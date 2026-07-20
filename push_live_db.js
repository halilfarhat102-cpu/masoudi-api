import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'db.json');

async function pushDb() {
    console.log("Reading local db.json...");
    try {
        const localData = fs.readFileSync(dbPath, 'utf-8');
        
        // Validate JSON
        const parsed = JSON.parse(localData);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error("Invalid database format");
        }

        console.log("Uploading db.json to Supabase Storage...");
        const { error } = await supabase.storage
            .from('images')
            .upload('db.json', Buffer.from(localData), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) {
            throw new Error(error.message);
        }

        console.log("Success! Live database on Supabase has been updated with local db.json.");
    } catch (e) {
        console.error("Error pushing database:", e.message);
        process.exit(1);
    }
}

pushDb();
