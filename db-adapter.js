import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'db.json');

const connectionString = process.env.DATABASE_URL || 'postgresql://masoudidb_user:BXKDimp2UfOM5rnA0nwCbnqJv0lu4CuD@dpg-d9fsji77f7vs739df3og-a/masoudidb';

const dbPool = new Pool({
  connectionString: connectionString,
  ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

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

let pgInitialized = false;

async function ensurePgInit() {
  if (pgInitialized) return;
  const client = await dbPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    const res = await client.query("SELECT data FROM system_config WHERE key = 'db'");
    if (res.rows.length === 0) {
      let initialData = getDefaultDb();
      try {
        if (fs.existsSync(dbPath)) {
          const content = fs.readFileSync(dbPath, 'utf-8');
          initialData = JSON.parse(content);
          console.log("[Postgres Init] Found local db.json, migration to Postgres starting...");
        }
      } catch (e) {
        console.error("[Postgres Init] Error reading local db.json fallback:", e.message);
      }
      await client.query("INSERT INTO system_config (key, data) VALUES ('db', $1)", [initialData]);
      console.log("[Postgres Init] Initialized system_config with data successfully.");
    }
    pgInitialized = true;
  } catch (e) {
    console.error("[Postgres Init] Failed to initialize table:", e.message);
  } finally {
    client.release();
  }
}

export async function readDb() {
  try {
    await ensurePgInit();
    const res = await dbPool.query("SELECT data FROM system_config WHERE key = 'db'");
    if (res.rows.length > 0) {
      return res.rows[0].data;
    }
    return getDefaultDb();
  } catch (e) {
    console.error("Error reading database from Postgres:", e.message);
    return getDefaultDb();
  }
}

export async function writeDb(data) {
  try {
    await ensurePgInit();
    await dbPool.query("UPDATE system_config SET data = $1 WHERE key = 'db'", [data]);
  } catch (e) {
    console.error("Error writing database to Postgres:", e.message);
  }
}

export async function runTransaction(fn) {
  await ensurePgInit();
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query("SELECT data FROM system_config WHERE key = 'db' FOR UPDATE");
    const dbData = res.rows.length > 0 ? res.rows[0].data : getDefaultDb();
    
    const updatedDb = await fn(dbData);
    
    await client.query("UPDATE system_config SET data = $1 WHERE key = 'db'", [updatedDb]);
    await client.query('COMMIT');
    return updatedDb;
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Postgres Transaction Error:", e.message);
    // Fallback in-memory behavior to prevent breaking API lifecycle
    const fallbackDb = await readDb();
    const updatedFallback = await fn(fallbackDb);
    await writeDb(updatedFallback);
    return updatedFallback;
  } finally {
    client.release();
  }
}
