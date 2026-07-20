const fs = require('fs');
const path = require('path');

function searchNetworkImages(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchNetworkImages(fullPath);
        } else if (file.endsWith('.dart')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('NetworkImage') || content.includes('CachedNetworkImage') || content.includes('.network')) {
                console.log(`File: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('NetworkImage') || line.includes('CachedNetworkImage') || line.includes('.network')) {
                        console.log(`  Line ${idx + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

searchNetworkImages(path.resolve(__dirname, '../masoudi_app/lib'));
