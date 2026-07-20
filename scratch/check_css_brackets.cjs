const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../style.css');
const css = fs.readFileSync(cssPath, 'utf8');

let braces = 0;
let line = 1;
let col = 1;
let inComment = false;

for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '\n') {
        line++;
        col = 1;
    } else {
        col++;
    }

    if (inComment) {
        if (char === '/' && css[i - 1] === '*') {
            inComment = false;
        }
        continue;
    }

    if (char === '/' && css[i + 1] === '*') {
        inComment = true;
        i++;
        continue;
    }

    if (char === '{') {
        braces++;
    } else if (char === '}') {
        braces--;
        if (braces < 0) {
            console.error(`Error: Unmatched closing brace '}' at line ${line}, col ${col}`);
            process.exit(1);
        }
    }
}

if (braces > 0) {
    console.error(`Error: Unmatched opening brace '{' (count: ${braces}) at end of file`);
    process.exit(1);
} else {
    console.log("CSS Braces check passed! No unclosed braces.");
}
