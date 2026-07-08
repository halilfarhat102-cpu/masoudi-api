// Sound Manager (Web Audio API)
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playSpin() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }

    playStop() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.22);
        });
    }
}

const sound = new SoundManager();

// Game configuration
const SYMBOLS = [
    { id: 'cherry', char: '🍒', multiplier: 2, color: '#ff3838' },
    { id: 'lemon', char: '🍋', multiplier: 3, color: '#ffd32a' },
    { id: 'orange', char: '🍊', multiplier: 5, color: '#ff9f43' },
    { id: 'grape', char: '🍇', multiplier: 8, color: '#a55eea' },
    { id: 'watermelon', char: '🍉', multiplier: 15, color: '#2ed573' },
    { id: 'bell', char: '🔔', multiplier: 25, color: '#ffa502' },
    { id: 'seven', char: '7️⃣', multiplier: 50, color: '#eb3b5a' },
    { id: 'diamond', char: '💎', multiplier: 100, color: '#4bcffa', isWild: true }
];

// Payline Coordinates inside 3x3 layout (col, row)
const PAYLINES = [
    { id: 1, name: 'Center Horizontal', nodes: [[0, 1], [1, 1], [2, 1]], color: '#3498db', cls: 'active-line-1' },
    { id: 2, name: 'Top Horizontal',    nodes: [[0, 0], [1, 0], [2, 0]], color: '#2ecc71', cls: 'active-line-2' },
    { id: 3, name: 'Bottom Horizontal', nodes: [[0, 2], [1, 2], [2, 2]], color: '#e74c3c', cls: 'active-line-3' },
    { id: 4, name: 'Diagonal Descending', nodes: [[0, 0], [1, 1], [2, 2]], color: '#9b59b6', cls: 'active-line-4' },
    { id: 5, name: 'Diagonal Ascending',  nodes: [[0, 2], [1, 1], [2, 0]], color: '#f1c40f', cls: 'active-line-5' }
];

// Wallet logic
const WALLET_KEY = 'masoudi_wallet_balance';
function getBalance() {
    return parseFloat(localStorage.getItem(WALLET_KEY)) || 10000;
}
function saveBalance(val) {
    localStorage.setItem(WALLET_KEY, val);
}

// Reel parameters
let balance = getBalance();
const betOptions = [50, 100, 200, 500, 1000, 2000, 5000];
let currentBet = 100;
let isSpinning = false;
let autoSpin = false;
let turboMode = false;
let soundEnabled = true;

// Grid matrix representing currently visible 3x3 symbols
let activeGrid = [
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]],
    [SYMBOLS[6], SYMBOLS[7], SYMBOLS[0]]
];

// Master Initialization
window.addEventListener('DOMContentLoaded', () => {
    // Sync balance
    updateBalanceDisplay();
    updateBetDisplay();
    initReels();

    // Map controls
    document.getElementById('slots-back-btn')?.addEventListener('click', () => {
        sound.playClick();
        window.location.href = 'index.html';
    });

    document.getElementById('bet-plus-btn')?.addEventListener('click', () => {
        if (isSpinning) return;
        sound.playClick();
        const idx = betOptions.indexOf(currentBet);
        if (idx < betOptions.length - 1) {
            currentBet = betOptions[idx + 1];
            updateBetDisplay();
        }
    });

    document.getElementById('bet-minus-btn')?.addEventListener('click', () => {
        if (isSpinning) return;
        sound.playClick();
        const idx = betOptions.indexOf(currentBet);
        if (idx > 0) {
            currentBet = betOptions[idx - 1];
            updateBetDisplay();
        }
    });

    document.getElementById('slots-sound-btn')?.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        sound.enabled = soundEnabled;
        const btn = document.getElementById('slots-sound-btn');
        if (soundEnabled) {
            btn.textContent = '🎵';
            btn.classList.remove('toggle-active');
        } else {
            btn.textContent = '🔇';
            btn.classList.add('toggle-active');
        }
    });

    document.getElementById('slots-turbo-btn')?.addEventListener('click', () => {
        turboMode = !turboMode;
        const btn = document.getElementById('slots-turbo-btn');
        if (turboMode) {
            btn.classList.add('toggle-active');
        } else {
            btn.classList.remove('toggle-active');
        }
    });

    document.getElementById('slots-auto-btn')?.addEventListener('click', () => {
        autoSpin = !autoSpin;
        const btn = document.getElementById('slots-auto-btn');
        if (autoSpin) {
            btn.classList.add('toggle-active');
            if (!isSpinning) triggerSpin();
        } else {
            btn.classList.remove('toggle-active');
        }
    });

    document.getElementById('slots-spin-btn')?.addEventListener('click', () => {
        if (!isSpinning) triggerSpin();
    });

    document.getElementById('slots-result-close-btn')?.addEventListener('click', () => {
        document.getElementById('slots-result-overlay').style.display = 'none';
    });

    document.getElementById('celebration-collect-btn')?.addEventListener('click', () => {
        sound.playClick();
        dismissCelebration();
    });
});

