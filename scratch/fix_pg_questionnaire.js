import XLSX from 'xlsx';

const inputFile  = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\DOC-20260709-WA0067(1)_';
const outputFile = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\PG_Integration_Masoudi_Final.xlsx';

function set(sh, ref, val) {
  if (!sh[ref]) sh[ref] = {};
  sh[ref].v = val; sh[ref].t = 's'; delete sh[ref].f;
}
function clr(sh, ref) {
  if (!sh[ref]) sh[ref] = {};
  sh[ref].v = ''; sh[ref].t = 's'; delete sh[ref].f;
}

const BRAND     = 'MasoudiGames';
const BASE      = 'https://masoudi-api.onrender.com';
const VERIFY    = `${BASE}/api/game/verify-session`;
const BALANCE   = `${BASE}/api/game/get-balance`;
const ADJUST    = `${BASE}/api/game/adjustment`;
const BETPAYOUT = `${BASE}/api/game/betpayout`;
const IP_OFFICE = '196.151.82.64';
const IP_SRV1   = '216.24.57.8';
const IP_SRV2   = '216.24.57.9';

console.log('Reading workbook…');
const wb = XLSX.readFile(inputFile);
const sh = wb.Sheets['New Integration'];

// ══ PART 1 ═══════════════════════════════════════════════════════
set(sh,'D2',  BRAND);
set(sh,'D3',  'PG');
set(sh,'D4',  BASE);
set(sh,'D6',  'halilfarhat102@gmail.com');
set(sh,'D10', 'Arabic, English');
set(sh,'D12', 'USD');

// ══ PART 2: QAT ══════════════════════════════════════════════════
// IP Whitelist (rows 35-36)
set(sh,'D35', IP_OFFICE);
set(sh,'D36', `${IP_SRV1} and ${IP_SRV2}`);

// Seamless Wallet API (rows 38-45)
set(sh,'D38', BRAND);        // Brand Name
set(sh,'D39', VERIFY);       // Verify Session
set(sh,'D40', BALANCE);      // Get Balance
set(sh,'D41', ADJUST);       // Adjustment
clr(sh,'D42');               // Reason = empty (we DO integrate)
set(sh,'D43', BETPAYOUT);   // ✅ Bet Payout (TransferInOut) ← correct row
clr(sh,'D44');               // Bet (TransferOut) ← EMPTY (new operator)
clr(sh,'D45');               // Payout (TransferIn) ← EMPTY (new operator)

// Transfer Wallet API (rows 46-47) ← ALL EMPTY
clr(sh,'D46'); clr(sh,'D47');

// ══ PART 3: Production ═══════════════════════════════════════════
// IP Whitelist (rows 50-51)
set(sh,'D50', IP_OFFICE);
set(sh,'D51', `${IP_SRV1} and ${IP_SRV2}`);

// Seamless Wallet API (rows 53-60)
set(sh,'D53', BRAND);        // Brand Name
set(sh,'D54', VERIFY);       // Verify Session
set(sh,'D55', BALANCE);      // Get Balance
set(sh,'D56', ADJUST);       // Adjustment
clr(sh,'D57');               // Reason = empty (we DO integrate)
set(sh,'D58', BETPAYOUT);   // ✅ Bet Payout (TransferInOut) ← correct row
clr(sh,'D59');               // Bet (TransferOut) ← EMPTY (new operator)
clr(sh,'D60');               // Payout (TransferIn) ← EMPTY (new operator)

// Transfer Wallet API (rows 61-62) ← ALL EMPTY
clr(sh,'D61'); clr(sh,'D62');

XLSX.writeFile(wb, outputFile);

console.log('✅ File saved:', outputFile);
console.log('');
console.log('QAT Rows:');
console.log('  D43 (Bet Payout/TransferInOut) :', BETPAYOUT);
console.log('  D44 (Bet/TransferOut)          : EMPTY');
console.log('  D45 (Payout/TransferIn)        : EMPTY');
console.log('  D46-D47 (Transfer Wallet)      : EMPTY');
console.log('');
console.log('Production Rows:');
console.log('  D58 (Bet Payout/TransferInOut) :', BETPAYOUT);
console.log('  D59 (Bet/TransferOut)          : EMPTY');
console.log('  D60 (Payout/TransferIn)        : EMPTY');
console.log('  D61-D62 (Transfer Wallet)      : EMPTY');
