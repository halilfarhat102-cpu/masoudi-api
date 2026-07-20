import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Patching admin.js using Node.js...");
    const filePath = resolve('admin.js');
    let content = fs.readFileSync(filePath, 'utf-8');

    // Normalize newlines to LF
    content = content.replace(/\r\n/g, '\n');

    // Tab Switch block replacement
    const old_switch_tab = `// ─── Tab Switch ──────────────────────────────
function switchTab(id) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    const targetPanel = document.getElementById(id);
    if (targetPanel) targetPanel.classList.add('active');
    
    const clickedTab = Array.from(document.querySelectorAll('.admin-tab')).find(t => {
        const onclickAttr = t.getAttribute('onclick') || '';
        return onclickAttr.includes(\`'\${id}'\`) || onclickAttr.includes(\`"\${id}"\`);
    });
    if (clickedTab) clickedTab.classList.add('active');
}`;

    const new_switch_tab = `// ─── Tab Switch ──────────────────────────────
function switchTab(id) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    const targetPanel = document.getElementById(id);
    if (targetPanel) targetPanel.classList.add('active');
    
    const clickedTab = Array.from(document.querySelectorAll('.admin-tab')).find(t => {
        const onclickAttr = t.getAttribute('onclick') || '';
        return onclickAttr.includes(\`'\${id}'\`) || onclickAttr.includes(\`"\${id}"\`);
    });
    if (clickedTab) clickedTab.classList.add('active');

    // Close mobile sidebar drawer if open
    if (typeof window.toggleSidebar === 'function') {
        window.toggleSidebar(false);
    }
}`;

    if (content.includes(old_switch_tab)) {
        content = content.replace(old_switch_tab, new_switch_tab);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("SUCCESS: admin.js patched successfully!");
    } else {
        console.log("ERROR: switchTab block not found in admin.js!");
    }
}

main();
