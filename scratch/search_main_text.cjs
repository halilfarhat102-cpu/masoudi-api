const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../masoudi_app/lib/main.dart'), 'utf8');
const lines = content.split('\n');

const arabicRegex = /[\u0600-\u06FF]/;
lines.forEach((line, idx) => {
    if (arabicRegex.test(line)) {
        console.log(`L${idx + 1}: ${line.trim()}`);
    }
});
