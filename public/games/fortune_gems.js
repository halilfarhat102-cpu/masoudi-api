// ==========================================
// Fortune Gems 3 - Slots Engine State
// ==========================================
let balance = parseInt(localStorage.getItem('masoudi_wallet_balance')) || 0;
let baseBet = 1000;
let exMode = false;
let isSpinning = false;
let autoSpin = false;
let turboMode = false;
let soundEnabled = true;

// Symbols Configuration
const symbols = [
    { id: 'wild', name: 'WILD', icon: '👑', mult: 25, color: '#f1c40f' },
    { id: 'ruby', name: 'RUBY', icon: '🟥', mult: 15, color: '#e74c3c' },
    { id: 'sapphire', name: 'SAPPHIRE', icon: '🟦', mult: 10, color: '#3498db' },
    { id: 'emerald', name: 'EMERALD', icon: '🟩', mult: 6, color: '#2ecc71' },
    { id: 'A', name: 'A', icon: '🅰️', mult: 3, color: '#ffffff' },
    { id: 'K', name: 'K', icon: '🇰', mult: 2.5, color: '#ffffff' },
    { id: 'Q', name: 'Q', icon: '🆪', mult: 2, color: '#ffffff' },
    { id: 'J', name: 'J', icon: '🇯', mult: 1.5, color: '#ffffff' }
];

// Multipliers List
const multipliers = [
    { value: 1, text: '1x', class: 'mult-1x', weight: 40 },
    { value: 2, text: '2x', class: 'mult-2x', weight: 25 },
    { value: 3, text: '3x', class: 'mult-3x', weight: 15 },
    { value: 5, text: '5x', class: 'mult-5x', weight: 10 },
    { value: 10, text: '10x', class: 'mult-10x', weight: 7 },
    { value: 15, text: '15x', class: 'mult-15x', weight: 3 }
];

// Web Audio API Audio Controller
class AudioController {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    playSpin() {
        if (!soundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
    playStop(index) {
        if (!soundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350 + (index * 80), this.ctx.currentTime);
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }
    playWin() {
        if (!soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C Major Arpeggio
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.25);
        });
    }
}
const sound = new AudioController();

// Bet Array sizes
const betOptions = [100, 200, 500, 1000, 2000, 5000, 10000];

// HTML Reel Columns DOM Map
let strips = [];

function getActiveBet() {
    return exMode ? baseBet * 1.5 : baseBet;
}

function updateUI() {
    localStorage.setItem('masoudi_wallet_balance', balance);

    const balanceEl = document.getElementById('gems-balance-val');
    if (balanceEl) balanceEl.textContent = balance.toLocaleString();

    const betEl = document.getElementById('gems-bet-val');
    if (betEl) betEl.textContent = getActiveBet().toLocaleString();
}

// Generate vertical layout elements inside reel strips
function initReels() {
    strips = [
        document.getElementById('reel-strip-1'),
        document.getElementById('reel-strip-2'),
        document.getElementById('reel-strip-3'),
        document.getElementById('reel-strip-4')
    ];

    strips.forEach((strip, reelIdx) => {
        if (!strip) return;
        
        let html = '';
        if (reelIdx < 3) {
            // Generate standard gem symbols
            // Generate 35 symbols for spinning buffer visual
            for (let i = 0; i < 35; i++) {
                const sym = getRandomSymbol(exMode);
                html += createSymbolMarkup(sym);
            }
        } else {
            // Generate multiplier symbols
            for (let i = 0; i < 35; i++) {
                const mult = getRandomMultiplier(exMode);
                html += createMultiplierMarkup(mult);
            }
        }
        strip.innerHTML = html;
        // Reset translate position
        strip.style.transition = 'none';
        strip.style.transform = `translateY(0px)`;
    });
}

function getSymbolInnerHtml(sym) {
    if (['wild', 'ruby', 'sapphire', 'emerald'].includes(sym.id)) {
        return `<img src="gem_${sym.id}.png" alt="${sym.name}">`;
    } else {
        return `<div class="aztec-letter-block letter-${sym.name}">${sym.name}</div>`;
    }
}

function createSymbolMarkup(sym) {
    return `
        <div class="slot-symbol-card" data-id="${sym.id}">
            <span class="symbol-inner">${getSymbolInnerHtml(sym)}</span>
            <span class="symbol-card-label">${sym.name}</span>
        </div>
    `;
}

