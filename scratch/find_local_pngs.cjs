const fs = require('fs');
const path = require('path');

function findPngs(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findPngs(fullPath);
        } else if (file.endsWith('.png')) {
            console.log(`Resource PNG: ${fullPath} (${stat.size} bytes)`);
        }
    }
}

const resDir = path.resolve(__dirname, '../masoudi_app/android/app/src/main/res');
if (fs.existsSync(resDir)) {
    findPngs(resDir);
} else {
    console.log("Res folder does not exist");
}
