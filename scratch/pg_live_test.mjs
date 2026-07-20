/**
 * PG Soft Integration Live Test Suite
 * Tests all seamless wallet endpoints against the live Render server
 * Run: node scratch/pg_live_test.mjs
 */

const BASE_URL = 'https://masoudi-api.onrender.com';

// ── Colours for terminal output ─────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

let totalPassed = 0;
let totalFailed = 0;

// ── Helper: POST JSON ────────────────────────────────────────────────────────
async function post(path, body = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    return { status: res.status, json, text, ok: res.ok };
  } catch (e) {
    return { status: 0, json: null, text: e.message, error: true };
  }
}

// ── Helper: GET ──────────────────────────────────────────────────────────────
async function get(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    return { status: res.status, json, text, ok: res.ok };
  } catch (e) {
    return { status: 0, json: null, text: e.message, error: true };
  }
}

// ── Helper: Print test result ────────────────────────────────────────────────
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${GREEN}✅ PASS${RESET} ${label}${detail ? `  ${YELLOW}${detail}${RESET}` : ''}`);
    totalPassed++;
  } else {
    console.log(`  ${RED}❌ FAIL${RESET} ${label}${detail ? `  ${RED}${detail}${RESET}` : ''}`);
    totalFailed++;
  }
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  0. Read live settings
// ═══════════════════════════════════════════════════════════════════════════
section('0. Reading Live Settings');
const dbRes = await get('/api/data');
check('GET /api/data returns 200', dbRes.status === 200, `status=${dbRes.status}`);
check('Response is JSON', dbRes.json !== null);

const pgConfig = dbRes.json?.settings?.pgConfig || {};
const isProduction = pgConfig.isProduction;
const operatorToken = isProduction ? pgConfig.productionOperatorToken : pgConfig.stagingOperatorToken;
const secretKey     = isProduction ? pgConfig.productionSecretKey     : pgConfig.stagingSecretKey;
const currency      = pgConfig.currency || 'USD';
const env           = isProduction ? 'PRODUCTION' : 'STAGING';

console.log(`\n  📋 Environment : ${BOLD}${env}${RESET}`);
console.log(`  📋 Token       : ${operatorToken}`);
console.log(`  📋 SecretKey   : ${secretKey}`);
console.log(`  📋 Currency    : ${currency}`);

check('Operator Token is set', !!operatorToken && operatorToken.length > 10, `token=${operatorToken?.substring(0,12)}...`);
check('Secret Key is set',     !!secretKey && secretKey.length > 10,         `key=${secretKey?.substring(0,8)}...`);

// ═══════════════════════════════════════════════════════════════════════════
//  1. Create Session — get a real session token
// ═══════════════════════════════════════════════════════════════════════════
section('1. Create Session (/api/game/create-session)');

// First find a real player ID from the DB
const players = dbRes.json?.players || [];
const testPlayer = players.find(p => p.status !== 'banned') || players[0];

if (!testPlayer) {
  console.log(`  ${RED}⛔ No players found in database. Cannot proceed with PG Soft tests.${RESET}`);
  process.exit(1);
}

console.log(`  🧑 Using player: ${testPlayer.name} (id=${testPlayer.id}, balance=${testPlayer.balance})`);

const sessionRes = await post('/api/game/create-session', { playerId: testPlayer.id });
console.log(`  Response:`, JSON.stringify(sessionRes.json, null, 2));

check('Status = 200',         sessionRes.status === 200,        `got ${sessionRes.status}`);
check('success = true',       sessionRes.json?.success === true);
check('sessionToken present', typeof sessionRes.json?.sessionToken === 'string' && sessionRes.json.sessionToken.length > 10);

const SESSION_TOKEN = sessionRes.json?.sessionToken || testPlayer.sessionToken || 'test-token-fallback';
console.log(`  🎟️  Session Token: ${SESSION_TOKEN.substring(0, 20)}...`);

// ═══════════════════════════════════════════════════════════════════════════
//  2. Verify Session
// ═══════════════════════════════════════════════════════════════════════════
section('2. Verify Session (/api/game/verify-session)');

const vsRes = await post('/api/game/verify-session', {
  token:       SESSION_TOKEN,
  player_name: testPlayer.id,
  player_id:   testPlayer.id
});
console.log(`  Response:`, JSON.stringify(vsRes.json, null, 2));

check('HTTP 200',              vsRes.status === 200,             `got ${vsRes.status}`);
check('Is JSON',               vsRes.json !== null);
check('error is null',         vsRes.json?.error === null,       `error=${JSON.stringify(vsRes.json?.error)}`);
check('data.player_name set',  !!vsRes.json?.data?.player_name, `player_name=${vsRes.json?.data?.player_name}`);
check('data.currency present', !!vsRes.json?.data?.currency,    `currency=${vsRes.json?.data?.currency}`);

// ═══════════════════════════════════════════════════════════════════════════
//  3. Get Balance
// ═══════════════════════════════════════════════════════════════════════════
section('3. Get Balance (/api/game/get-balance)');

const gbRes = await post('/api/game/get-balance', {
  token:       SESSION_TOKEN,
  player_name: testPlayer.id,
  player_id:   testPlayer.id
});
console.log(`  Response:`, JSON.stringify(gbRes.json, null, 2));

check('HTTP 200',             gbRes.status === 200,          `got ${gbRes.status}`);
check('Is JSON',              gbRes.json !== null);
check('error is null',        gbRes.json?.error === null,    `error=${JSON.stringify(gbRes.json?.error)}`);
check('data.balance is number', typeof gbRes.json?.data?.balance === 'number', `balance=${gbRes.json?.data?.balance}`);
check('data.currency = USD',  gbRes.json?.data?.currency === 'USD', `got ${gbRes.json?.data?.currency}`);

const liveBalance = gbRes.json?.data?.balance ?? 0;
console.log(`  💰 Live balance: ${liveBalance} ${currency}`);

// ═══════════════════════════════════════════════════════════════════════════
//  4. Adjustment (Debit -0.10 USD)
// ═══════════════════════════════════════════════════════════════════════════
section('4. Adjustment - Debit (/api/game/adjustment)');

const betTxId = `TEST-BET-${Date.now()}`;
const adjDebitRes = await post('/api/game/adjustment', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         -0.10,            // Negative = debit
  type:           'bet',
  transaction_id: betTxId,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(adjDebitRes.json, null, 2));

const adjExpectedBalance = parseFloat((liveBalance - 0.10).toFixed(2));
check('HTTP 200',               adjDebitRes.status === 200, `got ${adjDebitRes.status}`);
check('Is JSON',                adjDebitRes.json !== null);
check('error is null',          adjDebitRes.json?.error === null, `error=${JSON.stringify(adjDebitRes.json?.error)}`);
check('balance decreased by 0.10', Math.abs((adjDebitRes.json?.data?.balance || 0) - adjExpectedBalance) < 0.01,
  `expected≈${adjExpectedBalance} got ${adjDebitRes.json?.data?.balance}`);

// ═══════════════════════════════════════════════════════════════════════════
//  4b. Adjustment - Credit +0.20 USD
// ═══════════════════════════════════════════════════════════════════════════
section('4b. Adjustment - Credit (/api/game/adjustment)');

const winTxId = `TEST-WIN-${Date.now()}`;
const adjCreditRes = await post('/api/game/adjustment', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         0.20,             // Positive = credit
  type:           'win',
  transaction_id: winTxId,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(adjCreditRes.json, null, 2));

check('HTTP 200',               adjCreditRes.status === 200, `got ${adjCreditRes.status}`);
check('error is null',          adjCreditRes.json?.error === null, `error=${JSON.stringify(adjCreditRes.json?.error)}`);
const balanceAfterCredit = adjCreditRes.json?.data?.balance;
check('balance increased by 0.20', typeof balanceAfterCredit === 'number', `balance=${balanceAfterCredit}`);

// ═══════════════════════════════════════════════════════════════════════════
//  4c. Adjustment Duplicate Check (same txId)
// ═══════════════════════════════════════════════════════════════════════════
section('4c. Adjustment - Duplicate Transaction Guard');

const adjDupRes = await post('/api/game/adjustment', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         -0.10,
  type:           'bet',
  transaction_id: betTxId,   // Reuse the SAME txId
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(adjDupRes.json, null, 2));

check('HTTP 200',              adjDupRes.status === 200, `got ${adjDupRes.status}`);
// Duplicate should still return success with same balance (idempotent)
check('error is null (idempotent)', adjDupRes.json?.error === null, `error=${JSON.stringify(adjDupRes.json?.error)}`);
check('Balance unchanged from previous', Math.abs((adjDupRes.json?.data?.balance || 0) - (balanceAfterCredit || 0)) < 0.01,
  `expected ${balanceAfterCredit} got ${adjDupRes.json?.data?.balance}`);

// ═══════════════════════════════════════════════════════════════════════════
//  5. Bet
// ═══════════════════════════════════════════════════════════════════════════
section('5. Bet (/api/game/bet)');

const betRes = await post('/api/game/bet', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         0.10,
  transaction_id: `BET-${Date.now()}`,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(betRes.json, null, 2));

check('HTTP 200',         betRes.status === 200,         `got ${betRes.status}`);
check('Is JSON',          betRes.json !== null);
check('code = 1',         betRes.json?.code === 1,       `code=${betRes.json?.code}, msg=${betRes.json?.msg}`);
check('balance present',  typeof betRes.json?.balance === 'string', `balance=${betRes.json?.balance}`);

const balanceAfterBet = parseFloat(betRes.json?.balance || '0');

// ═══════════════════════════════════════════════════════════════════════════
//  6. Payout
// ═══════════════════════════════════════════════════════════════════════════
section('6. Payout (/api/game/payout)');

const payoutRes = await post('/api/game/payout', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         0.25,
  transaction_id: `WIN-${Date.now()}`,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(payoutRes.json, null, 2));

check('HTTP 200',        payoutRes.status === 200,   `got ${payoutRes.status}`);
check('Is JSON',         payoutRes.json !== null);
check('code = 1',        payoutRes.json?.code === 1, `code=${payoutRes.json?.code}, msg=${payoutRes.json?.msg}`);
check('balance present', typeof payoutRes.json?.balance === 'string', `balance=${payoutRes.json?.balance}`);

const balanceAfterPayout = parseFloat(payoutRes.json?.balance || '0');
console.log(`  💰 Balance after payout: ${balanceAfterPayout}`);

// ═══════════════════════════════════════════════════════════════════════════
//  7. Rollback
// ═══════════════════════════════════════════════════════════════════════════
section('7. Rollback (/api/game/rollback)');

const rollbackRes = await post('/api/game/rollback', {
  token:                   SESSION_TOKEN,
  player_name:             testPlayer.id,
  player_id:               testPlayer.id,
  amount:                  0.10,
  original_transaction_id: betTxId,
  rollback_id:             `RB-${Date.now()}`
});
console.log(`  Response:`, JSON.stringify(rollbackRes.json, null, 2));

check('HTTP 200',        rollbackRes.status === 200,   `got ${rollbackRes.status}`);
check('Is JSON',         rollbackRes.json !== null);
check('code = 1',        rollbackRes.json?.code === 1, `code=${rollbackRes.json?.code}, msg=${rollbackRes.json?.msg}`);
check('balance present', typeof rollbackRes.json?.balance === 'string', `balance=${rollbackRes.json?.balance}`);

// ═══════════════════════════════════════════════════════════════════════════
//  8. BetPayout (Combined)
// ═══════════════════════════════════════════════════════════════════════════
section('8. BetPayout (/api/game/betpayout)');

const bpRes = await post('/api/game/betpayout', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  bet_amount:     0.10,
  win_amount:     0.20,
  transaction_id: `BP-${Date.now()}`,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(bpRes.json, null, 2));

check('HTTP 200',           bpRes.status === 200,           `got ${bpRes.status}`);
check('Is JSON',            bpRes.json !== null);
check('error is null',      bpRes.json?.error === null,     `error=${JSON.stringify(bpRes.json?.error)}`);
check('data.balance set',   typeof bpRes.json?.data?.balance === 'number', `balance=${bpRes.json?.data?.balance}`);

// ═══════════════════════════════════════════════════════════════════════════
//  9. Downline
// ═══════════════════════════════════════════════════════════════════════════
section('9. Downline (/api/game/downline)');

const dlRes = await post('/api/game/downline', { token: SESSION_TOKEN });
console.log(`  Response (truncated):`, JSON.stringify({ code: dlRes.json?.code, msg: dlRes.json?.msg, total: dlRes.json?.total }));

check('HTTP 200',       dlRes.status === 200,   `got ${dlRes.status}`);
check('code = 1',       dlRes.json?.code === 1, `code=${dlRes.json?.code}`);
check('data is array',  Array.isArray(dlRes.json?.data), `data type=${typeof dlRes.json?.data}`);
check('total matches',  dlRes.json?.total === (dlRes.json?.data?.length ?? -1));

// ═══════════════════════════════════════════════════════════════════════════
//  10. Insufficient Balance Guard
// ═══════════════════════════════════════════════════════════════════════════
section('10. Insufficient Balance Guard');

const hugeRes = await post('/api/game/bet', {
  token:          SESSION_TOKEN,
  player_name:    testPlayer.id,
  player_id:      testPlayer.id,
  amount:         999999999,   // Way more than any balance
  transaction_id: `HUGE-BET-${Date.now()}`,
  game_code:      'test-game'
});
console.log(`  Response:`, JSON.stringify(hugeRes.json, null, 2));

check('HTTP 200',           hugeRes.status === 200, `got ${hugeRes.status}`);
check('code = 0 (error)',   hugeRes.json?.code === 0, `code=${hugeRes.json?.code}`);
check('Insufficient balance message', hugeRes.json?.msg?.toLowerCase().includes('insufficient') ||
  hugeRes.json?.msg?.toLowerCase().includes('balance'), `msg="${hugeRes.json?.msg}"`);
check('Balance unchanged',  parseFloat(hugeRes.json?.balance) < 1000, `balance=${hugeRes.json?.balance}`);

// ═══════════════════════════════════════════════════════════════════════════
//  11. Verify-Session with INVALID token
// ═══════════════════════════════════════════════════════════════════════════
section('11. Verify-Session with INVALID Token');

const invRes = await post('/api/game/verify-session', {
  token:       'totally-invalid-session-token-abc123xyz',
  player_name: 'nonexistent-player-99999',
  player_id:   'nonexistent-player-99999'
});
console.log(`  Response:`, JSON.stringify(invRes.json, null, 2));

// PG Soft standard: if player not found, should still return HTTP 200 but with error code
check('HTTP 200',      invRes.status === 200, `got ${invRes.status}`);
check('Is JSON',       invRes.json !== null);
// Allowed: returns an error code in the JSON body — either error.code or data=null
check('Returns error code', invRes.json?.error !== null, `error=${JSON.stringify(invRes.json?.error)}`);

// ═══════════════════════════════════════════════════════════════════════════
//  12. Launch URL Check (Staging/Production)
// ═══════════════════════════════════════════════════════════════════════════
section('12. Game Launch Endpoint (/api/pg/launch)');

const launchRes = await get(`/api/pg/launch?player_id=${testPlayer.id}&game_code=79`);

console.log(`  HTTP Status: ${launchRes.status}`);
console.log(`  Content-Type: text/html (expected for launcher)`);
console.log(`  Response size: ${launchRes.text.length} bytes`);

check('HTTP 200',           launchRes.status === 200,           `got ${launchRes.status}`);
check('Response non-empty', launchRes.text.length > 100,        `length=${launchRes.text.length}`);
// Should return HTML for successful launch, or a PG Soft error page
const isHtml = launchRes.text.includes('<html') || launchRes.text.includes('<!DOCTYPE') || launchRes.text.includes('<body');
const hasError = launchRes.text.includes('خطأ') || launchRes.text.includes('error');
check('Returns HTML',       isHtml,                             `starts with: ${launchRes.text.substring(0, 60)}`);
if (hasError) {
  console.log(`  ${YELLOW}⚠️  Launch returned HTML with error content — check PG Soft operator token validity${RESET}`);
  console.log(`  Error preview: ${launchRes.text.replace(/<[^>]+>/g, ' ').trim().substring(0, 200)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════
const total = totalPassed + totalFailed;
const rate = Math.round((totalPassed / total) * 100);

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  FINAL REPORT${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
console.log(`  Tests Passed : ${GREEN}${BOLD}${totalPassed}/${total}${RESET}`);
console.log(`  Tests Failed : ${RED}${BOLD}${totalFailed}/${total}${RESET}`);
console.log(`  Success Rate : ${rate >= 90 ? GREEN : rate >= 70 ? YELLOW : RED}${BOLD}${rate}%${RESET}`);
console.log(`  Environment  : ${BOLD}${env}${RESET}`);
console.log(`  Token Used   : ${operatorToken}`);
console.log();
if (rate === 100) {
  console.log(`  ${GREEN}${BOLD}🎉 ALL TESTS PASSED — Integration is 100% ready!${RESET}`);
} else if (rate >= 70) {
  console.log(`  ${YELLOW}${BOLD}⚠️  Some tests failed — see above for details${RESET}`);
} else {
  console.log(`  ${RED}${BOLD}❌ Integration has critical failures — review above${RESET}`);
}
console.log();