function createMultiplierMarkup(mult) {
    return `
        <div class="slot-symbol-card ${mult.class}" data-value="${mult.value}">
            <span class="symbol-inner" style="font-family:var(--font-display); font-weight:900;">${mult.text}</span>
            <span class="symbol-card-label" style="color:var(--primary);">MULTIPLIER</span>
        </div>
    `;
}

// Helper to get random symbols based on weights
function getRandomSymbol(isExActive) {
    // If EX is active, weight mask (Wild) and high-value gems higher
    if (isExActive) {
        const roll = Math.random();
        if (roll < 0.25) return symbols[0]; // Wild
        if (roll < 0.45) return symbols[1]; // Ruby
        if (roll < 0.60) return symbols[2]; // Sapphire
        if (roll < 0.75) return symbols[3]; // Emerald
        return symbols[4 + Math.floor(Math.random() * 4)]; // Low values
    } else {
        const roll = Math.random();
        if (roll < 0.08) return symbols[0]; // Wild
        if (roll < 0.20) return symbols[1]; // Ruby
        if (roll < 0.32) return symbols[2]; // Sapphire
        if (roll < 0.45) return symbols[3]; // Emerald
        return symbols[4 + Math.floor(Math.random() * 4)]; // Low values
    }
}

// Helper to get random multipliers based on weights
function getRandomMultiplier(isExActive) {
    // If EX mode is active, increase the chance of 5x, 10x, 15x significantly
    let weightedList = [];
    multipliers.forEach(m => {
        let weight = m.weight;
        if (isExActive) {
            if (m.value >= 5) weight *= 2.5; // boost weights of high multipliers
        }
        for (let i = 0; i < weight; i++) {
            weightedList.push(m);
        }
    });
    return weightedList[Math.floor(Math.random() * weightedList.length)];
}

