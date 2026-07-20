import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_admin_v2.js to update dashboard tab layout and add refresh button...");

    // 1. PATCH admin.html
    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Normalize newlines to LF
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // Add .btn-refresh styling in CSS
    const old_btn_menu_style = `        .btn-menu-toggle {
            display: none; /* Hidden on PC */
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-menu-toggle:hover {
            background: var(--orange);
            border-color: var(--orange);
            box-shadow: 0 0 10px var(--orange-glow);
        }`;

    const new_btn_menu_style = `        .btn-menu-toggle {
            display: none; /* Hidden on PC */
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-menu-toggle:hover {
            background: var(--orange);
            border-color: var(--orange);
            box-shadow: 0 0 10px var(--orange-glow);
        }

        .btn-refresh {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-refresh:hover {
            background: var(--orange);
            border-color: var(--orange);
            box-shadow: 0 0 10px var(--orange-glow);
        }`;

    htmlContent = htmlContent.replace(old_btn_menu_style, new_btn_menu_style);

    // Add dashboard tab in sidebar navigation
    const old_sidebar_tabs = `            <div class="sidebar-tabs" id="sidebarTabs">
                <button class="admin-tab active" onclick="switchTab('tab-players')">
                    <i class="fa-solid fa-users"></i> <span>إدارة اللاعبين</span>
                </button>`;

    const new_sidebar_tabs = `            <div class="sidebar-tabs" id="sidebarTabs">
                <button class="admin-tab active" onclick="switchTab('tab-dashboard')">
                    <i class="fa-solid fa-chart-line"></i> <span>الرئيسية</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-players')">
                    <i class="fa-solid fa-users"></i> <span>إدارة اللاعبين</span>
                </button>`;

    htmlContent = htmlContent.replace(old_sidebar_tabs, new_sidebar_tabs);

    // Update Header Menu Toggle container to add Refresh button next to hamburger menu toggle
    const old_header_toggle = `                <div style="display:flex;align-items:center;gap:12px;">
                    <!-- Menu Toggle Button for mobile -->
                    <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)">
                        <i class="fa-solid fa-bars"></i>
                    </button>`;

    const new_header_toggle = `                <div style="display:flex;align-items:center;gap:8px;">
                    <!-- Menu Toggle Button for mobile -->
                    <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <!-- Page Refresh Button -->
                    <button class="btn-refresh" onclick="window.location.reload()" title="تحديث الصفحة">
                        <i class="fa-solid fa-rotate"></i>
                    </button>`;

    htmlContent = htmlContent.replace(old_header_toggle, new_header_toggle);

    // Remove Stats Summary block outside main
    const old_stats_summary = `        <!-- Stats Summary -->
        <div style="padding:0 15px 16px;">
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-val" id="statTotalPlayers">—</div>
                    <div class="stat-label">إجمالي اللاعبين</div>
                </div>
                <div class="stat-card">
                    <div class="stat-val" id="statActivePlayers">—</div>
                    <div class="stat-label">نشطون</div>
                </div>
                <div class="stat-card">
                    <div class="stat-val" id="statTotalBalance">—</div>
                    <div class="stat-label">إجمالي الأرصدة</div>
                </div>
            </div>
        </div>`;

    htmlContent = htmlContent.replace(old_stats_summary, "");

    // Add dashboard tab panel and update players tab panel
    const old_main_panels = `        <main>

            <!-- ═══════════════ TAB: PLAYERS ═══════════════ -->
            <div id="tab-players" class="tab-panel active">`;

    const new_main_panels = `        <main>

            <!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->
            <div id="tab-dashboard" class="tab-panel active">
                <div class="section-header-row" style="margin-bottom:20px;">
                    <h3><i class="fa-solid fa-chart-line" style="color:var(--orange);margin-left:6px;"></i>لوحة الإحصائيات العامة</h3>
                </div>
                
                <div class="stats-row" style="margin-bottom: 25px;">
                    <div class="stat-card">
                        <div class="stat-val" id="statTotalPlayers">—</div>
                        <div class="stat-label">إجمالي اللاعبين</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val" id="statActivePlayers">—</div>
                        <div class="stat-label">نشطون</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val" id="statTotalBalance">—</div>
                        <div class="stat-label">إجمالي الأرصدة</div>
                    </div>
                </div>

                <!-- Welcome & Platform Overview Card -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-bg);">
                    <h4 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif;">
                        <i class="fa-solid fa-circle-info" style="color: var(--orange);"></i> مرحباً بك في لوحة تحكم منصة مسعودي
                    </h4>
                    <p style="font-size: 13px; color: #ccc; line-height: 1.6; margin: 0; font-family: 'Cairo', sans-serif;">
                        من هنا يمكنك إدارة اللاعبين وتعديل الأرصدة، شحن الأكواد والألعاب، تهيئة إعدادات التطبيق وبوابات الدفع، وإدارة المشرفين والوكلاء. استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.
                    </p>
                </div>
            </div>

            <!-- ═══════════════ TAB: PLAYERS ═══════════════ -->
            <div id="tab-players" class="tab-panel">`;

    htmlContent = htmlContent.replace(old_main_panels, new_main_panels);

    // Save patched admin.html
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log("SUCCESS: admin.html patched successfully!");

    // 2. PATCH admin.js
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    
    // Normalize newlines to LF
    jsContent = jsContent.replace(/\r\n/g, '\n');

    // Replace allowed check
    const old_allowed_check = `                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                if (allowed.includes(tabKey)) {`;
    const new_allowed_check = `                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                if (tabKey === 'dashboard' || allowed.includes(tabKey)) {`;

    if (jsContent.includes(old_allowed_check)) {
        jsContent = jsContent.replace(old_allowed_check, new_allowed_check);
        fs.writeFileSync(jsPath, jsContent, 'utf-8');
        console.log("SUCCESS: admin.js patched successfully!");
    } else {
        console.log("ERROR: allowed tab check block not found in admin.js!");
    }
}

main();
