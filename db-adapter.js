import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'db.json');

function getDefaultDb() {
  return {
    settings: {
      enablePreview: false,
      showBalance: false,
      showLiveBadge: false,
      playButtonText: "العب الآن",
      coinBuyRate: 10000,
      coinSellRate: 20000
    },
    banners: [],
    agents: [],
    games: [],
    players: [],
    admins: [],
    sessions: {}
  };
}

export async function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      const defaultData = getDefaultDb();
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading db.json:", e.message);
    return getDefaultDb();
  }
}

export async function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing db.json:", e.message);
  }
}

export async function runTransaction(fn) {
  const db = await readDb();
  const updatedDb = await fn(db);
  await writeDb(updatedDb);
  return updatedDb;
}
