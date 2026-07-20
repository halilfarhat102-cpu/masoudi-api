const fs = require('fs');
const path = require('path');

function findFiles(dir, name) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath, name);
        } else if (file.toLowerCase().includes(name.toLowerCase())) {
            console.log(`Found: ${fullPath} (${stat.size} bytes)`);
        }
    }
}

const rootDir = path.resolve(__dirname, '../');
findFiles(rootDir, 'fox');