// Main Slots Spin Event
function triggerGemsSpin() {
    if (isSpinning) return;
    const betCost = getActiveBet();

    if (balance < betCost) {
        alert("رصيدك الحالي غير كافٍ لإتمام الدوران!");
        autoSpin = false;
        document.getElementById('gems-auto-btn')?.classList.remove('toggle-active');
        return;
    }

    isSpinning = true;
    balance -= betCost;
    updateUI();

    // Disable Spin button
    document.getElementById('gems-spin-btn')?.classList.add('disabled');

    // Remove old highlights
    const cards = document.querySelectorAll('.slot-symbol-card');
    cards.forEach(c => c.classList.remove('winning-symbol'));
    document.getElementById('winning-line-frame')?.classList.remove('pulse');

    sound.playSpin();

    // Prepare winning grid target
    const finalGrid = [
        [getRandomSymbol(exMode), getRandomSymbol(exMode), getRandomSymbol(exMode)], // Column 1
        [getRandomSymbol(exMode), getRandomSymbol(exMode), getRandomSymbol(exMode)], // Column 2
        [getRandomSymbol(exMode), getRandomSymbol(exMode), getRandomSymbol(exMode)]  // Column 3
    ];
    const finalMultiplier = getRandomMultiplier(exMode);

    // Setup transition timers
    const baseDuration = turboMode ? 600 : 1200;
    const delayStep = turboMode ? 200 : 400;

    strips.forEach((strip, colIdx) => {
        if (!strip) return;
        
        // Populate the top 3 cards with the final grid results so when it lands it matches exactly
        const cardsArr = Array.from(strip.querySelectorAll('.slot-symbol-card'));
        
        if (colIdx < 3) {
            // Set landing cards (index 27, 28, 29 of the strip)
            // Index 27 is bottom slot, 28 is center slot, 29 is top slot
            cardsArr[27].dataset.id = finalGrid[colIdx][2].id;
            cardsArr[27].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(finalGrid[colIdx][2]);
            cardsArr[27].querySelector('.symbol-card-label').textContent = finalGrid[colIdx][2].name;

            cardsArr[28].dataset.id = finalGrid[colIdx][1].id;
            cardsArr[28].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(finalGrid[colIdx][1]);
            cardsArr[28].querySelector('.symbol-card-label').textContent = finalGrid[colIdx][1].name;

            cardsArr[29].dataset.id = finalGrid[colIdx][0].id;
            cardsArr[29].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(finalGrid[colIdx][0]);
            cardsArr[29].querySelector('.symbol-card-label').textContent = finalGrid[colIdx][0].name;
        } else {
            // Multiplier Column
            cardsArr[27].className = `slot-symbol-card ${finalMultiplier.class}`;
            cardsArr[27].dataset.value = finalMultiplier.value;
            cardsArr[27].querySelector('.symbol-inner').textContent = finalMultiplier.text;

            const nextM = getRandomMultiplier(exMode);
            cardsArr[28].className = `slot-symbol-card ${nextM.class}`;
            cardsArr[28].dataset.value = nextM.value;
            cardsArr[28].querySelector('.symbol-inner').textContent = nextM.text;

            const prevM = getRandomMultiplier(exMode);
            cardsArr[29].className = `slot-symbol-card ${prevM.class}`;
            cardsArr[29].dataset.value = prevM.value;
            cardsArr[29].querySelector('.symbol-inner').textContent = prevM.text;
        }

        // Apply transition animation
        // Translate height is cards * 96px. Moving 27 slots down.
        const spinDistance = 27 * 96;
        const duration = baseDuration + (colIdx * delayStep);
        
        strip.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.85, 0.25, 1)`;
        strip.style.transform = `translateY(-${spinDistance}px)`;

        // Spin stop callbacks
        setTimeout(() => {
            sound.playStop(colIdx);
            
            // Loop the strip quietly back to translateY(0)
            if (colIdx === 3) {
                // All reels stopped! Evaluate
                setTimeout(() => {
                    evaluateGemsSpin(finalGrid, finalMultiplier);
                }, 300);
            }
        }, duration);
    });
}

function evaluateGemsSpin(grid, multiplier) {
    // 5 Paylines mappings: (Reel col, Row idx)
    // Row 0 is Top, Row 1 is Center, Row 2 is Bottom
    const paylines = [
        [[0, 0], [1, 0], [2, 0]], // Line 1: Top horizontal
        [[0, 1], [1, 1], [2, 1]], // Line 2: Center horizontal
        [[0, 2], [1, 2], [2, 2]], // Line 3: Bottom horizontal
        [[0, 0], [1, 1], [2, 2]], // Line 4: Diagonal top-left to bottom-right
        [[0, 2], [1, 1], [2, 0]]  // Line 5: Diagonal bottom-left to top-right
    ];

    let totalWinPayout = 0;
    let winningLinesCount = 0;
    let winDetails = [];

    paylines.forEach((line, lineIdx) => {
        const symbol0 = grid[line[0][0]][line[0][1]];
        const symbol1 = grid[line[1][0]][line[1][1]];
        const symbol2 = grid[line[2][0]][line[2][1]];

        // Determine if line has 3 matching symbols (accounting for WILD masks)
        let isWinningLine = false;
        let matchSymbol = null;

        // Check if all are Wild
        if (symbol0.id === 'wild' && symbol1.id === 'wild' && symbol2.id === 'wild') {
            isWinningLine = true;
            matchSymbol = symbols[0]; // Wild payout
        } else {
            // Find first non-wild symbol to be target match
            const firstNonWild = [symbol0, symbol1, symbol2].find(s => s.id !== 'wild');
            if (firstNonWild) {
                if (
                    (symbol0.id === firstNonWild.id || symbol0.id === 'wild') &&
                    (symbol1.id === firstNonWild.id || symbol1.id === 'wild') &&
                    (symbol2.id === firstNonWild.id || symbol2.id === 'wild')
                ) {
                    isWinningLine = true;
                    matchSymbol = firstNonWild;
                }
            }
        }

        if (isWinningLine) {
            winningLinesCount++;
            const lineBasePayout = getActiveBet() * matchSymbol.mult;
            const lineTotalPayout = lineBasePayout * multiplier.value;
            totalWinPayout += lineTotalPayout;

            winDetails.push({
                lineIndex: lineIdx,
                payout: lineTotalPayout,
                symbol: matchSymbol,
                lineCoords: line
            });
        }
    });

    // Reset reel positions quietly by populating standard grid at translateY(0)
    strips.forEach((strip, colIdx) => {
        strip.style.transition = 'none';
        strip.style.transform = `translateY(0px)`;
        
        // Re-randomize the remainder slots for the next spin
        const cardsArr = Array.from(strip.querySelectorAll('.slot-symbol-card'));
        
        if (colIdx < 3) {
            // Keep the landed symbols at indices 0, 1, 2
            cardsArr[0].dataset.id = grid[colIdx][0].id;
            cardsArr[0].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(grid[colIdx][0]);
            cardsArr[0].querySelector('.symbol-card-label').textContent = grid[colIdx][0].name;

            cardsArr[1].dataset.id = grid[colIdx][1].id;
            cardsArr[1].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(grid[colIdx][1]);
            cardsArr[1].querySelector('.symbol-card-label').textContent = grid[colIdx][1].name;

            cardsArr[2].dataset.id = grid[colIdx][2].id;
            cardsArr[2].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(grid[colIdx][2]);
            cardsArr[2].querySelector('.symbol-card-label').textContent = grid[colIdx][2].name;

            for (let i = 3; i < 35; i++) {
                const sym = getRandomSymbol(exMode);
                cardsArr[i].dataset.id = sym.id;
                cardsArr[i].querySelector('.symbol-inner').innerHTML = getSymbolInnerHtml(sym);
                cardsArr[i].querySelector('.symbol-card-label').textContent = sym.name;
            }
        } else {
            // Multiplier reel
            cardsArr[0].className = `slot-symbol-card ${multiplier.class}`;
            cardsArr[0].dataset.value = multiplier.value;
            cardsArr[0].querySelector('.symbol-inner').textContent = multiplier.text;

            for (let i = 1; i < 35; i++) {
                const m = getRandomMultiplier(exMode);
                cardsArr[i].className = `slot-symbol-card ${m.class}`;
                cardsArr[i].dataset.value = m.value;
                cardsArr[i].querySelector('.symbol-inner').textContent = m.text;
            }
        }
    });

    // Payout and highlights
    if (totalWinPayout > 0) {
        balance += totalWinPayout;
        updateUI();

        // Only play generic win sound for small wins; big wins play their own fanfare
        if (totalWinPayout < getActiveBet() * 5) {
            sound.playWin();
        }

        // Animate winning symbols (first 3 indices at position 0)
        winDetails.forEach(detail => {
            detail.lineCoords.forEach(coord => {
                const reelIdx = coord[0];
                const rowIdx = coord[1];
                const strip = strips[reelIdx];
                const cardsArr = strip.querySelectorAll('.slot-symbol-card');
                // Row indices: 0 is top, 1 is center, 2 is bottom
                if (cardsArr[rowIdx]) cardsArr[rowIdx].classList.add('winning-symbol');
            });
        });

        // Pulse the center payline box overlay if it was among win lines
        document.getElementById('winning-line-frame')?.classList.add('pulse');

        // Update Win banner text
        const winValEl = document.getElementById('gems-win-val');
        if (winValEl) winValEl.textContent = totalWinPayout.toLocaleString();

        // Premium Win Celebration if win is 5x or more of the bet
        if (totalWinPayout >= getActiveBet() * 5) {
            triggerCelebration(totalWinPayout, winDetails, multiplier);
        } else {
            // Standard small win overlay message if needed, or just let the bottom banner show it
            if (totalWinPayout >= getActiveBet() * 2) {
                const overlay = document.getElementById('gems-result-overlay');
                const resTitle = document.getElementById('gems-result-title');
                const resDesc = document.getElementById('gems-result-desc');
                const resAvatar = document.getElementById('gems-result-avatar');

                if (resTitle) resTitle.textContent = "🏆 فوز رائع! 🏆";
                if (resAvatar) resAvatar.textContent = winDetails[0].symbol.icon;
                if (resDesc) {
                    resDesc.innerHTML = `ربحت عن تماثل 3 رموز من (${winDetails[0].symbol.name}) بمضاعف ${multiplier.text}!<br><span style="color:#ffd700; font-weight:900;">الربح: +${totalWinPayout.toLocaleString()} عملة.</span>`;
                }
                if (overlay) overlay.style.display = 'flex';
            }
        }
    } else {
        const winValEl = document.getElementById('gems-win-val');
        if (winValEl) winValEl.textContent = '0';
    }

    // Release state
    isSpinning = false;
    document.getElementById('gems-spin-btn')?.classList.remove('disabled');

    // Auto spin cycle trigger
    if (autoSpin) {
        const delayTime = totalWinPayout >= getActiveBet() * 5 ? 4500 : 1500;
        setTimeout(() => {
            const overlay = document.getElementById('gems-result-overlay');
            if (overlay) overlay.style.display = 'none';
            dismissCelebration();
            triggerGemsSpin();
        }, delayTime);
    }
}

// Master Initialization on Load
window.addEventListener('DOMContentLoaded', () => {
    initReels();
    updateUI();

    // Back to portal
    document.getElementById('gems-back-btn')?.addEventListener('click', () => {
        sound.playStop(0);
        window.location.href = 'index.html';
    });

    // Spin click mapping
    document.getElementById('gems-spin-btn')?.addEventListener('click', triggerGemsSpin);

    // Bet adjust buttons
    document.getElementById('bet-plus-btn')?.addEventListener('click', () => {
        if (isSpinning) return;
        sound.playStop(0);
        const idx = betOptions.indexOf(baseBet);
        if (idx < betOptions.length - 1) {
            baseBet = betOptions[idx + 1];
            updateUI();
        }
    });

    document.getElementById('bet-minus-btn')?.addEventListener('click', () => {
        if (isSpinning) return;
        sound.playStop(0);
        const idx = betOptions.indexOf(baseBet);
        if (idx > 0) {
            baseBet = betOptions[idx - 1];
            updateUI();
        }
    });

    // Toggle EX Mode
    document.getElementById('gems-ex-toggle')?.addEventListener('click', () => {
        if (isSpinning) return;
        sound.playStop(1);
        exMode = !exMode;
        
        const container = document.getElementById('gems-ex-toggle');
        const statusLabel = document.getElementById('ex-label-status');
        const boardFrame = document.getElementById('slots-board-glow-frame');

        if (exMode) {
            container.classList.add('ex-active');
            if (statusLabel) statusLabel.textContent = 'ON';
            if (boardFrame) boardFrame.style.borderColor = '#ff4757';
        } else {
            container.classList.remove('ex-active');
            if (statusLabel) statusLabel.textContent = 'OFF';
            if (boardFrame) boardFrame.style.borderColor = '#b8860b';
        }

        updateUI();
    });

    // Settings Toggle (Mute)
    document.getElementById('gems-settings-btn')?.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        const btn = document.getElementById('gems-settings-btn');
        if (soundEnabled) {
            if (btn) btn.textContent = '🎵';
            btn.classList.remove('toggle-active');
        } else {
            if (btn) btn.textContent = '🔇';
            btn.classList.add('toggle-active');
        }
    });

    // Turbo Mode Toggle
    document.getElementById('gems-turbo-btn')?.addEventListener('click', () => {
        turboMode = !turboMode;
        const btn = document.getElementById('gems-turbo-btn');
        if (turboMode) {
            btn.classList.add('toggle-active');
        } else {
            btn.classList.remove('toggle-active');
        }
    });

    // Auto Spin Toggle
    document.getElementById('gems-auto-btn')?.addEventListener('click', () => {
        autoSpin = !autoSpin;
        const btn = document.getElementById('gems-auto-btn');
        if (autoSpin) {
            btn.classList.add('toggle-active');
            if (!isSpinning) triggerGemsSpin();
        } else {
            btn.classList.remove('toggle-active');
        }
    });

    // Close Modal overlay
    document.getElementById('gems-result-close-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('gems-result-overlay');
        if (overlay) overlay.style.display = 'none';
    });

    // Celebration Collect button
    document.getElementById('celebration-collect-btn')?.addEventListener('click', () => {
        sound.playStop(2);
        dismissCelebration();
    });
});

let celebrationInterval = null;
let coinRainInterval = null;

// Tier thresholds (ratio = payout / activeBet)
const WIN_TIERS = [
    { minRatio: 50, cls: 'grand-win', title: 'GRAND WIN', coins: ['🌟','💎','👑','🪙'], coinRate: 60 },
    { minRatio: 30, cls: 'super-win', title: 'SUPER WIN', coins: ['🔥','💎','✨','🪙'], coinRate: 90 },
    { minRatio: 15, cls: 'mega-win',  title: 'MEGA WIN',  coins: ['💥','💎','🪙','💰'], coinRate: 120 },
    { minRatio: 5,  cls: 'big-win',   title: 'BIG WIN',   coins: ['🎉','💎','🪙','✨'], coinRate: 150 }
];

function triggerCelebration(payoutAmount, winDetails, multiplier) {
    const ratio = payoutAmount / getActiveBet();

    // Find the right tier
    const tier = WIN_TIERS.find(t => ratio >= t.minRatio) || WIN_TIERS[WIN_TIERS.length - 1];

    const overlay      = document.getElementById('gems-celebration-overlay');
    const titleEl      = document.getElementById('celebration-win-title');
    const descEl       = document.getElementById('celebration-payout-desc');
    const counterEl    = document.getElementById('celebration-counter-val');
    const showcaseEl   = document.getElementById('celebration-gems-showcase');
    const coinsContainer = document.getElementById('celebration-coins-container');
    const multBadgeEl  = document.getElementById('celebration-mult-badge');

    if (!overlay || !titleEl || !counterEl) return;

    // ── 1. Apply tier class & title ──────────────────────────────────────
    overlay.className = `celebration-overlay ${tier.cls}`;
    titleEl.textContent = tier.title;
    overlay.style.display = 'flex';

    // ── 2. Populate gems showcase ────────────────────────────────────────
    if (showcaseEl && winDetails?.length > 0) {
        const seen = new Set();
        const unique = winDetails.filter(d => {
            if (seen.has(d.symbol.id)) return false;
            seen.add(d.symbol.id);
            return true;
        });
        showcaseEl.innerHTML = unique.slice(0, 3)
            .map(d => `<span class="celebration-gem-icon">${getSymbolInnerHtml(d.symbol)}</span>`)
            .join('');
    }

    // ── 3. Description text ──────────────────────────────────────────────
    if (descEl) {
        const names = [...new Set(winDetails.map(d => d.symbol.name))].join(' & ');
        descEl.innerHTML = `تماثل [ ${names} ] × ${multiplier.text} = <b>+${payoutAmount.toLocaleString()}</b> عملة!`;
    }

    // ── 4. Set multiplier badge ──────────────────────────────────────────
    if (multBadgeEl) {
        if (multiplier && multiplier.text) {
            multBadgeEl.textContent = `${multiplier.text} MULTIPLIER`;
            multBadgeEl.style.display = 'inline-block';
        } else {
            multBadgeEl.style.display = 'none';
        }
    }

    // ── 5. Ticking counter (eased quad-out, 2.5 s) ──────────────────────
    counterEl.textContent = '0';
    if (celebrationInterval) cancelAnimationFrame(celebrationInterval);
    const duration = 2500;
    const startTime = performance.now();

    function tick(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t * (2 - t);                       // ease-out quadratic
        counterEl.textContent = Math.floor(ease * payoutAmount).toLocaleString();
        if (t < 1) {
            celebrationInterval = requestAnimationFrame(tick);
        } else {
            counterEl.textContent = payoutAmount.toLocaleString();
        }
    }
    celebrationInterval = requestAnimationFrame(tick);

    // ── 6. Coin-rain ─────────────────────────────────────────────────────
    if (coinsContainer) {
        coinsContainer.innerHTML = '';
        if (coinRainInterval) clearInterval(coinRainInterval);

        // Initial burst
        for (let i = 0; i < 25; i++) spawnCoin(coinsContainer, tier.coins);
        // Continuous drizzle
        coinRainInterval = setInterval(() => spawnCoin(coinsContainer, tier.coins), tier.coinRate);
    }

    // ── 7. Tier-specific sound ────────────────────────────────────────────
    playCelebrationSound(tier.cls);
}

function spawnCoin(container, pool = ['🪙','💎','✨','💰']) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'falling-coin-particle';
    el.textContent = pool[Math.floor(Math.random() * pool.length)];

    const dur   = 2 + Math.random() * 2.5;   // 2 – 4.5 s
    const delay = Math.random() * 0.6;
    const size  = 18 + Math.floor(Math.random() * 26); // 18 – 44 px

    el.style.left              = `${Math.random() * 100}%`;
    el.style.fontSize          = `${size}px`;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay    = `${delay}s`;

    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay) * 1000 + 200);
}

function playCelebrationSound(tierCls) {
    if (!soundEnabled) return;
    sound.init();
    const ctx = sound.ctx;
    const now = ctx.currentTime;

    // Base arpeggio notes scaled by tier grandeur
    const scales = {
        'big-win':   [261.63, 329.63, 392.00, 523.25],
        'mega-win':  [261.63, 329.63, 392.00, 523.25, 659.25],
        'super-win': [261.63, 329.63, 392.00, 523.25, 659.25, 783.99],
        'grand-win': [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
    };
    const notes = scales[tierCls] || scales['big-win'];

    notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.3);
    });
}

function dismissCelebration() {
    const overlay = document.getElementById('gems-celebration-overlay');
    if (overlay) overlay.style.display = 'none';
    if (celebrationInterval) { cancelAnimationFrame(celebrationInterval); celebrationInterval = null; }
    if (coinRainInterval)    { clearInterval(coinRainInterval);            coinRainInterval    = null; }
}
