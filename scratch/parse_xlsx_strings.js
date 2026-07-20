import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Parsing sharedStrings.xml to view Excel document contents...");
    const stringsPath = resolve('c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\doc_extracted\\xl\\sharedStrings.xml');
    if (!fs.existsSync(stringsPath)) {
        console.error("sharedStrings.xml not found!");
        return;
    }
    const content = fs.readFileSync(stringsPath, 'utf-8');
    
    // Quick regex extraction of all <t>...</t> tags
    const regex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let match;
    const strings = [];
    while ((match = regex.exec(content)) !== null) {
        strings.push(match[1]);
    }

    console.log(`Found ${strings.length} strings:`);
    // Output first 200 strings
    strings.slice(0, 300).forEach((str, index) => {
        console.log(`[${index + 1}]: ${str}`);
    });
}

main();
