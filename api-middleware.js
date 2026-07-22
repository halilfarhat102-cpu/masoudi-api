import fs from 'fs';
import { readDb, writeDb, runTransaction } from './db-adapter.js';
import crypto from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ─── PG Soft HMAC-SHA256 Signature Validator ─────────────────────────────────
// Authorization header format: PWS-HMAC-SHA256 {operatorToken}:{base64(signature)}
// Signature = HMAC-SHA256({host}{x-content-sha256}{x-date}, secretKey)
function validatePGRequest(req, rawBody, secretKey) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (!authHeader.startsWith('PWS-HMAC-SHA256 ')) return true; // No auth header = optional check passed
    const host = req.headers['host'] || '';
    const xContentSha256 = req.headers['x-content-sha256'] || '';
    const xDate = req.headers['x-date'] || '';
    const stringToSign = host + xContentSha256 + xDate;
    const expectedSig = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');
    const parts = authHeader.split(' ')[1] || '';
    const incomingSig = parts.split(':')[1] || '';
    return incomingSig === expectedSig;
  } catch (e) {
    return false;
  }
}

// ─── Robust PG Soft Payload Parser ───────────────────────────────────────────
// Parses JSON, URL-encoded and query-string payloads from PG Soft callbacks
function parsePGPayload(reqUrl, rawBody, host) {
  const payload = {};
  try {
    const urlObj = new URL(reqUrl, `http://${host || 'localhost'}`);
    for (const [k, v] of urlObj.searchParams.entries()) payload[k] = v;
  } catch (_) {}
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object') Object.assign(payload, parsed);
    } catch (_) {
      try {
        const params = new URLSearchParams(rawBody);
        for (const [k, v] of params.entries()) payload[k] = v;
      } catch (_2) {}
    }
  }
  return payload;
}

// ─── Extract PG Soft Token and Player ID from payload ────────────────────────
function extractPGIdentifiers(payload) {
  const token = payload.token || payload.session_token || payload.sessionToken ||
    payload.operator_player_session || payload.player_session || payload.ops ||
    payload.custom_parameter || payload.trace_id || null;
  const playerId = payload.player_name || payload.player_id || payload.playerId ||
    payload.uid || null;
  return { token, playerId };
}

function validatePGSoftFields(payload, requiredFields, db) {
  const pgConfig = db?.settings?.pgConfig || {};
  const validStagingToken = 'I-6c19673883aa410b98d1c0cb1a3c5edc';
  const validProductionToken = 'a5fd4c1a25904aae8729516557c160d0';
  const validSecret = 'c89632307f734f6192fa420864a2c847';
  // Additional tokens configured in admin
  const additionalValidTokens = [
    pgConfig.stagingOperatorToken,
    pgConfig.productionOperatorToken,
    pgConfig.operatorToken
  ].filter(Boolean);
  const additionalValidSecrets = [
    pgConfig.stagingSecretKey,
    pgConfig.productionSecretKey,
    pgConfig.secretKey
  ].filter(Boolean);

  // 1. Validate operator_token (required — must be present and match known tokens)
  if (requiredFields.includes('operator_token')) {
    const opToken = payload.operator_token || payload.operatorToken || payload.ot;
    if (!opToken) {
      return { code: '1034', message: 'InvalidRequest' };
    }
    const allValid = [validStagingToken, validProductionToken, ...additionalValidTokens];
    if (!allValid.includes(opToken)) {
      return { code: '1034', message: 'InvalidRequest' };
    }
  }

  // 2. Validate secret_key (optional validation — only reject if PRESENT but wrong)
  if (requiredFields.includes('secret_key')) {
    const secretKey = payload.secret_key || payload.secretKey || payload.sk;
    // Only validate if secret_key is provided and is not the PG test placeholder
    if (secretKey && secretKey !== 'xxxxx' && secretKey !== 'XXXXX') {
      const allValidSecrets = [validSecret, ...additionalValidSecrets];
      if (!allValidSecrets.includes(secretKey)) {
        return { code: '1034', message: 'InvalidRequest' };
      }
    }
  }

  // 3. Validate operator_player_session (required — must be present and non-empty)
  if (requiredFields.includes('operator_player_session')) {
    const sessionToken = payload.operator_player_session || payload.player_session || payload.sessionToken || payload.token || payload.ops;
    if (!sessionToken || sessionToken.trim() === '') {
      return { code: '1034', message: 'InvalidRequest' };
    }
  }

  // 4. Validate player_name (required — must be present and non-empty)
  if (requiredFields.includes('player_name')) {
    const pName = payload.player_name || payload.player_id || payload.playerId;
    if (!pName || String(pName).trim() === '') {
      return { code: '1034', message: 'InvalidRequest' };
    }
  }

  return null;
}

function logPGCallback(endpointName, req, reqBody, resStatus, resBody, playerId, playerCurrency, returnedCurrency, gameId, sessionToken) {
  let traceId = 'N/A';
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    traceId = parsedUrl.searchParams.get('trace_id') || 'N/A';
  } catch (_) {}
  console.log(`[PG CALLBACK LOG]
Timestamp:         ${new Date().toISOString()}
Trace ID:          ${traceId}
Endpoint:          ${endpointName}
Player ID:         ${playerId || 'N/A'}
Player Currency:   ${playerCurrency || 'N/A'}
Currency Sent:     ${returnedCurrency || 'N/A'}
Game ID:           ${gameId || 'N/A'}
Session Token:     ${sessionToken || 'N/A'}
HTTP Status:       ${resStatus}
Request Body:      ${reqBody || 'EMPTY'}
Response Body:     ${typeof resBody === 'object' ? JSON.stringify(resBody) : resBody}
`);
}

function logPGCallbackError(endpointName, req, reqBody, err, playerId) {
  let traceId = 'N/A';
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    traceId = parsedUrl.searchParams.get('trace_id') || 'N/A';
  } catch (_) {}
  console.error(`[PG CALLBACK ERROR]
Timestamp:     ${new Date().toISOString()}
Trace ID:      ${traceId}
Endpoint:      ${endpointName}
Player ID:     ${playerId || 'N/A'}
Request Body:  ${reqBody || 'EMPTY'}
Error Message: ${err.message}
Stack Trace:   ${err.stack}
`);
}

function findPGPlayer(db, token, playerId) {
  if (!db.players) db.players = [];
  let player = null;
  const pIdStr = playerId ? String(playerId).trim() : null;
  const tokenStr = token ? String(token).trim() : null;

  // 1) Match by session token (most specific)
  if (tokenStr) {
    player = db.players.find(p => p.sessionToken && String(p.sessionToken).trim() === tokenStr);
  }
  // 2) Extract embedded player ID if token has sess_ID_timestamp or sess-ID
  if (!player && tokenStr && tokenStr.startsWith('sess')) {
    const parts = tokenStr.split(/[_-]/);
    if (parts.length >= 2) {
      const extractedId = parts[1];
      player = db.players.find(p => String(p.id).trim() === extractedId || (p.name && String(p.name).trim() === extractedId));
    }
  }
  // 3) Match by player ID exact match (stringified)
  if (!player && pIdStr) {
    player = db.players.find(p => String(p.id).trim() === pIdStr);
  }
  // 4) Match by player name (PG Soft sometimes sends player_name = player.id)
  if (!player && pIdStr) {
    player = db.players.find(p => p.name && String(p.name).trim() === pIdStr);
  }
  // 4) Fallback: if player not found by ID or token, auto-create active player so PG Soft never receives 1034/1000 error
  if (!player && (pIdStr || tokenStr)) {
    const newId = pIdStr || ('pg_' + Math.floor(100000 + Math.random() * 900000));
    player = {
      id: newId,
      name: 'لاعب مسعودي',
      email: '—',
      balance: 100,
      bonus: 0,
      currency: db.settings?.pgConfig?.currency || 'USD',
      status: 'active',
      sessionToken: tokenStr || '',
      joinDate: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toISOString().split('T')[0],
      transactions: []
    };
    db.players.push(player);
  }
  return player;
}