// Sync balance display
function updateBalanceDisplay() {
    const displays = [
        document.getElementById('slots-balance-val'),
        document.getElementById('big-wallet-val'),
        document.getElementById('header-wallet-balance')
    ];
    displays.forEach(el => {
        if (el) el.textContent = Math.floor(balance).toLocaleString();
    });
    saveBalance(balance);

    // Notify Flutter app of balance changes
    if (window.MasoudiChannel) {
        window.MasoudiChannel.postMessage(JSON.stringify({
            'action': 'updateBalance',
            'balance': balance
        }));
    }
}

// Sync bet display
function updateBetDisplay() {
    const el = document.getElementById('slots-bet-val');
    if (el) el.textContent = currentBet.toLocaleString();
}

// Populates initial cards on reels
function initReels() {
    for (let r = 1; r <= 3; r++) {
        const strip = document.getElementById(`reel-${r}`);
        if (!strip) continue;
        strip.innerHTML = '';
        
        // Initial 3 visible symbols
        for (let i = 0; i < 3; i++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            activeGrid[r - 1][i] = sym;
            strip.appendChild(createSymbolCard(sym));
        }
    }
}

// Helper to construct symbol card markup
function createSymbolCard(sym) {
    const el = document.createElement('div');
    el.className = 'slot-symbol-card';
    el.dataset.id = sym.id;
    el.innerHTML = `<span class="slot-symbol-inner">${sym.char}</span>`;
    return el;
}

