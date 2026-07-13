import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'db.json');

async function pullDb() {
    console.log("Pulling latest database from live Render server...");
    try {
        const res = await fetch('https://masoudi-api.onrender.com/api/data');
        if (!res.ok) throw new Error("HTTP error " + res.status);
        const data = await res.json();
        
        // Safety check to ensure we don't write an empty object or malformed JSON
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
            console.log("Success! Local db.json updated with latest live database from Render.");
        } else {
            console.error("Error: Received empty or invalid database response");
        }
    } catch (e) {
        console.error("Error pulling database:", e.message);
        process.exit(1);
    }
}

pullDb();
