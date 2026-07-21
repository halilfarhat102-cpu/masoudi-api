// ═══════════════════════════════════════════════
//  Masoudi Admin Panel — Full Logic v2.0
// ═══════════════════════════════════════════════

let providers = [];
let dynamicGames = [];
let players = [];
let banners = [];
let agents = [];
let receipts = [];
let admins = [];
let currentWalletPlayerId = null;
let currentDeletePlayerId = null;
let settings = {
    enablePreview: true,
    playButtonText: "العب الآن",
    showBalance: true,
    showLiveBadge: true
};

const API_BASE = window.location.origin.startsWith('http') ? '' : 'https://masoudi-api.onrender.com';

function resolveImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    return API_BASE + '/' + cleanUrl;
}

function triggerImageUpload(fileInputId, textInputId, statusId) {
    if (window.MasoudiApp) {
        window.MasoudiApp.postMessage(`pickImage|${textInputId}|${statusId}`);
    } else {
        const el = document.getElementById(fileInputId);
        if (el) el.click();
    }
}
window.triggerImageUpload = triggerImageUpload;

// ─── Bootstrap ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize language-specific direction
    const lang = localStorage.getItem('admin_lang') || 'ar';
    document.body.style.direction = (lang === 'en') ? 'ltr' : 'rtl';
    const toggleBtn = document.getElementById('langToggleBtn');
    if (toggleBtn) {
        toggleBtn.innerHTML = (lang === 'en') ? '🌐 العربية' : '🌐 English';
    }
    
    // 2. Start MutationObserver for translating dynamically rendered templates
    initTranslationObserver();

    // 3. Initialize header and load data
    initAdminHeader();
    loadData();
});

