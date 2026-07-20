import re

def main():
    print("Patching admin.html...")
    with open("admin.html", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Replace body styling
    old_body_style = "        body { background: var(--dark-bg); }"
    new_body_style = """        body {
            margin: 0;
            padding: 0;
            background: var(--dark-bg);
            color: #fff;
            font-family: 'Cairo', sans-serif;
            overflow-x: hidden;
        }

        .admin-wrapper {
            display: flex;
            min-height: 100vh;
            width: 100%;
        }

        /* Sidebar styling */
        .admin-sidebar {
            width: 280px;
            background: linear-gradient(180deg, #1C120C 0%, #150D09 100%);
            border-left: 1.5px solid var(--border);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-brand {
            padding: 24px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid rgba(255, 122, 31, 0.1);
            position: relative;
        }

        .btn-close-sidebar {
            display: none;
            background: none;
            border: none;
            color: #aaa;
            font-size: 20px;
            cursor: pointer;
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            transition: color 0.2s;
        }
        .btn-close-sidebar:hover {
            color: #ff5252;
        }

        .sidebar-tabs {
            flex: 1;
            padding: 20px 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            overflow-y: auto;
        }

        /* Sidebar Tabs styling */
        .sidebar-tabs .admin-tab {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            border-radius: 12px;
            border: 1px solid transparent;
            background: transparent;
            color: #8B909E;
            font-family: 'Cairo', sans-serif;
            font-size: 13.5px;
            font-weight: 700;
            cursor: pointer;
            text-align: right;
            transition: all 0.25s ease;
        }

        .sidebar-tabs .admin-tab i {
            font-size: 16px;
            width: 20px;
            text-align: center;
            color: #8B909E;
            transition: color 0.25s;
        }

        .sidebar-tabs .admin-tab:hover {
            background: rgba(255, 122, 31, 0.05);
            color: #fff;
            border-color: rgba(255, 122, 31, 0.1);
        }

        .sidebar-tabs .admin-tab:hover i {
            color: var(--orange);
        }

        .sidebar-tabs .admin-tab.active {
            background: linear-gradient(135deg, var(--orange), #D45A00);
            color: #fff;
            border-color: var(--orange);
            box-shadow: 0 4px 15px rgba(255, 122, 31, 0.25);
        }

        .sidebar-tabs .admin-tab.active i {
            color: #fff;
        }

        .sidebar-footer {
            padding: 20px;
            border-top: 1px solid rgba(255, 122, 31, 0.1);
        }

        .btn-sidebar-logout {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px;
            background: rgba(255, 82, 82, 0.08);
            border: 1px solid rgba(255, 82, 82, 0.2);
            color: #ff5252;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-sidebar-logout:hover {
            background: #ff5252;
            color: #fff;
            box-shadow: 0 4px 15px rgba(255, 82, 82, 0.25);
        }

        /* Overlay for mobile drawer */
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.65);
            backdrop-filter: blur(4px);
            z-index: 999;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        /* Main content styling */
        .main-content {
            flex: 1;
            min-height: 100vh;
            padding: 24px;
            margin-right: 280px; /* Space for permanent sidebar */
            width: calc(100% - 280px);
            transition: margin 0.3s ease, width 0.3s ease;
        }

        .btn-menu-toggle {
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

        /* Responsive Layout Rules */
        @media (max-width: 991px) {
            .admin-sidebar {
                transform: translateX(280px); /* Hide drawer offscreen (RTL hides to the right) */
            }
            .admin-sidebar.open {
                transform: translateX(0);
                box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            }
            .btn-close-sidebar {
                display: block; /* Show close button in drawer */
            }
            .main-content {
                margin-right: 0;
                width: 100%;
                padding: 16px;
            }
            .btn-menu-toggle {
                display: flex; /* Show menu toggle on mobile */
            }
            .sidebar-overlay.open {
                display: block;
                opacity: 1;
            }
            .vip-header {
                margin: 0 0 16px 0;
                padding: 14px;
            }
            .stats-row {
                grid-template-columns: 1fr; /* Stack stats vertically on small screens */
                gap: 12px;
            }
        }

        @media (min-width: 992px) {
            .admin-sidebar {
                transform: translateX(0) !important; /* Always visible on PC */
            }
            .sidebar-overlay {
                display: none !important;
            }
        }"""
    content = content.replace(old_body_style, new_body_style)

    # 2. Add toggleSidebar helper inside head or script
    toggle_js = """
    <script>
        function toggleSidebar(open) {
            const sidebar = document.getElementById('adminSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar && overlay) {
                if (open) {
                    sidebar.classList.add('open');
                    overlay.classList.add('open');
                } else {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                }
            }
        }
        window.toggleSidebar = toggleSidebar;
    </script>
</head>"""
    content = content.replace("</head>", toggle_js)

    # 3. Replace horizontal tabs
    old_tabs_regex = r'<!-- Tabs -->\s*<div class="admin-tabs">.*?</div>\s*</div>'
    # Let's search by string to be safe
    old_tabs_block = """        <!-- Tabs -->
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="switchTab('tab-players')">
                <i class="fa-solid fa-users"></i> إدارة اللاعبين
            </button>
            <button class="admin-tab" onclick="switchTab('tab-providers')">
                <i class="fa-solid fa-plug"></i> مزودات الـ API
            </button>
            <button class="admin-tab" onclick="switchTab('tab-games')">
                <i class="fa-solid fa-gamepad"></i> ألعاب المنصة
            </button>
            <button class="admin-tab" onclick="switchTab('tab-settings')">
                <i class="fa-solid fa-gears"></i> إعدادات التطبيق
            </button>
            <button class="admin-tab" onclick="switchTab('tab-agents')">
                <i class="fa-solid fa-truck-fast"></i> وكلاء الشحن
            </button>
            <button class="admin-tab" onclick="switchTab('tab-p2p')">
                <i class="fa-solid fa-user-shield"></i> وكلاء التطبيق (P2P)
            </button>
            <button class="admin-tab" onclick="switchTab('tab-payment')">
                <i class="fa-solid fa-credit-card"></i> بوابات الشحن 🇪🇬
            </button>
            <button class="admin-tab" onclick="switchTab('tab-receipts')">
                <i class="fa-solid fa-receipt"></i> إيصالات الشحن 🧾
            </button>
            <button class="admin-tab" onclick="switchTab('tab-admins')" id="tabBtnAdmins" style="display:none;">
                <i class="fa-solid fa-user-shield"></i> إدارة المشرفين 👥
            </button>
        </div>"""
    
    # We will search and replace it with empty string
    content = content.replace(old_tabs_block, "")

    # 4. Replace container and header
    old_container_header = """    <div class="app-container" style="max-width:860px; padding-bottom:30px;">

        <!-- Header -->
        <header class="vip-header glass-card" style="border-top-color:var(--orange);margin-bottom:20px;">
            <div class="profile-section">
                <div class="icon-circle gold-glow" style="width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,#FF7A1F,#D45A00);">
                    <i class="fa-solid fa-user-gear"></i>
                </div>
                <div class="player-info">
                    <div class="player-name-row">
                        <h2 class="player-name" id="adminHeaderName">بوابة التحكم الإدارية</h2>
                        <span class="vip-badge" style="background:rgba(255,122,31,0.15);color:var(--orange);border-color:var(--orange);" id="adminRoleBadge">
                            <i class="fa-solid fa-user-shield"></i> المشرف العام
                        </span>
                    </div>
                    <span class="player-id">منصة مسعودي للألعاب — الإصدار 2.0</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button class="btn-action" onclick="window.toggleLanguage()" style="font-size:11px;padding:6px 10px;background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;gap:4px;" id="langToggleBtn">
                    🌐 English
                </button>
                <button class="btn-action btn-reset-pw" onclick="openModal('changePwModal')" style="font-size:11px;padding:6px 10px;">
                    <i class="fa-solid fa-key"></i> كلمة المرور
                </button>
                <button class="btn-action btn-add-funds" id="addAdminBtn" onclick="openModal('addAdminModal')" style="font-size:11px;padding:6px 10px;display:none;">
                    <i class="fa-solid fa-user-plus"></i> مشرف جديد
                </button>
                <button class="btn-action btn-delete-player" onclick="adminLogout()" style="font-size:11px;padding:6px 10px;">
                    <i class="fa-solid fa-right-from-bracket"></i> خروج
                </button>
            </div>
        </header>"""

    new_container_header = """    <div class="admin-wrapper">
        <!-- Sidebar Navigation Drawer -->
        <aside class="admin-sidebar" id="adminSidebar">
            <div class="sidebar-brand">
                <div class="icon-circle gold-glow" style="width:36px;height:36px;font-size:14px;background:linear-gradient(135deg,#FF7A1F,#D45A00);margin-left:10px;display:flex;align-items:center;justify-content:center;">
                    <i class="fa-solid fa-user-gear"></i>
                </div>
                <div>
                    <h2 style="font-size:15px;font-weight:900;color:#fff;margin:0;font-family:'Cairo',sans-serif;">بوابة المسؤول</h2>
                    <span style="font-size:10px;color:#888;font-family:'Cairo',sans-serif;">منصة مسعودي v2.0</span>
                </div>
                <button class="btn-close-sidebar" onclick="window.toggleSidebar(false)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="sidebar-tabs" id="sidebarTabs">
                <button class="admin-tab active" onclick="switchTab('tab-players')">
                    <i class="fa-solid fa-users"></i> <span>إدارة اللاعبين</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-providers')">
                    <i class="fa-solid fa-plug"></i> <span>مزودات الـ API</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-games')">
                    <i class="fa-solid fa-gamepad"></i> <span>ألعاب المنصة</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-settings')">
                    <i class="fa-solid fa-gears"></i> <span>إعدادات التطبيق</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-agents')">
                    <i class="fa-solid fa-truck-fast"></i> <span>وكلاء الشحن</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-p2p')">
                    <i class="fa-solid fa-user-shield"></i> <span>وكلاء التطبيق (P2P)</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-payment')">
                    <i class="fa-solid fa-credit-card"></i> <span>بوابات الشحن 🇪🇬</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-receipts')">
                    <i class="fa-solid fa-receipt"></i> <span>إيصالات الشحن 🧾</span>
                </button>
                <button class="admin-tab" onclick="switchTab('tab-admins')" id="tabBtnAdmins" style="display:none;">
                    <i class="fa-solid fa-user-shield"></i> <span>إدارة المشرفين 👥</span>
                </button>
            </div>
            <div class="sidebar-footer">
                <button class="btn-sidebar-logout" onclick="adminLogout()">
                    <i class="fa-solid fa-right-from-bracket"></i> <span>تسجيل الخروج</span>
                </button>
            </div>
        </aside>

        <!-- Overlay for mobile drawer -->
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="window.toggleSidebar(false)"></div>

        <!-- Main Content Area -->
        <div class="main-content">
            <!-- Header -->
            <header class="vip-header glass-card" style="border-top-color:var(--orange);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;width:100%;gap:15px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <!-- Menu Toggle Button for mobile -->
                    <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div class="profile-section">
                        <div class="icon-circle gold-glow" style="width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,#FF7A1F,#D45A00);display:none;" id="headerIconCircle">
                            <i class="fa-solid fa-user-gear"></i>
                        </div>
                        <div class="player-info">
                            <div class="player-name-row">
                                <h2 class="player-name" id="adminHeaderName">بوابة التحكم الإدارية</h2>
                                <span class="vip-badge" style="background:rgba(255,122,31,0.15);color:var(--orange);border-color:var(--orange);" id="adminRoleBadge">
                                    <i class="fa-solid fa-user-shield"></i> المشرف العام
                                </span>
                            </div>
                            <span class="player-id">منصة مسعودي للألعاب — الإصدار 2.0</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <button class="btn-action" onclick="window.toggleLanguage()" style="font-size:11px;padding:6px 10px;background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;gap:4px;" id="langToggleBtn">
                        🌐 English
                    </button>
                    <button class="btn-action btn-reset-pw" onclick="openModal('changePwModal')" style="font-size:11px;padding:6px 10px;">
                        <i class="fa-solid fa-key"></i> كلمة المرور
                    </button>
                    <button class="btn-action btn-add-funds" id="addAdminBtn" onclick="openModal('addAdminModal')" style="font-size:11px;padding:6px 10px;display:none;">
                        <i class="fa-solid fa-user-plus"></i> مشرف جديد
                    </button>
                    <button class="btn-action btn-delete-player" onclick="adminLogout()" style="font-size:11px;padding:6px 10px;">
                        <i class="fa-solid fa-right-from-bracket"></i> خروج
                    </button>
                </div>
            </header>"""

    content = content.replace(old_container_header, new_container_header)

    # 5. Replace closing tag of app-container
    old_closing = """        </main>
    </div>"""
    new_closing = """        </main>
        </div> <!-- Closing main-content -->
    </div> <!-- Closing admin-wrapper -->"""
    
    content = content.replace(old_closing, new_closing)

    # Write back
    with open("admin.html", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: admin.html patched successfully!")

if __name__ == "__main__":
    main()
