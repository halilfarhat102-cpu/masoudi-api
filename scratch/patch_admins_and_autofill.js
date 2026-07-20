import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Starting script to apply whitelisting of halilfarhat102@gmail.com and admin promotional autofill...");

    // 1. PATCH api-middleware.js
    const middlewarePath = resolve('api-middleware.js');
    let middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
    middlewareContent = middlewareContent.replace(/\r\n/g, '\n');

    const old_middleware_emails = `        const adminEmails = ['halilfarhat102@gmail.com', 'management135790@gmail.com'];
        const isLinkedAdmin = (db.admins || []).some(a => String(a.playerId) === String(player.id));
        const isAdmin = player.isAdmin === true || adminEmails.includes(player.email) || isLinkedAdmin;`;

    const new_middleware_emails = `        const adminEmails = ['halilfarhat102@gmail.com'];
        const isLinkedAdmin = (db.admins || []).some(a => String(a.playerId) === String(player.id));
        const isAdmin = player.isAdmin === true || adminEmails.includes(player.email) || isLinkedAdmin;`;

    if (middlewareContent.includes(old_middleware_emails)) {
        middlewareContent = middlewareContent.replace(old_middleware_emails, new_middleware_emails);
        fs.writeFileSync(middlewarePath, middlewareContent, 'utf-8');
        console.log("SUCCESS: api-middleware.js whitelisted successfully!");
    } else {
        console.log("ERROR: adminEmails not found in api-middleware.js!");
    }

    // 2. PATCH admin.js
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    jsContent = jsContent.replace(/\r\n/g, '\n');

    // Update hardcoded email array
    const old_js_emails = `    // 1. Add all hardcoded admin emails from players list
    const adminEmails = ['halilfarhat102@gmail.com', 'management135790@gmail.com'];`;

    const new_js_emails = `    // 1. Add all hardcoded admin emails from players list
    const adminEmails = ['halilfarhat102@gmail.com'];`;

    if (jsContent.includes(old_js_emails)) {
        jsContent = jsContent.replace(old_js_emails, new_js_emails);
    } else {
        console.log("ERROR: adminEmails not found in admin.js!");
    }

    // Update autofillPlayerInfo function
    const old_autofill_fn = `// ─── Autofill Player Info for Promotion ───
function autofillPlayerInfo(playerId) {
    if (!playerId) return;
    const player = (players || []).find(p => String(p.id) === String(playerId.trim()));
    if (player) {
        const usernameEl = document.getElementById('newAdminUsername');
        const displayEl = document.getElementById('newAdminDisplay');
        if (usernameEl) usernameEl.value = player.id;
        if (displayEl) displayEl.value = player.name || ('لاعب ' + player.id);
    }
}`;

    const new_autofill_fn = `// ─── Autofill Player Info for Promotion ───
function autofillPlayerInfo(playerId) {
    const previewEl = document.getElementById('promotedPlayerPreview');
    const nameEl = document.getElementById('promotedPlayerName');
    const emailEl = document.getElementById('promotedPlayerEmail');
    const avatarEl = document.getElementById('promotedPlayerAvatar');

    if (!playerId) {
        if (previewEl) previewEl.style.display = 'none';
        return;
    }
    
    const player = (players || []).find(p => String(p.id) === String(playerId.trim()));
    if (player) {
        const usernameEl = document.getElementById('newAdminUsername');
        const displayEl = document.getElementById('newAdminDisplay');
        if (usernameEl) usernameEl.value = player.id;
        if (displayEl) displayEl.value = player.name || ('لاعب ' + player.id);
        
        if (previewEl && nameEl && emailEl && avatarEl) {
            nameEl.textContent = player.name || ('لاعب ' + player.id);
            emailEl.textContent = player.email || 'لا يوجد بريد إلكتروني';
            avatarEl.src = player.photoUrl || 'assets/player_avatar.png';
            previewEl.style.display = 'flex';
        }
    } else {
        if (previewEl) previewEl.style.display = 'none';
    }
}`;

    if (jsContent.includes(old_autofill_fn)) {
        jsContent = jsContent.replace(old_autofill_fn, new_autofill_fn);
    } else {
        console.log("ERROR: autofillPlayerInfo function not found in admin.js!");
    }

    // Hide preview on successful admin add
    const old_admin_add_reset = `        if (data.success) {
            closeModal('addAdminModal');
            ['newAdminPlayerId','newAdminUsername','newAdminDisplay','newAdminPw'].forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.value = ''; 
            });`;

    const new_admin_add_reset = `        if (data.success) {
            closeModal('addAdminModal');
            ['newAdminPlayerId','newAdminUsername','newAdminDisplay','newAdminPw'].forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.value = ''; 
            });
            const previewEl = document.getElementById('promotedPlayerPreview');
            if (previewEl) previewEl.style.display = 'none';`;

    if (jsContent.includes(old_admin_add_reset)) {
        jsContent = jsContent.replace(old_admin_add_reset, new_admin_add_reset);
    } else {
        console.log("ERROR: admin add reset block not found in admin.js!");
    }

    fs.writeFileSync(jsPath, jsContent, 'utf-8');
    console.log("SUCCESS: admin.js updated successfully!");

    // 3. PATCH admin.html
    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    const old_html_input = `            <label style="font-size:11px;color:#888;display:block;margin-bottom:6px;">معرف حساب اللاعب للربط (اختياري)</label>
            <input type="text" id="newAdminPlayerId" placeholder="مثال: 519997" oninput="window.autofillPlayerInfo(this.value)">`;

    const new_html_input = `            <label style="font-size:11px;color:#888;display:block;margin-bottom:6px;">معرف حساب اللاعب للربط (اختياري)</label>
            <input type="text" id="newAdminPlayerId" placeholder="مثال: 519997" oninput="window.autofillPlayerInfo(this.value)">
            
            <!-- Promoted Player Preview Card -->
            <div id="promotedPlayerPreview" style="display:none; margin-bottom:14px; padding:10px; background:rgba(255,122,31,0.06); border:1px solid rgba(255,122,31,0.15); border-radius:12px; align-items:center; gap:10px;">
                <img id="promotedPlayerAvatar" src="" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--orange);">
                <div>
                    <div id="promotedPlayerName" style="font-size:13px; font-weight:bold; color:#fff; font-family:'Cairo',sans-serif;">-</div>
                    <div id="promotedPlayerEmail" style="font-size:11px; color:#aaa; font-family:'Cairo',sans-serif;">-</div>
                </div>
            </div>`;

    if (htmlContent.includes(old_html_input)) {
        htmlContent = htmlContent.replace(old_html_input, new_html_input);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log("SUCCESS: admin.html updated successfully!");
    } else {
        console.log("ERROR: newAdminPlayerId input not found in admin.html!");
    }
}

main();
