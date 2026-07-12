import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'db.json');

export async function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
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
        admins: []
      };
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading database from db.json:", error);
    throw error;
  }
}

export async function writeDb(db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing database to db.json:", error);
    throw error;
  }
}
