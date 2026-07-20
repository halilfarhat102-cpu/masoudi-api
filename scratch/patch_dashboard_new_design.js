import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_dashboard_new_design.js to implement custom luxury dashboard Home tab design...");

    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // 1. CSS styling block for Admin Hub, Premium Stats, and Back Button
    const old_mobile_header_style = `        .mobile-header-bar {
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
        }

        /* ─── Premium Admin Hub ─── */
        .admin-hub-card {
            background: linear-gradient(135deg, rgba(31,22,17,0.95) 0%, rgba(20,13,10,0.98) 100%);
            border: 1.5px solid var(--border);
            border-top: 3px solid var(--orange);
            border-radius: 24px;
            padding: 24px;
            margin-bottom: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        
        .admin-hub-profile {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .avatar-glow {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FF7A1F, #D45A00);
            padding: 3px;
            box-shadow: 0 0 20px var(--orange-glow);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .admin-avatar-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #110A07;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--orange);
            font-size: 26px;
        }

        .admin-hub-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .admin-hub-info h2 {
            font-size: 20px;
            font-weight: 900;
            color: #fff;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        .admin-hub-sub {
            font-size: 12px;
            color: #888;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        .admin-role-tag {
            align-self: flex-start;
            background: rgba(255,122,31,0.12);
            color: #FFA726;
            border: 1px solid rgba(255,122,31,0.3);
            border-radius: 50px;
            padding: 4px 14px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 0 10px rgba(255,122,31,0.05);
            font-family: 'Cairo', sans-serif;
        }

        .admin-hub-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding-top: 20px;
        }

        .hub-btn {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fff;
            padding: 10px 18px;
            border-radius: 12px;
            font-size: 12.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Cairo', sans-serif;
        }

        .hub-btn:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .hub-btn-add {
            background: rgba(16, 185, 129, 0.08);
            border-color: rgba(16, 185, 129, 0.2);
            color: #34D399;
        }
        .hub-btn-add:hover {
            background: #10B981;
            border-color: #10B981;
            color: #fff;
            box-shadow: 0 0 15px rgba(16,185,129,0.3);
        }

        .hub-btn-logout {
            background: rgba(239, 68, 68, 0.08);
            border-color: rgba(239, 68, 68, 0.2);
            color: #F87171;
            margin-right: auto; /* Push logout to the left in RTL */
        }
        .hub-btn-logout:hover {
            background: #EF4444;
            border-color: #EF4444;
            color: #fff;
            box-shadow: 0 0 15px rgba(239,68,68,0.3);
        }

        /* ─── Premium Stats Grid ─── */
        .premium-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }

        .premium-stat-card {
            background: linear-gradient(135deg, rgba(38,38,38,0.4) 0%, rgba(20,20,20,0.6) 100%);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .premium-stat-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            transition: all 0.3s ease;
        }

        .card-players-stat::after { background: #FF7A1F; }
        .card-active-stat::after { background: #10B981; }
        .card-balance-stat::after { background: #FFD700; }

        .premium-stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
            border-color: rgba(255,255,255,0.12);
        }

        .stat-icon-wrapper {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .card-players-stat .stat-icon-wrapper {
            background: rgba(255,122,31,0.12);
            color: #FF7A1F;
        }
        .card-active-stat .stat-icon-wrapper {
            background: rgba(16,185,129,0.12);
            color: #10B981;
        }
        .card-balance-stat .stat-icon-wrapper {
            background: rgba(255,215,0,0.12);
            color: #FFD700;
        }

        .stat-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .stat-val {
            font-size: 24px;
            font-weight: 900;
            color: #fff;
            font-family: 'Outfit', sans-serif;
            line-height: 1.2;
        }

        .stat-label {
            font-size: 11.5px;
            color: #888;
            font-family: 'Cairo', sans-serif;
        }

        /* Announcement Card */
        .announcement-card {
            background: linear-gradient(135deg, rgba(255,122,31,0.03) 0%, rgba(0,0,0,0.4) 100%);
            border: 1px solid rgba(255,122,31,0.15);
            border-radius: 20px;
            padding: 20px;
        }

        .announcement-header {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--orange);
            margin-bottom: 12px;
        }

        .announcement-header h4 {
            font-size: 15px;
            font-weight: 800;
            margin: 0;
            color: #fff;
            font-family: 'Cairo', sans-serif;
        }

        .announcement-card p {
            font-size: 12.5px;
            color: #ccc;
            line-height: 1.6;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        /* Responsive Breakpoints for Stats Grid */
        @media (max-width: 991px) {
            .premium-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 576px) {
            .premium-stats-grid {
                grid-template-columns: 1fr; /* Stack vertically on phones */
                gap: 12px;
            }
            .admin-hub-actions {
                flex-direction: column;
                gap: 8px;
            }
            .hub-btn-logout {
                margin-right: 0;
            }
            .admin-hub-profile {
                flex-direction: column;
                text-align: center;
            }
            .admin-role-tag {
                align-self: center;
            }
        }`;

    htmlContent = htmlContent.replace(old_mobile_header_style, new_mobile_header_style);

    // 2. Replace the old tab-dashboard content completely
    const old_dashboard_block = `            <!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->
            <div id="tab-dashboard" class="tab-panel" style="display: none;" style="display: none;">
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


            </div>`;

    const new_dashboard_block = `            <!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->
            <div id="tab-dashboard" class="tab-panel" style="display: none;">
                <!-- Back Button -->
                <button class="btn-back" onclick="window.goBackToGrid()">
                    <i class="fa-solid fa-arrow-right"></i> رجوع للخلف
                </button>

                <!-- Admin Profile Card / Admin Hub -->
                <div class="admin-hub-card">
                    <div class="admin-hub-profile">
                        <div class="avatar-glow">
                            <div class="admin-avatar-circle">
                                <i class="fa-solid fa-user-shield"></i>
                            </div>
                        </div>
                        <div class="admin-hub-info">
                            <h2 id="adminHeaderName">بوابة التحكم الإدارية</h2>
                            <span class="admin-role-tag gold-glow" id="adminRoleBadge">
                                <i class="fa-solid fa-crown"></i> المشرف العام
                            </span>
                            <p class="admin-hub-sub">منصة مسعودي للألعاب — الإصدار 2.0</p>
                        </div>
                    </div>
                    <div class="admin-hub-actions">
                        <button class="hub-btn" onclick="window.toggleLanguage()" id="langToggleBtn">
                            🌐 English
                        </button>
                        <button class="hub-btn hub-btn-pw" onclick="openModal('changePwModal')">
                            <i class="fa-solid fa-key"></i> كلمة المرور
                        </button>
                        <button class="hub-btn hub-btn-add" id="addAdminBtn" onclick="openModal('addAdminModal')" style="display:none;">
                            <i class="fa-solid fa-user-plus"></i> مشرف جديد
                        </button>
                        <button class="hub-btn hub-btn-logout" onclick="adminLogout()">
                            <i class="fa-solid fa-right-from-bracket"></i> خروج
                        </button>
                    </div>
                </div>

                <div class="section-header-row" style="margin-top: 30px; margin-bottom: 15px;">
                    <h3><i class="fa-solid fa-chart-simple" style="color:var(--orange);margin-left:8px;"></i>مؤشرات النظام الحية</h3>
                </div>
                
                <div class="premium-stats-grid">
                    <div class="premium-stat-card card-players-stat">
                        <div class="stat-icon-wrapper">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-val" id="statTotalPlayers">—</div>
                            <div class="stat-label">إجمالي اللاعبين المسجلين</div>
                        </div>
                    </div>
                    <div class="premium-stat-card card-active-stat">
                        <div class="stat-icon-wrapper">
                            <i class="fa-solid fa-user-check"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-val" id="statActivePlayers">—</div>
                            <div class="stat-label">اللاعبين النشطين حالياً</div>
                        </div>
                    </div>
                    <div class="premium-stat-card card-balance-stat">
                        <div class="stat-icon-wrapper">
                            <i class="fa-solid fa-coins"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-val" id="statTotalBalance">—</div>
                            <div class="stat-label">إجمالي الأرصدة بالمنصة</div>
                        </div>
                    </div>
                </div>

                <!-- Welcome Card -->
                <div class="announcement-card glass-card">
                    <div class="announcement-header">
                        <i class="fa-solid fa-bullhorn" style="color: var(--orange);"></i>
                        <h4>إعلان الإدارة العام</h4>
                    </div>
                    <p>مرحباً بك في لوحة تحكم منصة مسعودي للألعاب. تم تحسين اللوحة بالكامل لتكون مرنة وسريعة وسهلة الاستخدام عبر الهواتف المحمولة والكمبيوتر لمتابعة إحصائيات النظام وإدارة الألعاب والمشرفين.</p>
                </div>
            </div>`;

    if (htmlContent.includes(old_dashboard_block)) {
        htmlContent = htmlContent.replace(old_dashboard_block, new_dashboard_block);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log("SUCCESS: admin.html updated with custom premium dashboard tab!");
    } else {
        // Fallback replacement if some spaces/newlines differ
        console.log("WARNING: Strict matching of old tab block failed, trying substring replacement...");
        // Let's do a substring locate for the old block
        const startIndex = htmlContent.indexOf('<!-- ═══════════════ TAB: DASHBOARD ═══════════════ -->');
        const endIndex = htmlContent.indexOf('<!-- ═══════════════ TAB: PLAYERS ═══════════════ -->');
        if (startIndex !== -1 && endIndex !== -1) {
            const before = htmlContent.substring(0, startIndex);
            const after = htmlContent.substring(endIndex);
            htmlContent = before + new_dashboard_block + "\n\n            " + after;
            fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
            console.log("SUCCESS: admin.html updated via fallback substring replace!");
        } else {
            console.log("ERROR: Dashboard and Players tab demarcators not found in admin.html!");
        }
    }
}

main();
