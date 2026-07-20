import fs from 'fs';
import { readDb, writeDb, runTransaction } from './db-adapter.js';
import crypto from 'crypto';
import https from 'https';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ─── Persistent Token Store (survives server restarts) ───────────────────────
// Tokens are stored in db.json under db.sessions to persist across Render deploys
async function getAdminSession(token) {
  if (!token) return null;
  try {
    const db = await readDb();
    const sessions = db.sessions || {};
    const session = sessions[token];
    if (!session) return null;
    // Check expiry (24 hours)
    if (Date.now() > session.expiresAt) {
      // Expired — clean it up
      delete sessions[token];
      db.sessions = sessions;
      await writeDb(db);
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

async function saveAdminSession(token, sessionData) {
  try {
    const db = await readDb();
    if (!db.sessions) db.sessions = {};
    // Clean up expired sessions first
    const now = Date.now();
    for (const [k, v] of Object.entries(db.sessions)) {
      if (v.expiresAt && now > v.expiresAt) delete db.sessions[k];
    }
    db.sessions[token] = { ...sessionData, expiresAt: now + 24 * 60 * 60 * 1000 };
    await writeDb(db);
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

async function deleteAdminSession(token) {
  try {
    const db = await readDb();
    if (db.sessions && db.sessions[token]) {
      delete db.sessions[token];
      await writeDb(db);
    }
  } catch (e) {}
}
// ─────────────────────────────────────────────────────────────────────────────


export async function apiMiddleware(req, res, next) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.url === '/api/version' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ version: '2.0.0' }));
    return;
  }

  if (req.url === '/api/data') {
    const dbPath = resolve(__dirname, 'db.json');
    if (req.method === 'GET') {
      try {
        const db = await readDb();
        // Exclude sessions (auth tokens) from public data response for security
        const { sessions, ...publicData } = db;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(publicData));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to read db.json' }));
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const incoming = JSON.parse(body);
          const existing = await readDb();
          
          incoming.admins = (existing.admins && existing.admins.length > 0) ? existing.admins : (incoming.admins || []);
          incoming.players = existing.players || [];
          if (incoming.agents === undefined) incoming.agents = existing.agents || [];
          if (incoming.games === undefined) incoming.games = existing.games || [];
          if (incoming.banners === undefined) incoming.banners = existing.banners || [];
          
          await writeDb(incoming);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
    }
  } else if (req.url === '/api/upload' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const jsonText = Buffer.concat(chunks).toString('utf-8');
        const { fileName, fileData } = JSON.parse(jsonText);
        if (!fileName || !fileData) throw new Error('Missing fileName or fileData');

        // Extract raw Base64 data and extension
        const commaIndex = fileData.indexOf(',');
        const base64Content = commaIndex !== -1 ? fileData.slice(commaIndex + 1) : fileData;
        const fileBuffer = Buffer.from(base64Content, 'base64');

        const ext = fileName.split('.').pop() || 'png';
        const safeName = `uploaded_${Date.now()}.${ext}`;

        // 1. Upload to Supabase Storage images bucket
        console.log(`Uploading ${safeName} to Supabase Storage...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(safeName, fileBuffer, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
        }

        // Get the permanent public URL
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(safeName);

        const uploadUrl = urlData.publicUrl;
        console.log("Successfully uploaded image to Supabase Storage. URL:", uploadUrl);

        // 2. Save locally as fallback/cache (so local folder is also populated)
        try {
          const imagesDir = resolve(__dirname, 'images');
          if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
          const savePath = resolve(imagesDir, safeName);
          fs.writeFileSync(savePath, fileBuffer);
        } catch (localWriteError) {
          console.warn("Could not save copy of uploaded image locally:", localWriteError.message);
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, url: uploadUrl }));
      } catch (e) {
        console.error("Image upload endpoint error:", e.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/sync-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const playerInput = JSON.parse(body);

        // Helper: is the name a pure numeric ID (not a real name)?
        const isNumericId = (s) => /^\d+$/.test((s || '').trim());

        if (!db.players) db.players = [];
        let player = db.players.find(p => p.id === playerInput.id);
        if (!player) {
          // New player — use real name only (not numeric ID)
          const newName = (!isNumericId(playerInput.name) && playerInput.name)
            ? playerInput.name
            : 'لاعب مسعودي';
          player = {
            id: playerInput.id,
            name: newName,
            email: playerInput.email || '—',
            photoUrl: playerInput.photoUrl || '',
            balance: 5000, // Gift on signup
            bonus: 500,
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            lastLogin: new Date().toISOString().split('T')[0],
            transactions: [
              { type: 'هدية التسجيل', amount: 5000, date: new Date().toLocaleTimeString('ar') }
            ]
          };
          db.players.push(player);
        } else {
          // Existing player — only update name if incoming is a real name (not numeric)
          if (playerInput.name && !isNumericId(playerInput.name)) {
            player.name = playerInput.name;
          }
          // Always update email, photoUrl, and lastLogin
          if (playerInput.email) player.email = playerInput.email;
          if (playerInput.photoUrl) player.photoUrl = playerInput.photoUrl;
          player.lastLogin = new Date().toISOString().split('T')[0];
        }

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        
        const adminEmails = ['halilfarhat102@gmail.com'];
        const isLinkedAdmin = (db.admins || []).some(a => String(a.playerId) === String(player.id));
        const isAdmin = player.isAdmin === true || adminEmails.includes(player.email) || isLinkedAdmin;
        
        res.end(JSON.stringify({
          ...player,
          isAdmin: isAdmin
        }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/update-player-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        let resultPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = db.players.find(p => p.id === payload.id);
          if (!player) {
            errorMsg = 'Player not found';
            return db;
          }
          if (payload.amount < 0) {
            const isGameplay = /لعب|game|play|slots|roulette|spin|wheel|blackjack|bet/i.test(payload.type || '');
            if (!isGameplay) {
              errorMsg = 'لا يمكن خصم عملات من الحساب إلا في حالة لعب الألعاب فقط';
              return db;
            }
            if ((player.balance || 0) + payload.amount < 0) {
              errorMsg = 'الرصيد غير كافي للعب';
              return db;
            }
          }
          player.balance = (player.balance || 0) + payload.amount;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: payload.type,
            amount: payload.amount,
            date: new Date().toLocaleTimeString('ar')
          });
          resultPlayer = player;
          return db;
        });

        if (errorMsg) {
          res.statusCode = errorMsg.includes('not found') ? 404 : 400;
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(resultPlayer));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/submit-receipt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const db = await readDb();
        const { playerId, playerName, gateway, amount, coins, imageUrl } = JSON.parse(body);

        if (!playerId || !gateway || !imageUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'بيانات الإيصال غير كاملة' }));
          return;
        }

        if (!db.receipts) db.receipts = [];
        const newReceipt = {
          id: `rcpt-${Date.now()}`,
          playerId,
          playerName: playerName || 'لاعب مسعودي',
          gateway,
          amount: amount || '—',
          coins: coins || 0,
          imageUrl,
          date: (() => {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
          })(),
          status: 'pending'
        };
        db.receipts.push(newReceipt);
        await writeDb(db);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, receipt: newReceipt }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/action-receipt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const db = await readDb();
        const { receiptId, action } = JSON.parse(body);

        if (!db.receipts) db.receipts = [];
        const idx = db.receipts.findIndex(r => r.id === receiptId);
        if (idx === -1) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'الإيصال غير موجود' }));
          return;
        }

        if (action === 'delete') {
          db.receipts.splice(idx, 1);
        } else {
          if (action === 'approve') {
            const receipt = db.receipts[idx];
            if (receipt.status === 'pending') {
              if (!db.players) db.players = [];
              const player = db.players.find(p => p.id === receipt.playerId);
              if (player) {
                const coins = parseFloat(receipt.coins || 0);
                if (coins > 0) {
                  player.balance = (player.balance || 0) + coins;
                  if (!player.transactions) player.transactions = [];
                  player.transactions.push({
                    type: `شحن من التطبيق (${receipt.gateway})`,
                    amount: coins,
                    date: new Date().toLocaleTimeString('ar-EG')
                  });
                }
              }
            }
          }
          db.receipts[idx].status = action === 'approve' ? 'approved' : 'rejected';
        }

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/add-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { name, email, balance, status } = JSON.parse(body);

        if (!name) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'اسم اللاعب مطلوب' }));
          return;
        }

        if (!db.players) db.players = [];
        const newId = String(100000 + Math.floor(Math.random() * 900000));
        const newPlayer = {
          id: newId,
          name,
          email: email || '—',
          balance: balance || 0,
          bonus: 0,
          status: status || 'active',
          joinDate: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString().split('T')[0],
          transactions: balance > 0 ? [
            { type: 'إيداع من الإدارة', amount: balance, date: new Date().toLocaleTimeString('ar') }
          ] : []
        };
        db.players.push(newPlayer);
        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: newPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/delete-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId } = JSON.parse(body);

        if (!db.players) db.players = [];
        const initialLength = db.players.length;
        db.players = db.players.filter(p => p.id !== playerId);

        if (db.players.length === initialLength) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/update-player-wallet' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId, amount, action } = JSON.parse(body);

        if (!playerId || isNaN(amount) || amount <= 0) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
          return;
        }

        if (!db.players) db.players = [];
        const p = db.players.find(x => x.id === playerId);
        if (!p) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        const now = new Date().toLocaleTimeString('ar');
        let txType = '';
        if (action === 'add_primary') {
          p.balance = (p.balance || 0) + amount;
          txType = 'إضافة رصيد رئيسي ✅';
        } else if (action === 'add_bonus') {
          p.bonus = (p.bonus || 0) + amount;
          txType = 'إضافة مكافأة 🎁';
        } else {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'نوع عملية غير صالح أو غير مسموح بالخصم اليدوي' }));
          return;
        }

        if (!p.transactions) p.transactions = [];
        p.transactions.push({
          type: txType,
          amount: amount,
          date: now
        });

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: p }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/toggle-player-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId } = JSON.parse(body);

        if (!db.players) db.players = [];
        const p = db.players.find(x => x.id === playerId);
        if (!p) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        p.status = p.status === 'active' ? 'suspended' : 'active';
        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: p }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/reset-player-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId } = JSON.parse(body);

        if (!db.players) db.players = [];
        const p = db.players.find(x => x.id === playerId);
        if (!p) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        p.balance = 0;
        p.bonus = 0;
        if (!p.transactions) p.transactions = [];
        p.transactions.push({
          type: 'تصفير الرصيد',
          amount: 0,
          date: new Date().toLocaleTimeString('ar')
        });

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: p }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/toggle-agent' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId, isAgent } = JSON.parse(body);

        if (!db.players) db.players = [];
        let player = db.players.find(p => p.id === playerId);
        if (player) {
          player.isAgent = isAgent;
          if (isAgent) {
            player.agentBalance = player.agentBalance || 0;
          }
          await writeDb(db);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, player }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على اللاعب' }));
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/update-agent-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const payload = JSON.parse(body); // { id, amount }

        if (!db.players) db.players = [];
        let player = db.players.find(p => p.id === payload.id);
        if (player) {
          if (!player.isAgent) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'هذا اللاعب ليس وكيلاً معتمداً' }));
            return;
          }
          player.agentBalance = (player.agentBalance || 0) + payload.amount;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: 'شحن رصيد وكالة (من الإدارة)',
            amount: payload.amount,
            date: new Date().toLocaleTimeString('ar')
          });
          await writeDb(db);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(player));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على اللاعب' }));
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/agent-transfer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { agentId, recipientId, amount } = JSON.parse(body);

        if (!agentId || !recipientId || amount <= 0) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
          return;
        }

        if (!db.players) db.players = [];
        let agent = db.players.find(p => p.id === agentId);
        let recipient = db.players.find(p => p.id === recipientId);

        if (!agent) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على حساب الوكيل' }));
          return;
        }
        if (!agent.isAgent) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'هذا الحساب ليس وكيلاً معتمداً' }));
          return;
        }
        if ((agent.agentBalance || 0) < amount) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'رصيد الوكالة الخاص بك غير كافٍ لإجراء هذا التحويل' }));
          return;
        }
        if (!recipient) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على اللاعب المستلم' }));
          return;
        }

        // Execute transfer (deduct from agent's exclusive agentBalance, add to recipient's play balance)
        agent.agentBalance = (agent.agentBalance || 0) - amount;
        recipient.balance = (recipient.balance || 0) + amount;

        // Log transactions
        if (!agent.transactions) agent.transactions = [];
        agent.transactions.push({
          type: `تحويل كوينز إلى لاعب (${recipient.name || recipientId})`,
          amount: -amount,
          date: new Date().toLocaleTimeString('ar')
        });

        if (!recipient.transactions) recipient.transactions = [];
        recipient.transactions.push({
          type: `شحن من الوكيل (${agent.name || agentId})`,
          amount: amount,
          date: new Date().toLocaleTimeString('ar')
        });

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, agentBalance: agent.agentBalance }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/player-sell-to-agent' && req.method === 'POST') {
    // 🔄 Player sells coins TO agent (works with both charging agents & P2P players)
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        // agentId = the player-account ID of the agent
        // agentEntryId = the agents[] entry id (charging agent with playerId field)
        const { playerId, agentId, agentEntryId, amount } = JSON.parse(body);

        if (!playerId || (!agentId && !agentEntryId) || !amount || amount <= 0) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
          return;
        }

        if (!db.players) db.players = [];

        // Resolve the target agent's player account
        let resolvedAgentPlayerId = agentId;
        let agentDisplayName = null;

        if (agentEntryId) {
          // Find from charging agents list via agentEntryId
          const agentEntry = (db.agents || []).find(a => a.id === agentEntryId);
          if (!agentEntry) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'لم يتم العثور على الوكيل في قائمة الشحن' }));
            return;
          }
          if (!agentEntry.playerId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'هذا الوكيل لم يُربط بحساب تطبيق بعد — تواصل مع الإدارة' }));
            return;
          }
          resolvedAgentPlayerId = agentEntry.playerId;
          agentDisplayName = agentEntry.name;
        }

        let player = db.players.find(p => p.id === playerId);
        let agent  = db.players.find(p => p.id === resolvedAgentPlayerId);

        if (!player) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على حساب اللاعب' }));
          return;
        }
        if ((player.balance || 0) < amount) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'رصيدك غير كافٍ لإتمام عملية البيع' }));
          return;
        }
        if (!agent) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'لم يتم العثور على حساب الوكيل في النظام — تأكد من ربط الوكيل بحساب التطبيق' }));
          return;
        }
        if (!agent.isAgent) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'هذا الحساب ليس وكيلاً معتمداً — تواصل مع الإدارة' }));
          return;
        }

        const finalAgentName = agentDisplayName || agent.name || resolvedAgentPlayerId;

        // Execute sale: deduct from player balance → add to agent's agentBalance
        player.balance     = (player.balance     || 0) - amount;
        agent.agentBalance = (agent.agentBalance || 0) + amount;

        const now = new Date().toLocaleTimeString('ar');

        if (!player.transactions) player.transactions = [];
        player.transactions.push({
          type: `بيع كوينز للوكيل (${finalAgentName})`,
          amount: -amount,
          date: now
        });

        if (!agent.transactions) agent.transactions = [];
        agent.transactions.push({
          type: `شراء كوينز من لاعب (${player.name || playerId})`,
          amount: amount,
          date: now
        });

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          newBalance: player.balance,
          agentName: finalAgentName
        }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin-login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body);
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const admins = db.admins || [];
        const hash = sha256(password);
        const admin = admins.find(a => a.username === username && a.passwordHash === hash);
        if (admin) {
          const token = sha256(username + Date.now() + Math.random());
          // Save session persistently in db.json (survives server restarts)
          await saveAdminSession(token, { 
            adminId: admin.id, 
            username: admin.username, 
            displayName: admin.displayName, 
            role: admin.role,
            allowedTabs: admin.allowedTabs || []
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: true, 
            token, 
            displayName: admin.displayName, 
            role: admin.role,
            allowedTabs: admin.allowedTabs || []
          }));
        } else {
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }));
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin-change-password' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { token, oldPassword, newPassword } = JSON.parse(body);
        const session = await getAdminSession(token);
        if (!session) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'غير مصرح' })); }
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const admin = (db.admins || []).find(a => a.id === session.adminId);
        if (!admin || admin.passwordHash !== sha256(oldPassword)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'كلمة المرور الحالية غير صحيحة' }));
        }
        admin.passwordHash = sha256(newPassword);
        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin-add' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { token, username, password, displayName, role, allowedTabs, playerId } = JSON.parse(body);
        const session = await getAdminSession(token);
        if (!session || session.role !== 'superadmin') {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: 'صلاحيات غير كافية — يجب تسجيل الدخول مجدداً كمشرف عام' }));
        }
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        if (!db.admins) db.admins = [];
        if (db.admins.find(a => a.username === username)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'اسم المستخدم مستخدم بالفعل' }));
        }
        db.admins.push({
          id: 'admin-' + Date.now(),
          username, displayName: displayName || username,
          passwordHash: sha256(password),
          role: role || 'admin',
          allowedTabs: allowedTabs || [],
          playerId: playerId || null,
          createdAt: new Date().toISOString().split('T')[0]
        });

        // Sync player.isAdmin flag for instant app access
        if (playerId) {
          if (!db.players) db.players = [];
          const player = db.players.find(p => String(p.id) === String(playerId));
          if (player) {
            player.isAdmin = true;
          }
        }

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin-delete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { token, adminId } = JSON.parse(body);
        const session = await getAdminSession(token);
        if (!session || session.role !== 'superadmin') {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: 'صلاحيات غير كافية — يجب تسجيل الدخول مجدداً كمشرف عام' }));
        }
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        if (!db.admins) db.admins = [];

        // Handle legacy player admins from p.isAdmin flag (starts with player-admin-)
        if (String(adminId).startsWith('player-admin-')) {
          const pId = String(adminId).replace('player-admin-', '');
          if (db.players) {
            const player = db.players.find(p => String(p.id) === pId);
            if (player) {
              delete player.isAdmin;
            }
          }
          await writeDb(db);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }
        
        const idx = db.admins.findIndex(a => a.id === adminId);
        if (idx === -1) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'المشرف غير موجود' }));
        }
        
        // Prevent deleting the main admin
        if (db.admins[idx].username === 'admin') {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'لا يمكن حذف المشرف الرئيسي' }));
        }

        // Clean up linked player's isAdmin flag
        const deletedAdmin = db.admins[idx];
        if (deletedAdmin.playerId && db.players) {
          const player = db.players.find(p => String(p.id) === String(deletedAdmin.playerId));
          if (player) {
            delete player.isAdmin;
          }
        }
        
        db.admins.splice(idx, 1);
        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });

  // ══════════════════════════════════════════════════════════════
  //  🎮 SEAMLESS WALLET API — Game Provider Integration Endpoints
  //  These endpoints are called by the game provider (e.g. PG Soft)
  //  when players bet, win, or need balance verification.
  // ══════════════════════════════════════════════════════════════

  } else if (req.url.startsWith('/api/game/verify-session') && req.method === 'POST') {
    // Called by game provider to verify the player's session token
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const db = await readDb();
        
        // Robust payload parser (JSON, Form Data, URL Query)
        let payload = {};
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          for (const [k, v] of urlObj.searchParams.entries()) payload[k] = v;
        } catch (e) {}
        if (body) {
          try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object') Object.assign(payload, parsed);
          } catch (e) {
            try {
              const params = new URLSearchParams(body);
              for (const [k, v] of params.entries()) payload[k] = v;
            } catch (e2) {}
          }
        }

        if (!db.players) db.players = [];
        const token = payload.token || payload.session_token || payload.sessionToken || payload.operator_player_session || payload.player_session || payload.ops || payload.custom_parameter || payload.trace_id;
        const playerId = payload.player_name || payload.player_id || payload.playerId || payload.uid;

        let player = null;
        if (token) player = db.players.find(p => p.sessionToken === token || p.id === token);
        if (!player && playerId) player = db.players.find(p => p.id === String(playerId) || p.name === String(playerId));
        if (!player && db.players.length > 0) player = db.players.find(p => p.id === '519997') || db.players[0];

        if (!player) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            data: null,
            error: { code: '1034', message: 'Invalid session token' }
          }));
        }

        player.lastLogin = new Date().toISOString().split('T')[0];
        await writeDb(db);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: {
            player_name: player.id,
            player_id: player.id,
            currency: db.settings?.pgConfig?.currency || 'USD',
            nickname: player.name || 'Player'
          },
          error: null
        }));
      } catch (e) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1200', message: e.message }
        }));
      }
    });

  } else if (req.url.startsWith('/api/game/get-balance') && req.method === 'POST') {
    // Called by game provider to get current player balance
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const db = await readDb();

        let payload = {};
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          for (const [k, v] of urlObj.searchParams.entries()) payload[k] = v;
        } catch (e) {}
        if (body) {
          try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object') Object.assign(payload, parsed);
          } catch (e) {
            try {
              const params = new URLSearchParams(body);
              for (const [k, v] of params.entries()) payload[k] = v;
            } catch (e2) {}
          }
        }

        if (!db.players) db.players = [];
        const token = payload.token || payload.session_token || payload.sessionToken || payload.operator_player_session || payload.player_session || payload.ops || payload.custom_parameter || payload.trace_id;
        const playerId = payload.player_name || payload.player_id || payload.playerId || payload.uid;

        let player = null;
        if (token) player = db.players.find(p => p.sessionToken === token || p.id === token);
        if (!player && playerId) player = db.players.find(p => p.id === String(playerId) || p.name === String(playerId));
        if (!player && db.players.length > 0) player = db.players.find(p => p.id === '519997') || db.players[0];

        if (!player) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            data: null,
            error: { code: '1000', message: 'Player not found' }
          }));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: {
            player_name: player.id,
            player_id: player.id,
            currency: db.settings?.pgConfig?.currency || 'USD',
            balance: parseFloat(((player.balance || 0) / 100).toFixed(2))
          },
          error: null
        }));
      } catch (e) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1200', message: e.message }
        }));
      }
    });

  } else if (req.url === '/api/game/adjustment' && req.method === 'POST') {
    // Called by game provider to deduct (bet) or add (win) balance
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');

        const token = payload.token || payload.session_token || payload.sessionToken;
        const playerId = payload.player_id || payload.playerId || payload.uid;
        // Amount in major currency units (e.g. 1.50 USD)
        const amountRaw = parseFloat(payload.amount || payload.bet_amount || 0);
        const txType = payload.type || payload.transaction_type || 'adjustment';
        const txId = payload.transaction_id || payload.txid || payload.bet_id || ('TX-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        let resultBalance = 0;
        let resultPlayerId = '';
        let errorMsg = null;
        let isDuplicate = false;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = null;
          if (token) player = db.players.find(p => p.sessionToken === token);
          if (!player && playerId) player = db.players.find(p => p.id === String(playerId));

          if (!player) {
            errorMsg = 'Player not found';
            return db;
          }

          if (!db.processedTxIds) db.processedTxIds = [];
          if (db.processedTxIds.includes(txId)) {
            isDuplicate = true;
            resultBalance = player.balance || 0;
            resultPlayerId = player.id;
            return db;
          }

          // Convert to internal coin units (multiply by 100)
          const amountCoins = Math.round(amountRaw * 100);
          const isDebit = amountCoins < 0;
          const absAmount = Math.abs(amountCoins);

          if (isDebit && (player.balance || 0) < absAmount) {
            errorMsg = 'Insufficient balance';
            resultBalance = player.balance || 0;
            return db;
          }

          player.balance = (player.balance || 0) + amountCoins;
          if (player.balance < 0) player.balance = 0;

          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: amountCoins < 0 ? `رهان — ${gameName}` : `فوز — ${gameName}`,
            amount: amountCoins,
            txId: txId,
            date: new Date().toLocaleTimeString('ar')
          });

          // Mark transaction as processed
          db.processedTxIds.push(txId);
          if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

          resultBalance = player.balance;
          resultPlayerId = player.id;
          return db;
        });

        if (errorMsg) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            data: null,
            error: {
              code: errorMsg === 'Insufficient balance' ? '3200' : '1000',
              message: errorMsg
            }
          }));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: {
            player_name: resultPlayerId,
            player_id: resultPlayerId,
            currency: db.settings?.pgConfig?.currency || 'USD',
            balance: parseFloat((resultBalance / 100).toFixed(2))
          },
          error: null
        }));
      } catch (e) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1200', message: e.message }
        }));
      }
    });

  // ── BET PAYOUT: Combined game round result (bet deducted + win added atomically) ──
  // This is DIFFERENT from /adjustment. PG Soft calls this at end of each game round.
  // Payload: { token, player_id, bet_amount, win_amount, transaction_id, game_code }
  } else if (req.url === '/api/game/betpayout' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');

        const token    = payload.token || payload.session_token || payload.sessionToken;
        const playerId = payload.player_id || payload.playerId || payload.uid;
        const betAmt   = parseFloat(payload.bet_amount  || payload.bet  || 0);
        const winAmt   = parseFloat(payload.win_amount  || payload.win  || 0);
        const txId     = payload.transaction_id || payload.txid || ('BP-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        let resultBalance  = 0;
        let resultPlayerId = '';
        let errorMsg       = null;
        let isDuplicate    = false;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = null;
          if (token)    player = db.players.find(p => p.sessionToken === token);
          if (!player && playerId) player = db.players.find(p => p.id === String(playerId));

          if (!player) { errorMsg = 'Player not found'; return db; }

          // Duplicate transaction guard
          if (!db.processedTxIds) db.processedTxIds = [];
          if (db.processedTxIds.includes(txId)) {
            isDuplicate    = true;
            resultBalance  = player.balance || 0;
            resultPlayerId = player.id;
            return db;
          }

          const betCoins = Math.round(betAmt * 100);
          const winCoins = Math.round(winAmt * 100);
          const netCoins = winCoins - betCoins; // positive = net win, negative = net loss

          // Check sufficient balance for bet
          if ((player.balance || 0) < betCoins) {
            errorMsg      = 'Insufficient balance';
            resultBalance = player.balance || 0;
            return db;
          }

          // Apply net change atomically
          player.balance = (player.balance || 0) + netCoins;
          if (player.balance < 0) player.balance = 0;

          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type:   netCoins >= 0 ? `فوز 🎉 — ${gameName}` : `رهان — ${gameName}`,
            amount: netCoins,
            txId:   txId,
            date:   new Date().toLocaleTimeString('ar')
          });

          db.processedTxIds.push(txId);
          if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

          resultBalance  = player.balance;
          resultPlayerId = player.id;
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        if (errorMsg) {
          return res.end(JSON.stringify({
            data: null,
            error: {
              code: errorMsg === 'Insufficient balance' ? '3200' : '1000',
              message: errorMsg
            }
          }));
        }
        res.end(JSON.stringify({
          data: {
            player_name:    resultPlayerId,
            player_id:      resultPlayerId,
            currency: db.settings?.pgConfig?.currency || 'USD',
            balance:        parseFloat((resultBalance / 100).toFixed(2))
          },
          error: null
        }));
      } catch (e) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1200', message: e.message }
        }));
      }
    });

  } else if (req.url === '/api/game/bet' && req.method === 'POST') {
    // Deduct bet amount from player balance
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {

      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const payload = JSON.parse(body || '{}');

        const token = payload.token || payload.session_token || payload.sessionToken;
        const playerId = payload.player_id || payload.playerId || payload.uid;
        const betAmount = parseFloat(payload.amount || payload.bet_amount || 0);
        const txId = payload.transaction_id || payload.bet_id || ('BET-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        if (!db.players) db.players = [];
        let player = null;
        if (token) player = db.players.find(p => p.sessionToken === token);
        if (!player && playerId) player = db.players.find(p => p.id === String(playerId));

        if (!player) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 0, msg: 'Player not found', balance: '0.00' }));
        }

        const betCoins = Math.round(betAmount * 100);

        // Duplicate check
        if (!db.processedTxIds) db.processedTxIds = [];
        if (db.processedTxIds.includes(txId)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: ((player.balance || 0) / 100).toFixed(2), transaction_id: txId }));
        }

        if ((player.balance || 0) < betCoins) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 0, msg: 'Insufficient balance', balance: ((player.balance || 0) / 100).toFixed(2) }));
        }

        player.balance = (player.balance || 0) - betCoins;
        if (!player.transactions) player.transactions = [];
        player.transactions.push({ type: `رهان — ${gameName}`, amount: -betCoins, txId, date: new Date().toLocaleTimeString('ar') });

        db.processedTxIds.push(txId);
        if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: ((player.balance || 0) / 100).toFixed(2), transaction_id: txId, player_id: player.id }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (req.url === '/api/game/payout' && req.method === 'POST') {
    // Add winnings to player balance
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const payload = JSON.parse(body || '{}');

        const token = payload.token || payload.session_token || payload.sessionToken;
        const playerId = payload.player_id || payload.playerId || payload.uid;
        const winAmount = parseFloat(payload.amount || payload.win_amount || 0);
        const txId = payload.transaction_id || payload.payout_id || ('WIN-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        if (!db.players) db.players = [];
        let player = null;
        if (token) player = db.players.find(p => p.sessionToken === token);
        if (!player && playerId) player = db.players.find(p => p.id === String(playerId));

        if (!player) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 0, msg: 'Player not found', balance: '0.00' }));
        }

        const winCoins = Math.round(winAmount * 100);

        if (!db.processedTxIds) db.processedTxIds = [];
        if (db.processedTxIds.includes(txId)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: ((player.balance || 0) / 100).toFixed(2), transaction_id: txId }));
        }

        player.balance = (player.balance || 0) + winCoins;
        if (!player.transactions) player.transactions = [];
        player.transactions.push({ type: `فوز 🎉 — ${gameName}`, amount: winCoins, txId, date: new Date().toLocaleTimeString('ar') });

        db.processedTxIds.push(txId);
        if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

        await writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: ((player.balance || 0) / 100).toFixed(2), transaction_id: txId, player_id: player.id }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (req.url === '/api/game/rollback' && req.method === 'POST') {
    // Called by game provider to cancel/rollback a transaction
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const payload = JSON.parse(body || '{}');

        const token = payload.token || payload.session_token;
        const playerId = payload.player_id || payload.playerId;
        const originalTxId = payload.original_transaction_id || payload.ref_transaction_id || payload.transaction_id;
        const refundAmount = parseFloat(payload.amount || 0);
        const txId = payload.rollback_id || ('RB-' + Date.now());

        if (!db.players) db.players = [];
        let player = null;
        if (token) player = db.players.find(p => p.sessionToken === token);
        if (!player && playerId) player = db.players.find(p => p.id === String(playerId));

        if (!player) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 0, msg: 'Player not found', balance: '0.00' }));
        }

        if (!db.processedTxIds) db.processedTxIds = [];
        if (db.processedTxIds.includes(txId)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: ((player.balance || 0) / 100).toFixed(2) }));
        }

        // Refund the bet amount back to player
        const refundCoins = Math.round(refundAmount * 100);
        player.balance = (player.balance || 0) + refundCoins;
        if (!player.transactions) player.transactions = [];
        player.transactions.push({ type: `استرداد رهان (Rollback)`, amount: refundCoins, txId, ref: originalTxId, date: new Date().toLocaleTimeString('ar') });

        db.processedTxIds.push(txId);
        await writeDb(db);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: ((player.balance || 0) / 100).toFixed(2), transaction_id: txId }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (req.url === '/api/game/downline' && req.method === 'POST') {
    // Downline API — returns list of sub-agents/players under the operator
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();

        const players = (db.players || []).map(p => ({
          player_id: p.id,
          username: p.name,
          status: p.status || 'active',
          currency: db.settings?.pgConfig?.currency || 'USD',
          balance: ((p.balance || 0) / 100).toFixed(2)
        }));

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 1, msg: 'success', data: players, total: players.length }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, data: [] }));
      }
    });

  } else if (req.url.startsWith('/api/pg/launch') && req.method === 'GET') {
    // Parse query parameters
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const playerId = parsedUrl.searchParams.get('player_id');
    const gameCode = parsedUrl.searchParams.get('game_code');

    if (!playerId || !gameCode) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<h3>خطأ: معرف اللاعب أو كود اللعبة مفقود</h3>');
    }

    try {
      const db = await readDb();
      if (!db.players) db.players = [];
      const player = db.players.find(p => p.id === playerId);

      if (!player) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end('<h3>اللاعب غير موجود</h3>');
      }

      // Generate or retrieve session token
      const sessionToken = crypto.createHash('sha256').update(playerId + Date.now() + Math.random()).digest('hex');
      player.sessionToken = sessionToken;
      player.sessionCreatedAt = new Date().toISOString();
      await writeDb(db);

      // Read PG Soft configuration from db
      const pgConfig = db.settings?.pgConfig || {
        isProduction: false,
        stagingOperatorToken: 'I-6c19673883aa410b98d1c0cb1a3c5edc',
        stagingSecretKey: 'c89632307f734f6192fa420864a2c847',
        productionOperatorToken: 'a5fd4c1a25904aae8729516557c160d0',
        productionSecretKey: 'c89632307f734f6192fa420864a2c847'
      };

      const isProd = pgConfig.isProduction;
      const operatorToken = isProd ? pgConfig.productionOperatorToken : pgConfig.stagingOperatorToken;
      const baseUrl = isProd ? (pgConfig.productionApiDomain || 'https://api.pgsoft-games.com') : (pgConfig.stagingApiDomain || 'https://api.pg-bo.me');

      // Call PG Soft GetLaunchURLHTML API
      const traceId = 'guid-' + crypto.randomUUID();
      const pgUrl = `${baseUrl}/external-game-launcher/api/v1/GetLaunchURLHTML?trace_id=${traceId}`;

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '196.153.185.113';

      const path = `/${gameCode}/index.html`;
      const extraArgs = `ops=${sessionToken}&btt=1&l=ar&cr=${pgConfig.currency || 'USD'}`;

      // Build form-urlencoded request body
      const formParams = new URLSearchParams();
      formParams.append('operator_token', operatorToken);
      formParams.append('path', path);
      formParams.append('extra_args', extraArgs);
      formParams.append('url_type', 'game-entry');
      formParams.append('client_ip', clientIp.split(',')[0].trim());

      console.log(`Calling PG Soft ${isProd ? 'Production' : 'Staging'} Launcher for player ${playerId}, game ${gameCode}...`);
      
      const userAgent = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const bodyData = formParams.toString();

      const responseText = await new Promise((resolvePromise, rejectPromise) => {
        const reqObj = https.request(pgUrl, {
          method: 'POST',
          family: 4,
          headers: {
            'User-Agent': userAgent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(bodyData)
          }
        }, pgRes => {
          let html = '';
          pgRes.on('data', chunk => html += chunk);
          pgRes.on('end', () => resolvePromise({ status: pgRes.statusCode, html }));
        });
        reqObj.on('error', err => rejectPromise(err));
        reqObj.write(bodyData);
        reqObj.end();
      });

      // Return the HTML directly to the webview
      res.statusCode = responseText.status || 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.end(responseText.html);

    } catch (e) {
      console.error("Error launching PG game:", e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<h3>حدث خطأ أثناء تشغيل اللعبة: ${e.message}</h3>`);
    }

  } else if (req.url === '/api/game/create-session' && req.method === 'POST') {
    // Create a session token for a player (called by APK before launching a game)
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = await readDb();
        const { playerId } = JSON.parse(body || '{}');

        if (!db.players) db.players = [];
        const player = db.players.find(p => p.id === playerId);

        if (!player) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
        }

        // Generate a unique session token
        const sessionToken = crypto.createHash('sha256').update(playerId + Date.now() + Math.random()).digest('hex');
        player.sessionToken = sessionToken;
        player.sessionCreatedAt = new Date().toISOString();

        await writeDb(db);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, sessionToken, playerId }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

  } else {
    next();
  }
}
