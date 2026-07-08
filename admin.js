// ═══════════════════════════════════════════════
//  Masoudi Admin Panel — Full Logic v2.0
// ═══════════════════════════════════════════════

let providers = [];
let dynamicGames = [];
let players = [];
let banners = [];
let agents = [];
let currentWalletPlayerId = null;
let currentDeletePlayerId = null;
let settings = {
    enablePreview: true,
    playButtonText: "العب الآن",
    showBalance: true,
    showLiveBadge: true
};

const API_BASE = window.location.origin.startsWith('http') ? '' : 'http://localhost:5173';

// ─── Bootstrap ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
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

// ─── Add New Admin ────────────────────────────
async function doAddAdmin() {
    const username    = document.getElementById('newAdminUsername')?.value?.trim();
    const displayName = document.getElementById('newAdminDisplay')?.value?.trim();
    const password    = document.getElementById('newAdminPw')?.value;
    const role        = document.getElementById('newAdminRole')?.value;
    if (!username || !password) return showToast('أدخل اسم المستخدم وكلمة المرور', 'error');
    if (password.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
    try {
        const res = await fetch(API_BASE + '/api/admin-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.ADMIN_TOKEN, username, displayName: displayName || username, password, role })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('addAdminModal');
            ['newAdminUsername','newAdminDisplay','newAdminPw'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
            showToast(`تم إنشاء حساب المشرف "${username}" بنجاح`);
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
        providers    = Array.isArray(data.providers) ? data.providers : [];
        dynamicGames = Array.isArray(data.games) ? data.games : [];
        players      = Array.isArray(data.players) ? data.players : [];
        settings     = data.settings  || settings;
        banners      = Array.isArray(data.banners) ? data.banners : [];
        
        // Ensure agents is always an array (handling potential object conversion issues)
        if (Array.isArray(data.agents)) {
            agents = data.agents;
        } else if (data.agents && typeof data.agents === 'object') {
            agents = [data.agents];
        } else {
            agents = [];
        }
    } catch (e) {
        console.warn('Falling back to localStorage:', e);
        providers    = JSON.parse(localStorage.getItem('masoudi_providers'))    || defaultProviders();
        dynamicGames = JSON.parse(localStorage.getItem('masoudi_games'))        || defaultGames();
        players      = JSON.parse(localStorage.getItem('masoudi_players'))      || defaultPlayers();
        agents       = JSON.parse(localStorage.getItem('masoudi_agents'))       || [];
        banners      = JSON.parse(localStorage.getItem('masoudi_banners'))      || [];
        settings     = JSON.parse(localStorage.getItem('masoudi_settings'))     || settings;
    }
    initSettingsUI();
    renderAll();
}

// ─── Data: Save ──────────────────────────────
async function saveData() {
    const payload = { settings, banners, agents, providers, games: dynamicGames, players };
    localStorage.setItem('masoudi_providers', JSON.stringify(providers));
    localStorage.setItem('masoudi_games',     JSON.stringify(dynamicGames));
    localStorage.setItem('masoudi_players',   JSON.stringify(players));
    localStorage.setItem('masoudi_agents',    JSON.stringify(agents));
    localStorage.setItem('masoudi_banners',   JSON.stringify(banners));
    localStorage.setItem('masoudi_settings',  JSON.stringify(settings));
    try {
        await fetch(API_BASE + '/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('Failed to sync to server:', e);
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
}

// ─── Stats ───────────────────────────────────
function updateStats() {
    const active  = players.filter(p => p.status === 'active').length;
    const total   = players.reduce((s, p) => s + (p.balance || 0), 0);
    document.getElementById('statTotalPlayers').textContent = players.length;
    document.getElementById('statActivePlayers').textContent = active;
    document.getElementById('statTotalBalance').textContent  = formatNum(total) + ' كوين';
    document.getElementById('playerCountBadge').textContent  = `${players.length} لاعب`;
}

// ─── Tab Switch ──────────────────────────────
function switchTab(id) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    const targetPanel = document.getElementById(id);
    if (targetPanel) targetPanel.classList.add('active');
    
    const clickedTab = Array.from(document.querySelectorAll('.admin-tab')).find(t => {
        const onclickAttr = t.getAttribute('onclick') || '';
        return onclickAttr.includes(`'${id}'`) || onclickAttr.includes(`"${id}"`);
    });
    if (clickedTab) clickedTab.classList.add('active');
}

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
    
    const avatarContent = p.photoUrl 
        ? `<img src="${p.photoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerText='${initial}';">`
        : initial;

    return `
    <div class="player-card" id="card-${p.id}">
        <!-- Card Header / Avatar & Info -->
        <div class="player-card-main-info" onclick="toggleCard('${p.id}')">
            <div class="player-avatar">${avatarContent}</div>
            <div class="player-details-col">
                <div class="player-name-admin">${p.name} <span style="font-size:11px;color:#888;font-weight:normal;margin-right:6px;">#${p.id}</span></div>
                <div class="player-badges-row">
                    <span class="badge-balance">🪙 ${formatNum(p.balance || 0)} كوين</span>
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
                <span class="val" id="bal-${p.id}">${formatNum(p.balance || 0)} كوين</span>
            </div>
            <div class="control-info-row">
                <span class="lbl"><i class="fa-solid fa-gift"></i> رصيد المكافآت</span>
                <span class="val" style="color:#00E676;" id="bon-${p.id}">${formatNum(p.bonus || 0)} كوين</span>
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
            <span class="tx-amt ${isPos?'pos':'neg'}">${isPos?'+':''}${formatNum(tx.amount)} كوين</span>
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
    const p = players.find(x => x.id === id);
    if (!p) return;
    currentWalletPlayerId = id;
    document.getElementById('modalPlayerName').textContent = p.name;
    document.getElementById('modalPlayerId').textContent   = p.id;
    document.getElementById('modalBalance').textContent    = `${formatNum(p.balance || 0)} كوين`;
    document.getElementById('modalBonus').textContent      = `${formatNum(p.bonus || 0)} كوين`;
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
    const p = players.find(x => x.id === id);
    if (!p) return;
    currentDeletePlayerId = id;
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
        const imgUrl = g.image ? g.image : 'images/slots.png';
        return `
        <tr>
            <td style="text-align:center; vertical-align:middle; padding:8px;">
                <img src="${imgUrl}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1.5px solid rgba(255,122,31,0.25);box-shadow:0 3px 6px rgba(0,0,0,0.3);" onerror="this.src='images/slots.png'">
            </td>
            <td style="vertical-align:middle;"><strong>${g.title}</strong></td>
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
    const url      = document.getElementById('editGameLaunchUrlInput')?.value?.trim();
    const image    = document.getElementById('editGameImageInputVal')?.value?.trim() || 'images/slots.png';

    if (!title || !url) return showToast('أدخل اسم اللعبة والرابط', 'error');

    dynamicGames[index] = {
        ...dynamicGames[index],
        title,
        category,
        provider,
        launchUrl: url,
        image
    };

    closeModal('editGameModal');
    saveData();
    renderAll();
    showToast(`تم تحديث لعبة: ${title}`);
}

function addNewGame() {
    const title    = document.getElementById('gameNameInput')?.value?.trim();
    const category = document.getElementById('gameCategoryInput')?.value;
    const provider = document.getElementById('gameProviderSelect')?.value;
    const url      = document.getElementById('gameLaunchUrlInput')?.value?.trim();
    const image    = document.getElementById('gameImageInputVal')?.value?.trim() || 'images/slots.png';
    if (!title || !url) return showToast('أدخل اسم اللعبة والرابط', 'error');
    const id = `game-${Date.now()}`;
    dynamicGames.push({ id, title, category, provider, launchUrl: url, image });
    ['gameNameInput','gameLaunchUrlInput','gameImageInputVal'].forEach(x => { const el=document.getElementById(x); if(el) el.value=''; });
    const statusEl = document.getElementById('gameUploadStatus');
    if (statusEl) statusEl.textContent = 'يمكنك كتابة المسار يدوياً أو الضغط على رفع';
    saveData(); renderAll();
    showToast(`تمت إضافة لعبة: ${title}`);
}

function deleteGame(i) {
    const name = dynamicGames[i]?.title;
    dynamicGames.splice(i, 1);
    saveData(); renderAll();
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
}

async function saveSettings() {
    const enablePreview = document.getElementById('settingEnablePreview')?.checked;
    const showBalance   = document.getElementById('settingShowBalance')?.checked;
    const showLiveBadge = document.getElementById('settingShowLiveBadge')?.checked;
    const playBtnText   = document.getElementById('settingPlayButtonText')?.value?.trim();
    const coinBuyRate   = parseInt(document.getElementById('settingCoinBuyRate')?.value?.trim(), 10) || 10000;
    const coinSellRate  = parseInt(document.getElementById('settingCoinSellRate')?.value?.trim(), 10) || 20000;

    settings = {
        enablePreview: enablePreview !== undefined ? enablePreview : true,
        showBalance: showBalance !== undefined ? showBalance : true,
        showLiveBadge: showLiveBadge !== undefined ? showLiveBadge : true,
        playButtonText: playBtnText || "العب الآن",
        coinBuyRate: coinBuyRate,
        coinSellRate: coinSellRate
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
            ? `<img src="${b.image.startsWith('http') ? b.image : '/' + b.image}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;border:1px solid var(--border);">` 
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

// ─── Local Image Upload ──────────────────────
async function uploadLocalImage(fileInputId, textInputId, statusId) {
    const fileInput = document.getElementById(fileInputId);
    const textInput = document.getElementById(textInputId);
    const statusEl  = document.getElementById(statusId);

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--orange);"></i> جاري رفع الصورة...`;
    statusEl.style.color = 'var(--orange)';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(API_BASE + '/api/upload', {
            method: 'POST',
            body: formData
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
    } catch (e) {
        statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#ff5252;"></i> تعذّر الاتصال بالخادم`;
        statusEl.style.color = '#ff5252';
        showToast('تعذر الاتصال بالخادم لرفع الصورة', 'error');
    }
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
    const countries = _agentSelectedCountries.slice(); // array copy

    if (!name || countries.length === 0 || !phone || !payments || !rate) {
        return showToast('يرجى ملء جميع حقول وكيل الشحن (واختيار دولة واحدة على الأقل)', 'error');
    }

    const id = `agent-${Date.now()}`;
    // Save countries as array; keep first as `country` for backward compat
    agents.push({ id, name, countries, country: countries[0], phone, paymentMethods: payments, rate, playerId });

    // Clear form
    ['newAgentName', 'newAgentPhone', 'newAgentPayments', 'newAgentRate', 'newAgentPlayerId'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.value = '';
    });
    resetAgentCountryTags();

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
            <td><span style="color:#00E676;font-weight:bold;">${formatNum(ag.agentBalance || 0)} كوين 🪙</span></td>
            <td>
                <div style="display:flex;gap:6px;align-items:center;max-width:260px;">
                    <input type="number" id="${inputId}" placeholder="كمية الكوينز..." style="margin:0;padding:6px 10px;height:32px;font-size:12px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:#fff;">
                    <button class="btn-action btn-add-funds" onclick="sendCoinsToP2pAgent('${ag.id}', '${inputId}')" style="padding:6px 12px;height:32px;font-size:11px;margin:0;">إرسال كوينز</button>
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

    const player = players.find(p => p.id === playerId);
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
    const player = players.find(p => p.id === playerId);
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

    const player = players.find(p => p.id === playerId);
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
            showToast(`تم شحن رصيد وكالة الوكيل بـ ${formatNum(amount)} كوينز بنجاح ✅`);
        } else {
            showToast('فشل شحن كوينز للوكيل', 'error');
        }
    } catch (e) {
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

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
    deactivateP2pAgent
});
