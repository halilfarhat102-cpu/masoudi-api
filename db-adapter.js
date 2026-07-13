import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'db.json');
let isInitialized = false;

// Helper to get default database
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
  // 1. Sync from Supabase Storage on first initialization
  if (!isInitialized) {
    try {
      console.log("Initializing database from Supabase Storage...");
      const { data, error } = await supabase.storage
        .from('images')
        .download('db.json');

      if (error) {
        console.warn("Could not download db.json from Supabase (may not exist yet). Error:", error.message);
        // If it doesn't exist, we upload the local file to initialize it on Supabase
        if (fs.existsSync(dbPath)) {
          console.log("Local db.json found. Initializing Supabase Storage with local data...");
          const localData = fs.readFileSync(dbPath, 'utf-8');
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload('db.json', Buffer.from(localData), {
              contentType: 'application/json',
              upsert: true
            });
          if (uploadError) {
            console.error("Failed to initialize database on Supabase:", uploadError.message);
          } else {
            console.log("Successfully initialized database on Supabase Storage.");
          }
        }
      } else {
        const text = await data.text();
        // Parse and validate the downloaded DB
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          fs.writeFileSync(dbPath, text, 'utf-8');
          console.log("Successfully synced database from Supabase Storage locally.");
        }
      }
      isInitialized = true;
    } catch (e) {
      console.error("Exception during database initialization from Supabase:", e.message);
      isInitialized = true;
    }
  }

  // 2. Read from local disk (which is now in sync)
  try {
    if (!fs.existsSync(dbPath)) {
      return getDefaultDb();
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
    const jsonString = JSON.stringify(db, null, 2);
    // Write locally first
    fs.writeFileSync(dbPath, jsonString, 'utf-8');

    // Sync to Supabase Storage
    try {
      const { error } = await supabase.storage
        .from('images')
        .upload('db.json', Buffer.from(jsonString), {
          contentType: 'application/json',
          upsert: true
        });
      if (error) {
        console.error("Failed to sync database write to Supabase Storage:", error.message);
      } else {
        console.log("Successfully synced database write to Supabase Storage.");
      }
    } catch (supabaseError) {
      console.error("Supabase Storage write exception:", supabaseError.message);
    }
  } catch (error) {
    console.error("Error writing database to db.json:", error);
    throw error;
  }
}

let dbPromise = Promise.resolve();

export async function runTransaction(fn) {
  const current = dbPromise;
  let resolveLock;
  dbPromise = new Promise(resolve => { resolveLock = resolve; });
  await current;
  try {
    const db = await readDb();
    const updatedDb = await fn(db);
    if (updatedDb) {
      await writeDb(updatedDb);
    }
    return updatedDb;
  } finally {
    resolveLock();
  }
}