// ─── Init Admin Header ────────────────────────
function initAdminHeader() {
    const name = window.ADMIN_NAME || 'المشرف العام';
    const role = window.ADMIN_ROLE || 'admin';
    const nameEl = document.getElementById('adminHeaderName');
    const badgeEl = document.getElementById('adminRoleBadge');
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (nameEl) nameEl.textContent = name;
    if (badgeEl) badgeEl.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${role === 'superadmin' ? 'مشرف عام' : 'مشرف'}`;
    if (addAdminBtn && role === 'superadmin') addAdminBtn.style.display = 'flex';
    const tabBtnAdmins = document.getElementById('tabBtnAdmins');
    if (tabBtnAdmins && role === 'superadmin') tabBtnAdmins.style.display = 'flex';

    // Role-based tab visibility check
    if (role !== 'superadmin') {
        let allowed = [];
        try {
            allowed = JSON.parse(sessionStorage.getItem('adminAllowedTabs') || '[]');
        } catch (e) {
            console.error("Error parsing adminAllowedTabs", e);
        }
        
        let firstAllowedTabId = null;
        document.querySelectorAll('.admin-tab').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/switchTab\(['"]([^'"]+)['"]\)/);
            if (match) {
                const tabId = match[1]; // e.g. "tab-players"
                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                const isAllowed = tabKey === 'dashboard' || allowed.includes(tabKey);
                btn.style.display = isAllowed ? 'flex' : 'none';
                if (isAllowed && !firstAllowedTabId) firstAllowedTabId = tabId;

                // Sync corresponding menu card on the dashboard if it exists
                const correspondingCard = Array.from(document.querySelectorAll('.menu-card')).find(card => {
                    const clickAttr = card.getAttribute('onclick') || '';
                    return clickAttr.includes(`'${tabId}'`) || clickAttr.includes(`"${tabId}"`);
                });
                if (correspondingCard) {
                    correspondingCard.style.display = isAllowed ? 'flex' : 'none';
                }
            }
        });
        

    }
}

// ─── Admin Logout ─────────────────────────────
function adminLogout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('adminRole');
    window.location.replace('/admin-login.html');
}

// ─── Change Password ──────────────────────────
async function doChangePassword() {
    const oldPw     = document.getElementById('oldPwInput')?.value;
    const newPw     = document.getElementById('newPwInput')?.value;
    const confirmPw = document.getElementById('confirmPwInput')?.value;
    if (!oldPw || !newPw || !confirmPw) return showToast('أكمل جميع الحقول', 'error');
    if (newPw !== confirmPw) return showToast('كلمتا المرور غير متطابقتين', 'error');
    if (newPw.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
    try {
        const res = await fetch(API_BASE + '/api/admin-change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.ADMIN_TOKEN, oldPassword: oldPw, newPassword: newPw })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('changePwModal');
            ['oldPwInput','newPwInput','confirmPwInput'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
            showToast('تم تغيير كلمة المرور بنجاح ✅');
        } else {
            showToast(data.error || 'فشل تغيير كلمة المرور', 'error');
        }
    } catch (e) { showToast('تعذّر الاتصال بالخادم', 'error'); }
}

// ─── Autofill Player Info for Promotion ───
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
}
window.autofillPlayerInfo = autofillPlayerInfo;

// ─── Add New Admin ────────────────────────────
async function doAddAdmin() {
    const playerId    = document.getElementById('newAdminPlayerId')?.value?.trim();
    const username    = document.getElementById('newAdminUsername')?.value?.trim();
    const displayName = document.getElementById('newAdminDisplay')?.value?.trim();
    const password    = document.getElementById('newAdminPw')?.value;
    const role        = document.getElementById('newAdminRole')?.value;
    
    // Gather checked permissions
    const checkedBoxes = document.querySelectorAll('.admin-permission-cb:checked');
    const allowedTabs = Array.from(checkedBoxes).map(cb => cb.value);

    if (!username || !password) return showToast('أدخل اسم المستخدم وكلمة المرور', 'error');
    if (password.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
    try {
        const res = await fetch(API_BASE + '/api/admin-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token: window.ADMIN_TOKEN, 
                username, 
                displayName: displayName || username, 
                password, 
                role,
                allowedTabs,
                playerId: playerId || null
            })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('addAdminModal');
            ['newAdminPlayerId','newAdminUsername','newAdminDisplay','newAdminPw'].forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.value = ''; 
            });
            const previewEl = document.getElementById('promotedPlayerPreview');
            if (previewEl) previewEl.style.display = 'none';
            showToast(`تم إنشاء حساب المشرف "${username}" بنجاح`);
            await loadData(); // Refresh table immediately
        } else {
            showToast(data.error || 'فشل إنشاء الحساب', 'error');
        }
    } catch (e) { showToast('تعذّر الاتصال بالخادم', 'error'); }
}


// ─── Data: Load from server / localStorage ───
async function loadData() {
    try {
        const res = await fetch(API_BASE + '/api/data');
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        providers    = (Array.isArray(data.providers) && data.providers.length > 0) ? data.providers : (JSON.parse(localStorage.getItem('masoudi_providers')) || defaultProviders());
        dynamicGames = (Array.isArray(data.games) && data.games.length > 0) ? data.games : (JSON.parse(localStorage.getItem('masoudi_games')) || defaultGames());
        players      = Array.isArray(data.players) ? data.players : [];
        settings     = data.settings  || settings;
        banners      = Array.isArray(data.banners) ? data.banners : [];
        admins       = Array.isArray(data.admins) ? data.admins : [];
        
        // Ensure agents is always an array (handling potential object conversion issues)
        if (Array.isArray(data.agents)) {
            agents = data.agents;
        } else if (data.agents && typeof data.agents === 'object') {
            agents = [data.agents];
        } else {
            agents = [];
        }
        receipts = Array.isArray(data.receipts) ? data.receipts : [];
    } catch (e) {
        console.warn('Falling back to localStorage:', e);
        providers    = JSON.parse(localStorage.getItem('masoudi_providers'))    || defaultProviders();
        dynamicGames = JSON.parse(localStorage.getItem('masoudi_games'))        || defaultGames();
        players      = JSON.parse(localStorage.getItem('masoudi_players'))      || defaultPlayers();
        agents       = JSON.parse(localStorage.getItem('masoudi_agents'))       || [];
        banners      = JSON.parse(localStorage.getItem('masoudi_banners'))      || [];
        settings     = JSON.parse(localStorage.getItem('masoudi_settings'))     || settings;
        receipts     = JSON.parse(localStorage.getItem('masoudi_receipts'))     || [];
        admins       = JSON.parse(localStorage.getItem('masoudi_admins'))       || [];
    }
    initSettingsUI();
    initGameConfigsUI();
    renderAll();
}

// ─── Data: Save ──────────────────────────────
async function saveData() {
    const payload = { settings, banners, agents, providers, games: dynamicGames, receipts };
    // Save to localStorage as instant fallback
    localStorage.setItem('masoudi_providers', JSON.stringify(providers));
    localStorage.setItem('masoudi_games',     JSON.stringify(dynamicGames));
    localStorage.setItem('masoudi_agents',    JSON.stringify(agents));
    localStorage.setItem('masoudi_banners',   JSON.stringify(banners));
    localStorage.setItem('masoudi_settings',  JSON.stringify(settings));
    localStorage.setItem('masoudi_receipts',  JSON.stringify(receipts));
    try {
        // Try the dedicated safe config endpoint first
        let res = await fetch(API_BASE + '/api/admin/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // If save-config endpoint is not deployed yet on server (404), fallback to /api/data
        if (res.status === 404) {
            res = await fetch(API_BASE + '/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        const result = await res.json();
        if (!res.ok || !result.success) {
            const errMsg = result.error || `HTTP ${res.status}`;
            console.error('[saveData] Server error:', errMsg);
            showToast('⚠️ فشل حفظ البيانات على الخادم: ' + errMsg, 'error');
        }
    } catch (e) {
        console.error('[saveData] Network error:', e);
        showToast('⚠️ خطأ في الاتصال بالخادم، تم الحفظ محلياً فقط', 'error');
    }
}

// ─── Render All ──────────────────────────────
function renderAll() {
    updateStats();
    renderPlayers();
    renderProvidersTable();
    renderAdminGamesTable();
    populateProviderSelect();
    renderAdminBannersTable();
    renderAdminAgentsTable();
    renderAdminP2pAgentsTable();
    loadPaymentGateways();
    renderReceiptsTable();
    renderAdminsTable();
}

// ─── Payment Gateways ─────────────────────────
let paymentGateways = {
    vodafone: { number: '', name: '', active: false },
    instapay: { number: '', name: '', active: false },
    orange:   { number: '', name: '', active: false },
    etisalat: { number: '', name: '', active: false },
    bank:     { account: '', bankName: '', holder: '', active: false },
    pricing:  []
};

function loadPaymentGateways() {
    // Load from settings object if present
    const gw = (settings.paymentGateways) ? settings.paymentGateways : null;
    if (!gw) return;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.style.display = val ? 'block' : 'none'; };

    if (gw.vodafone) {
        setVal('gw-vodafone-number', gw.vodafone.number);
        setVal('gw-vodafone-name', gw.vodafone.name);
        setChk('gw-vodafone-active', gw.vodafone.active);
        setStat('vodafone-status', gw.vodafone.active);
    }
    if (gw.instapay) {
        setVal('gw-instapay-number', gw.instapay.number);
        setVal('gw-instapay-name', gw.instapay.name);
        setChk('gw-instapay-active', gw.instapay.active);
        setStat('instapay-status', gw.instapay.active);
    }
    if (gw.orange) {
        setVal('gw-orange-number', gw.orange.number);
        setVal('gw-orange-name', gw.orange.name);
        setChk('gw-orange-active', gw.orange.active);
        setStat('orange-status', gw.orange.active);
    }
    if (gw.etisalat) {
        setVal('gw-etisalat-number', gw.etisalat.number);
        setVal('gw-etisalat-name', gw.etisalat.name);
        setChk('gw-etisalat-active', gw.etisalat.active);
        setStat('etisalat-status', gw.etisalat.active);
    }
    if (gw.bank) {
        setVal('gw-bank-account', gw.bank.account);
        setVal('gw-bank-name', gw.bank.bankName);
        setVal('gw-bank-holder', gw.bank.holder);
        setChk('gw-bank-active', gw.bank.active);
        setStat('bank-status', gw.bank.active);
    }
    // Load pricing rows
    if (Array.isArray(gw.pricing) && gw.pricing.length > 0) {
        const container = document.getElementById('pricingTableInputs');
        if (container) {
            container.innerHTML = '';
            gw.pricing.forEach(p => {
                const row = document.createElement('div');
                row.className = 'pricing-row';
                row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
                row.innerHTML = `
                    <input type="number" class="price-coins" value="${p.coins || ''}" placeholder="ر.س" style="width:40%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:10px;padding:10px;color:#fff;font-family:'Cairo';font-size:13px;outline:none;">
                    <input type="number" class="price-egp" value="${p.egp || ''}" placeholder="جنيه" style="width:40%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:10px;padding:10px;color:#fff;font-family:'Cairo';font-size:13px;outline:none;">
                    <button onclick="removePricingRow(this)" style="background:rgba(255,82,82,0.15);border:none;color:#FF5252;border-radius:10px;padding:8px 12px;cursor:pointer;font-size:14px;">✕</button>`;
                container.appendChild(row);
            });
        }
    }
    paymentGateways = { ...paymentGateways, ...gw };
}

function addPricingRow() {
    const container = document.getElementById('pricingTableInputs');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'pricing-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
    row.innerHTML = `
        <input type="number" class="price-coins" placeholder="ر.س" style="width:40%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:10px;padding:10px;color:#fff;font-family:'Cairo';font-size:13px;outline:none;">
        <input type="number" class="price-egp" placeholder="جنيه" style="width:40%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:10px;padding:10px;color:#fff;font-family:'Cairo';font-size:13px;outline:none;">
        <button onclick="removePricingRow(this)" style="background:rgba(255,82,82,0.15);border:none;color:#FF5252;border-radius:10px;padding:8px 12px;cursor:pointer;font-size:14px;">✕</button>`;
    container.appendChild(row);
}

function removePricingRow(btn) {
    btn.closest('.pricing-row')?.remove();
}

function savePaymentGateways() {
    const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
    const getChk = (id) => document.getElementById(id)?.checked || false;

    // Collect pricing rows
    const pricing = [];
    document.querySelectorAll('#pricingTableInputs .pricing-row').forEach(row => {
        const coins = parseFloat(row.querySelector('.price-coins')?.value) || 0;
        const egp   = parseFloat(row.querySelector('.price-egp')?.value) || 0;
        if (coins > 0 && egp > 0) pricing.push({ coins, egp });
    });

    settings.paymentGateways = {
        vodafone: {
            number: getVal('gw-vodafone-number'),
            name:   getVal('gw-vodafone-name'),
            active: getChk('gw-vodafone-active')
        },
        instapay: {
            number: getVal('gw-instapay-number'),
            name:   getVal('gw-instapay-name'),
            active: getChk('gw-instapay-active')
        },
        orange: {
            number: getVal('gw-orange-number'),
            name:   getVal('gw-orange-name'),
            active: getChk('gw-orange-active')
        },
        etisalat: {
            number: getVal('gw-etisalat-number'),
            name:   getVal('gw-etisalat-name'),
            active: getChk('gw-etisalat-active')
        },
        bank: {
            account:  getVal('gw-bank-account'),
            bankName: getVal('gw-bank-name'),
            holder:   getVal('gw-bank-holder'),
            active:   getChk('gw-bank-active')
        },
        pricing
    };

    saveData();
    showToast('تم حفظ إعدادات بوابات الشحن بنجاح ✅');
    loadPaymentGateways(); // Refresh status indicators
}
window.savePaymentGateways = savePaymentGateways;
window.addPricingRow = addPricingRow;
window.removePricingRow = removePricingRow;

// ─── Stats ───────────────────────────────────
function updateStats() {
    const active  = players.filter(p => p.status === 'active').length;
    const total   = players.reduce((s, p) => s + (p.balance || 0), 0);
    document.getElementById('statTotalPlayers').textContent = players.length;
    document.getElementById('statActivePlayers').textContent = active;
    document.getElementById('statTotalBalance').textContent  = formatNum(total) + ' $';
    document.getElementById('playerCountBadge').textContent  = `${players.length} لاعب`;
}

// ─── Tab Switch ──────────────────────────────
function switchTab(id) {
    // Hide main grid screen
    const mainGrid = document.getElementById('main-grid-screen');
    if (mainGrid) mainGrid.style.display = 'none';

    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    // Show target panel
    const targetPanel = document.getElementById(id);
    if (targetPanel) {
        targetPanel.style.display = 'block';
        targetPanel.classList.add('active');
    }
    
    const clickedTab = Array.from(document.querySelectorAll('.admin-tab')).find(t => {
        const onclickAttr = t.getAttribute('onclick') || '';
        return onclickAttr.includes(`'${id}'`) || onclickAttr.includes(`"${id}"`);
    });
    if (clickedTab) clickedTab.classList.add('active');

    // Close mobile sidebar drawer if open
    if (typeof window.toggleSidebar === 'function') {
        window.toggleSidebar(false);
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

function goBackToGrid() {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    
    // Show main grid screen
    const mainGrid = document.getElementById('main-grid-screen');
    if (mainGrid) mainGrid.style.display = 'block';

    // Scroll to top
    window.scrollTo(0, 0);
}
window.goBackToGrid = goBackToGrid;

// ─── Toggle Add Player Form ──────────────────
function toggleAddPlayerForm() {
    const form = document.getElementById('addPlayerForm');
    form.classList.toggle('open');
}

// ─── Render Players ──────────────────────────
function renderPlayers() {
    const query  = (document.getElementById('playerSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('playerFilter')?.value || 'all';
    const container = document.getElementById('playersContainer');
    if (!container) return;

    const filtered = players.filter(p => {
        const matchFilter = filter === 'all' || p.status === filter;
        const matchQuery  = !query ||
            (p.name  || '').toLowerCase().includes(query) ||
            (p.email || '').toLowerCase().includes(query) ||
            (p.id    || '').includes(query);
        return matchFilter && matchQuery;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:#666;padding:30px;font-size:13px;">لا يوجد لاعبون مطابقون</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => buildPlayerCard(p)).join('');
}

function buildPlayerCard(p) {
    const initial  = (p.name || '?')[0];
    const isActive = p.status === 'active';
    const statusText = isActive ? 'نشط' : 'موقوف';
    const statusBg = isActive ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.12)';
    const statusColor = isActive ? '#00E676' : '#FF5252';
    const statusBorder = isActive ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 82, 82, 0.25)';
    const statusIcon = isActive ? 'fa-solid fa-circle' : 'fa-solid fa-circle-minus';
    const txHtml   = buildMiniTx(p.transactions || []);
    
    // Use wsrv.nl proxy to bypass Google photo CORS/referrer restrictions in WebView
    const rawPhoto = p.photoUrl || '';
    const proxyPhoto = rawPhoto ? `https://wsrv.nl/?url=${encodeURIComponent(rawPhoto)}&w=80&h=80&fit=cover&mask=circle` : '';
    const avatarContent = proxyPhoto
        ? `<img src="${proxyPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.src=''; this.style.display='none'; this.parentElement.innerText='${initial}'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center';">`
        : initial;

    return `
    <div class="player-card" id="card-${p.id}">
        <!-- Card Header / Avatar & Info -->
        <div class="player-card-main-info" onclick="toggleCard('${p.id}')">
            <div class="admin-player-avatar">${avatarContent}</div>
            <div class="player-details-col">
                <div class="player-name-admin">${p.name} <span style="font-size:11px;color:#888;font-weight:normal;margin-right:6px;">#${p.id}</span></div>
                <div class="player-badges-row">
                    <span class="badge-balance">💵 ${formatNum(p.balance || 0)} $</span>
                    <span class="badge-status" style="background:${statusBg}; color:${statusColor}; border:1px solid ${statusBorder};">
                        <i class="${statusIcon}" style="font-size:8px; margin-left:4px;"></i> ${statusText}
                    </span>
                </div>
            </div>
        </div>

        <!-- Action Buttons (Side by Side) -->
        <div class="player-card-actions-row">
            <button class="btn-card-outline" onclick="toggleCard('${p.id}')">
                <span id="btn-text-${p.id}"><i class="fa-solid fa-user-gear" style="margin-left:4px;"></i>عرض الملف</span>
            </button>
            <button class="btn-card-solid" onclick="openWalletModal('${p.id}')">
                <i class="fa-solid fa-wallet" style="margin-left:4px;"></i>إدارة الحساب
            </button>
        </div>

        <div class="player-controls" id="ctrl-${p.id}">
            <!-- Info rows -->
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-hashtag"></i> معرف اللاعب (ID)</span>
                <span class="val">#${p.id}</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-envelope"></i> البريد الإلكتروني</span>
                <span class="val" style="font-family:monospace;font-size:11px;color:#fff;">${p.email || '—'}</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-wallet"></i> الرصيد الرئيسي</span>
                <span class="val" id="bal-${p.id}">${formatNum(p.balance || 0)} $</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-gift"></i> رصيد المكافآت</span>
                <span class="val" style="color:#00E676;" id="bon-${p.id}">${formatNum(p.bonus || 0)} $</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-calendar"></i> تاريخ الانضمام</span>
                <span class="val">${p.joinDate || '—'}</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-clock"></i> آخر دخول</span>
                <span class="val">${p.lastLogin || '—'}</span>
            </div>

            <!-- Action Buttons -->
            <div class="control-grid" style="margin-top:14px;">
                ${isActive
                    ? `<button class="btn-action btn-suspend" onclick="toggleStatus('${p.id}')"><i class="fa-solid fa-ban"></i> إيقاف الحساب</button>`
                    : `<button class="btn-action btn-activate" onclick="toggleStatus('${p.id}')"><i class="fa-solid fa-circle-check"></i> تفعيل الحساب</button>`
                }
                <button class="btn-action btn-reset-pw" onclick="resetBalance('${p.id}')">
                    <i class="fa-solid fa-rotate"></i> تصفير الرصيد
                </button>
                <button class="btn-action btn-delete-player" onclick="openDeleteModal('${p.id}')">
                    <i class="fa-solid fa-trash-can"></i> حذف الحساب
                </button>
            </div>

            <!-- Quick wallet inline -->
            <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.05);padding-top:14px;">
                <div style="font-size:12px;color:#888;margin-bottom:8px;font-weight:700;">⚡ إجراء سريع على المحفظة (شحن)</div>
                <div class="wallet-action-row">
                    <input type="number" id="quick-amount-${p.id}" placeholder="المبلغ" min="1">
                    <button class="btn-action btn-add-funds" onclick="quickWallet('${p.id}','add')" style="width: 100%;">
                        <i class="fa-solid fa-plus"></i> إضافة رصيد
                    </button>
                </div>
            </div>

            <!-- Mini TX List -->
            ${txHtml}
        </div>
    </div>`;
}

