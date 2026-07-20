import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_dashboard_navigation.js...");

    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // 1. Add CSS rules for back button and main grid screen, hide sidebar & mobile header toggle
    const old_mobile_header_style = `        .mobile-header-bar {
            display: none; /* Hidden on PC */
            padding: 10px 15px 0 15px;
            align-items: center;
            justify-content: flex-start;
            margin-bottom: 10px;
        }

        @media (max-width: 991px) {
            .mobile-header-bar {
                display: flex; /* Visible on mobile */
            }
        }`;

    const new_mobile_header_style = `        .mobile-header-bar {
            display: none !important; /* Hidden completely */
        }

        .admin-sidebar {
            display: none !important; /* Remove sidebar completely */
        }

        .main-content {
            margin-right: 0 !important;
            margin-left: 0 !important;
            width: 100% !important;
            padding: 20px !important;
        }

        /* ─── Back Button Custom Styling ─── */
        .btn-back {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 20px;
            font-family: 'Cairo', sans-serif;
        }
        .btn-back:hover {
            background: var(--orange);
            border-color: var(--orange);
            box-shadow: 0 4px 15px var(--orange-glow);
            transform: translateX(4px);
        }
        .btn-back i {
            font-size: 16px;
        }`;

    htmlContent = htmlContent.replace(old_mobile_header_style, new_mobile_header_style);

    // 2. Hide dashboard menu cards in tab-dashboard panel and move them to main-grid-screen
    const old_main_content_start = `        <!-- Main Content Area -->
        <div class="main-content">
            <!-- Mobile Header Bar -->
            <div class="mobile-header-bar">
                <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)" style="display: flex;">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>`;

    const new_main_content_start = `        <!-- Main Content Area -->
        <div class="main-content">
            <!-- Mobile Header Bar -->
            <div class="mobile-header-bar">
                <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)" style="display: flex;">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>

            <!-- ═══════════════ MAIN GRID NAVIGATION SCREEN ═══════════════ -->
            <div id="main-grid-screen" style="max-width: 1200px; margin: 0 auto; padding: 10px 0 30px 0;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="font-size: 24px; font-weight: 900; color: #fff; font-family: 'Cairo', sans-serif; margin: 0;">بوابة التحكم الإدارية</h2>
                    <p style="font-size: 12px; color: #888; margin-top: 6px; font-family: 'Cairo', sans-serif;">اختر القسم المطلوب لإدارة المنصة</p>
                </div>
                <div class="dashboard-grid">
                    <div class="menu-card" onclick="switchTab('tab-dashboard')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #FF5722, #FF7043);">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>
                        <h4 class="menu-card-title">الرئيسية</h4>
                        <p class="menu-card-desc">الإحصائيات والملف الشخصي</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-players')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #FF7A1F, #D45A00);">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة اللاعبين</h4>
                        <p class="menu-card-desc">تعديل الأرصدة والبيانات</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-games')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #FFD700, #FFA500);">
                            <i class="fa-solid fa-gamepad"></i>
                        </div>
                        <h4 class="menu-card-title">ألعاب المنصة</h4>
                        <p class="menu-card-desc">إضافة وحذف وتعديل الألعاب</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-providers')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #10B981, #059669);">
                            <i class="fa-solid fa-plug"></i>
                        </div>
                        <h4 class="menu-card-title">مزودات الـ API</h4>
                        <p class="menu-card-desc">ربط وتفويض شركات الألعاب</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-agents')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #3B82F6, #1D4ED8);">
                            <i class="fa-solid fa-truck-fast"></i>
                        </div>
                        <h4 class="menu-card-title">وكلاء الشحن</h4>
                        <p class="menu-card-desc">إدارة وكلاء الشحن المعتمدين</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-p2p')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #8B5CF6, #6D28D9);">
                            <i class="fa-solid fa-user-shield"></i>
                        </div>
                        <h4 class="menu-card-title">وكلاء التطبيق (P2P)</h4>
                        <p class="menu-card-desc">تفعيل ومراقبة عملاء P2P</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-payment')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #EC4899, #BE185D);">
                            <i class="fa-solid fa-credit-card"></i>
                        </div>
                        <h4 class="menu-card-title">بوابات الشحن</h4>
                        <p class="menu-card-desc">تهيئة طرق الدفع والأسعار</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-receipts')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #F59E0B, #D97706);">
                            <i class="fa-solid fa-receipt"></i>
                        </div>
                        <h4 class="menu-card-title">إيصالات الشحن</h4>
                        <p class="menu-card-desc">مراجعة واعتماد إيصالات الدفع</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-settings')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #6B7280, #4B5563);">
                            <i class="fa-solid fa-gears"></i>
                        </div>
                        <h4 class="menu-card-title">إعدادات التطبيق</h4>
                        <p class="menu-card-desc">التحكم في الشاشات والبنرات</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-admins')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #06B6D4, #0891B2);">
                            <i class="fa-solid fa-users-gear"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة المشرفين</h4>
                        <p class="menu-card-desc">إضافة وتعديل صلاحيات المشرفين</p>
                    </div>
                </div>
            </div>`;

    htmlContent = htmlContent.replace(old_main_content_start, new_main_content_start);

    // 3. Remove grid menu markup from the bottom of tab-dashboard panel
    const old_dashboard_grid = `                <div class="section-header-row" style="margin-top:30px; margin-bottom:15px;">
                    <h3><i class="fa-solid fa-cubes" style="color:var(--orange);margin-left:6px;"></i>أقسام لوحة التحكم</h3>
                </div>

                <div class="dashboard-grid">
                    <div class="menu-card" onclick="switchTab('tab-players')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #FF7A1F, #D45A00);">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة اللاعبين</h4>
                        <p class="menu-card-desc">تعديل الأرصدة والبيانات</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-games')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #FFD700, #FFA500);">
                            <i class="fa-solid fa-gamepad"></i>
                        </div>
                        <h4 class="menu-card-title">ألعاب المنصة</h4>
                        <p class="menu-card-desc">إضافة وحذف وتعديل الألعاب</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-providers')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #10B981, #059669);">
                            <i class="fa-solid fa-plug"></i>
                        </div>
                        <h4 class="menu-card-title">مزودات الـ API</h4>
                        <p class="menu-card-desc">ربط وتفويض شركات الألعاب</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-agents')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #3B82F6, #1D4ED8);">
                            <i class="fa-solid fa-truck-fast"></i>
                        </div>
                        <h4 class="menu-card-title">وكلاء الشحن</h4>
                        <p class="menu-card-desc">إدارة وكلاء الشحن المعتمدين</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-p2p')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #8B5CF6, #6D28D9);">
                            <i class="fa-solid fa-user-shield"></i>
                        </div>
                        <h4 class="menu-card-title">وكلاء التطبيق (P2P)</h4>
                        <p class="menu-card-desc">تفعيل ومراقبة عملاء P2P</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-payment')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #EC4899, #BE185D);">
                            <i class="fa-solid fa-credit-card"></i>
                        </div>
                        <h4 class="menu-card-title">بوابات الشحن</h4>
                        <p class="menu-card-desc">تهيئة طرق الدفع والأسعار</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-receipts')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #F59E0B, #D97706);">
                            <i class="fa-solid fa-receipt"></i>
                        </div>
                        <h4 class="menu-card-title">إيصالات الشحن</h4>
                        <p class="menu-card-desc">مراجعة واعتماد إيصالات الدفع</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-settings')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #6B7280, #4B5563);">
                            <i class="fa-solid fa-gears"></i>
                        </div>
                        <h4 class="menu-card-title">إعدادات التطبيق</h4>
                        <p class="menu-card-desc">التحكم في الشاشات والبنرات</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-admins')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #06B6D4, #0891B2);">
                            <i class="fa-solid fa-users-gear"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة المشرفين</h4>
                        <p class="menu-card-desc">إضافة وتعديل صلاحيات المشرفين</p>
                    </div>
                </div>`;

    htmlContent = htmlContent.replace(old_dashboard_grid, '');

    // 4. Inject Back Button at the top of every tab panel and hide panels by default
    const panels = [
        'tab-dashboard',
        'tab-players',
        'tab-providers',
        'tab-games',
        'tab-agents',
        'tab-p2p',
        'tab-payment',
        'tab-receipts',
        'tab-settings',
        'tab-admins'
    ];

    panels.forEach(id => {
        // Set display to none and remove active class
        const target = `id="${id}" class="tab-panel active"`;
        const target_no_active = `id="${id}" class="tab-panel"`;
        const replacement = `id="${id}" class="tab-panel" style="display: none;"`;

        htmlContent = htmlContent.replace(target, replacement);
        htmlContent = htmlContent.replace(target_no_active, replacement);

        // Inject Back Button inside the panel right after its opening tag
        const panel_tag = `id="${id}" class="tab-panel" style="display: none;">`;
        const back_btn_block = `\n                <!-- Back Button -->\n                <button class="btn-back" onclick="window.goBackToGrid()">\n                    <i class="fa-solid fa-arrow-right"></i> رجوع للخلف\n                </button>\n`;
        
        // Only inject if not already injected
        if (htmlContent.includes(panel_tag) && !htmlContent.includes(`onclick="window.goBackToGrid()"`)) {
            htmlContent = htmlContent.replace(panel_tag, panel_tag + back_btn_block);
        }
    });

    // Make sure we replace any remaining panel tags to add back button
    panels.forEach(id => {
        const tag = `id="${id}" class="tab-panel" style="display: none;">`;
        if (htmlContent.includes(tag)) {
            const index = htmlContent.indexOf(tag) + tag.length;
            const checkText = htmlContent.substring(index, index + 200);
            if (!checkText.includes('goBackToGrid')) {
                const before = htmlContent.substring(0, index);
                const after = htmlContent.substring(index);
                htmlContent = before + `\n                <!-- Back Button -->\n                <button class="btn-back" onclick="window.goBackToGrid()">\n                    <i class="fa-solid fa-arrow-right"></i> رجوع للخلف\n                </button>\n` + after;
            }
        }
    });

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log("SUCCESS: admin.html updated with back buttons and hidden panels!");

    // 5. PATCH admin.js to handle switchTab and goBackToGrid
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    jsContent = jsContent.replace(/\r\n/g, '\n');

    // Remove auto routing on startup
    const auto_route_block = `        // Auto-switch to the first allowed tab if players tab is hidden/unauthorized
        if (firstAllowedTabId && !allowed.includes('players')) {
            switchTab(firstAllowedTabId);
        }`;
    jsContent = jsContent.replace(auto_route_block, '');

    // Replace switchTab function
    const old_switch_tab_fn = `// ─── Tab Switch ──────────────────────────────
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

    const new_switch_tab_fn = `// ─── Tab Switch ──────────────────────────────
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
        return onclickAttr.includes(\`'\${id}'\`) || onclickAttr.includes(\`"\${id}"\`);
    });
    if (clickedTab) clickedTab.classList.add('active');

    // Close mobile sidebar drawer if open
    if (typeof window.toggleSidebar === 'function') {
        window.toggleSidebar(false);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goBackToGrid = goBackToGrid;`;

    jsContent = jsContent.replace(old_switch_tab_fn, new_switch_tab_fn);

    fs.writeFileSync(jsPath, jsContent, 'utf-8');
    console.log("SUCCESS: admin.js updated with back navigation and overridden tab switches!");
}

main();
