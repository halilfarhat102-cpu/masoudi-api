const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchDir(fullPath, query);
        } else if (file.endsWith('.dart') || file.endsWith('.yaml') || file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
                console.log(`Found "${query}" in: ${fullPath}`);
                // Print lines
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        console.log(`  Line ${idx + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

searchDir(path.resolve(__dirname, '../masoudi_app'), 'fox');
searchDir(path.resolve(__dirname, '../masoudi_app'), 'avatar');
