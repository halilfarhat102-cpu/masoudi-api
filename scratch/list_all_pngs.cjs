const fs = require('fs');
const path = require('path');

function findPngs(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'build') continue;
            findPngs(fullPath);
        } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            console.log(`${fullPath} (${stat.size} bytes)`);
        }
    }
}

findPngs(path.resolve(__dirname, '../masoudi_app'));
