import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_admin_v4.js to implement custom grid menu design matching user app...");

    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // 1. Add CSS rules for dashboard-grid and menu-card
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
        }

        /* ─── Grid Menu on Home Page ─── */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }

        .menu-card {
            background: linear-gradient(135deg, rgba(41,27,21,0.90) 0%, rgba(26,17,13,0.95) 100%);
            border: 1.5px solid var(--border);
            border-radius: 20px;
            padding: 24px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .menu-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,122,31,0.08) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .menu-card:hover {
            transform: translateY(-6px);
            border-color: var(--orange);
            box-shadow: 0 10px 25px rgba(255, 122, 31, 0.15);
        }

        .menu-card:hover::before {
            opacity: 1;
        }

        .menu-card-icon {
            width: 60px;
            height: 60px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #fff;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }

        .menu-card:hover .menu-card-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .menu-card-title {
            font-size: 15px;
            font-weight: 800;
            color: #fff;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        .menu-card-desc {
            font-size: 11px;
            color: #8B909E;
            margin: 0;
            line-height: 1.4;
            font-family: 'Cairo', sans-serif;
        }

        /* Responsive Mobile Columns (2 Columns just like user's screenshot) */
        @media (max-width: 576px) {
            .dashboard-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            .menu-card {
                padding: 16px 10px;
                border-radius: 16px;
                gap: 8px;
            }
            .menu-card-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
                border-radius: 14px;
            }
            .menu-card-title {
                font-size: 13px;
            }
            .menu-card-desc {
                font-size: 10px;
            }
        }`;

    htmlContent = htmlContent.replace(old_mobile_header_style, new_mobile_header_style);

    // 2. Add dashboard menu cards in tab-dashboard panel
    const old_dashboard_bottom = `                <!-- Welcome & Platform Overview Card -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-bg);">
                    <h4 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif;">
                        <i class="fa-solid fa-circle-info" style="color: var(--orange);"></i> مرحباً بك في لوحة تحكم منصة مسعودي
                    </h4>
                    <p style="font-size: 13px; color: #ccc; line-height: 1.6; margin: 0; font-family: 'Cairo', sans-serif;">
                        من هنا يمكنك إدارة اللاعبين وتعديل الأرصدة، شحن الأكواد والألعاب، تهيئة إعدادات التطبيق وبوابات الدفع، وإدارة المشرفين والوكلاء. استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.
                    </p>
                </div>
            </div>`;

    const new_dashboard_bottom = `                <!-- Welcome & Platform Overview Card -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-bg);">
                    <h4 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif;">
                        <i class="fa-solid fa-circle-info" style="color: var(--orange);"></i> مرحباً بك في لوحة تحكم منصة مسعودي
                    </h4>
                    <p style="font-size: 13px; color: #ccc; line-height: 1.6; margin: 0; font-family: 'Cairo', sans-serif;">
                        من هنا يمكنك إدارة اللاعبين وتعديل الأرصدة، شحن الأكواد والألعاب، تهيئة إعدادات التطبيق وبوابات الدفع، وإدارة المشرفين والوكلاء. استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.
                    </p>
                </div>

                <div class="section-header-row" style="margin-top:30px; margin-bottom:15px;">
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
                </div>
            </div>`;

    if (htmlContent.includes(old_dashboard_bottom)) {
        htmlContent = htmlContent.replace(old_dashboard_bottom, new_dashboard_bottom);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log("SUCCESS: admin.html updated with grid menu card markup!");
    } else {
        console.log("ERROR: Dashboard welcome card not found in admin.html!");
    }

    // 3. PATCH admin.js for menu card visibility syncing
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    jsContent = jsContent.replace(/\r\n/g, '\n');

    const old_js_tab_check = `        let firstAllowedTabId = null;
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

    const new_js_tab_check = `        let firstAllowedTabId = null;
        document.querySelectorAll('.admin-tab').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/switchTab\\(['"]([^'"]+)['"]\\)/);
            if (match) {
                const tabId = match[1]; // e.g. "tab-players"
                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                const isAllowed = tabKey === 'dashboard' || allowed.includes(tabKey);
                btn.style.display = isAllowed ? 'flex' : 'none';
                if (isAllowed && !firstAllowedTabId) firstAllowedTabId = tabId;

                // Sync the corresponding menu card on the dashboard if it exists
                const correspondingCard = document.querySelector(\`.menu-card[onclick*="'\${tabId}'"]\`) || document.querySelector(\`.menu-card[onclick*='"\${tabId}"']\`);
                if (correspondingCard) {
                    correspondingCard.style.display = isAllowed ? 'flex' : 'none';
                }
            }
        });`;

    // Note: JS template literals need escaping in python/string replacements, let's replace by exact characters matching
    // Let's do a direct replace since we know the exact text in admin.js
    const old_js_match = `        let firstAllowedTabId = null;
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

    // We can search for allowed.includes(tabKey) loop in admin.js to replace it
    const target_code = jsContent.match(/let firstAllowedTabId = null;[\s\S]*?\}\s*\}\s*\}\s*\}\s*\);\s*/);
    if (target_code) {
        jsContent = jsContent.replace(target_code[0], `let firstAllowedTabId = null;
        document.querySelectorAll('.admin-tab').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/switchTab\\(['"]([^'"]+)['"]\\)/);
            if (match) {
                const tabId = match[1]; // e.g. "tab-players"
                const tabKey = tabId.replace('tab-', ''); // e.g. "players"
                const isAllowed = tabKey === 'dashboard' || allowed.includes(tabKey);
                btn.style.display = isAllowed ? 'flex' : 'none';
                if (isAllowed && !firstAllowedTabId) firstAllowedTabId = tabId;

                // Sync the corresponding menu card on the dashboard if it exists
                const correspondingCard = document.querySelector(\`.menu-card[onclick*="'\${tabId}'"]\`) || document.querySelector(\`.menu-card[onclick*='"\${tabId}"']\`);
                if (correspondingCard) {
                    correspondingCard.style.display = isAllowed ? 'flex' : 'none';
                }
            }
        });\n`);
        fs.writeFileSync(jsPath, jsContent, 'utf-8');
        console.log("SUCCESS: admin.js updated with menu card syncing logic!");
    } else {
        console.log("ERROR: firstAllowedTabId check loop not matched in admin.js!");
    }
}

main();
