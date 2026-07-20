import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_game_configs.js...");

    // 1. PATCH admin.html
    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // Add Menu Card on Main Grid
    const old_main_grid_end = `                    <div class="menu-card" onclick="switchTab('tab-admins')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #06B6D4, #0891B2);">
                            <i class="fa-solid fa-users-gear"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة المشرفين</h4>
                        <p class="menu-card-desc">إضافة وتعديل صلاحيات المشرفين</p>
                    </div>
                </div>`;

    const new_main_grid_end = `                    <div class="menu-card" onclick="switchTab('tab-admins')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #06B6D4, #0891B2);">
                            <i class="fa-solid fa-users-gear"></i>
                        </div>
                        <h4 class="menu-card-title">إدارة المشرفين</h4>
                        <p class="menu-card-desc">إضافة وتعديل صلاحيات المشرفين</p>
                    </div>

                    <div class="menu-card" onclick="switchTab('tab-game-config')">
                        <div class="menu-card-icon" style="background: linear-gradient(135deg, #E040FB, #651FFF);">
                            <i class="fa-solid fa-screwdriver-wrench"></i>
                        </div>
                        <h4 class="menu-card-title">تعديل محرك الألعاب</h4>
                        <p class="menu-card-desc">نسب الربح والرهان والتحكم</p>
                    </div>
                </div>`;

    if (htmlContent.includes(old_main_grid_end)) {
        htmlContent = htmlContent.replace(old_main_grid_end, new_main_grid_end);
    } else {
        console.log("ERROR: main-grid-screen end not found in admin.html!");
    }

    // Add tab-game-config panel below tab-admins panel
    const old_admins_panel_end = `            </div>

            <!-- ═══════════════ TAB: PLAYERS ═══════════════ -->`;

    const new_admins_panel_end = `            </div>

            <!-- ═══════════════ TAB: GAME CONFIG ═══════════════ -->
            <div id="tab-game-config" class="tab-panel" style="display: none;">
                <!-- Back Button -->
                <button class="btn-back" onclick="window.goBackToGrid()">
                    <i class="fa-solid fa-arrow-right"></i> رجوع للخلف
                </button>

                <div class="section-header-row" style="margin-bottom:20px;">
                    <h3><i class="fa-solid fa-screwdriver-wrench" style="color:var(--orange);margin-left:8px;"></i>تعديل محرك الألعاب</h3>
                </div>

                <div class="glass-card" style="padding:20px; border-radius:16px; margin-bottom:20px;">
                    <label style="font-size:12px; color:#888; display:block; margin-bottom:8px;">اختر اللعبة المراد تعديل إعداداتها</label>
                    <select id="gameConfigSelector" onchange="window.switchGameConfigView(this.value)" style="width:100%; background:rgba(0,0,0,0.4); border:1.5px solid var(--border); border-radius:12px; padding:11px 14px; color:#fff; font-family:'Cairo',sans-serif; font-size:14px; outline:none; margin-bottom:15px;">
                        <option value="bigfarm">لعبة مزرعة الحيوانات (Big Farm)</option>
                        <option value="fruit_slots">سلوت الفواكه (Fruit Slots)</option>
                        <option value="fortune_gems">سلوت الجواهر (Fortune Gems)</option>
                    </select>

                    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:15px 0;">

                    <!-- Configuration Form for Big Farm -->
                    <div id="cfg-section-bigfarm" class="game-cfg-section">
                        <h4 style="font-size:15px; font-weight:800; color:#fff; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                            <span style="width:8px; height:8px; border-radius:50%; background: #FF7A1F;"></span> إعدادات لعبة Big Farm
                        </h4>
                        
                        <div style="margin-bottom:20px;">
                            <label style="font-size:12px; color:#aaa; display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span>نسبة ربح اللاعب (RTP %)</span>
                                <span id="lblWinRateBigFarm" style="color:var(--orange); font-weight:800;">70%</span>
                            </label>
                            <input type="range" id="winRateBigFarm" min="10" max="98" value="70" oninput="document.getElementById('lblWinRateBigFarm').textContent = this.value + '%'" style="width:100%; accent-color:var(--orange); height:6px; background:rgba(255,255,255,0.1); border-radius:10px; cursor:pointer;">
                            <span style="font-size:10px; color:#666; display:block; margin-top:4px;">النسب المرتفعة تزيد من احتمالية فوز اللاعب في كل لفة.</span>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأدنى للرهان (Min Bet)</label>
                                <input type="number" id="minBetBigFarm" value="500" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأقصى للرهان (Max Bet)</label>
                                <input type="number" id="maxBetBigFarm" value="10000" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:12px; color:#aaa; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
                                <input type="checkbox" id="activeBigFarm" checked style="accent-color:var(--orange); width:16px; height:16px;">
                                <span>اللعبة نشطة ومتاحة للاعبين</span>
                            </label>
                        </div>
                    </div>

                    <!-- Configuration Form for Fruit Slots -->
                    <div id="cfg-section-fruit_slots" class="game-cfg-section" style="display:none;">
                        <h4 style="font-size:15px; font-weight:800; color:#fff; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                            <span style="width:8px; height:8px; border-radius:50%; background: #FFD700;"></span> إعدادات لعبة Fruit Slots
                        </h4>
                        
                        <div style="margin-bottom:20px;">
                            <label style="font-size:12px; color:#aaa; display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span>نسبة ربح اللاعب (RTP %)</span>
                                <span id="lblWinRateFruitSlots" style="color:var(--orange); font-weight:800;">70%</span>
                            </label>
                            <input type="range" id="winRateFruitSlots" min="10" max="98" value="70" oninput="document.getElementById('lblWinRateFruitSlots').textContent = this.value + '%'" style="width:100%; accent-color:var(--orange); height:6px; background:rgba(255,255,255,0.1); border-radius:10px; cursor:pointer;">
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأدنى للرهان</label>
                                <input type="number" id="minBetFruitSlots" value="100" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأقصى للرهان</label>
                                <input type="number" id="maxBetFruitSlots" value="5000" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:12px; color:#aaa; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
                                <input type="checkbox" id="activeFruitSlots" checked style="accent-color:var(--orange); width:16px; height:16px;">
                                <span>اللعبة نشطة ومتاحة للاعبين</span>
                            </label>
                        </div>
                    </div>

                    <!-- Configuration Form for Fortune Gems -->
                    <div id="cfg-section-fortune_gems" class="game-cfg-section" style="display:none;">
                        <h4 style="font-size:15px; font-weight:800; color:#fff; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                            <span style="width:8px; height:8px; border-radius:50%; background: #10B981;"></span> إعدادات لعبة Fortune Gems
                        </h4>
                        
                        <div style="margin-bottom:20px;">
                            <label style="font-size:12px; color:#aaa; display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span>نسبة ربح اللاعب (RTP %)</span>
                                <span id="lblWinRateFortuneGems" style="color:var(--orange); font-weight:800;">70%</span>
                            </label>
                            <input type="range" id="winRateFortuneGems" min="10" max="98" value="70" oninput="document.getElementById('lblWinRateFortuneGems').textContent = this.value + '%'" style="width:100%; accent-color:var(--orange); height:6px; background:rgba(255,255,255,0.1); border-radius:10px; cursor:pointer;">
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأدنى للرهان</label>
                                <input type="number" id="minBetFortuneGems" value="100" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                            <div>
                                <label style="font-size:11px; color:#888; display:block; margin-bottom:6px;">الحد الأقصى للرهان</label>
                                <input type="number" id="maxBetFortuneGems" value="5000" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:10px; color:#fff;">
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:12px; color:#aaa; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
                                <input type="checkbox" id="activeFortuneGems" checked style="accent-color:var(--orange); width:16px; height:16px;">
                                <span>اللعبة نشطة ومتاحة للاعبين</span>
                            </label>
                        </div>
                    </div>

                    <button class="btn-action" onclick="window.saveGameConfigs()" style="width:100%; padding:12px; font-size:14px; font-weight:800; margin-top:10px;">
                        <i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات وحفظ محرك الألعاب
                    </button>
                </div>
            </div>

            </div>

            <!-- ═══════════════ TAB: PLAYERS ═══════════════ -->`;

    if (htmlContent.includes(old_admins_panel_end)) {
        htmlContent = htmlContent.replace(old_admins_panel_end, new_admins_panel_end);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log("SUCCESS: admin.html updated with game configurations tab panel!");
    } else {
        console.log("ERROR: tab panels boundary not found in admin.html!");
    }

    // 2. PATCH admin.js
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    jsContent = jsContent.replace(/\r\n/g, '\n');

    // Add function call initGameConfigsUI inside loadData
    const old_load_data_end = `    initSettingsUI();
    renderAll();`;
    const new_load_data_end = `    initSettingsUI();
    initGameConfigsUI();
    renderAll();`;
    jsContent = jsContent.replace(old_load_data_end, new_load_data_end);

    // Append helper functions to the end of admin.js
    const game_config_logic = `
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
`;

    jsContent = jsContent + game_config_logic;
    fs.writeFileSync(jsPath, jsContent, 'utf-8');
    console.log("SUCCESS: admin.js updated with game config logic!");

    // 3. PATCH public/games/bigfarm/app.js
    const bigfarmAppPath = resolve('public/games/bigfarm/app.js');
    let bigfarmAppContent = fs.readFileSync(bigfarmAppPath, 'utf-8');
    bigfarmAppContent = bigfarmAppContent.replace(/\r\n/g, '\n');

    const old_bigfarm_spin_logic = `    // Winning index calculation: every 50 rounds, give pizza (8) or salad (9)
    let winningIndex;
    if (roundNumber % 50 === 0) {
        winningIndex = Math.random() < 0.5 ? 8 : 9;
    } else {
        winningIndex = Math.floor(Math.random() * 8); // only standard slots 0 to 7
    }`;

    const new_bigfarm_spin_logic = `    // Read win rate config from localStorage (default to 70% if not found)
    let winRate = 70;
    try {
        const localCfg = JSON.parse(localStorage.getItem('masoudi_game_config_bigfarm'));
        if (localCfg && localCfg.winRate !== undefined) {
            winRate = parseInt(localCfg.winRate, 10);
        }
    } catch(e) {}

    // Decide if this spin should be a WIN or LOSS based on the winRate probability
    const shouldWin = (Math.random() * 100) < winRate;

    // Filter available indexes (0-9)
    const bettedIndexes = Object.keys(selectedBets).map(Number); // indexes the player betted on
    const allIndexes = [0,1,2,3,4,5,6,7,8,9];
    const nonBettedIndexes = allIndexes.filter(i => !bettedIndexes.includes(i));

    let winningIndex;
    if (bettedIndexes.length > 0) {
        if (shouldWin) {
            // Player should win: select one of the betted indexes
            winningIndex = bettedIndexes[Math.floor(Math.random() * bettedIndexes.length)];
        } else {
            // Player should lose: select one of the non-betted indexes
            if (nonBettedIndexes.length > 0) {
                winningIndex = nonBettedIndexes[Math.floor(Math.random() * nonBettedIndexes.length)];
            } else {
                // If they bet on everything, select a random one
                winningIndex = Math.floor(Math.random() * 10);
            }
        }
    } else {
        // No bets placed: random spin
        winningIndex = Math.floor(Math.random() * 10);
    }`;

    if (bigfarmAppContent.includes(old_bigfarm_spin_logic)) {
        bigfarmAppContent = bigfarmAppContent.replace(old_bigfarm_spin_logic, new_bigfarm_spin_logic);
    } else {
        console.log("ERROR: old_bigfarm_spin_logic not found in bigfarm/app.js!");
    }

    // Append automatic server loader fetch call to sync configs on game load
    const game_loader_sync = `

// ─── Auto Sync Game Config from Server on Game Load ───
async function loadGameConfigFromServer() {
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            const data = await res.json();
            if (data.settings && data.settings.gameConfigs && data.settings.gameConfigs.bigfarm) {
                const config = data.settings.gameConfigs.bigfarm;
                localStorage.setItem('masoudi_game_config_bigfarm', JSON.stringify(config));
            }
        }
    } catch(e) {
        console.warn("Failed to fetch game config from server, falling back to local storage:", e);
    }
}
loadGameConfigFromServer();
`;

    bigfarmAppContent = bigfarmAppContent + game_loader_sync;
    fs.writeFileSync(bigfarmAppPath, bigfarmAppContent, 'utf-8');
    console.log("SUCCESS: bigfarm/app.js patched with RTP win-rate mechanics and loader!");
}

main();