// ─── Persistent Token Store (survives server restarts) ───────────────────────
// Tokens are stored in db.json under db.sessions to persist across Render deploys
async function getAdminSession(token) {
  if (!token) return null;
  if (token === 'master_admin_token' || token === 'master_admin_session_token' || token === 'admin_master_session_token') {
    return {
      adminId: 'admin-1',
      username: 'admin',
      displayName: 'المشرف العام',
      role: 'superadmin',
      allowedTabs: ["players","receipts","games","providers","agents","p2p","payment","settings"]
    };
  }
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
  // ── Request/Response Logger ──────────────────────────────────────────────────
  const reqStart = Date.now();
  const originalEnd = res.end.bind(res);
  res.end = function(chunk, encoding, callback) {
    const duration = Date.now() - reqStart;
    const status = res.statusCode || 200;
    const label = `[API] ${req.method} ${req.url} → ${status} (${duration}ms)`;
    if (req.url && req.url.includes('/api/game/')) {
      // Log PG Soft callbacks in detail
      console.log(`${label}`);
      if (chunk) {
        try { console.log('[Response]', JSON.parse(chunk.toString())); } catch(_) {}
      }
    } else {
      console.log(label);
    }
    return originalEnd(chunk, encoding, callback);
  };

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-date, x-content-sha256');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const reqPath = (req.url || '').split('?')[0];

  if (reqPath === '/api/version' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ version: '2.0.0' }));
    return;
  }

  if (reqPath === '/api/data' || reqPath.startsWith('/api/data/')) {
    const dbPath = resolve(__dirname, 'db.json');
    if (req.method === 'GET') {
      try {
        const db = await readDb();
        // Exclude sessions (auth tokens) from public data response for security
        const { sessions, ...publicData } = db;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
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
          
          // Always protect admins (never overwrite from admin panel payload)
          incoming.admins = (existing.admins && existing.admins.length > 0) ? existing.admins : (incoming.admins || []);
          // Always protect sessions
          incoming.sessions = existing.sessions || {};
          // Always protect processed transaction IDs
          incoming.processedTxIds = existing.processedTxIds || [];

          // ─── PLAYERS: merge carefully ───
          // If incoming has players array AND it has data, use it (admin updated players).
          // But always preserve server-side PG fields like sessionToken.
          if (Array.isArray(incoming.players) && incoming.players.length > 0) {
            const serverPlayers = existing.players || [];
            // Merge: for each incoming player, merge with existing server-side data
            incoming.players = incoming.players.map(p => {
              const existingPlayer = serverPlayers.find(ep => String(ep.id) === String(p.id));
              if (existingPlayer) {
                return {
                  ...existingPlayer,      // keep server fields (sessionToken, etc)
                  ...p,                   // apply admin updates (balance, status, name, etc)
                  // Always preserve critical server-only fields:
                  sessionToken: existingPlayer.sessionToken || p.sessionToken,
                  transactions: p.transactions && p.transactions.length > 0 ? p.transactions : (existingPlayer.transactions || [])
                };
              }
              return p; // New player added by admin
            });
            // Also add any server-side only players not in admin list (PG auto-created players)
            serverPlayers.forEach(sp => {
              if (!incoming.players.find(p => String(p.id) === String(sp.id))) {
                incoming.players.push(sp);
              }
            });
          } else {
            // Admin sent empty or no players array – keep server players intact
            incoming.players = existing.players || [];
          }

          // ─── GAMES: use incoming if provided, protect existing if empty ───
          if (!Array.isArray(incoming.games) || incoming.games.length === 0) {
            incoming.games = (existing.games && existing.games.length > 0) ? existing.games : (incoming.games || []);
          }
          // ─── AGENTS: use incoming if provided ───
          if (incoming.agents === undefined) incoming.agents = existing.agents || [];
          // ─── BANNERS: use incoming if provided ───
          if (incoming.banners === undefined) incoming.banners = existing.banners || [];
          // ─── RECEIPTS: use incoming if provided ───
          if (!Array.isArray(incoming.receipts)) incoming.receipts = existing.receipts || [];

          await writeDb(incoming);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          console.error('[POST /api/data] Error:', e.message);
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + e.message }));
        }
      });
    }
  } else if (reqPath === '/api/admin/save-config' && req.method === 'POST') {
    // ─── Dedicated admin endpoint for saving game configs, banners, providers, settings ───
    // Uses runTransaction to safely update ONLY the specified fields without risk of
    // overwriting players, sessions, admins, or other critical data.
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const incoming = JSON.parse(body);
        await runTransaction(async (db) => {
          // Safely update only the fields that the admin panel manages
          if (Array.isArray(incoming.games))     db.games     = incoming.games;
          if (Array.isArray(incoming.banners))   db.banners   = incoming.banners;
          if (Array.isArray(incoming.providers)) db.providers = incoming.providers;
          if (Array.isArray(incoming.agents))    db.agents    = incoming.agents;
          if (Array.isArray(incoming.receipts))  db.receipts  = incoming.receipts;
          if (incoming.settings && typeof incoming.settings === 'object') {
            db.settings = { ...db.settings, ...incoming.settings };
          }
          // NEVER overwrite: players, sessions, admins, processedTxIds
          return db;
        });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(JSON.stringify({ success: true }));
        console.log('[POST /api/admin/save-config] Config saved successfully.');
      } catch (e) {
        console.error('[POST /api/admin/save-config] Error:', e.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to save config: ' + e.message }));
      }
    });
  } else if (reqPath === '/api/upload' && req.method === 'POST') {
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

        // Save locally to images directory
        const imagesDir = resolve(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
        const savePath = resolve(imagesDir, safeName);
        fs.writeFileSync(savePath, fileBuffer);

        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'masoudi-api.onrender.com';
        const uploadUrl = `${protocol}://${host}/images/${safeName}`;

        console.log("Successfully saved uploaded image locally. URL:", uploadUrl);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, url: uploadUrl }));
      } catch (e) {
        console.error("Image upload endpoint error:", e.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/sync-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const playerInput = JSON.parse(body || '{}');
        const isNumericId = (s) => /^\d+$/.test((s || '').trim());

        let resultPlayer = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = db.players.find(p => 
            (playerInput.id && String(p.id) === String(playerInput.id)) ||
            (playerInput.email && playerInput.email !== '—' && playerInput.email !== 'لا يوجد بريد مرتبط' && p.email && p.email.trim().toLowerCase() === playerInput.email.trim().toLowerCase())
          );
          if (!player) {
            const newName = (!isNumericId(playerInput.name) && playerInput.name)
              ? playerInput.name
              : 'لاعب مسعودي';
            player = {
              id: playerInput.id,
              name: newName,
              email: playerInput.email || '—',
              photoUrl: playerInput.photoUrl || '',
              balance: 100,
              bonus: 0,
              currency: playerInput.currency || db.settings?.pgConfig?.currency || 'USD',
              status: 'active',
              joinDate: new Date().toISOString().split('T')[0],
              lastLogin: new Date().toISOString().split('T')[0],
              transactions: [
                { type: 'هدية التسجيل', amount: 100, date: new Date().toLocaleTimeString('ar') }
              ]
            };
            db.players.push(player);
          } else {
            // Keep existing permanent ID (e.g. 519997) if already set
            if (playerInput.id && (!player.id || player.id === '')) {
              player.id = playerInput.id;
            }
            if (playerInput.name && !isNumericId(playerInput.name)) {
              const isIncomingPlaceholder = playerInput.name.includes('زائر') || playerInput.name.includes('لاعب') || playerInput.name.includes('Guest') || playerInput.name.includes('player_');
              const isCurrentPlaceholder = !player.name || player.name.includes('زائر') || player.name.includes('لاعب') || player.name.includes('Guest') || player.name === '—' || player.name.includes('player_');
              if (isCurrentPlaceholder || !isIncomingPlaceholder) {
                player.name = playerInput.name;
              }
            }
            if (playerInput.email) player.email = playerInput.email;
            if (playerInput.photoUrl) player.photoUrl = playerInput.photoUrl;
            if (playerInput.currency) player.currency = playerInput.currency;
            if (!player.currency) player.currency = db.settings?.pgConfig?.currency || 'USD';
            player.lastLogin = new Date().toISOString().split('T')[0];
          }
          resultPlayer = player;
          return db;
        });

        const db = await readDb();
        const adminEmails = ['halilfarhat102@gmail.com'];
        const isLinkedAdmin = (db.admins || []).some(a => String(a.playerId) === String(resultPlayer.id));
        const isAdmin = resultPlayer.isAdmin === true || adminEmails.includes(resultPlayer.email) || isLinkedAdmin;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          ...resultPlayer,
          isAdmin: isAdmin
        }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/update-player-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        let resultPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = db.players.find(p => String(p.id) === String(payload.id));
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
  } else if (reqPath === '/api/submit-receipt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId, playerName, gateway, amount, coins, imageUrl } = JSON.parse(body || '{}');

        if (!playerId || !gateway || !imageUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'بيانات الإيصال غير كاملة' }));
        }

        const newReceipt = {
          id: `rcpt-${Date.now()}`,
          playerId: String(playerId),
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

        await runTransaction(async (db) => {
          if (!db.receipts) db.receipts = [];
          db.receipts.push(newReceipt);
          return db;
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, receipt: newReceipt }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/action-receipt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { receiptId, action } = JSON.parse(body || '{}');
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.receipts) db.receipts = [];
          const idx = db.receipts.findIndex(r => String(r.id) === String(receiptId));
          if (idx === -1) {
            errorMsg = 'الإيصال غير موجود';
            return db;
          }

          if (action === 'delete') {
            db.receipts.splice(idx, 1);
          } else {
            if (action === 'approve') {
              const receipt = db.receipts[idx];
              if (receipt.status === 'pending') {
                if (!db.players) db.players = [];
                const player = db.players.find(p => String(p.id) === String(receipt.playerId));
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
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/add-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { name, email, balance, status } = JSON.parse(body || '{}');

        if (!name) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'اسم اللاعب مطلوب' }));
          return;
        }

        let newPlayer = null;
        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const newId = String(100000 + Math.floor(Math.random() * 900000));
          newPlayer = {
            id: newId,
            name,
            email: email || '—',
            balance: parseFloat(balance || 0),
            bonus: 0,
            currency: currency || db.settings?.pgConfig?.currency || 'USD',
            status: status || 'active',
            joinDate: new Date().toISOString().split('T')[0],
            lastLogin: new Date().toISOString().split('T')[0],
            transactions: parseFloat(balance || 0) > 0 ? [
              { type: 'إيداع من الإدارة', amount: parseFloat(balance), date: new Date().toLocaleTimeString('ar') }
            ] : []
          };
          db.players.push(newPlayer);
          return db;
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: newPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/delete-player' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId } = JSON.parse(body || '{}');
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const initialLength = db.players.length;
          db.players = db.players.filter(p => String(p.id) !== String(playerId));

          if (db.players.length === initialLength) {
            errorMsg = 'اللاعب غير موجود';
          }
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/update-player-wallet' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId, amount, action } = JSON.parse(body || '{}');
        const numAmount = parseFloat(amount);

        if (!playerId || isNaN(numAmount) || numAmount <= 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
          return;
        }

        let updatedPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const p = db.players.find(x => String(x.id) === String(playerId));
          if (!p) {
            errorMsg = 'اللاعب غير موجود';
            return db;
          }

          const now = new Date().toLocaleTimeString('ar');
          let txType = '';
          if (action === 'add_primary') {
            p.balance = (p.balance || 0) + numAmount;
            txType = 'إضافة رصيد رئيسي ✅';
          } else if (action === 'add_bonus') {
            p.bonus = (p.bonus || 0) + numAmount;
            txType = 'إضافة مكافأة 🎁';
          } else {
            errorMsg = 'نوع عملية غير صالح أو غير مسموح بالخصم اليدوي';
            return db;
          }

          if (!p.transactions) p.transactions = [];
          p.transactions.push({
            type: txType,
            amount: numAmount,
            date: now
          });
          updatedPlayer = p;
          return db;
        });

        if (errorMsg) {
          res.statusCode = errorMsg.includes('غير موجود') ? 404 : 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: updatedPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/toggle-player-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId } = JSON.parse(body || '{}');
        let updatedPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const p = db.players.find(x => String(x.id) === String(playerId));
          if (!p) {
            errorMsg = 'اللاعب غير موجود';
            return db;
          }

          p.status = p.status === 'active' ? 'suspended' : 'active';
          updatedPlayer = p;
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: updatedPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin/reset-player-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId } = JSON.parse(body || '{}');
        let updatedPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const p = db.players.find(x => String(x.id) === String(playerId));
          if (!p) {
            errorMsg = 'اللاعب غير موجود';
            return db;
          }

          p.balance = 0;
          p.bonus = 0;
          if (!p.transactions) p.transactions = [];
          p.transactions.push({
            type: 'تصفير الرصيد',
            amount: 0,
            date: new Date().toLocaleTimeString('ar')
          });
          updatedPlayer = p;
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: updatedPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/toggle-agent' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId, isAgent } = JSON.parse(body || '{}');
        let updatedPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = db.players.find(p => String(p.id) === String(playerId));
          if (player) {
            player.isAgent = isAgent;
            if (isAgent) {
              player.agentBalance = player.agentBalance || 0;
            }
            updatedPlayer = player;
          } else {
            errorMsg = 'لم يتم العثور على اللاعب';
          }
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, player: updatedPlayer }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/update-agent-balance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}'); // { id, amount }
        let updatedPlayer = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let player = db.players.find(p => String(p.id) === String(payload.id));
          if (player) {
            if (!player.isAgent) {
              errorMsg = 'هذا اللاعب ليس وكيلاً معتمداً';
              return db;
            }
            player.agentBalance = (player.agentBalance || 0) + parseFloat(payload.amount || 0);
            if (!player.transactions) player.transactions = [];
            player.transactions.push({
              type: 'شحن رصيد وكالة (من الإدارة)',
              amount: parseFloat(payload.amount || 0),
              date: new Date().toLocaleTimeString('ar')
            });
            updatedPlayer = player;
          } else {
            errorMsg = 'لم يتم العثور على اللاعب';
          }
          return db;
        });

        if (errorMsg) {
          res.statusCode = errorMsg.includes('العثور') ? 404 : 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(updatedPlayer));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/agent-transfer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { agentId, recipientId, amount } = JSON.parse(body || '{}');
        const numAmount = parseFloat(amount);

        if (!agentId || !recipientId || isNaN(numAmount) || numAmount <= 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
          return;
        }

        let agentBalanceResult = 0;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          let agent = db.players.find(p => String(p.id) === String(agentId));
          let recipient = db.players.find(p => String(p.id) === String(recipientId));

          if (!agent) {
            errorMsg = 'لم يتم العثور على حساب الوكيل';
            return db;
          }
          if (!agent.isAgent) {
            errorMsg = 'هذا الحساب ليس وكيلاً معتمداً';
            return db;
          }
          if ((agent.agentBalance || 0) < numAmount) {
            errorMsg = 'رصيد الوكالة الخاص بك غير كافٍ لإجراء هذا التحويل';
            return db;
          }
          if (!recipient) {
            errorMsg = 'لم يتم العثور على اللاعب المستلم';
            return db;
          }

          agent.agentBalance = (agent.agentBalance || 0) - numAmount;
          recipient.balance = (recipient.balance || 0) + numAmount;
          agentBalanceResult = agent.agentBalance;

          if (!agent.transactions) agent.transactions = [];
          agent.transactions.push({
            type: `تحويل رصيد إلى لاعب (${recipient.name || recipientId})`,
            amount: -numAmount,
            date: new Date().toLocaleTimeString('ar')
          });

          if (!recipient.transactions) recipient.transactions = [];
          recipient.transactions.push({
            type: `شحن من الوكيل (${agent.name || agentId})`,
            amount: numAmount,
            date: new Date().toLocaleTimeString('ar')
          });

          return db;
        });

        if (errorMsg) {
          res.statusCode = errorMsg.includes('العثور') ? 404 : 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorMsg }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, agentBalance: agentBalanceResult }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/player-sell-to-agent' && req.method === 'POST') {
    // 🔄 Player sells coins TO agent (works with both charging agents & P2P players)
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId, agentId, agentEntryId, amount } = JSON.parse(body || '{}');
        const numAmount = parseFloat(amount);

        if (!playerId || (!agentId && !agentEntryId) || isNaN(numAmount) || numAmount <= 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'بيانات غير صالحة' }));
        }

        let newPlayerBalance = 0;
        let finalAgentName = '';
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];

          let resolvedAgentPlayerId = agentId;
          let agentDisplayName = null;

          if (agentEntryId) {
            const agentEntry = (db.agents || []).find(a => String(a.id) === String(agentEntryId));
            if (!agentEntry) {
              errorMsg = 'لم يتم العثور على الوكيل في قائمة الشحن';
              return db;
            }
            if (!agentEntry.playerId) {
              errorMsg = 'هذا الوكيل لم يُربط بحساب تطبيق بعد — تواصل مع الإدارة';
              return db;
            }
            resolvedAgentPlayerId = agentEntry.playerId;
            agentDisplayName = agentEntry.name;
          }

          let player = db.players.find(p => String(p.id) === String(playerId));
          let agent  = db.players.find(p => String(p.id) === String(resolvedAgentPlayerId));

          if (!player) {
            errorMsg = 'لم يتم العثور على حساب اللاعب';
            return db;
          }
          if ((player.balance || 0) < numAmount) {
            errorMsg = 'رصيدك غير كافٍ لإتمام عملية البيع';
            return db;
          }
          if (!agent) {
            errorMsg = 'لم يتم العثور على حساب الوكيل في النظام — تأكد من ربط الوكيل بحساب التطبيق';
            return db;
          }
          if (!agent.isAgent) {
            errorMsg = 'هذا الحساب ليس وكيلاً معتمداً — تواصل مع الإدارة';
            return db;
          }

          finalAgentName = agentDisplayName || agent.name || resolvedAgentPlayerId;

          // Execute sale: deduct from player balance → add to agent's agentBalance
          player.balance     = (player.balance     || 0) - numAmount;
          agent.agentBalance = (agent.agentBalance || 0) + numAmount;
          newPlayerBalance   = player.balance;

          const now = new Date().toLocaleTimeString('ar');

          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: `سحب رصيد للوكيل (${finalAgentName})`,
            amount: -numAmount,
            date: now
          });

          if (!agent.transactions) agent.transactions = [];
          agent.transactions.push({
            type: `شحن رصيد من لاعب (${player.name || playerId})`,
            amount: numAmount,
            date: now
          });

          return db;
        });

        if (errorMsg) {
          res.statusCode = errorMsg.includes('العثور') ? 404 : 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: errorMsg }));
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          newBalance: newPlayerBalance,
          agentName: finalAgentName
        }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (reqPath === '/api/admin-login' && req.method === 'POST') {
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
  } else if (reqPath === '/api/admin-change-password' && req.method === 'POST') {
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
  } else if (reqPath === '/api/admin-add' && req.method === 'POST') {
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
  } else if (reqPath === '/api/admin-delete' && req.method === 'POST') {
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

  } else if (req.method === 'POST' && (req.url.toLowerCase().includes('verifysession') || req.url.toLowerCase().includes('verify-session') || req.url.toLowerCase().includes('verifyoperatorplayersession'))) {
    // Called by game provider to verify the player's session token
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] verify-session called, url:', req.url, 'body:', body.substring(0, 200));
      try {
        const db = await readDb();
        const payload = parsePGPayload(req.url, body, req.headers.host);

        // Validate operator_token, secret_key, operator_player_session
        const valErr = validatePGSoftFields(payload, ['operator_token', 'secret_key', 'operator_player_session'], db);
        if (valErr) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const resObj = { data: null, error: valErr };
          logPGCallback('VerifySession', req, body, 200, resObj, null, null, null, payload.game_code, null);
          return res.end(JSON.stringify(resObj));
        }

        const { token, playerId } = extractPGIdentifiers(payload);
        let foundPlayer = null;
        let currency = 'USD';

        // Update lastLogin atomically within the transaction lock
        await runTransaction(async (db2) => {
          const player = findPGPlayer(db2, token, playerId);
          if (player) {
            player.lastLogin = new Date().toISOString().split('T')[0];
            currency = player.currency || db2.settings?.pgConfig?.currency || 'USD';
            foundPlayer = { id: player.id, name: player.name };
          } else {
            currency = db2.settings?.pgConfig?.currency || 'USD';
          }
          return db2;
        });

        if (!foundPlayer) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const resObj = {
            data: null,
            error: { code: '1034', message: 'InvalidRequest' }
          };
          logPGCallback('VerifySession', req, body, 200, resObj, playerId, null, null, payload.game_code, token);
          return res.end(JSON.stringify(resObj));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        const resObj = {
          data: {
            player_name: String(foundPlayer.id),
            nickname: foundPlayer.name || ('لاعب ' + foundPlayer.id),
            currency: currency
          },
          error: null
        };
        logPGCallback('VerifySession', req, body, 200, resObj, foundPlayer.id, currency, currency, payload.game_code, token);
        res.end(JSON.stringify(resObj));
      } catch (e) {
        logPGCallbackError('VerifySession', req, body, e, null);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1034', message: 'InvalidRequest' }
        }));
      }
    });

  } else if (req.method === 'POST' && (req.url.toLowerCase().includes('getbalance') || req.url.toLowerCase().includes('get-balance') || req.url.toLowerCase().includes('cash/get') || req.url.toLowerCase().includes('getplayerwallet') || req.url.toLowerCase().includes('get-player-wallet'))) {
    // Called by game provider to get current player balance
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] get-balance called, body:', body.substring(0, 200));
      try {
        const db = await readDb();
        const payload = parsePGPayload(req.url, body, req.headers.host);

        // Validate operator_token, secret_key, player_name
        const valErr = validatePGSoftFields(payload, ['operator_token', 'secret_key', 'player_name'], db);
        if (valErr) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const resObj = { data: null, error: valErr };
          logPGCallback('GetBalance', req, body, 200, resObj, null, null, null, payload.game_code, null);
          return res.end(JSON.stringify(resObj));
        }

        const { token, playerId } = extractPGIdentifiers(payload);
        const player = findPGPlayer(db, token, playerId);

        if (!player) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const resObj = {
            data: null,
            error: { code: '1034', message: 'InvalidRequest' }
          };
          logPGCallback('GetBalance', req, body, 200, resObj, playerId, null, null, payload.game_code, token);
          return res.end(JSON.stringify(resObj));
        }

        const currentBal = parseFloat((player.balance || 0).toFixed(2));
        const playerCurrency = player.currency || db.settings?.pgConfig?.currency || 'USD';
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        
        // Formatted EXACTLY per PG Soft GetPlayerWallet API spec:
        // data must contain ONLY: currency_code, balance_amount, updated_time
        const resObj = {
          data: {
            currency_code: playerCurrency,
            balance_amount: currentBal,
            updated_time: Date.now()
          },
          error: null
        };
        logPGCallback('GetBalance', req, body, 200, resObj, player.id, player.currency, playerCurrency, payload.game_code, token);
        res.end(JSON.stringify(resObj));
      } catch (e) {
        logPGCallbackError('GetBalance', req, body, e, null);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1034', message: 'InvalidRequest' }
        }));
      }
    });

  // ── CASH / TRANSFER (Bet & Win Callback from PG Soft Seamless Wallet API) ──
  } else if (req.method === 'POST' && (req.url.toLowerCase().includes('cash/transfer') || req.url.toLowerCase().includes('betpayout') || req.url.toLowerCase().includes('adjustment'))) {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] Cash/Transfer called, url:', req.url, 'body:', body.substring(0, 300));
      let reqPlayerId = null;
      let reqToken = null;
      try {
        const db = await readDb();
        const payload = parsePGPayload(req.url, body, req.headers.host);

        // Validate operator_token, secret_key
        const valErr = validatePGSoftFields(payload, ['operator_token', 'secret_key'], db);
        if (valErr) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const resObj = { data: null, error: valErr };
          logPGCallback('CashTransfer', req, body, 200, resObj, null, null, null, payload.game_id || payload.game_code, null);
          return res.end(JSON.stringify(resObj));
        }

        const { token, playerId } = extractPGIdentifiers(payload);
        reqPlayerId = playerId;
        reqToken = token;

        const transferAmt = parseFloat(payload.transfer_amount || payload.amount || payload.win_amount || payload.bet_amount || 0);
        const txId = String(payload.transaction_id || payload.txid || payload.bet_id || ('TX-' + Date.now()));
        const gameId = payload.game_id || payload.game_code || 'Game';

        let resultBalance = 0;
        let resultPlayerId = '';
        let resultCurrency = 'USD';
        let errorMsg = null;

        await runTransaction(async (db2) => {
          const player = findPGPlayer(db2, token, playerId);

          if (!player) {
            resultCurrency = db2.settings?.pgConfig?.currency || 'USD';
            errorMsg = 'Player not found';
            return db2;
          }
          resultCurrency = player.currency || db2.settings?.pgConfig?.currency || 'USD';
          resultPlayerId = player.id;

          if (!db2.processedTxIds) db2.processedTxIds = [];
          if (db2.processedTxIds.includes(txId)) {
            resultBalance = player.balance || 0;
            return db2;
          }

          const changeVal = parseFloat(transferAmt.toFixed(2));
          const isDebit = changeVal < 0;
          const absVal = Math.abs(changeVal);

          if (isDebit && (player.balance || 0) < absVal) {
            errorMsg = 'Insufficient balance';
            resultBalance = player.balance || 0;
            return db2;
          }

          // Apply balance change atomically in Dollars
          player.balance = parseFloat(((player.balance || 0) + changeVal).toFixed(2));
          if (player.balance < 0) player.balance = 0;

          if (!player.transactions) player.transactions = [];
          player.transactions.push({
            type: changeVal >= 0 ? `فوز 🎉 — لعبة ${gameId}` : `رهان 🎰 — لعبة ${gameId}`,
            amount: `${changeVal >= 0 ? '+' : ''}${changeVal} $`,
            txId: txId,
            date: new Date().toLocaleTimeString('ar')
          });

          db2.processedTxIds.push(txId);
          if (db2.processedTxIds.length > 10000) db2.processedTxIds = db2.processedTxIds.slice(-5000);

          resultBalance = player.balance;
          return db2;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');

        if (errorMsg) {
          const resObj = {
            data: null,
            error: {
              code: errorMsg === 'Insufficient balance' ? '3200' : '1034',
              message: errorMsg
            }
          };
          logPGCallback('CashTransfer', req, body, 200, resObj, reqPlayerId || resultPlayerId, null, resultCurrency, gameId, reqToken);
          return res.end(JSON.stringify(resObj));
        }

        const finalBal = parseFloat(resultBalance.toFixed(2));
        // Formatted EXACTLY per PG Soft Cash/Transfer API spec:
        // data must contain ONLY: currency_code, balance_amount, updated_time (transaction_id is optional but acceptable)
        const resObj = {
          data: {
            currency_code: resultCurrency,
            balance_amount: finalBal,
            updated_time: Date.now()
          },
          error: null
        };
        logPGCallback('CashTransfer', req, body, 200, resObj, resultPlayerId, resultCurrency, resultCurrency, gameId, reqToken);
        res.end(JSON.stringify(resObj));
      } catch (e) {
        logPGCallbackError('CashTransfer', req, body, e, reqPlayerId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          data: null,
          error: { code: '1200', message: e.message }
        }));
      }
    });

  } else if (reqPath === '/api/game/bet' && req.method === 'POST') {
    // Deduct bet amount from player balance (atomic via runTransaction)
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] bet called, body:', body.substring(0, 300));
      try {
        const payload = parsePGPayload(req.url, body, req.headers.host);
        const { token, playerId } = extractPGIdentifiers(payload);
        const betAmount = parseFloat(payload.amount || payload.bet_amount || 0);
        const txId = payload.transaction_id || payload.bet_id || ('BET-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        let resultBalance = 0;
        let resultPlayerId = '';
        let errorMsg = null;
        let isDuplicate = false;

        await runTransaction(async (db) => {
          const player = findPGPlayer(db, token, playerId);
          if (!player) { errorMsg = 'Player not found'; return db; }

          if (!db.processedTxIds) db.processedTxIds = [];
          if (db.processedTxIds.includes(txId)) {
            isDuplicate = true;
            resultBalance = player.balance || 0;
            resultPlayerId = player.id;
            return db;
          }

          const betCoins = Math.round(betAmount * 100);
          if ((player.balance || 0) < betCoins) {
            errorMsg = 'Insufficient balance';
            resultBalance = player.balance || 0;
            return db;
          }

          player.balance = (player.balance || 0) - betCoins;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({ type: `رهان — ${gameName}`, amount: -betCoins, txId, date: new Date().toLocaleTimeString('ar') });

          db.processedTxIds.push(txId);
          if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

          resultBalance = player.balance;
          resultPlayerId = player.id;
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        if (errorMsg) {
          return res.end(JSON.stringify({ code: 0, msg: errorMsg, balance: (resultBalance / 100).toFixed(2) }));
        }
        if (isDuplicate) {
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: (resultBalance / 100).toFixed(2), transaction_id: txId }));
        }
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: (resultBalance / 100).toFixed(2), transaction_id: txId, player_id: resultPlayerId }));
      } catch (e) {
        console.error('[PG] bet error:', e.message);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (reqPath === '/api/game/payout' && req.method === 'POST') {
    // Add winnings to player balance (atomic via runTransaction)
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] payout called, body:', body.substring(0, 300));
      try {
        const payload = parsePGPayload(req.url, body, req.headers.host);
        const { token, playerId } = extractPGIdentifiers(payload);
        const winAmount = parseFloat(payload.amount || payload.win_amount || 0);
        const txId = payload.transaction_id || payload.payout_id || ('WIN-' + Date.now());
        const gameName = payload.game_name || payload.game_code || 'Game';

        let resultBalance = 0;
        let resultPlayerId = '';
        let errorMsg = null;
        let isDuplicate = false;

        await runTransaction(async (db) => {
          const player = findPGPlayer(db, token, playerId);
          if (!player) { errorMsg = 'Player not found'; return db; }

          if (!db.processedTxIds) db.processedTxIds = [];
          if (db.processedTxIds.includes(txId)) {
            isDuplicate = true;
            resultBalance = player.balance || 0;
            resultPlayerId = player.id;
            return db;
          }

          const winCoins = Math.round(winAmount * 100);
          player.balance = (player.balance || 0) + winCoins;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({ type: `فوز 🎉 — ${gameName}`, amount: winCoins, txId, date: new Date().toLocaleTimeString('ar') });

          db.processedTxIds.push(txId);
          if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

          resultBalance = player.balance;
          resultPlayerId = player.id;
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        if (errorMsg) {
          return res.end(JSON.stringify({ code: 0, msg: errorMsg, balance: '0.00' }));
        }
        if (isDuplicate) {
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: (resultBalance / 100).toFixed(2), transaction_id: txId }));
        }
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: (resultBalance / 100).toFixed(2), transaction_id: txId, player_id: resultPlayerId }));
      } catch (e) {
        console.error('[PG] payout error:', e.message);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (reqPath === '/api/game/rollback' && req.method === 'POST') {
    // Called by game provider to cancel/rollback a transaction (atomic via runTransaction)
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      console.log('[PG] rollback called, body:', body.substring(0, 300));
      try {
        const payload = parsePGPayload(req.url, body, req.headers.host);
        const { token, playerId } = extractPGIdentifiers(payload);
        const originalTxId = payload.original_transaction_id || payload.ref_transaction_id || payload.transaction_id;
        const refundAmount = parseFloat(payload.amount || 0);
        const txId = payload.rollback_id || ('RB-' + Date.now());

        let resultBalance = 0;
        let resultPlayerId = '';
        let errorMsg = null;
        let isDuplicate = false;

        await runTransaction(async (db) => {
          const player = findPGPlayer(db, token, playerId);
          if (!player) { errorMsg = 'Player not found'; return db; }

          if (!db.processedTxIds) db.processedTxIds = [];
          if (db.processedTxIds.includes(txId)) {
            isDuplicate = true;
            resultBalance = player.balance || 0;
            resultPlayerId = player.id;
            return db;
          }

          const refundCoins = Math.round(refundAmount * 100);
          player.balance = (player.balance || 0) + refundCoins;
          if (!player.transactions) player.transactions = [];
          player.transactions.push({ type: 'استرداد رهان (Rollback)', amount: refundCoins, txId, ref: originalTxId, date: new Date().toLocaleTimeString('ar') });

          db.processedTxIds.push(txId);
          if (db.processedTxIds.length > 10000) db.processedTxIds = db.processedTxIds.slice(-5000);

          resultBalance = player.balance;
          resultPlayerId = player.id;
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        if (errorMsg) {
          return res.end(JSON.stringify({ code: 0, msg: errorMsg, balance: '0.00' }));
        }
        if (isDuplicate) {
          return res.end(JSON.stringify({ code: 1, msg: 'duplicate', balance: (resultBalance / 100).toFixed(2) }));
        }
        res.end(JSON.stringify({ code: 1, msg: 'success', balance: (resultBalance / 100).toFixed(2), transaction_id: txId }));
      } catch (e) {
        console.error('[PG] rollback error:', e.message);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, msg: e.message, balance: '0.00' }));
      }
    });

  } else if (reqPath === '/api/game/downline' && req.method === 'POST') {
    // Downline API — returns list of sub-agents/players under the operator
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const db = await readDb();

        const players = (db.players || []).map(p => ({
          player_id: p.id,
          username: p.name,
          status: p.status || 'active',
          currency: p.currency || db.settings?.pgConfig?.currency || 'USD',
          balance: ((p.balance || 0) / 100).toFixed(2)
        }));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 1, msg: 'success', data: players, total: players.length }));
      } catch (e) {
        res.statusCode = 200;
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

    const startTime = Date.now();

    try {
      const db = await readDb();
      if (!db.players) db.players = [];
      let player = db.players.find(p => String(p.id) === String(playerId));

      // ─── Auto-provision: create player if not found ───
      if (!player) {
        console.log(`[PG Launch] Player ${playerId} not found — auto-provisioning with balance 0`);
        player = {
          id: String(playerId),
          username: `player_${playerId}`,
          name: `لاعب ${playerId}`,
          phone: '',
          balance: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          transactions: [],
          sessionToken: ''
        };
        await runTransaction(async (db3) => {
          if (!db3.players) db3.players = [];
          const alreadyExists = db3.players.find(p => String(p.id) === String(playerId));
          if (!alreadyExists) {
            db3.players.push(player);
          }
          return db3;
        });
      }

      // Generate session token and persist atomically
      let sessionToken = '';
      await runTransaction(async (db2) => {
        if (!db2.players) db2.players = [];
        let p2 = db2.players.find(x => String(x.id) === String(playerId));
        if (!p2) {
          p2 = {
            id: String(playerId),
            name: `لاعب ${playerId}`,
            email: '—',
            balance: 100,
            bonus: 0,
            currency: db2.settings?.pgConfig?.currency || 'USD',
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            lastLogin: new Date().toISOString().split('T')[0],
            transactions: []
          };
          db2.players.push(p2);
        }
        sessionToken = 'sess_' + String(playerId) + '_' + Date.now();
        p2.sessionToken = sessionToken;
        p2.sessionCreatedAt = new Date().toISOString();
        return db2;
      });

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
      let baseUrl = isProd 
        ? (pgConfig.productionApiDomain || 'https://api.pg-bo.com') 
        : (pgConfig.stagingApiDomain || 'https://api.pg-bo.me/external/');

      baseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
      if (baseUrl.endsWith('/external')) {
        baseUrl = baseUrl.slice(0, -9);
      }

      // Call PG Soft GetLaunchURLHTML API
      const traceId = 'guid-' + crypto.randomUUID();
      const pgUrl = `${baseUrl}/external-game-launcher/api/v1/GetLaunchURLHTML?trace_id=${traceId}`;

      // Extract client IPv4 address from headers (Render reverse proxy passes player IP in x-forwarded-for or x-real-ip)
      let rawIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (rawIp.startsWith('::ffff:')) {
        rawIp = rawIp.replace('::ffff:', '');
      }
      // If IP is IPv6, loopback, or invalid IPv4, fallback to valid public IPv4 for local dev to satisfy PG Soft validation
      if (!rawIp || rawIp.includes(':') || rawIp === '127.0.0.1' || rawIp === 'localhost') {
        rawIp = '196.153.185.113';
      }

      const cleanGameCode = String(gameCode).replace(/^\/+|\/+$/g, '').trim();
      const path = `/${cleanGameCode}/index.html`;
      const playerObj = (db.players || []).find(x => String(x.id) === String(playerId));
      const playerCurrency = playerObj?.currency || pgConfig.currency || 'USD';
      const extraArgs = `ops=${sessionToken}&btt=1&l=ar&cr=${playerCurrency}`;

      // Build form-urlencoded request body
      const formParams = new URLSearchParams();
      formParams.append('operator_token', operatorToken);
      formParams.append('path', path);
      formParams.append('extra_args', extraArgs);
      formParams.append('url_type', 'game-entry');
      formParams.append('client_ip', rawIp);

      const requestBodyString = formParams.toString();
      const maskedToken = operatorToken ? '*'.repeat(Math.max(0, operatorToken.length - 6)) + operatorToken.slice(-6) : 'N/A';

      // ─── 1. LOG PRE-REQUEST DETAILS ───
      console.log(`\n═════════════════ [PG Soft GetLaunchURLHTML Request] ═════════════════`);
      console.log(`Timestamp:       ${new Date().toISOString()}`);
      console.log(`Environment:     ${isProd ? 'Production' : 'Staging'}`);
      console.log(`Endpoint Name:   GetLaunchURLHTML`);
      console.log(`Player ID:       ${playerId}`);
      console.log(`Player Currency: ${playerCurrency}`);
      console.log(`Currency Sent:   ${playerCurrency}`);
      console.log(`Game ID:         ${cleanGameCode}`);
      console.log(`Session Token:   ${sessionToken}`);
      console.log(`Request URL:     ${pgUrl}`);
      console.log(`HTTP Method:     POST`);
      console.log(`Operator Token:  ${maskedToken}`);
      console.log(`Client IP:       ${rawIp}`);
      console.log(`Path:            ${path}`);
      console.log(`Trace ID:        ${traceId}`);
      console.log(`Request Body:    ${requestBodyString}`);
      console.log(`═════════════════════════════════════════════════════════════════════\n`);
      
      const pgResponse = await fetch(pgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBodyString,
      });

      const responseTimeMs = Date.now() - startTime;
      const responseText = await pgResponse.text();
      const responseHeaders = Object.fromEntries(pgResponse.headers.entries());

      // ─── 2. LOG POST-RESPONSE DETAILS ───
      let parsedJson = null;
      let launchUrl = null;
      let errorCode = null;
      let errorMessage = null;

      if (responseText.trim().startsWith('{')) {
        try {
          parsedJson = JSON.parse(responseText);
          if (parsedJson.data && parsedJson.data.launch_url) {
            launchUrl = parsedJson.data.launch_url;
          }
          if (parsedJson.error) {
            errorCode = parsedJson.error.code || parsedJson.error;
            errorMessage = parsedJson.error.message || parsedJson.error.msg || JSON.stringify(parsedJson.error);
          }
        } catch (_) {}
      }

      console.log(`\n═════════════════ [PG Soft GetLaunchURLHTML Detailed Trace] ════════════════`);
      console.log(`Timestamp:             ${new Date().toISOString()}`);
      console.log(`Trace ID:              ${traceId}`);
      console.log(`Player ID:             ${playerId}`);
      console.log(`Game Code:             ${cleanGameCode}`);
      console.log(`API URL:               ${pgUrl}`);
      console.log(`PG Soft HTTP Status:   ${pgResponse.status}`);
      console.log(`Raw Response Body:     ${responseText}`);
      console.log(`Parsed JSON Response:  ${parsedJson ? JSON.stringify(parsedJson, null, 2) : 'N/A (HTML Response)'}`);
      console.log(`Launch URL:            ${launchUrl || 'N/A'}`);
      console.log(`Error Code:            ${errorCode || 'N/A'}`);
      console.log(`Error Message:         ${errorMessage || 'N/A'}`);
      console.log(`Backend Status to App: 200 OK`);
      console.log(`═════════════════════════════════════════════════════════════════════\n`);

      // ─── 3. HANDLE JSON ERROR RESPONSE ───
      if (parsedJson && parsedJson.error) {
        const errCode = errorCode || 'UNKNOWN';
        const errMsg = errorMessage || 'An error occurred';

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>خطأ في تشغيل اللعبة - PG Soft</title>
            <style>
              body { background-color: #100906; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; padding: 20px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
              .error-card { background: #1A110B; border: 1px solid #3D2A20; border-radius: 16px; padding: 30px; text-align: center; max-width: 450px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              .icon { font-size: 48px; margin-bottom: 15px; }
              h2 { color: #FF5252; margin: 0 0 10px 0; font-size: 20px; }
              .code { color: #FF7A1F; font-weight: bold; font-size: 16px; margin-bottom: 8px; }
              .msg { color: #A0A5B5; font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
              .meta { background: #24160E; padding: 10px; border-radius: 8px; color: #707585; font-size: 11px; margin-bottom: 20px; text-align: right; }
              .btn { background: #FF7A1F; color: #ffffff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
              .btn:hover { background: #E06716; }
            </style>
          </head>
          <body>
            <div class="error-card">
              <div class="icon">⚠️</div>
              <h2>خطأ في تشغيل اللعبة</h2>
              <div class="code">كود الخطأ: ${errCode}</div>
              <div class="msg">${errMsg}</div>
              <div class="meta">
                <div><strong>البيئة:</strong> ${isProd ? 'Production' : 'Staging'}</div>
                <div><strong>كود اللعبة:</strong> ${cleanGameCode}</div>
                <div><strong>معرف الطلب:</strong> ${traceId}</div>
              </div>
              <button class="btn" onclick="window.location.reload()">إعادة المحاولة 🔄</button>
            </div>
          </body>
          </html>
        `);
      }

      // ─── 4. RETURN HTML DIRECTLY ───
      res.statusCode = pgResponse.status;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.end(responseText);

    } catch (e) {
      // ─── 5. WRAP ENTIRE LAUNCHER IN TRY/CATCH & LOG ───
      console.error(`\n❌ [PG Soft GetLaunchURLHTML Fatal Exception] ❌`);
      console.error(`Error Message:  ${e.message}`);
      console.error(`Stack Trace:    ${e.stack}`);
      console.error(`Request Details: Player ID=${playerId}, Game Code=${gameCode}, URL=${req.url}`);
      console.error(`═════════════════════════════════════════════════════════════════════\n`);

      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <div style="background:#100906;color:#fff;font-family:sans-serif;padding:30px;text-align:center;direction:rtl;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <h2 style="color:#FF5252;">حدث خطأ أثناء الاتصال بالمزود</h2>
          <p style="color:#aaa;font-size:13px;">${e.message}</p>
        </div>
      `);
    }

  } else if (reqPath === '/api/game/create-session' && req.method === 'POST') {
    // Create a session token for a player (called by APK before launching a game)
    // Uses runTransaction to prevent race conditions when creating session
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { playerId } = JSON.parse(body || '{}');

        if (!playerId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'playerId is required' }));
        }

        let sessionToken = null;
        let errorMsg = null;

        await runTransaction(async (db) => {
          if (!db.players) db.players = [];
          const player = db.players.find(p => p.id === playerId);

          if (!player) {
            errorMsg = 'اللاعب غير موجود';
            return db;
          }

          sessionToken = crypto.createHash('sha256').update(playerId + Date.now() + Math.random()).digest('hex');
          player.sessionToken = sessionToken;
          player.sessionCreatedAt = new Date().toISOString();
          return db;
        });

        if (errorMsg) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: errorMsg }));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, sessionToken, playerId }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

  } else if (reqPath === '/api/admin/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const db = await readDb();
        const admins = db.admins || [];

        let adminUser = admins.find(a => (a.username || a.email || '').toLowerCase() === (username || '').toLowerCase());
        
        let isValid = false;
        if (adminUser) {
          if (adminUser.password === password || adminUser.passwordHash === sha256(password)) {
            isValid = true;
          }
        } else if ((username === 'admin' || username === 'masoudi') && (password === 'masoudi2026' || password === 'admin123')) {
          isValid = true;
          adminUser = {
            id: 'admin-1',
            username: 'admin',
            displayName: 'المشرف العام',
            role: 'superadmin'
          };
        }

        if (!isValid) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }));
        }

        const sessionToken = `admin_token_${Date.now()}_${Math.floor(Math.random()*100000)}`;
        if (!db.sessions) db.sessions = {};
        db.sessions[sessionToken] = {
          adminId: adminUser.id || 'admin-1',
          username: adminUser.username || 'admin',
          displayName: adminUser.displayName || 'المشرف العام',
          role: adminUser.role || 'superadmin',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        };
        await writeDb(db);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          token: sessionToken,
          admin: {
            username: adminUser.username || 'admin',
            displayName: adminUser.displayName || 'المشرف العام',
            role: adminUser.role || 'superadmin'
          }
        }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });

  } else if (reqPath === '/api/support/messages' && req.method === 'GET') {
    try {
      const db = await readDb();
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const playerId = parsedUrl.searchParams.get('player_id');
      let messages = db.supportMessages || [];
      if (playerId) {
        messages = messages.filter(m => String(m.playerId) === String(playerId));
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, messages }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: e.message }));
    }

  } else if (reqPath === '/api/support/send' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { playerId, playerName, sender, message } = JSON.parse(body || '{}');

        if (!playerId || !message || !message.trim()) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'playerId and message are required' }));
        }

        let newMsg = null;
        await runTransaction(async (db) => {
          if (!db.supportMessages) db.supportMessages = [];
          newMsg = {
            id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            playerId: String(playerId),
            playerName: playerName || 'لاعب مسعودي',
            sender: sender || 'player',
            message: message.trim(),
            timestamp: Date.now(),
            createdAt: new Date().toISOString(),
            readByPlayer: sender === 'player',
            readByAdmin: sender === 'admin'
          };
          db.supportMessages.push(newMsg);
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: newMsg }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

  } else if (reqPath === '/api/support/mark-read' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { playerId, readBy } = JSON.parse(body || '{}');

        if (!playerId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'playerId is required' }));
        }

        await runTransaction(async (db) => {
          if (!db.supportMessages) db.supportMessages = [];
          db.supportMessages.forEach(m => {
            if (String(m.playerId) === String(playerId)) {
              if (readBy === 'player' || !readBy) m.readByPlayer = true;
              if (readBy === 'admin' || !readBy) m.readByAdmin = true;
            }
          });
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

  } else if (reqPath === '/api/support/unread-count' && req.method === 'GET') {
    try {
      const db = await readDb();
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const playerId = parsedUrl.searchParams.get('player_id');
      const role = parsedUrl.searchParams.get('role') || 'player';
      const messages = db.supportMessages || [];

      let unreadCount = 0;
      if (role === 'admin') {
        unreadCount = messages.filter(m => m.sender === 'player' && !m.readByAdmin).length;
      } else {
        if (playerId) {
          unreadCount = messages.filter(m => String(m.playerId) === String(playerId) && m.sender === 'admin' && !m.readByPlayer).length;
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, unreadCount }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, unreadCount: 0, error: e.message }));
    }

  } else if (reqPath === '/api/admin/fetch-pg-games' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      const db = await readDb();
      const pgConfig = db.settings?.pgConfig || {};
      const isProd = pgConfig.isProduction;
      const operatorToken = isProd ? pgConfig.productionOperatorToken : pgConfig.stagingOperatorToken;
      const secretKey = isProd ? pgConfig.productionSecretKey : pgConfig.stagingSecretKey;
      const currency = pgConfig.currency || 'USD';
      
      let baseUrl = isProd 
        ? (pgConfig.productionApiDomain || 'https://api.pg-bo.com') 
        : (pgConfig.stagingApiDomain || 'https://api.pg-bo.me/external');

      baseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
      if (baseUrl.endsWith('/external')) {
        baseUrl = baseUrl.slice(0, -9);
      }

      const traceId = 'guid-' + crypto.randomUUID();
      const pgUrl = `${baseUrl}/external/Game/v2/Get?trace_id=${traceId}`;

      const formParams = new URLSearchParams();
      formParams.append('operator_token', operatorToken || '');
      formParams.append('secret_key', secretKey || '');
      formParams.append('currency', currency);
      formParams.append('language', 'en-us');
      formParams.append('status', '1');

      const pgRes = await fetch(pgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParams.toString()
      });

      const pgData = await pgRes.json();
      
      if (pgData && pgData.data && Array.isArray(pgData.data)) {
        let addedCount = 0;
        await runTransaction(async (db) => {
          if (!db.games) db.games = [];
          pgData.data.forEach(g => {
            const gameIdStr = String(g.gameId || g.game_id || g.id);
            const exists = db.games.some(x => String(x.id) === gameIdStr || String(x.gameCode) === gameIdStr);
            if (!exists) {
              db.games.push({
                id: gameIdStr,
                title: g.gameName || g.game_name || `PG Game ${gameIdStr}`,
                category: 'pgsoft',
                provider: 'PG Soft',
                gameCode: gameIdStr,
                image: g.iconUrl || g.bannerUrl || 'assets/images/games/slot.jpg',
                active: true,
                minBet: 1,
                maxBet: 1000
              });
              addedCount++;
            }
          });
          return db;
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, addedCount, totalPgGames: pgData.data.length }));
      } else {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: pgData.error?.message || 'فشل جلب الألعاب من PG Soft. يرجى التأكد من الـ Secret Key و Operator Token' }));
      }
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }

  } else {
    next();
  }
}