// Master Spin Trigger
function triggerSpin() {
    if (isSpinning) return;
    
    // Check balance
    if (balance < currentBet) {
        autoSpin = false;
        document.getElementById('slots-auto-btn')?.classList.remove('toggle-active');
        alert('رصيدك غير كافٍ للرهان!');
        return;
    }

    // Reset visual wins
    resetWinningStates();

    // Deduct bet
    balance -= currentBet;
    updateBalanceDisplay();
    isSpinning = true;
    document.getElementById('slots-spin-btn')?.classList.add('disabled');

    // Run Sound
    sound.playSpin();

    // Choose final matrix outcome
    const targetMatrix = [
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
    ];

    // Configure timing (turbo reduces length)
    const reelDelay = turboMode ? 100 : 250;
    const spinDuration = turboMode ? 400 : 900;
    
    let completedReels = 0;

    for (let r = 1; r <= 3; r++) {
        const strip = document.getElementById(`reel-${r}`);
        const colIdx = r - 1;
        
        // Prepend fake spinning symbols
        const fakeCount = turboMode ? 8 : 16;
        for (let i = 0; i < fakeCount; i++) {
            strip.insertBefore(createSymbolCard(getRandomSymbol()), strip.firstChild);
        }

        // Prepend 3 target final symbols
        for (let i = 2; i >= 0; i--) {
            const finalSym = targetMatrix[colIdx][i];
            activeGrid[colIdx][i] = finalSym;
            strip.insertBefore(createSymbolCard(finalSym), strip.firstChild);
        }

        // Apply slide animation
        const offsetPixels = -(fakeCount + 3) * 90; // offset each card (90px height)
        strip.style.transition = 'none';
        strip.style.transform = `translateY(${offsetPixels}px)`;

        // Trigger layout flush to register transform
        strip.offsetHeight;

        // Slide down
        const durationMs = spinDuration + (colIdx * reelDelay);
        strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.12, 0.8, 0.15, 1.01)`;
        strip.style.transform = 'translateY(0px)';

        // Animation end callback
        setTimeout(() => {
            // Clean up extra nodes and snap to final
            strip.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                strip.appendChild(createSymbolCard(activeGrid[colIdx][i]));
            }
            sound.playStop();
            
            completedReels++;
            if (completedReels === 3) {
                evaluateSpinResults(targetMatrix);
            }
        }, durationMs);
    }
}

// Reset styling from previous wins
function resetWinningStates() {
    document.querySelectorAll('.slot-symbol-card').forEach(el => el.classList.remove('winning-symbol'));
    document.querySelectorAll('.line-node').forEach(el => {
        el.className = 'line-node';
    });
    const canvas = document.getElementById('payline-svg');
    if (canvas) canvas.innerHTML = '';
    document.getElementById('slots-win-val').textContent = '0';
}

function getRandomSymbol() {
    // Basic weight distribution: diamond is rare, cherry is common
    const pool = [
        ...Array(8).fill(SYMBOLS[0]), // cherry
        ...Array(7).fill(SYMBOLS[1]), // lemon
        ...Array(6).fill(SYMBOLS[2]), // orange
        ...Array(5).fill(SYMBOLS[3]), // grape
        ...Array(4).fill(SYMBOLS[4]), // watermelon
        ...Array(3).fill(SYMBOLS[5]), // bell
        ...Array(2).fill(SYMBOLS[6]), // seven
        ...Array(1).fill(SYMBOLS[7])  // diamond (wild)
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}

// Checks matching paylines
function evaluateSpinResults(matrix) {
    let totalWinPayout = 0;
    const wins = [];

    // Analyze each payline
    PAYLINES.forEach(line => {
        const syms = line.nodes.map(node => matrix[node[0]][node[1]]);
        
        // Find if line is a win
        // Wild diamond (isWild: true) can stand for any symbol
        let matchingSym = null;
        let isWin = true;

        for (let i = 0; i < 3; i++) {
            const sym = syms[i];
            if (sym.isWild) continue; // skip wild checking
            
            if (matchingSym === null) {
                matchingSym = sym;
            } else if (matchingSym.id !== sym.id) {
                isWin = false;
                break;
            }
        }

        // If all symbols are wild diamonds
        if (matchingSym === null && isWin) {
            matchingSym = SYMBOLS.find(s => s.isWild); // triple diamond wild!
        }

        if (isWin && matchingSym) {
            const linePayout = currentBet * matchingSym.multiplier;
            totalWinPayout += linePayout;
            wins.push({
                line: line,
                payout: linePayout,
                symbol: matchingSym,
                nodes: line.nodes
            });
        }
    });

    if (totalWinPayout > 0) {
        balance += totalWinPayout;
        updateBalanceDisplay();
        
        // Highlight win details
        document.getElementById('slots-win-val').textContent = totalWinPayout.toLocaleString();

        wins.forEach(win => {
            // Glow the payline indicators
            const nodeL = document.getElementById(`node-L-${win.line.id}`);
            const nodeR = document.getElementById(`node-R-${win.line.id}`);
            if (nodeL) nodeL.classList.add(win.line.cls);
            if (nodeR) nodeR.classList.add(win.line.cls);

            // Draw line on SVG canvas
            drawPaylineSVG(win.line);

            // Highlight card elements
            win.nodes.forEach(node => {
                const col = node[0];
                const row = node[1];
                const colEl = document.getElementById(`reel-${col + 1}`);
                if (colEl) {
                    const cards = colEl.querySelectorAll('.slot-symbol-card');
                    if (cards[row]) cards[row].classList.add('winning-symbol');
                }
            });
        });

        // Trigger sound and celebration based on multiplier tier
        const winRatio = totalWinPayout / currentBet;
        if (winRatio >= 5) {
            triggerWinCelebration(totalWinPayout, wins, winRatio);
        } else {
            sound.playWin();
            // Show standard results popup for medium wins
            if (winRatio >= 2) {
                setTimeout(() => {
                    const overlay = document.getElementById('slots-result-overlay');
                    const resTitle = document.getElementById('slots-result-title');
                    const resDesc = document.getElementById('slots-result-desc');
                    const resAvatar = document.getElementById('slots-result-avatar');

                    if (resTitle) resTitle.textContent = "🏆 فوز رائع! 🏆";
                    if (resAvatar) resAvatar.textContent = wins[0].symbol.char;
                    if (resDesc) {
                        resDesc.innerHTML = `تماثل رموز (${wins[0].symbol.char}) بمضاعف ×${wins[0].symbol.multiplier}!<br><span style="color:#ffa502; font-weight:900;">الربح: +${totalWinPayout.toLocaleString()} عملة.</span>`;
                    }
                    if (overlay) overlay.style.display = 'flex';
                }, 400);
            }
        }
    }

    // Spin release
    isSpinning = false;
    document.getElementById('slots-spin-btn').classList.remove('disabled');

    // Auto spin handling
    if (autoSpin) {
        const delay = totalWinPayout >= currentBet * 5 ? 4500 : 1500;
        setTimeout(() => {
            document.getElementById('slots-result-overlay').style.display = 'none';
            dismissCelebration();
            triggerSpin();
        }, delay);
    }
}

// Draw payline lines in SVG overlay
function drawPaylineSVG(line) {
    const canvas = document.getElementById('payline-svg');
    if (!canvas) return;

    // Reel column width is ~90px, height is ~270px. Coordinates mapped directly to canvas coordinates:
    // col 0 center -> x: 50, col 1 center -> x: 175, col 2 center -> x: 300
    // row 0 center -> y: 45, row 1 center -> y: 135, row 2 center -> y: 225
    const xCoords = [55, 175, 295];
    const yCoords = [45, 137, 229];

    const points = line.nodes.map(node => `${xCoords[node[0]]},${yCoords[node[1]]}`).join(' ');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('stroke', line.color);
    polyline.setAttribute('stroke-width', '4');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke-dasharray', '8 4');
    polyline.style.filter = `drop-shadow(0 0 4px ${line.color})`;
    
    // Add pulsing animation to line
    polyline.innerHTML = `<animate attributeName="stroke-dashoffset" values="0;24" dur="1s" repeatCount="indefinite" />`;

    canvas.appendChild(polyline);
}

// Win celebration variables
let celebrationInterval = null;
let coinRainInterval = null;

const CELEB_TIERS = [
    { minRatio: 50, cls: 'grand-win', title: 'GRAND WIN', coins: ['🌟','💎','👑','🪙'], coinRate: 60 },
    { minRatio: 30, cls: 'super-win', title: 'SUPER WIN', coins: ['🔥','💎','✨','🪙'], coinRate: 90 },
    { minRatio: 15, cls: 'mega-win',  title: 'MEGA WIN',  coins: ['💥','💎','🪙','🍉'], coinRate: 120 },
    { minRatio: 5,  cls: 'big-win',   title: 'BIG WIN',   coins: ['🎉','🍒','🪙','✨'], coinRate: 150 }
];

// Triggers full screen celebration overlays
function triggerWinCelebration(payoutAmount, wins, winRatio) {
    const tier = CELEB_TIERS.find(t => winRatio >= t.minRatio) || CELEB_TIERS[CELEB_TIERS.length - 1];

    const overlay = document.getElementById('slots-celebration-overlay');
    const titleEl = document.getElementById('celebration-win-title');
    const descEl = document.getElementById('celebration-payout-desc');
    const counterEl = document.getElementById('celebration-counter-val');
    const showcaseEl = document.getElementById('celebration-gems-showcase');
    const coinsContainer = document.getElementById('celebration-coins-container');
    const multBadgeEl = document.getElementById('celebration-mult-badge');

    if (!overlay || !titleEl || !counterEl) return;

    // 1. Setup overlay classes & title
    overlay.className = `celebration-overlay ${tier.cls}`;
    titleEl.textContent = tier.title;
    overlay.style.display = 'flex';

    // 2. Symbols showcase
    if (showcaseEl && wins.length > 0) {
        showcaseEl.innerHTML = wins.slice(0, 3)
            .map(w => `<span class="celebration-gem-icon"><span class="slot-symbol-inner">${w.symbol.char}</span></span>`)
            .join('');
    }

    // 3. Multiplier badge
    if (multBadgeEl) {
        multBadgeEl.textContent = `×${wins[0].symbol.multiplier} MULTIPLIER`;
        multBadgeEl.style.display = 'inline-block';
    }

    // 4. Description text
    if (descEl) {
        const names = [...new Set(wins.map(w => w.symbol.char))].join(' & ');
        descEl.innerHTML = `تماثل [ ${names} ] = <b>+${payoutAmount.toLocaleString()}</b> عملة!`;
    }

    // 5. Ticking counter (2.5 seconds ease-out)
    counterEl.textContent = '0';
    if (celebrationInterval) cancelAnimationFrame(celebrationInterval);
    const duration = 2500;
    const startTime = performance.now();

    function tick(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t * (2 - t); // ease-out quadratic
        counterEl.textContent = Math.floor(ease * payoutAmount).toLocaleString();
        if (t < 1) {
            celebrationInterval = requestAnimationFrame(tick);
        } else {
            counterEl.textContent = payoutAmount.toLocaleString();
        }
    }
    celebrationInterval = requestAnimationFrame(tick);

    // 6. Coin Rain particles
    if (coinsContainer) {
        coinsContainer.innerHTML = '';
        if (coinRainInterval) clearInterval(coinRainInterval);
        
        // initial burst
        for (let i = 0; i < 25; i++) spawnCoin(coinsContainer, tier.coins);
        // interval rain
        coinRainInterval = setInterval(() => spawnCoin(coinsContainer, tier.coins), tier.coinRate);
    }

    // 7. Sound fanfare
    playCelebrationFanfare(tier.cls);
}

function spawnCoin(container, pool) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'falling-coin-particle';
    el.textContent = pool[Math.floor(Math.random() * pool.length)];

    const dur = 2 + Math.random() * 2.5; // 2 - 4.5s
    const delay = Math.random() * 0.6;
    const size = 18 + Math.floor(Math.random() * 26); // 18 - 44px

    el.style.left = `${Math.random() * 100}%`;
    el.style.fontSize = `${size}px`;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${delay}s`;

    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay) * 1000 + 200);
}

function playCelebrationFanfare(tierCls) {
    if (!soundEnabled) return;
    sound.init();
    const ctx = sound.ctx;
    const now = ctx.currentTime;

    const scales = {
        'big-win':   [261.63, 329.63, 392.00, 523.25],
        'mega-win':  [261.63, 329.63, 392.00, 523.25, 659.25],
        'super-win': [261.63, 329.63, 392.00, 523.25, 659.25, 783.99],
        'grand-win': [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
    };
    const notes = scales[tierCls] || scales['big-win'];

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.38);
    });
}

function dismissCelebration() {
    const overlay = document.getElementById('slots-celebration-overlay');
    if (overlay) overlay.style.display = 'none';
    if (celebrationInterval) { cancelAnimationFrame(celebrationInterval); celebrationInterval = null; }
    if (coinRainInterval) { clearInterval(coinRainInterval); coinRainInterval = null; }
}

// Expose balance setter for Flutter webview integration
window.setMasoudiBalance = function(newBalance) {
    balance = parseInt(newBalance) || 0;
    updateBalanceDisplay();
};
