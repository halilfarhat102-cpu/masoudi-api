/**
 * One-time cleanup script: replaces old "كوينز" strings in transaction history
 * inside db.json with proper "رصيد" terminology.
 * Run once: node fix_coins_in_db.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, 'db.json');

function fixCoins(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/تحويل كوينز إلى لاعب/g, 'تحويل رصيد إلى لاعب')
      .replace(/بيع كوينز للوكيل/g,    'سحب رصيد للوكيل')
      .replace(/شراء كوينز من لاعب/g,  'شحن رصيد من لاعب')
      .replace(/كوينز/g, 'رصيد')
      .replace(/كوين/g,  'رصيد');
  }
  if (Array.isArray(obj)) return obj.map(fixCoins);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = fixCoins(obj[k]);
    return out;
  }
  return obj;
}

try {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db  = JSON.parse(raw);
  const fixed = fixCoins(db);
  fs.writeFileSync(DB_PATH, JSON.stringify(fixed, null, 2), 'utf8');
  console.log('✅ db.json cleaned successfully — all "كوينز" entries replaced with "رصيد"');
} catch (e) {
  console.error('❌ Error:', e.message);
}
