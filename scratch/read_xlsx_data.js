import XLSX from 'xlsx';
import path from 'path';

function main() {
    const filePath = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\DOC-20260709-WA0067(1)_';
    console.log("Reading workbook...");
    const workbook = XLSX.readFile(filePath);
    
    console.log("Sheet names in workbook:", workbook.SheetNames);
    
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    
    const cells = Object.keys(sheet).filter(k => k[0] !== '!');
    const matchedCells = [];
    cells.forEach(cell => {
        const val = sheet[cell].v;
        if (val) {
            matchedCells.push({ cell, val: String(val) });
        }
    });

    console.log(`Found ${matchedCells.length} non-empty cells.`);
    
    const keywords = ['url', 'api', 'whitelist', 'verify', 'wallet', 'cash', 'adjustment', 'bet', 'payout', 'brand', 'token', 'seamless', 'transfer'];
    const filtered = matchedCells.filter(item => {
        const low = item.val.toLowerCase();
        return keywords.some(k => low.includes(k));
    });

    console.log("Filtered matching cells:");
    filtered.forEach(item => {
        console.log(`Cell ${item.cell}: ${item.val.substring(0, 120)}`);
    });
}

main();
