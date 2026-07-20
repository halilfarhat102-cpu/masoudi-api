const fs = require('fs');
const path = require('path');

function findPngs(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findPngs(fullPath);
        } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            console.log(`Asset Image: ${fullPath} (${stat.size} bytes)`);
        }
    }
}

findPngs(path.resolve(__dirname, '../masoudi_app/assets'));
