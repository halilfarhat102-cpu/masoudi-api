const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../masoudi_app/lib/screens/profile_screen.dart'), 'utf8');
const lines = content.split('\n');

const arabicRegex = /[\u0600-\u06FF]/;
lines.forEach((line, idx) => {
    if (arabicRegex.test(line)) {
        // filter out comments
        if (!line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
            console.log(`L${idx + 1}: ${line.trim()}`);
        }
    }
});
