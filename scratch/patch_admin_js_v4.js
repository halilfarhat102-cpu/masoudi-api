import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Safely patching admin.js...");
    const filePath = resolve('admin.js');
    let content = fs.readFileSync(filePath, 'utf-8');

    // Normalize newlines to LF
    content = content.replace(/\r\n/g, '\n');

    const old_block = `        let firstAllowedTabId = null;
        document.querySelectorAll('.admin-tab').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/switchTab\\(['"]([^'"]+)['"]\\)/);
            if (match) {
                const tabId = match[1]; // e.g. "tab-players"
                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                if (tabKey === 'dashboard' || allowed.includes(tabKey)) {
                    btn.style.display = 'flex';
                    if (!firstAllowedTabId) firstAllowedTabId = tabId;
                } else {
                    btn.style.display = 'none';
                }
            }
        });`;

    const new_block = `        let firstAllowedTabId = null;
        document.querySelectorAll('.admin-tab').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/switchTab\\(['"]([^'"]+)['"]\\)/);
            if (match) {
                const tabId = match[1]; // e.g. "tab-players"
                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                const isAllowed = tabKey === 'dashboard' || allowed.includes(tabKey);
                btn.style.display = isAllowed ? 'flex' : 'none';
                if (isAllowed && !firstAllowedTabId) firstAllowedTabId = tabId;

                // Sync corresponding menu card on the dashboard if it exists
                const correspondingCard = Array.from(document.querySelectorAll('.menu-card')).find(card => {
                    const clickAttr = card.getAttribute('onclick') || '';
                    return clickAttr.includes(\`'\${tabId}'\`) || clickAttr.includes(\`"\${tabId}"\`);
                });
                if (correspondingCard) {
                    correspondingCard.style.display = isAllowed ? 'flex' : 'none';
                }
            }
        });`;

    if (content.includes(old_block)) {
        content = content.replace(old_block, new_block);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("SUCCESS: admin.js patched successfully with menu card permission checks!");
    } else {
        console.log("ERROR: Target permission block not found in admin.js!");
    }
}

main();
