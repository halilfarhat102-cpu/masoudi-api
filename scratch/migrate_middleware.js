import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const middlewarePath = resolve(__dirname, '..', 'api-middleware.js');
let code = fs.readFileSync(middlewarePath, 'utf-8');

// 1. Add imports
code = code.replace(
  "import fs from 'fs';",
  "import fs from 'fs';\nimport { readDb, writeDb } from './db-adapter.js';"
);

// 2. Make main function async
code = code.replace(
  "export function apiMiddleware(req, res, next) {",
  "export async function apiMiddleware(req, res, next) {"
);

// 3. Make all body parser end callbacks async
// Match 'req.on(\'end\', () => {' globally
code = code.replace(/req\.on\('end',\s*\(\)\s*=>\s*\{/g, "req.on('end', async () => {");

// 4. Replace readFileSync calls
code = code.replace(
  /const data = fs\.readFileSync\(dbPath,\s*'utf-8'\);/g,
  "const data = JSON.stringify(await readDb());"
);

code = code.replace(
  /const existing = JSON\.parse\(fs\.readFileSync\(dbPath,\s*'utf-8'\)\);/g,
  "const existing = await readDb();"
);

code = code.replace(
  /const db = JSON\.parse\(fs\.readFileSync\(dbPath,\s*'utf-8'\)\);/g,
  "const db = await readDb();"
);

// 5. Replace writeFileSync calls (ignoring savePath upload writes)
code = code.replace(
  /fs\.writeFileSync\(dbPath,\s*JSON\.stringify\(db,\s*null,\s*2\),\s*'utf-8'\);/g,
  "await writeDb(db);"
);

code = code.replace(
  /fs\.writeFileSync\(dbPath,\s*JSON\.stringify\(incoming,\s*null,\s*2\),\s*'utf-8'\);/g,
  "await writeDb(incoming);"
);

fs.writeFileSync(middlewarePath, code, 'utf-8');
console.log("Successfully migrated api-middleware.js to Supabase!");
