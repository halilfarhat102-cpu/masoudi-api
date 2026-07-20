import XLSX from 'xlsx';

function main() {
    const filePath = 'c:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\DOC-20260709-WA0067(1)_';
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['New Integration'];
    
    // Let's print row by row from row 30 to 70
    // Columns: A to H
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let r = 30; r <= 70; r++) {
        let rowStr = `Row ${r}: `;
        cols.forEach(col => {
            const cellRef = `${col}${r}`;
            const cell = sheet[cellRef];
            const val = cell ? cell.v : '';
            rowStr += `[${col}: ${val}] `;
        });
        console.log(rowStr);
    }
}

main();
