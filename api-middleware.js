import fs from 'fs';
import crypto from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function apiMiddleware(req, res, next) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.url === '/api/data') {
    const dbPath = resolve(__dirname, 'db.json');
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.end(data);
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to read db.json' }));
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body);
          const existing = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
          incoming.admins = existing.admins || incoming.admins || [];
          incoming.agents = incoming.agents || existing.agents || [];
          // ✔️ PRESERVE PLAYERS DATABASE (Never overwrite from admin panel settings updates!)
          incoming.players = existing.players || [];
          fs.writeFileSync(dbPath, JSON.stringify(incoming, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'];
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) throw new Error('No boundary found');
        const boundary = '--' + boundaryMatch[1];
        
        // Find boundary indices in the buffer
        const boundaryBuffer = Buffer.from(boundary);
        const boundaryIndices = [];
        let index = buffer.indexOf(boundaryBuffer);
        while (index !== -1) {
          boundaryIndices.push(index);
          index = buffer.indexOf(boundaryBuffer, index + boundaryBuffer.length);
        }

        if (boundaryIndices.length < 2) throw new Error('Invalid multipart body');

        // Extract first part (the file)
        const partStart = boundaryIndices[0] + boundaryBuffer.length;
        const partEnd = boundaryIndices[1];
        const part = buffer.subarray(partStart, partEnd);

        // Find header and body separator (\r\n\r\n)
        const separator = Buffer.from('\r\n\r\n');
        const separatorIndex = part.indexOf(separator);
        if (separatorIndex === -1) throw new Error('Invalid part structure');

        const headersText = part.subarray(0, separatorIndex).toString('utf-8');
        // The body data ends before \r\n boundary start (part ends with \r\n)
        const fileData = part.subarray(separatorIndex + separator.length, part.length - 2);

        // Extract filename
        const filenameMatch = headersText.match(/filename="([^"]+)"/);
        if (!filenameMatch) throw new Error('No filename found');
        const originalName = filenameMatch[1];
        const ext = originalName.split('.').pop() || 'png';
        const safeName = `uploaded_${Date.now()}.${ext}`;

        const imagesDir = resolve(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

        const savePath = resolve(imagesDir, safeName);
        fs.writeFileSync(savePath, fileData);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, url: `images/${safeName}` }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/sync-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        
        const adminEmails = ['halilfarhat102@gmail.com', 'management135790@gmail.com'];
        const isAdmin = player.isAdmin === true || adminEmails.includes(player.email);
        
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const payload = JSON.parse(body); // { id, amount, type }

        if (!db.players) db.players = [];
        let player = db.players.find(p => p.id === payload.id);
        if (player) {
          // ✔️ Enforce deduction check: only allow negative balance change if type is gameplay related
          if (payload.amount < 0) {
            const isGameplay = /لعب|game|play|slots|roulette|spin|wheel|blackjack|bet/i.test(payload.type || '');
            if (!isGameplay) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'لا يمكن خصم عملات من الحساب إلا في حالة لعب الألعاب فقط' }));
              return;
            }
          }
          player.balance = (player.balance || 0) + payload.amount;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: payload.type,
            amount: payload.amount,
            date: new Date().toLocaleTimeString('ar')
          });
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(player));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Player not found' }));
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/admin/add-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const { playerId } = JSON.parse(body);

        if (!db.players) db.players = [];
        const initialLength = db.players.length;
        db.players = db.players.filter(p => p.id !== playerId);

        if (db.players.length === initialLength) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const { playerId } = JSON.parse(body);

        if (!db.players) db.players = [];
        const p = db.players.find(x => x.id === playerId);
        if (!p) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'اللاعب غير موجود' }));
          return;
        }

        p.status = p.status === 'active' ? 'suspended' : 'active';
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const { playerId, isAgent } = JSON.parse(body);

        if (!db.players) db.players = [];
        let player = db.players.find(p => p.id === playerId);
        if (player) {
          player.isAgent = isAgent;
          if (isAgent) {
            player.agentBalance = player.agentBalance || 0;
          }
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const admins = db.admins || [];
        const hash = sha256(password);
        const admin = admins.find(a => a.username === username && a.passwordHash === hash);
        if (admin) {
          const token = sha256(username + Date.now() + Math.random());
          if (!global._adminTokens) global._adminTokens = {};
          global._adminTokens[token] = { adminId: admin.id, username: admin.username, displayName: admin.displayName, role: admin.role };
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, token, displayName: admin.displayName, role: admin.role }));
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
    req.on('end', () => {
      try {
        const { token, oldPassword, newPassword } = JSON.parse(body);
        const session = (global._adminTokens || {})[token];
        if (!session) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'غير مصرح' })); }
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const admin = (db.admins || []).find(a => a.id === session.adminId);
        if (!admin || admin.passwordHash !== sha256(oldPassword)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'كلمة المرور الحالية غير صحيحة' }));
        }
        admin.passwordHash = sha256(newPassword);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
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
    req.on('end', () => {
      try {
        const { token, username, password, displayName, role } = JSON.parse(body);
        const session = (global._adminTokens || {})[token];
        if (!session || session.role !== 'superadmin') {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: 'صلاحيات غير كافية' }));
        }
        const dbPath = resolve(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
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
          createdAt: new Date().toISOString().split('T')[0]
        });
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    next();
  }
}
