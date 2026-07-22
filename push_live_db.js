import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'db.json');

async function pushDb() {
    console.log("Reading and validating local db.json...");
    try {
        const localData = fs.readFileSync(dbPath, 'utf-8');
        const parsed = JSON.parse(localData);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error("Invalid database format");
        }
        console.log("Success! Local db.json is valid and ready for Git / Render deployment.");
    } catch (e) {
        console.error("Error validating database:", e.message);
        process.exit(1);
    }
}

pushDb();