function buildMiniTx(txs) {
    if (!Array.isArray(txs) || txs.length === 0) return '';
    const rows = txs.slice(-5).reverse().map(tx => {
        const isPos = tx.amount > 0;
        return `<div class="mini-tx-row">
            <span style="color:#aaa;">${tx.type} — ${tx.date}</span>
            <span class="tx-amt ${isPos?'pos':'neg'}">${isPos?'+':''}${formatNum(tx.amount)} $</span>
        </div>`;
    }).join('');
    return `
    <div class="mini-tx-list">
        <div style="font-size:11px;color:#666;margin-bottom:6px;margin-top:14px;">آخر العمليات</div>
        ${rows}
    </div>`;
}

// ─── Toggle Card Expand ──────────────────────
function toggleCard(id) {
    const ctrl = document.getElementById(`ctrl-${id}`);
    const btnText = document.getElementById(`btn-text-${id}`);
    const isOpen = ctrl.classList.toggle('open');
    if (btnText) {
        btnText.innerHTML = isOpen 
            ? `<i class="fa-solid fa-eye-slash" style="margin-left:4px;"></i>إخفاء الملف` 
            : `<i class="fa-solid fa-user-gear" style="margin-left:4px;"></i>عرض الملف`;
    }
}

// ─── Wallet Modal ────────────────────────────
function openWalletModal(id) {
    const p = players.find(x => String(x.id) === String(id));
    if (!p) return;
    currentWalletPlayerId = p.id;
    document.getElementById('modalPlayerName').textContent = p.name;
    document.getElementById('modalPlayerId').textContent   = p.id;
    document.getElementById('modalBalance').textContent    = `${formatNum(p.balance || 0)} $`;
    document.getElementById('modalBonus').textContent      = `${formatNum(p.bonus || 0)} $`;
    document.getElementById('modalAmount').value = '';
    document.getElementById('walletModal').classList.add('open');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

function executeWalletAction() {
    const id     = currentWalletPlayerId;
    const amount = parseFloat(document.getElementById('modalAmount').value);
    const action = document.getElementById('modalAction').value;
    if (!id || isNaN(amount) || amount <= 0) return showToast('أدخل مبلغاً صحيحاً', 'error');

    fetch(API_BASE + '/api/admin/update-player-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id, amount, action })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeModal('walletModal');
            showToast(`تمت العملية بنجاح 🚀`);
            loadData(); // Re-fetch all fresh data from db.json
        } else {
            showToast(data.error || 'فشلت العملية', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

// ─── Quick Wallet ────────────────────────────
function quickWallet(id, direction) {
    const input  = document.getElementById(`quick-amount-${id}`);
    const amount = parseFloat(input?.value);
    if (isNaN(amount) || amount <= 0) return showToast('أدخل مبلغاً صحيحاً', 'error');

    fetch(API_BASE + '/api/admin/update-player-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id, amount, action: 'add_primary' })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (input) input.value = '';
            showToast(`تم إضافة الرصيد بنجاح 🚀`);
            loadData();
        } else {
            showToast(data.error || 'فشلت العملية', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

// ─── Toggle Status ───────────────────────────
function toggleStatus(id) {
    fetch(API_BASE + '/api/admin/toggle-player-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const statusMsg = data.player.status === 'active' ? 'نشط' : 'موقوف';
            showToast(`تم تغيير حالة اللاعب إلى: ${statusMsg}`);
            loadData();
        } else {
            showToast(data.error || 'فشلت العملية', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

// ─── Reset Balance ───────────────────────────
function resetBalance(id) {
    if (!confirm('هل أنت متأكد من تصفير رصيد اللاعب بالكامل؟')) return;
    fetch(API_BASE + '/api/admin/reset-player-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(`تم تصفير رصيد اللاعب بنجاح`);
            loadData();
        } else {
            showToast(data.error || 'فشلت العملية', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

// ─── Delete Player ───────────────────────────
function openDeleteModal(id) {
    const p = players.find(x => String(x.id) === String(id));
    if (!p) return;
    currentDeletePlayerId = p.id;
    document.getElementById('deletePlayerName').textContent = p.name;
    document.getElementById('deleteModal').classList.add('open');
}

function confirmDeletePlayer() {
    if (!currentDeletePlayerId) return;

    fetch(API_BASE + '/api/admin/delete-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentDeletePlayerId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeModal('deleteModal');
            showToast(`تم حذف حساب اللاعب بنجاح`, 'error');
            currentDeletePlayerId = null;
            loadData();
        } else {
            showToast(data.error || 'فشل حذف اللاعب', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

// ─── Add New Player ──────────────────────────
function addNewPlayer() {
    const name    = document.getElementById('newPlayerName')?.value?.trim();
    const email   = document.getElementById('newPlayerEmail')?.value?.trim();
    const balance = parseFloat(document.getElementById('newPlayerBalance')?.value) || 0;
    const status  = document.getElementById('newPlayerStatus')?.value || 'active';
    if (!name) return showToast('أدخل اسم اللاعب', 'error');
    fetch(API_BASE + '/api/admin/add-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, balance, status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Clear form
            ['newPlayerName','newPlayerEmail','newPlayerBalance'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('addPlayerForm').classList.remove('open');
            showToast(`تم إنشاء حساب اللاعب ${name} بنجاح 🚀`);
            loadData();
        } else {
            showToast(data.error || 'فشل إنشاء اللاعب', 'error');
        }
    })
    .catch(err => showToast('خطأ في الاتصال بالخادم: ' + err, 'error'));
}

function translateTag(t) {
    if (!t) return '';
    const clean = t.trim().toLowerCase();
    if (clean === 'hot' || clean === 'popular' || clean === 'شائع') return '🔥 شائع';
    if (clean === 'new' || clean === 'جديد') return '✨ جديد';
    if (clean === 'vip' || clean === 'حصري') return '👑 VIP';
    if (clean === 'jackpot' || clean === 'جاكبوت') return '💰 جاكبوت';
    return t;
}

// ─── Providers ───────────────────────────────
function renderProvidersTable() {
    const tbody = document.getElementById('providersTableBody');
    if (!tbody) return;
    if (providers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#666;padding:15px;">لا توجد شركات مزودة</td></tr>`;
        return;
    }
    tbody.innerHTML = providers.map((prov, i) => `
        <tr>
            <td><strong>${prov.name}</strong></td>
            <td style="font-family:monospace;font-size:10px;color:#888;">${prov.url}</td>
            <td><span class="status-badge status-success"><i class="fa-solid fa-signal"></i> متصل</span></td>
            <td><button class="btn-delete-row" onclick="deleteProvider(${i})"><i class="fa-solid fa-trash-can"></i> حذف</button></td>
        </tr>`).join('');
}

function addNewProvider() {
    const name = document.getElementById('providerNameInput')?.value?.trim();
    const url  = document.getElementById('providerApiInput')?.value?.trim();
    const key  = document.getElementById('providerKeyInput')?.value?.trim();
    if (!name || !url) return showToast('أدخل اسم الشركة والرابط', 'error');
    providers.push({ name, url, key });
    ['providerNameInput','providerApiInput','providerKeyInput'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    saveData(); renderAll();
    showToast(`تم ربط ${name} بنجاح`);
}

function deleteProvider(i) {
    const name = providers[i]?.name;
    providers.splice(i, 1);
    saveData(); renderAll();
    showToast(`تم حذف ${name}`, 'error');
}

// ─── Games ───────────────────────────────────
function renderAdminGamesTable() {
    const tbody = document.getElementById('adminGamesTableBody');
    if (!tbody) return;
    if (dynamicGames.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#666;padding:15px;">لا توجد ألعاب مضافة</td></tr>`;
        return;
    }
    tbody.innerHTML = dynamicGames.map((g, i) => {
        const imgUrl = g.image ? resolveImageUrl(g.image) : 'images/slots.png';
        const tagBadgeHtml = g.tag ? `<span class="status-badge" style="background:rgba(255,122,31,0.15);color:#FF7A1F;border-color:rgba(255,122,31,0.3);margin-right:6px;font-size:10px;">${translateTag(g.tag)}</span>` : '';
        return `
        <tr>
            <td style="text-align:center; vertical-align:middle; padding:8px;">
                <img src="${imgUrl}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1.5px solid rgba(255,122,31,0.25);box-shadow:0 3px 6px rgba(0,0,0,0.3);" onerror="this.src='images/slots.png'">
            </td>
            <td style="vertical-align:middle;"><strong>${g.title}</strong> ${tagBadgeHtml}</td>
            <td style="vertical-align:middle;"><span class="status-badge" style="background:rgba(255,255,255,0.05);color:#fff;border-color:rgba(255,255,255,0.1);">${translateCategory(g.category)}</span></td>
            <td style="vertical-align:middle;color:var(--orange);font-weight:700;">${g.provider}</td>
            <td style="vertical-align:middle;text-align:center;">
                <div style="display:flex;gap:6px;justify-content:center;align-items:center;">
                    <button class="btn-action btn-add-funds" onclick="editGame(${i})" style="padding:6px 12px;font-size:11px;margin:0;width:auto;height:auto;border-radius:6px;background:rgba(0,230,118,0.12);color:#00E676;border:1px solid rgba(0,230,118,0.25);"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                    <button class="btn-delete-row" onclick="deleteGame(${i})" style="padding:6px 12px;font-size:11px;margin:0;width:auto;height:auto;border-radius:6px;"><i class="fa-solid fa-trash-can"></i> حذف</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function editGame(index) {
    const g = dynamicGames[index];
    if (!g) return;

    document.getElementById('editGameIndex').value = index;
    document.getElementById('editGameNameInput').value = g.title || '';
    document.getElementById('editGameCategoryInput').value = g.category || 'slots';
    const tagSelect = document.getElementById('editGameTagInput');
    if (tagSelect) tagSelect.value = g.tag || '';
    document.getElementById('editGameLaunchUrlInput').value = g.launchUrl || '';
    document.getElementById('editGameImageInputVal').value = g.image || '';
    document.getElementById('editGameUploadStatus').textContent = 'يمكنك رفع صورة جديدة أو تعديل المسار';
    document.getElementById('editGameUploadStatus').style.color = '#888';

    // Populate provider select in modal
    const select = document.getElementById('editGameProviderSelect');
    if (select) {
        select.innerHTML = providers.map(p => `<option value="${p.name}" ${p.name === g.provider ? 'selected' : ''}>${p.name}</option>`).join('');
    }

    document.getElementById('editGameModal').classList.add('open');
}

async function saveEditedGame() {
    const index = parseInt(document.getElementById('editGameIndex').value, 10);
    if (isNaN(index) || index < 0 || index >= dynamicGames.length) return;

    const title    = document.getElementById('editGameNameInput')?.value?.trim();
    const category = document.getElementById('editGameCategoryInput')?.value;
    const provider = document.getElementById('editGameProviderSelect')?.value;
    const tag      = document.getElementById('editGameTagInput')?.value || '';
    const url      = document.getElementById('editGameLaunchUrlInput')?.value?.trim();
    const image    = document.getElementById('editGameImageInputVal')?.value?.trim() || 'images/slots.png';

    if (!title || !url) return showToast('أدخل اسم اللعبة والرابط', 'error');

    dynamicGames[index] = {
        ...dynamicGames[index],
        title,
        category,
        provider,
        tag,
        launchUrl: url,
        image
    };

    closeModal('editGameModal');
    await saveData();
    renderAll();
    showToast(`تم تحديث لعبة: ${title}`);
}

async function addNewGame() {
    const title    = document.getElementById('gameNameInput')?.value?.trim();
    const category = document.getElementById('gameCategoryInput')?.value;
    const provider = document.getElementById('gameProviderSelect')?.value;
    const tag      = document.getElementById('gameTagInput')?.value || '';
    const url      = document.getElementById('gameLaunchUrlInput')?.value?.trim();
    const image    = document.getElementById('gameImageInputVal')?.value?.trim() || 'images/slots.png';
    if (!title || !url) return showToast('أدخل اسم اللعبة والرابط', 'error');
    const id = `game-${Date.now()}`;
    dynamicGames.push({ id, title, category, provider, tag, launchUrl: url, image });
    ['gameNameInput','gameLaunchUrlInput','gameImageInputVal','gameTagInput'].forEach(x => { const el=document.getElementById(x); if(el) el.value=''; });
    const statusEl = document.getElementById('gameUploadStatus');
    if (statusEl) statusEl.textContent = 'يمكنك كتابة المسار يدوياً أو الضغط على رفع';
    await saveData(); renderAll();
    showToast(`تمت إضافة لعبة: ${title}`);
}

async function deleteGame(i) {
    const name = dynamicGames[i]?.title;
    dynamicGames.splice(i, 1);
    await saveData(); renderAll();
    showToast(`تم حذف ${name}`, 'error');
}

function populateProviderSelect() {
    const select = document.getElementById('gameProviderSelect');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>اختر الشركة المزودة...</option>' +
        providers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

function translateCategory(cat) {
    return { slots:'سلوتس', table:'ألعاب طاولة', live:'كازينو مباشر', crash:'لعبة فورية' }[cat] || cat;
}

// ─── Toast ───────────────────────────────────
function showToast(message, type = 'success') {
    const toast    = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    toastMsg.innerText = message;
    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check text-emerald';
        toast.style.borderColor = 'var(--emerald-primary)';
    } else {
        toastIcon.className = 'fa-solid fa-circle-exclamation text-danger';
        toast.style.borderColor = '#ff5252';
    }
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}
window.showToast = showToast;

// ─── Utilities ───────────────────────────────
function formatNum(n) {
    return Number(n).toLocaleString('en');
}

// ─── Default Data ────────────────────────────
function defaultProviders() {
    return [
        { name:'Pragmatic Play',   url:'https://api.pragmaticplay.com/v1', key:'prag_secret' },
        { name:'Evolution Gaming', url:'https://api.evolution.com/v1',     key:'evo_secret'  }
    ];
}
function defaultGames() {
    return [
        { id:'game-1', title:'روليت البرق', category:'live',  provider:'Evolution Gaming', launchUrl:'https://v1.evolution.com/demo', image:'images/roulette.png' },
        { id:'game-2', title:'فتحات أوليمبوس', category:'slots', provider:'Pragmatic Play', launchUrl:'https://demo.pragmaticplay.com', image:'images/slots.png' }
    ];
}
function defaultPlayers() {
    return [
        { id:'100001', name:'أحمد محمد',   email:'ahmed@example.com',  balance:5000,  bonus:500,  status:'active',    joinDate:'2026-01-15', lastLogin:'2026-07-05', transactions:[] },
        { id:'100002', name:'سارة علي',    email:'sara@example.com',   balance:12500, bonus:1200, status:'active',    joinDate:'2026-02-20', lastLogin:'2026-07-04', transactions:[] },
        { id:'100003', name:'محمد الخالد', email:'mkhalid@example.com', balance:800,   bonus:0,    status:'suspended', joinDate:'2026-03-10', lastLogin:'2026-06-20', transactions:[] }
    ];
}

// ─── Settings Helper Functions ────────────────
function initSettingsUI() {
    const enablePreview = document.getElementById('settingEnablePreview');
    const showBalance   = document.getElementById('settingShowBalance');
    const showLiveBadge = document.getElementById('settingShowLiveBadge');
    const playBtnText   = document.getElementById('settingPlayButtonText');
    const coinBuyRate   = document.getElementById('settingCoinBuyRate');
    const coinSellRate  = document.getElementById('settingCoinSellRate');

    if (enablePreview) enablePreview.checked = !!settings.enablePreview;
    if (showBalance)   showBalance.checked   = !!settings.showBalance;
    if (showLiveBadge) showLiveBadge.checked = !!settings.showLiveBadge;
    if (playBtnText)   playBtnText.value     = settings.playButtonText || "العب الآن";
    if (coinBuyRate)   coinBuyRate.value     = settings.coinBuyRate || 10000;
    if (coinSellRate)  coinSellRate.value    = settings.coinSellRate || 20000;

    // Load category names
    const catSlots = document.getElementById('categoryNameSlots');
    const catLive = document.getElementById('categoryNameLive');
    const catTable = document.getElementById('categoryNameTable');
    const catCrash = document.getElementById('categoryNameCrash');
    const catNames = settings.categoryNames || {};
    if (catSlots) catSlots.value = catNames.slots || "سلوتس";
    if (catLive) catLive.value = catNames.live || "كازينو مباشر";
    if (catTable) catTable.value = catNames.table || "ألعاب الطاولة";
    if (catCrash) catCrash.value = catNames.crash || "ألعاب فورية";

    // Load PG Soft Config
    const pgIsProd = document.getElementById('settingPgIsProduction');
    const pgStagingToken = document.getElementById('settingPgStagingOperatorToken');
    const pgStagingKey = document.getElementById('settingPgStagingSecretKey');
    const pgProductionToken = document.getElementById('settingPgProductionOperatorToken');
    const pgProductionKey = document.getElementById('settingPgProductionSecretKey');
    const pgCurrency = document.getElementById('settingPgCurrency');

    const pgConfig = settings.pgConfig || {};
    if (pgIsProd) pgIsProd.checked = !!pgConfig.isProduction;
    if (pgStagingToken) pgStagingToken.value = pgConfig.stagingOperatorToken || "I-6c19673883aa410b98d1c0cb1a3c5edc";
    if (pgStagingKey) pgStagingKey.value = pgConfig.stagingSecretKey || "c89632307f734f6192fa420864a2c847";
    if (pgProductionToken) pgProductionToken.value = pgConfig.productionOperatorToken || "a5fd4c1a25904aae8729516557c160d0";
    if (pgProductionKey) pgProductionKey.value = pgConfig.productionSecretKey || "c89632307f734f6192fa420864a2c847";
    if (pgCurrency) pgCurrency.value = pgConfig.currency || "USD";
}

async function saveSettings() {
    const enablePreview = document.getElementById('settingEnablePreview')?.checked;
    const showBalance   = document.getElementById('settingShowBalance')?.checked;
    const showLiveBadge = document.getElementById('settingShowLiveBadge')?.checked;
    const playBtnText   = document.getElementById('settingPlayButtonText')?.value?.trim();
    const coinBuyRate   = parseInt(document.getElementById('settingCoinBuyRate')?.value?.trim(), 10) || 10000;
    const coinSellRate  = parseInt(document.getElementById('settingCoinSellRate')?.value?.trim(), 10) || 20000;

    // Read category names
    const catSlots = document.getElementById('categoryNameSlots')?.value?.trim() || "سلوتس";
    const catLive = document.getElementById('categoryNameLive')?.value?.trim() || "كازينو مباشر";
    const catTable = document.getElementById('categoryNameTable')?.value?.trim() || "ألعاب الطاولة";
    const catCrash = document.getElementById('categoryNameCrash')?.value?.trim() || "ألعاب فورية";

    // Read PG Soft Config
    const pgIsProdChecked = !!document.getElementById('settingPgIsProduction')?.checked;
    
    // SAFETY: Confirm before enabling Production Mode
    if (pgIsProdChecked) {
        const confirmed = confirm(
            '⚠️ تحذير: أنت على وشك تفعيل بيئة الإنتاج الحقيقية (Production Mode)!\n\n' +
            'هذا سيستخدم رمز المشغل الحقيقي وسيؤثر على حسابات اللاعبين الحقيقيين.\n\n' +
            'هل أنت متأكد أن شركة PG Soft وافقت على الانتقال للإنتاج؟\n\n' +
            'اضغط "موافق" فقط إذا كنت متأكداً 100%.'
        );
        if (!confirmed) {
            // Revert the checkbox
            const pgIsProdEl = document.getElementById('settingPgIsProduction');
            if (pgIsProdEl) pgIsProdEl.checked = false;
            showToast('⚠️ تم إلغاء تفعيل بيئة الإنتاج', 'warning');
            return;
        }
    }
    
    const pgIsProd = pgIsProdChecked;
    const pgStagingToken = document.getElementById('settingPgStagingOperatorToken')?.value?.trim() || "I-6c19673883aa410b98d1c0cb1a3c5edc";
    const pgStagingKey = document.getElementById('settingPgStagingSecretKey')?.value?.trim() || "c89632307f734f6192fa420864a2c847";
    const pgProductionToken = document.getElementById('settingPgProductionOperatorToken')?.value?.trim() || "a5fd4c1a25904aae8729516557c160d0";
    const pgProductionKey = document.getElementById('settingPgProductionSecretKey')?.value?.trim() || "c89632307f734f6192fa420864a2c847";
    const pgCurrency = document.getElementById('settingPgCurrency')?.value?.trim() || "USD";

    settings = {
        enablePreview: enablePreview !== undefined ? enablePreview : true,
        showBalance: showBalance !== undefined ? showBalance : true,
        showLiveBadge: showLiveBadge !== undefined ? showLiveBadge : true,
        playButtonText: playBtnText || "العب الآن",
        coinBuyRate: coinBuyRate,
        coinSellRate: coinSellRate,
        categoryNames: {
            slots: catSlots,
            live: catLive,
            table: catTable,
            crash: catCrash
        },
        pgConfig: {
            isProduction: pgIsProd,
            stagingOperatorToken: pgStagingToken,
            stagingSecretKey: pgStagingKey,
            productionOperatorToken: pgProductionToken,
            productionSecretKey: pgProductionKey,
            currency: pgCurrency
        }
    };

    await saveData();
    showToast('تم حفظ الإعدادات وتطبيقها على جميع الأجهزة بنجاح ✅');
}

// ─── Banners Helper Functions ─────────────────
function renderAdminBannersTable() {
    const tbody = document.getElementById('adminBannersTableBody');
    if (!tbody) return;
    if (banners.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#666;padding:15px;">لا توجد بنرات إعلانية نشطة حالياً</td></tr>`;
        return;
    }
    tbody.innerHTML = banners.map((b, i) => {
        const previewHtml = b.image 
            ? `<img src="${resolveImageUrl(b.image)}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;border:1px solid var(--border);">` 
            : `<span style="font-size:12px;color:#888;padding:6px;border:1px dashed var(--border);border-radius:6px;">بدون صورة (${b.theme})</span>`;

        return `
        <tr>
            <td>${previewHtml}</td>
            <td><button class="btn-delete-row" onclick="deleteBanner(${i})"><i class="fa-solid fa-trash-can"></i> حذف</button></td>
        </tr>`;
    }).join('');
}

function addNewBanner() {
    const image    = document.getElementById('newBannerImage')?.value?.trim() || '';
    const theme    = document.getElementById('newBannerTheme')?.value;

    const id = `banner-${Date.now()}`;
    banners.push({ id, title: '', subtitle: '', badge: '', icon: '', image, theme });

    // Clear form
    ['newBannerImage'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });

    saveData();
    renderAll();
    showToast(`تمت إضافة البنّر بنجاح 🚀`);
}

function deleteBanner(i) {
    const title = banners[i]?.title;
    banners.splice(i, 1);
    saveData();
    renderAll();
    showToast(`تم حذف البنّر "${title}"`, 'error');
}

async function uploadLocalImage(fileInputId, textInputId, statusId) {
    const fileInput = document.getElementById(fileInputId);
    const textInput = document.getElementById(textInputId);
    const statusEl  = document.getElementById(statusId);

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--orange);"></i> جاري رفع الصورة...`;
    statusEl.style.color = 'var(--orange)';

    const reader = new FileReader();
    reader.onerror = () => {
        statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#ff5252;"></i> فشل قراءة الملف`;
        statusEl.style.color = '#ff5252';
        showToast('فشل قراءة ملف الصورة', 'error');
    };
    reader.onload = async function(e) {
        const base64Data = e.target.result;
        try {
            const res = await fetch(API_BASE + '/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileData: base64Data })
            });
            const data = await res.json();
            if (data.success && data.url) {
                textInput.value = data.url;
                statusEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#00E676;"></i> تم الرفع بنجاح: ${data.url}`;
                statusEl.style.color = '#00E676';
                showToast('تم رفع الصورة بنجاح ✅');
            } else {
                statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#ff5252;"></i> فشل الرفع: ${data.error || 'خطأ غير معروف'}`;
                statusEl.style.color = '#ff5252';
                showToast(data.error || 'فشل رفع الصورة', 'error');
            }
        } catch (err) {
            statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#ff5252;"></i> تعذّر الاتصال بالخادم`;
            statusEl.style.color = '#ff5252';
            showToast('تعذر الاتصال بالخادم لرفع الصورة', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ─── Recharging Agents Helper Functions ───────
// ─── Multi-Country Tag Helpers ────────────────────────────────────────────
let _agentSelectedCountries = [];

function addAgentCountryTag(val) {
    if (!val) return;
    if (_agentSelectedCountries.includes(val)) return; // no duplicate
    _agentSelectedCountries.push(val);
    renderAgentCountryTags();
    // Reset selector back to placeholder
    const sel = document.getElementById('newAgentCountrySelector');
    if (sel) sel.value = '';
}

function removeAgentCountryTag(val) {
    _agentSelectedCountries = _agentSelectedCountries.filter(c => c !== val);
    renderAgentCountryTags();
}

function renderAgentCountryTags() {
    const container = document.getElementById('agentCountriesTags');
    const placeholder = document.getElementById('agentCountriesPlaceholder');
    const hidden = document.getElementById('newAgentCountriesHidden');
    if (!container) return;
    // Remove all existing tags
    container.querySelectorAll('.country-tag').forEach(el => el.remove());
    if (_agentSelectedCountries.length === 0) {
        if (placeholder) placeholder.style.display = 'inline';
    } else {
        if (placeholder) placeholder.style.display = 'none';
        _agentSelectedCountries.forEach(function(c) {
            var tag = document.createElement('span');
            tag.className = 'country-tag';
            tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(255,122,31,0.18);color:var(--orange);border:1px solid rgba(255,122,31,0.5);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:bold;';
            var labelNode = document.createTextNode(c + '  ');
            var removeBtn = document.createElement('span');
            removeBtn.textContent = '\u00D7';
            removeBtn.style.cssText = 'color:#ff5252;font-weight:bold;font-size:15px;line-height:1;cursor:pointer;margin-right:2px;';
            var cCopy = c;
            removeBtn.addEventListener('click', function() { removeAgentCountryTag(cCopy); });
            tag.appendChild(labelNode);
            tag.appendChild(removeBtn);
            container.appendChild(tag);
        });
    }
    if (hidden) hidden.value = JSON.stringify(_agentSelectedCountries);
}

function resetAgentCountryTags() {
    _agentSelectedCountries = [];
    renderAgentCountryTags();
}

function renderAdminAgentsTable() {
    const tbody = document.getElementById('adminAgentsTableBody');
    if (!tbody) return;
    if (!window.agents) window.agents = [];
    if (agents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#666;padding:15px;">لا يوجد وكلاء شحن مضافين حالياً</td></tr>`;
        return;
    }
    tbody.innerHTML = agents.map((ag, i) => {
        // Support both old `country` (string) and new `countries` (array)
        const countriesList = Array.isArray(ag.countries) && ag.countries.length
            ? ag.countries
            : (ag.country ? [ag.country] : ['—']);
        const countriesBadges = countriesList.map(c =>
            `<span class="status-badge" style="background:rgba(255,122,31,0.12);color:var(--orange);border-color:var(--orange);margin:1px;">${c}</span>`
        ).join('');
        return `
        <tr>
            <td>${countriesBadges}</td>
            <td><strong style="color:#fff;">${ag.name}</strong></td>
            <td>
                ${ag.playerId
                    ? `<span style="background:rgba(0,137,123,0.15);color:#00E676;border:1px solid #00897B;border-radius:8px;padding:2px 10px;font-size:12px;font-weight:bold;">🔗 #${ag.playerId}</span>`
                    : `<span style="color:#666;font-size:11px;">غير مرتبط</span>`
                }
            </td>
            <td style="direction:ltr;text-align:right;color:#00E676;">${ag.phone}</td>
            <td style="color:#aaa;font-size:12px;">${ag.paymentMethods}</td>
            <td style="color:var(--orange);font-weight:bold;font-size:12px;">${ag.rate}</td>
            <td><button class="btn-delete-row" onclick="deleteAgent(${i})"><i class="fa-solid fa-trash-can"></i> حذف</button></td>
        </tr>`;
    }).join('');
}

function addNewAgent() {
    const name     = document.getElementById('newAgentName')?.value?.trim();
    const phone    = document.getElementById('newAgentPhone')?.value?.trim();
    const payments = document.getElementById('newAgentPayments')?.value?.trim();
    const rate     = document.getElementById('newAgentRate')?.value?.trim();
    const playerId = document.getElementById('newAgentPlayerId')?.value?.trim() || null;
    // Read from the simple single dropdown
    const country  = document.getElementById('newAgentCountry')?.value?.trim();

    if (!name) {
        return showToast('يرجى إدخال اسم الوكيل ⚠️', 'error');
    }
    if (!country) {
        return showToast('يرجى اختيار الدولة من القائمة ⚠️', 'error');
    }
    if (!phone) {
        return showToast('يرجى إدخال رقم هاتف الوكيل ⚠️', 'error');
    }
    if (!payments) {
        return showToast('يرجى إدخال طرق الدفع المقبولة ⚠️', 'error');
    }
    if (!rate) {
        return showToast('يرجى إدخال سعر الصرف للوكيل ⚠️', 'error');
    }

    const id = `agent-${Date.now()}`;
    // Save as both country string and countries array for backward compat
    agents.push({ id, name, country, countries: [country], phone, paymentMethods: payments, rate, playerId });

    // Clear form
    ['newAgentName', 'newAgentPhone', 'newAgentPayments', 'newAgentRate', 'newAgentPlayerId'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.value = '';
    });
    const sel = document.getElementById('newAgentCountry');
    if (sel) sel.value = '';

    saveData();
    renderAll();
    showToast(`تمت إضافة الوكيل "${name}" بنجاح 🚀`);
}

function deleteAgent(i) {
    const name = agents[i]?.name;
    agents.splice(i, 1);
    saveData();
    renderAll();
    showToast(`تم حذف الوكيل "${name}"`, 'error');
}

// ─── P2P Agents Helper Functions ──────────────
function renderAdminP2pAgentsTable() {
    const tbody = document.getElementById('adminP2pAgentsTableBody');
    if (!tbody) return;
    const p2pAgents = players.filter(p => p.isAgent === true);
    if (p2pAgents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#666;padding:15px;">لا يوجد لاعبون مفعلون كوكلاء شحن حالياً</td></tr>`;
        return;
    }
    tbody.innerHTML = p2pAgents.map(ag => {
        const inputId = `sendCoinsInput-${ag.id}`;
        return `
        <tr>
            <td><strong style="color:var(--orange);">${ag.id}</strong></td>
            <td><span style="color:#fff;font-weight:bold;">${ag.name || 'لاعب مسعودي'}</span></td>
            <td><span style="color:#00E676;font-weight:bold;">${formatNum(ag.agentBalance || 0)} $</span></td>
            <td>
                <div style="display:flex;gap:6px;align-items:center;max-width:260px;">
                    <input type="number" id="${inputId}" placeholder="كمية الرصيد..." style="margin:0;padding:6px 10px;height:32px;font-size:12px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:#fff;">
                    <button class="btn-action btn-add-funds" onclick="sendCoinsToP2pAgent('${ag.id}', '${inputId}')" style="padding:6px 12px;height:32px;font-size:11px;margin:0;">إرسال رصيد</button>
                </div>
            </td>
            <td>
                <button class="btn-delete-row" onclick="deactivateP2pAgent('${ag.id}')" style="background:rgba(255,82,82,0.15);color:#ff5252;border:1px solid rgba(255,82,82,0.3);"><i class="fa-solid fa-lock"></i> إلغاء التفعيل</button>
            </td>
        </tr>`;
    }).join('');
}

async function activateP2pAgent() {
    const playerIdInput = document.getElementById('p2pAgentPlayerId');
    const playerId = playerIdInput?.value?.trim();
    if (!playerId) return showToast('يرجى إدخال معرف اللاعب', 'error');

    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return showToast('معرف اللاعب غير موجود في النظام', 'error');

    try {
        const res = await fetch(API_BASE + '/api/toggle-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, isAgent: true })
        });
        const data = await res.json();
        if (data.success) {
            player.isAgent = true;
            player.agentBalance = data.player?.agentBalance || 0;
            playerIdInput.value = '';
            renderAll();
            showToast(`تم تفعيل حساب اللاعب ${player.name || playerId} كوكيل بنجاح 🚀`);
        } else {
            showToast(data.error || 'فشل التفعيل كوكيل', 'error');
        }
    } catch (e) {
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

async function deactivateP2pAgent(playerId) {
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;

    try {
        const res = await fetch(API_BASE + '/api/toggle-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, isAgent: false })
        });
        const data = await res.json();
        if (data.success) {
            player.isAgent = false;
            renderAll();
            showToast(`تم إلغاء تفعيل الوكيل ${player.name || playerId} بنجاح`, 'error');
        } else {
            showToast(data.error || 'فشل إلغاء التفعيل', 'error');
        }
    } catch (e) {
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

async function sendCoinsToP2pAgent(playerId, inputId) {
    const inputEl = document.getElementById(inputId);
    const amount = parseFloat(inputEl?.value);
    if (isNaN(amount) || amount <= 0) return showToast('يرجى إدخال كمية صحيحة', 'error');

    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;

    try {
        const res = await fetch(API_BASE + '/api/update-agent-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: playerId, amount: amount })
        });
        const data = await res.json();
        if (data && data.agentBalance !== undefined) {
            player.agentBalance = data.agentBalance;
            if (data.transactions) player.transactions = data.transactions;
            inputEl.value = '';
            renderAll();
            showToast(`تم تم شحن رصيد وكالة الوكيل بـ ${formatNum(amount)} ر.س بنجاح ✅`);
        } else {
            showToast('فشل شحن رصيد للوكيل', 'error');
        }
    } catch (e) {
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

// ─── Receipts Rendering & Management ──────────
function renderReceiptsTable() {
    const tbody = document.getElementById('adminReceiptsTableBody');
    if (!tbody) return;

    if (!receipts || receipts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;padding:20px;">لا توجد إيصالات شحن مرسلة حالياً</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    receipts.slice().reverse().forEach(r => {
        const statusLabels = {
            pending: '<span style="background:rgba(255,152,0,0.12);color:#FF9800;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,152,0,0.25);">⏳ قيد المراجعة</span>',
            approved: '<span style="background:rgba(0,230,118,0.12);color:#00E676;padding:4px 8px;border-radius:6px;border:1px solid rgba(0,230,118,0.25);">✅ مقبول</span>',
            rejected: '<span style="background:rgba(255,82,82,0.12);color:#FF5252;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,82,82,0.25);">❌ مرفوض</span>'
        };

        const imgUrl = resolveImageUrl(r.imageUrl);
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.innerHTML = `
            <td style="padding:10px;">
                <strong>${r.playerName}</strong><br>
                <span style="font-size:11px;color:#888;">#${r.playerId}</span>
            </td>
            <td style="padding:10px;">${r.gateway}</td>
            <td style="padding:10px;font-weight:bold;color:var(--orange);">${r.amount}</td>
            <td style="padding:10px;text-align:right;white-space:nowrap;">${r.date}</td>
            <td style="padding:10px;">
                <a href="${imgUrl}" target="_blank">
                    <img src="${imgUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer;" title="عرض كامل الصورة">
                </a>
            </td>
            <td style="padding:10px;">${statusLabels[r.status] || r.status}</td>
            <td style="padding:10px;">
                <div style="display:flex;gap:6px;">
                    ${r.status === 'pending' ? `
                        <button onclick="handleReceiptAction('${r.id}', 'approve')" style="background:#00E676;color:#100906;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:'Cairo';font-weight:bold;font-size:11px;">قبول</button>
                        <button onclick="handleReceiptAction('${r.id}', 'reject')" style="background:#FF5252;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:'Cairo';font-weight:bold;font-size:11px;">رفض</button>
                    ` : ''}
                    <button onclick="handleReceiptAction('${r.id}', 'delete')" style="background:rgba(255,82,82,0.15);color:#FF5252;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:'Cairo';font-weight:bold;font-size:11px;">حذف</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleReceiptAction(receiptId, action) {
    if (action === 'delete' && !confirm('هل أنت متأكد من حذف هذا الإيصال نهائياً؟')) return;
    try {
        const res = await fetch(API_BASE + '/api/admin/action-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptId, action })
        });
        const data = await res.json();
        if (data.success) {
            showToast('تم تنفيذ الإجراء بنجاح ✅');
            loadData();
        } else {
            showToast(data.error || 'فشل تنفيذ الإجراء', 'error');
        }
    } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
}
window.handleReceiptAction = handleReceiptAction;

// ─── Translations (Arabic <-> English) ───────────────────
const adminTranslations = {
    en: {
        "بوابة التحكم الإدارية": "Admin Control Portal",
        "منصة مسعودي للألعاب — الإصدار 2.0": "Masoudi Gaming Platform — v2.0",
        "كلمة المرور": "Password",
        "مشرف جديد": "New Admin",
        "خروج": "Logout",
        "إجمالي اللاعبين": "Total Players",
        "نشطون": "Active Players",
        "إجمالي الأرصدة": "Total Balances",
        "إدارة اللاعبين": "Players",
        "مزودات الـ API": "API Providers",
        "ألعاب المنصة": "Games List",
        "إعدادات التطبيق": "App Settings",
        "وكلاء الشحن": "Recharge Agents",
        "وكلاء التطبيق (P2P)": "P2P Agents",
        "بوابات الشحن 🇪🇬": "Gateways 🇪🇬",
        "إيصالات الشحن 🧾": "Receipts 🧾",
        "إدارة المشرفين 👥": "Moderators 👥",
        "قائمة اللاعبين المسجلين في التطبيق": "Registered Players",
        "إضافة لاعب جديد": "Add New Player",
        "بحث عن لاعب بالاسم أو البريد أو المعرف...": "Search players by name, email or ID...",
        "كل الحالات": "All Statuses",
        "نشط": "Active",
        "محظور": "Blocked",
        "موثق": "Verified",
        "غير موثق": "Unverified",
        "تعديل الرصيد": "Edit Balance",
        "تصفير": "Reset",
        "حظر": "Block",
        "تنشيط": "Activate",
        "حذف": "Delete",
        "شحن وكيل": "Agent Recharge",
        "ترقية لوكيل": "Promote to Agent",
        "تخفيض لاعب": "Demote to Player",
        "إدارة مزودات الـ API": "API Providers Management",
        "إضافة مزود جديد": "Add New Provider",
        "إدارة ألعاب المنصة": "Platform Games Management",
        "إضافة لعبة جديدة": "Add New Game",
        "إعدادات التطبيق العامة": "General App Settings",
        "تحديث خيارات العرض والوضع التجريبي": "Update Display & Demo Options",
        "تفعيل الوضع التجريبي": "Enable Demo/Preview Mode",
        "نص زر التشغيل": "Play Button Text",
        "إظهار الرصيد للاعبين": "Show Player Balance",
        "إظهار شارة البث المباشر": "Show Live Badge",
        "حفظ الإعدادات": "Save Settings",
        "إدارة البنرات الإعلانية": "Promotional Banners Management",
        "إضافة بنر جديد": "Add New Banner",
        "إدارة وكلاء الشحن": "Recharge Agents Management",
        "إضافة وكيل شحن جديد": "Add New Recharge Agent",
        "إدارة وكلاء التطبيق (P2P)": "P2P Agents Management",
        "طلبات شحن وتفعيل وكلاء P2P": "P2P Agent Requests & Activation",
        "إدارة بوابات الشحن المباشر": "Direct Payment Gateways Management",
        "إضافة بوابة دفع جديدة": "Add New Gateway",
        "مراجعة إيصالات شحن اللاعبين": "Review Player Recharge Receipts",
        "الإيصال": "Receipt",
        "اللاعب": "Player",
        "القيمة": "Amount",
        "تفاصيل التحويل": "Details",
        "تاريخ الطلب": "Request Date",
        "تغيير كلمة المرور": "Change Password",
        "إضافة مشرف جديد": "Add New Admin",
        "التبويبات المسموحة للمشرف العادي": "Allowed Tabs for Normal Admin",
        "الاسم الظاهر": "Display Name",
        "اسم المستخدم": "Username",
        "معرف حساب اللاعب للربط (اختياري)": "Link Player Account ID (Optional)",
        "تأكيد حذف اللعبة": "Confirm Game Deletion",
        "تأكيد حذف البنر": "Confirm Banner Deletion",
        "تأكيد حذف الوكيل": "Confirm Agent Deletion",
        "الاسم": "Name",
        "معرف الحساب (ID)": "Account ID",
        "البريد الإلكتروني": "Email Address",
        "الرصيد الرئيسي": "Main Balance",
        "رصيد الوكيل": "Agent Balance",
        "تاريخ الانضمام": "Join Date",
        "الإجراءات": "Actions",
        "تصفير الرصيد": "Reset Balance",
        "حذف الحساب": "Delete Account",
        "إيقاف الحساب": "Block Account",
        "تفعيل الحساب": "Activate Account",
        "إضافة رصيد": "Add Balance",
        "خصم رصيد": "Deduct Balance",
        "المبلغ": "Amount",
        "ترقية لوكيل شحن": "Promote to Agent",
        "تخفيض لوضع لاعب": "Demote to Player",
        "شحن رصيد وكالة": "Recharge Agent Balance",
        "سجل معاملات اللاعب (آخر 10 عمليات)": "Player Transaction History (Last 10)",
        "نوع العملية": "Transaction Type",
        "التاريخ والوقت": "Date & Time",
        "لا توجد معاملات مسجلة": "No transactions registered",
        "اسم الشركة": "Provider Name",
        "رابط الـ Endpoint (سيرفر الـ API)": "API Server Endpoint URL",
        "رمز الشريك (Partner Code)": "Partner Code",
        "مفتاح المرور (Secret Key)": "Secret Key",
        "عنوان اللعبة": "Game Title",
        "فئة اللعبة": "Category",
        "الشركة المزودة": "Provider",
        "رابط تشغيل اللعبة (Launch URL)": "Launch URL",
        "صورة اللعبة": "Game Cover Image",
        "تفعيل الوضع التجريبي (Preview Mode)": "Enable Demo/Preview Mode",
        "إظهار شارة البث المباشر (Live Badge)": "Show Live Badge",
        "نص زر التشغيل الافتراضي": "Default Play Button Text",
        "سعر شراء الرصيد (مثال: 10000 = 10000 ر.س لكل 1 دولار)": "Coin Buy Rate (e.g. 10000 = 10000 coins per 1 USD)",
        "سعر بيع الرصيد (مثال: 20000 = 20000 ر.س لكل 1 دولار)": "Coin Sell Rate (e.g. 20000 = 20000 coins per 1 USD)",
        "عنوان البنر": "Banner Title",
        "العنوان الفرعي": "Subtitle",
        "الشارة (Badge)": "Badge Label",
        "أيقونة البنر": "Banner Icon (Emoji)",
        "خلفية البنر (صورة)": "Banner Background Image",
        "إدارة وكلاء الشحن المباشر": "Recharge Agents Management",
        "اسم الوكيل": "Agent Name",
        "الدولة والرمز": "Country & Code",
        "رقم هاتف الوكيل (WhatsApp)": "Agent Phone Number (WhatsApp)",
        "طرق الدفع المدعومة": "Supported Payment Methods",
        "سعر الصرف الخاص بالوكيل": "Agent Exchange Rate",
        "ربط الوكيل بحساب لاعب (ID)": "Link Agent to Player ID",
        "اسم اللاعب": "Player Name",
        "رصيد الوكالة (P2P)": "Agency Balance (P2P)",
        "شحن رصيد الوكالة": "Recharge Agency Coins",
        "إرسال رصيد": "Send Coins",
        "إلغاء التفعيل": "Deactivate",
        "تفعيل وكيل P2P جديد": "Activate New P2P Agent",
        "تكوين بوابات الدفع الإلكتروني في مصر": "Configure Electronic Payment Gateways (Egypt)",
        "رقم المحفظة": "Wallet Number",
        "الاسم الكامل": "Full Name",
        "معرف حساب إنستا باي": "Instapay Account Address",
        "رقم الحساب البنكي": "Bank Account Number",
        "اسم البنك": "Bank Name",
        "اسم المستفيد": "Beneficiary Name",
        "تحديث البوابات": "Update Gateways",
        "خيارات أسعار الشحن السريع": "Quick Pricing Packages Settings",
        "إضافة باقة شحن": "Add Recharge Package",
        "المبلغ بالجنيه المصري": "Amount in EGP",
        "الرصيد المقابل": "Equivalent Coins",
        "شارة الباقة": "Package Badge",
        "القيمة (جنيه مصري)": "Amount (EGP)",
        "مقبول": "Approved",
        "مرفوض": "Rejected",
        "قيد الانتظار": "Pending",
        "قبول": "Approve",
        "رفض": "Reject",
        "إجراء سريع على المحفظة (شحن)": "Quick Wallet Action (Recharge)",
        "كلمة المرور الحالية": "Current Password",
        "كلمة المرور الجديدة": "New Password",
        "تأكيد كلمة المرور الجديدة": "Confirm New Password",
        "تغيير": "Change",
        "مشرف عادي": "Normal Admin",
        "مشرف عام": "Super Admin",
        "لا يوجد لاعبون مطابقون": "No matching players found",
        "لا توجد شركات مزودة": "No API providers found",
        "لا توجد ألعاب مضافة": "No games added",
        "لا توجد بنرات إعلانية نشطة حالياً": "No active banners found",
        "لا يوجد وكلاء شحن مضافين حالياً": "No recharge agents added",
        "لا يوجد لاعبون مفعلون كوكلاء شحن حالياً": "No P2P agents active",
        "لا توجد إيصال شحن مرسلة حالياً": "No recharge receipts received",
        "إدارة المشرفين والنشطين بالمنصة": "Manage Board Moderators",
        "قائمة المشرفين وتراخيصهم": "Moderators & Licenses List",
        "المشرف": "Moderator",
        "الصفحات المسموحة": "Allowed Pages",
        "إجراء": "Action",
        "الوصول لكافة الصفحات": "Access all pages",
        "لا توجد صفحات مسموحة": "No pages allowed",
        "مؤمن": "Protected",
        "لا يوجد مشرفون مضافون حالياً": "No moderators added currently",
        "تأكيد حذف المشرف": "Confirm Moderator Deletion"
    }
};

function translateDOM(root = document.body) {
    const lang = localStorage.getItem('admin_lang') || 'ar';
    if (lang === 'ar') return;

    const dict = adminTranslations.en;
    
    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const trimmed = node.nodeValue.trim();
            if (trimmed && dict[trimmed]) {
                const startSpace = node.nodeValue.match(/^\s*/)[0];
                const endSpace = node.nodeValue.match(/\s*$/)[0];
                node.nodeValue = startSpace + dict[trimmed] + endSpace;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.placeholder) {
                const trimmedPlaceholder = node.placeholder.trim();
                if (dict[trimmedPlaceholder]) {
                    node.placeholder = dict[trimmedPlaceholder];
                }
            }
            if (node.tagName === 'INPUT' && (node.type === 'button' || node.type === 'submit')) {
                const trimmedValue = node.value.trim();
                if (dict[trimmedValue]) {
                    node.value = dict[trimmedValue];
                }
            }
            for (let child of node.childNodes) {
                walk(child);
            }
        }
    }
    walk(root);
}

function initTranslationObserver() {
    const lang = localStorage.getItem('admin_lang') || 'ar';
    if (lang === 'ar') return;

    translateDOM(document.body);

    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    translateDOM(node);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function toggleLanguage() {
    const current = localStorage.getItem('admin_lang') || 'ar';
    const next = (current === 'en') ? 'ar' : 'en';
    localStorage.setItem('admin_lang', next);
    window.location.reload();
}
window.toggleLanguage = toggleLanguage;

function t(key) {
    const lang = localStorage.getItem('admin_lang') || 'ar';
    if (lang === 'ar') return key;
    return (adminTranslations.en && adminTranslations.en[key]) ? adminTranslations.en[key] : key;
}

function getCombinedAdmins() {
    const list = [];
    const seenPlayerIds = new Set();
    const seenUsernames = new Set();

    // 1. Add all hardcoded admin emails from players list
    const adminEmails = ['halilfarhat102@gmail.com'];
    players.forEach(p => {
        if (p.email && adminEmails.includes(p.email)) {
            list.push({
                id: 'email-admin-' + p.id,
                username: p.id,
                displayName: p.name,
                role: 'superadmin',
                allowedTabs: [],
                playerId: p.id,
                isDeveloper: true, // Mark as protected developer account
                createdAt: p.joinDate || '—'
            });
            seenPlayerIds.add(String(p.id));
        }
    });

    // 2. Add all admins from db.admins
    admins.forEach(ad => {
        if (ad.playerId) {
            seenPlayerIds.add(String(ad.playerId));
        }
        seenUsernames.add(ad.username);
        list.push({
            ...ad,
            isDeveloper: ad.username === 'admin' // The main admin is protected
        });
    });

    // 3. Add any player who has p.isAdmin === true (and not already added)
    players.forEach(p => {
        if (p.isAdmin === true && !seenPlayerIds.has(String(p.id))) {
            list.push({
                id: 'player-admin-' + p.id,
                username: p.id,
                displayName: p.name,
                role: 'admin',
                allowedTabs: [
                    "players",
                    "receipts",
                    "games",
                    "providers",
                    "agents",
                    "p2p",
                    "payment",
                    "settings"
                ], // Default all permissions
                playerId: p.id,
                isLegacyPlayerAdmin: true, // Mark so we can clean it up
                createdAt: p.joinDate || '—'
            });
            seenPlayerIds.add(String(p.id));
        }
    });

    return list;
}

function renderAdminsTable() {
    const tbody = document.getElementById('adminListTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const combined = getCombinedAdmins();
    
    if (combined.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#666;padding:15px;">لا يوجد مشرفون مضافون حالياً</td></tr>`;
        return;
    }
    
    const tabNames = {
        players: 'اللاعبين',
        receipts: 'الإيصالات',
        games: 'الألعاب',
        providers: 'المزودين',
        agents: 'الوكلاء',
        p2p: 'تحويلات P2P',
        payment: 'طرق الدفع',
        settings: 'الإعدادات'
    };

    tbody.innerHTML = combined.map(ad => {
        const isSuper = ad.role === 'superadmin';
        const roleLabel = ad.isDeveloper 
            ? 'مطور النظام' 
            : (isSuper ? 'مشرف عام' : 'مشرف عادي');
            
        const allowedLabel = ad.isDeveloper || isSuper 
            ? 'الوصول لكافة الصفحات' 
            : (ad.allowedTabs && ad.allowedTabs.length > 0 
                ? ad.allowedTabs.map(tab => tabNames[tab] || tab).join('، ') 
                : 'لا توجد صفحات مسموحة');
                
        // Prevent deleting the main superadmin or developer email accounts
        const deleteButton = ad.isDeveloper
            ? `<span style="color:#666;font-size:12px;">مؤمن 🔒</span>`
            : `<button class="btn-delete-row" onclick="deleteAdmin('${ad.id}')" style="background:rgba(255,82,82,0.15);color:#ff5252;border:1px solid rgba(255,82,82,0.3);"><i class="fa-solid fa-trash"></i> حذف</button>`;
            
        // Find linked player info
        const linkedPlayer = ad.playerId ? players.find(p => String(p.id) === String(ad.playerId)) : null;
        
        const playerDetailsHtml = linkedPlayer
            ? `
                <div style="display:flex;align-items:center;gap:10px;text-align:right;">
                    ${linkedPlayer.photoUrl 
                        ? `<img src="${linkedPlayer.photoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1.5px solid var(--orange);">` 
                        : `<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,122,31,0.2);color:var(--orange);display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fa-solid fa-user"></i></div>`
                    }
                    <div>
                        <div style="font-weight:bold;color:#fff;font-size:13px;">${ad.displayName}</div>
                        <div style="font-size:11px;color:#aaa;">الاسم باللعبة: ${linkedPlayer.name} | معرف الحساب: ${ad.playerId}</div>
                        <div style="font-size:10px;color:#777;direction:ltr;">${linkedPlayer.email}</div>
                    </div>
                </div>
              `
            : `
                <div style="text-align:right;">
                    <div style="font-weight:bold;color:#fff;font-size:13px;">${ad.displayName}</div>
                    <div style="font-size:11px;color:#888;">اسم المستخدم للدخول: ${ad.username}</div>
                </div>
              `;
            
        return `
            <tr>
                <td style="padding:12px 15px;">
                    ${playerDetailsHtml}
                </td>
                <td>
                    <span class="vip-badge" style="background:${ad.isDeveloper ? 'rgba(0,230,118,0.15)' : (isSuper ? 'rgba(255,122,31,0.15)' : 'rgba(255,255,255,0.06)')};color:${ad.isDeveloper ? '#00E676' : (isSuper ? 'var(--orange)' : '#eee')};border-color:${ad.isDeveloper ? '#00E676' : (isSuper ? 'var(--orange)' : 'rgba(255,255,255,0.1)')};">
                        ${roleLabel}
                    </span>
                </td>
                <td style="font-size:12px;color:#ccc;max-width:250px;white-space:normal;word-break:break-word;">
                    ${allowedLabel}
                </td>
                <td>
                    ${deleteButton}
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteAdmin(adminId) {
    if (!confirm('هل تريد حذف هذا المشرف؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
        const res = await fetch(API_BASE + '/api/admin-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.ADMIN_TOKEN, adminId })
        });
        const data = await res.json();
        if (data.success) {
            showToast('تم حذف المشرف بنجاح ✅');
            await loadData(); // Refresh table
        } else {
            showToast(data.error || 'فشل حذف المشرف — تأكد من أن لديك صلاحية مشرف عام', 'error');
        }
    } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    }
}
window.deleteAdmin = deleteAdmin;

// Expose functions globally for inline HTML onclick handlers
Object.assign(window, {
    openModal,
    closeModal,
    adminLogout,
    switchTab,
    toggleAddPlayerForm,
    addNewPlayer,
    addNewProvider,
    addNewGame,
    saveSettings,
    addNewBanner,
    addNewAgent,
    activateP2pAgent,
    executeWalletAction,
    confirmDeletePlayer,
    saveEditedGame,
    doChangePassword,
    doAddAdmin,
    toggleCard,
    openWalletModal,
    toggleStatus,
    resetBalance,
    openDeleteModal,
    quickWallet,
    deleteProvider,
    editGame,
    deleteGame,
    deleteBanner,
    deleteAgent,
    sendCoinsToP2pAgent,
    deactivateP2pAgent,
    deleteAdmin
});

// ─── Export Object ──────────
export {
    adminLogout,
    switchTab,
    toggleAddPlayerForm,
    addNewPlayer,
    addNewProvider,
    addNewGame,
    saveSettings,
    addNewBanner,
    addNewAgent,
    activateP2pAgent,
    executeWalletAction,
    confirmDeletePlayer,
    saveEditedGame,
    doChangePassword,
    doAddAdmin,
    toggleCard,
    openWalletModal,
    toggleStatus,
    resetBalance,
    openDeleteModal,
    quickWallet,
    deleteProvider,
    editGame,
    deleteGame,
    deleteBanner,
    deleteAgent,
    sendCoinsToP2pAgent,
    deactivateP2pAgent,
    deleteAdmin
};

// ─── Game Engine Configurations Management ───
function initGameConfigsUI() {
    const configs = settings.gameConfigs || {};

    // Big Farm
    const bf = configs.bigfarm || { winRate: 70, minBet: 500, maxBet: 10000, active: true };
    const winRateBf = document.getElementById('winRateBigFarm');
    if (winRateBf) {
        winRateBf.value = bf.winRate;
        document.getElementById('lblWinRateBigFarm').textContent = bf.winRate + '%';
    }
    const minBf = document.getElementById('minBetBigFarm');
    if (minBf) minBf.value = bf.minBet;
    const maxBf = document.getElementById('maxBetBigFarm');
    if (maxBf) maxBf.value = bf.maxBet;
    const actBf = document.getElementById('activeBigFarm');
    if (actBf) actBf.checked = bf.active;

    // Fruit Slots
    const fs = configs.fruit_slots || { winRate: 70, minBet: 100, maxBet: 5000, active: true };
    const winRateFs = document.getElementById('winRateFruitSlots');
    if (winRateFs) {
        winRateFs.value = fs.winRate;
        document.getElementById('lblWinRateFruitSlots').textContent = fs.winRate + '%';
    }
    const minFs = document.getElementById('minBetFruitSlots');
    if (minFs) minFs.value = fs.minBet;
    const maxFs = document.getElementById('maxBetFruitSlots');
    if (maxFs) maxFs.value = fs.maxBet;
    const actFs = document.getElementById('activeFruitSlots');
    if (actFs) actFs.checked = fs.active;

    // Fortune Gems
    const fg = configs.fortune_gems || { winRate: 70, minBet: 100, maxBet: 5000, active: true };
    const winRateFg = document.getElementById('winRateFortuneGems');
    if (winRateFg) {
        winRateFg.value = fg.winRate;
        document.getElementById('lblWinRateFortuneGems').textContent = fg.winRate + '%';
    }
    const minFg = document.getElementById('minBetFortuneGems');
    if (minFg) minFg.value = fg.minBet;
    const maxFg = document.getElementById('maxBetFortuneGems');
    if (maxFg) maxFg.value = fg.maxBet;
    const actFg = document.getElementById('activeFortuneGems');
    if (actFg) actFg.checked = fg.active;
}

function switchGameConfigView(gameId) {
    document.querySelectorAll('.game-cfg-section').forEach(sec => {
        sec.style.display = 'none';
    });
    const target = document.getElementById('cfg-section-' + gameId);
    if (target) target.style.display = 'block';
}
window.switchGameConfigView = switchGameConfigView;

async function saveGameConfigs() {
    const configs = {
        bigfarm: {
            winRate: parseInt(document.getElementById('winRateBigFarm')?.value || '70', 10),
            minBet: parseInt(document.getElementById('minBetBigFarm')?.value || '500', 10),
            maxBet: parseInt(document.getElementById('maxBetBigFarm')?.value || '10000', 10),
            active: document.getElementById('activeBigFarm')?.checked === true
        },
        fruit_slots: {
            winRate: parseInt(document.getElementById('winRateFruitSlots')?.value || '70', 10),
            minBet: parseInt(document.getElementById('minBetFruitSlots')?.value || '100', 10),
            maxBet: parseInt(document.getElementById('maxBetFruitSlots')?.value || '5000', 10),
            active: document.getElementById('activeFruitSlots')?.checked === true
        },
        fortune_gems: {
            winRate: parseInt(document.getElementById('winRateFortuneGems')?.value || '70', 10),
            minBet: parseInt(document.getElementById('minBetFortuneGems')?.value || '100', 10),
            maxBet: parseInt(document.getElementById('maxBetFortuneGems')?.value || '5000', 10),
            active: document.getElementById('activeFortuneGems')?.checked === true
        }
    };

    settings.gameConfigs = configs;

    try {
        await saveData();
        showToast('تم حفظ تعديلات محرك الألعاب بنجاح');
        
        // Write to local storage for instant sync in current browser window
        Object.keys(configs).forEach(gameId => {
            localStorage.setItem('masoudi_game_config_' + gameId, JSON.stringify(configs[gameId]));
        });
    } catch(e) {
        showToast('فشل حفظ التعديلات', 'error');
    }
}
window.saveGameConfigs = saveGameConfigs;
