import XLSX from 'xlsx';
import fs from 'fs';

// ─── API Endpoints ────────────────────────────────────────────────
const BRAND_NAME   = 'Masoudi Games';
const BASE_URL     = 'https://masoudi-api.onrender.com';
const VERIFY_URL   = `${BASE_URL}/api/game/verify-session`;
const BALANCE_URL  = `${BASE_URL}/api/game/get-balance`;
const ADJUST_URL   = `${BASE_URL}/api/game/adjustment`;
const BET_URL      = `${BASE_URL}/api/game/bet`;
const PAYOUT_URL   = `${BASE_URL}/api/game/payout`;

const inputFile  = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\DOC-20260709-WA0067(1)_';
const outputFile = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\PG_Integration_Masoudi_Filled.xlsx';

// Helper to set a cell value (preserves existing style if possible)
function setCell(sheet, cellRef, value) {
  if (!sheet[cellRef]) {
    sheet[cellRef] = { t: 's', v: value };
  } else {
    sheet[cellRef].v = value;
    sheet[cellRef].t = 's';
    delete sheet[cellRef].f; // remove formula if any
  }
}

console.log('Reading workbook…');
const workbook = XLSX.readFile(inputFile);
const sheet = workbook.Sheets['New Integration'];

// ─── Part 1: General Information ─────────────────────────────────
// Row 2: Brand Name
setCell(sheet, 'D2', BRAND_NAME);
// Row 4: Official Website
setCell(sheet, 'D4', 'https://masoudi-api.onrender.com');
// Row 6: Email
setCell(sheet, 'D6', 'halilfarhat102@gmail.com');
// Row 10: Languages
setCell(sheet, 'D10', 'Arabic, English');
// Row 12: Currency
setCell(sheet, 'D12', 'USD');

// ─── Part 2: QAT (Staging) — Seamless Wallet API (rows 38–45) ────
// Row 38: Brand Name
setCell(sheet, 'D38', BRAND_NAME);
// Row 39: Verify Session
setCell(sheet, 'D39', VERIFY_URL);
// Row 40: Get Player Wallet
setCell(sheet, 'D40', BALANCE_URL);
// Row 41: Adjustment
setCell(sheet, 'D41', ADJUST_URL);
// Row 42: Reason for not integrating (N/A — we DO integrate it)
setCell(sheet, 'D42', 'N/A - Adjustment API is fully integrated');
// Row 43: Bet Payout (combined debit+credit)
setCell(sheet, 'D43', ADJUST_URL);
// Row 44: Bet only (legacy reseller)
setCell(sheet, 'D44', BET_URL);
// Row 45: Payout only (legacy reseller)
setCell(sheet, 'D45', PAYOUT_URL);
// Row 46: Transfer Wallet Brand Name (optional section — still fill)
setCell(sheet, 'D46', BRAND_NAME);
// Row 47: Transfer Wallet Verify Session
setCell(sheet, 'D47', VERIFY_URL);

// ─── Part 3: Production — Seamless Wallet API (rows 53–62) ───────
// Row 53: Brand Name
setCell(sheet, 'D53', BRAND_NAME);
// Row 54: Verify Session
setCell(sheet, 'D54', VERIFY_URL);
// Row 55: Get Player Wallet
setCell(sheet, 'D55', BALANCE_URL);
// Row 56: Adjustment
setCell(sheet, 'D56', ADJUST_URL);
// Row 57: Reason for not integrating
setCell(sheet, 'D57', 'N/A - Adjustment API is fully integrated');
// Row 58: Bet Payout
setCell(sheet, 'D58', ADJUST_URL);
// Row 59: Bet
setCell(sheet, 'D59', BET_URL);
// Row 60: Payout
setCell(sheet, 'D60', PAYOUT_URL);
// Row 61: Transfer Wallet Brand Name
setCell(sheet, 'D61', BRAND_NAME);
// Row 62: Transfer Wallet Verify Session
setCell(sheet, 'D62', VERIFY_URL);

// ─── IP Whitelist (Row 35 / Row 50) ──────────────────────────────
// Render.com dynamic IPs — note we use a wildcard note
setCell(sheet, 'D35', 'Render.com cloud hosting — static IP not available; all outbound via Render.com CDN');
setCell(sheet, 'D50', 'Render.com cloud hosting — server IP is dynamic (managed by Render.com)');
setCell(sheet, 'D51', BASE_URL);

console.log('Writing filled workbook to output…');
XLSX.writeFile(workbook, outputFile);

console.log('');
console.log('✅ Done! Filled questionnaire saved to:');
console.log(`   ${outputFile}`);
console.log('');
console.log('Cells filled summary:');
console.log(`  D2  (Brand Name, Part 1)         = ${BRAND_NAME}`);
console.log(`  D4  (Official Website)            = ${BASE_URL}`);
console.log(`  D6  (Email)                       = halilfarhat102@gmail.com`);
console.log(`  D38 (Brand Name, QAT Seamless)    = ${BRAND_NAME}`);
console.log(`  D39 (Verify Session, QAT)         = ${VERIFY_URL}`);
console.log(`  D40 (Get Balance, QAT)            = ${BALANCE_URL}`);
console.log(`  D41 (Adjustment, QAT)             = ${ADJUST_URL}`);
console.log(`  D43 (Bet Payout, QAT)             = ${ADJUST_URL}`);
console.log(`  D44 (Bet, QAT)                    = ${BET_URL}`);
console.log(`  D45 (Payout, QAT)                 = ${PAYOUT_URL}`);
console.log(`  D53 (Brand Name, PROD Seamless)   = ${BRAND_NAME}`);
console.log(`  D54 (Verify Session, PROD)        = ${VERIFY_URL}`);
console.log(`  D55 (Get Balance, PROD)           = ${BALANCE_URL}`);
console.log(`  D56 (Adjustment, PROD)            = ${ADJUST_URL}`);
console.log(`  D58 (Bet Payout, PROD)            = ${ADJUST_URL}`);
console.log(`  D59 (Bet, PROD)                   = ${BET_URL}`);
console.log(`  D60 (Payout, PROD)                = ${PAYOUT_URL}`);
