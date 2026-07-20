import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_admin_v3.js...");
    const filePath = resolve('admin.html');
    let content = fs.readFileSync(filePath, 'utf-8');

    // Normalize newlines to LF
    content = content.replace(/\r\n/g, '\n');

    // 1. Add .mobile-header-bar styles to the styling block
    const old_btn_refresh_style = `        .btn-refresh {
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

    const new_btn_refresh_style = `        .btn-refresh {
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
        }

        .mobile-header-bar {
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

    content = content.replace(old_btn_refresh_style, new_btn_refresh_style);

    // 2. Define the header block currently in admin.html
    const old_header_block = `            <!-- Header -->
            <header class="vip-header glass-card" style="border-top-color:var(--orange);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;width:100%;gap:15px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <!-- Menu Toggle Button for mobile -->
                    <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <!-- Page Refresh Button -->
                    <button class="btn-refresh" onclick="window.location.reload()" title="تحديث الصفحة">
                        <i class="fa-solid fa-rotate"></i>
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
            </header>`;

    // Replace it with minimal mobile header bar
    const new_header_block = `            <!-- Mobile Header Bar -->
            <div class="mobile-header-bar">
                <button class="btn-menu-toggle" onclick="window.toggleSidebar(true)" style="display: flex;">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>`;

    content = content.replace(old_header_block, new_header_block);

    // 3. Move the entire header info to the top of tab-dashboard panel
    const old_dashboard_panel = `            <!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->
            <div id="tab-dashboard" class="tab-panel active">
                <div class="section-header-row" style="margin-bottom:20px;">
                    <h3><i class="fa-solid fa-chart-line" style="color:var(--orange);margin-left:6px;"></i>لوحة الإحصائيات العامة</h3>
                </div>`;

    const new_dashboard_panel = `            <!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->
            <div id="tab-dashboard" class="tab-panel active">
                <!-- Admin Profile Card -->
                <div class="vip-header glass-card" style="border-top-color:var(--orange);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;width:100%;gap:15px;flex-wrap:wrap;padding: 16px;">
                    <div class="profile-section" style="display:flex;align-items:center;gap:12px;">
                        <div class="icon-circle gold-glow" style="width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,#FF7A1F,#D45A00);display:flex;align-items:center;justify-content:center;">
                            <i class="fa-solid fa-user-gear"></i>
                        </div>
                        <div class="player-info">
                            <div class="player-name-row" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <h2 class="player-name" id="adminHeaderName" style="font-size:16px;font-weight:900;color:#fff;margin:0;">بوابة التحكم الإدارية</h2>
                                <span class="vip-badge" style="background:rgba(255,122,31,0.15);color:var(--orange);border-color:var(--orange);padding:2px 8px;font-size:10px;border-radius:50px;border:1px solid;" id="adminRoleBadge">
                                    <i class="fa-solid fa-user-shield"></i> المشرف العام
                                </span>
                            </div>
                            <span class="player-id" style="font-size:11px;color:#888;">منصة مسعودي للألعاب — الإصدار 2.0</span>
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
                </div>

                <div class="section-header-row" style="margin-bottom:20px;">
                    <h3><i class="fa-solid fa-chart-line" style="color:var(--orange);margin-left:6px;"></i>لوحة الإحصائيات العامة</h3>
                </div>`;

    content = content.replace(old_dashboard_panel, new_dashboard_panel);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("SUCCESS: admin.html updated and restructured successfully!");
}

main();
