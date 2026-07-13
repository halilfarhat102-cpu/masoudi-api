// ==========================================
// Lucky Animal Wheel - Game State
// ==========================================
let balance = parseInt(localStorage.getItem('masoudi_wallet_balance')) || 0;
let betAmount = 1000; // Default bet matching active green button
let selectedBets = {}; 
let ribbonMultiplier = 1;
let isSpinning = false;
let isAutoSpin = false;
let todayProfit = 0;
let roundHistoryList = [];

// Settings
let isSoundEnabled = true;
let isMusicEnabled = true;
let isVipActive = localStorage.getItem('masoudi_vip_active') === 'true';

// Rewards & Quests State
let lastChestClaimedTime = Date.now() - 4 * 60 * 60 * 1000; // ready to claim
let dailyStreak = 1;
let dailyStreakClaimed = false;
let dailyFreeSpinUsed = false;
let spinsCountQuest = 0;
let maxSingleWinQuest = 0;

// ==========================================
// Sound Effects Controller (Web Audio API)
// ==========================================
class SoundController {
    constructor() {
        this.ctx = null;
        this.musicInterval = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    startMusic() {
        if (!isMusicEnabled) return;
        this.init();
        if (this.musicInterval) return;

        // Safari Ambient Bass Loop
        const pattern = [77.78, 87.31, 98.00, 116.54]; // Bass notes Eb2, F2, G2, Bb2
        let step = 0;
        this.musicInterval = setInterval(() => {
            if (!this.ctx || this.ctx.state === 'suspended' || !isMusicEnabled) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(pattern[step % pattern.length], now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, now);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.6);
            step++;
        }, 600);
    }
    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
    playTick() {
        if (!isSoundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
    }
    playChip() {
        if (!isSoundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }
    playWin() {
        if (!isSoundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }
    playLose() {
        if (!isSoundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [220.00, 196.00, 164.81]; // A3, G3, E3
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.08, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }
}
const sound = new SoundController();

// ==========================================
// 10 Food Slices Configuration (Mockup style)
// ==========================================
const animalSlots = [
    { text: 'النسر', type: 'win', icon: '🦅', value: 45, label: 'win 45X', image: '' },
    { text: 'التمساح', type: 'win', icon: '🐊', value: 25, label: 'win 25X', image: '' },
    { text: 'الفهد', type: 'win', icon: '🐆', value: 15, label: 'win 15X', image: '' },
    { text: 'الأسد', type: 'win', icon: '🦁', value: 10, label: 'win 10X', image: '' },
    { text: 'الفيل', type: 'win', icon: '🐘', value: 5, label: 'win 5X', image: '' },
    { text: 'الزرافة', type: 'win', icon: '🦒', value: 5, label: 'win 5X', image: '' },
    { text: 'الحمار الوحشي', type: 'win', icon: '🦓', value: 5, label: 'win 5X', image: '' },
    { text: 'الغزال', type: 'win', icon: '🦌', value: 5, label: 'win 5X', image: '' },
    { text: 'اللحوم', type: 'special', icon: '🥩', value: 10, label: 'كل اللواحم', image: '' },
    { text: 'الأعشاب', type: 'special', icon: '🌿', value: 10, label: 'كل العواشب', image: '' }
];
const totalSlots = animalSlots.length;

// DOM Elements
let gridContainer, startScreen, gameScreen, balanceDisplays, playerBalanceEl, todayProfitValEl;
let freeCanvas, freeCtx;

function initGrid() {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    animalSlots.slice(0, 8).forEach((slot, index) => {
        const card = document.createElement('div');
        card.className = 'animal-card';
        card.dataset.index = index;

        card.innerHTML = `
            <span class="card-icon">${slot.icon}</span>
            <span class="card-value">${slot.label}</span>
            <div class="card-bet-badge">0</div>
        `;

        card.addEventListener('click', () => {
            if (isSpinning) return;
            
            if (balance < betAmount) {
                alert('رصيدك غير كافي لإتمام هذه المراهنة!');
                return;
            }
            
            sound.playChip();
            balance -= betAmount;
            
            if (selectedBets[index] !== undefined) {
                selectedBets[index] += betAmount;
            } else {
                selectedBets[index] = betAmount;
            }
            updateUI();
        });

        gridContainer.appendChild(card);
    });
}

function updateQuests() {
    const spinsProg = document.getElementById('quest-spins-prog');
    const claimSpinsBtn = document.getElementById('claim-quest-spins-btn');
    if (spinsProg) {
        spinsProg.textContent = `${Math.min(spinsCountQuest, 5)}/5`;
    }
    if (claimSpinsBtn) {
        claimSpinsBtn.disabled = spinsCountQuest < 5;
    }

    const winProg = document.getElementById('quest-win-prog');
    const claimWinBtn = document.getElementById('claim-quest-win-btn');
    if (winProg) {
        winProg.textContent = `${Math.min(maxSingleWinQuest, 1000)}/1000`;
    }
    if (claimWinBtn) {
        claimWinBtn.disabled = maxSingleWinQuest < 1000;
    }
}

function updateUI() {
    // Sync balance with shared portal wallet
    localStorage.setItem('masoudi_wallet_balance', balance);
    
    if (!balanceDisplays || !playerBalanceEl || !todayProfitValEl) return;
    
    // Update all text labels
    balanceDisplays.forEach(el => el.textContent = balance.toLocaleString());
    playerBalanceEl.textContent = balance.toLocaleString();
    todayProfitValEl.textContent = todayProfit.toLocaleString();

    // Toggle active bet card selection class
    const cards = document.querySelectorAll('.animal-card');
    cards.forEach((card, idx) => {
        const badge = card.querySelector('.card-bet-badge');
        if (selectedBets[idx] !== undefined) {
            card.classList.add('selected-bet');
            if (badge) {
                const val = selectedBets[idx];
                badge.textContent = val >= 1000 ? (val / 1000) + 'k' : val;
            }
        } else {
            card.classList.remove('selected-bet');
            if (badge) {
                badge.textContent = '0';
            }
        }
    });

    updateQuests();
}

// Daily Free Spin Wheel Popup Logic
let freeAngle = 0;
let isFreeSpinning = false;

function drawFreeWheel(angle = 0) {
    if (!freeCtx || !freeCanvas) return;
    const size = freeCanvas.width;
    const center = size / 2;
    const radius = center - 8;
    const numSectors = 8;
    const freeArc = (2 * Math.PI) / numSectors;
    const freePrizes = [100, 200, 300, 400, 500, 600, 800, 1000];
    const freeColors = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#1abc9c', '#34495e'];

    freeCtx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSectors; i++) {
        const start = i * freeArc + angle;
        const end = start + freeArc;
        
        freeCtx.beginPath();
        freeCtx.moveTo(center, center);
        freeCtx.arc(center, center, radius, start, end);
        freeCtx.closePath();
        freeCtx.fillStyle = freeColors[i];
        freeCtx.fill();
        freeCtx.strokeStyle = '#fff';
        freeCtx.lineWidth = 1.5;
        freeCtx.stroke();

        freeCtx.save();
        freeCtx.translate(center, center);
        freeCtx.rotate(start + freeArc / 2);
        freeCtx.textAlign = 'right';
        freeCtx.fillStyle = '#fff';
        freeCtx.font = 'bold 11px Orbitron';
        freeCtx.fillText(`+${freePrizes[i]}`, radius - 15, 4);
        freeCtx.restore();
    }

    freeCtx.beginPath();
    freeCtx.arc(center, center, 14, 0, Math.PI * 2);
    freeCtx.fillStyle = '#fff';
    freeCtx.fill();
    freeCtx.strokeStyle = '#ffd700';
    freeCtx.lineWidth = 2;
    freeCtx.stroke();

    // Draw pointer at 12 o'clock
    freeCtx.beginPath();
    freeCtx.moveTo(center - 10, 8);
    freeCtx.lineTo(center + 10, 8);
    freeCtx.lineTo(center, 25);
    freeCtx.closePath();
    freeCtx.fillStyle = '#e74c3c';
    freeCtx.fill();
    freeCtx.strokeStyle = '#fff';
    freeCtx.lineWidth = 1.5;
    freeCtx.stroke();
}

// Modals setup helper
function setupModal(triggerId, modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const trigger = document.getElementById(triggerId);
    if (trigger) {
        trigger.addEventListener('click', () => {
            sound.playChip();
            modal.classList.add('visible');
            if (modalId === 'gift-modal') {
                drawFreeWheel(0);
            }
        });
    }
    modal.querySelector('.close-modal-btn')?.addEventListener('click', () => {
        sound.playChip();
        modal.classList.remove('visible');
    });
}

// Spin execution
function spin() {
    if (isSpinning) return;

    isSpinning = true;
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = true;
    
    updateUI();

    const cards = document.querySelectorAll('.animal-card');
    cards.forEach(c => {
        c.classList.remove('winner-flash');
        c.classList.remove('winner-flash-special');
        c.classList.remove('scanning-active');
    });

    // Clear special highlights from header bubbles
    document.getElementById('decor-pizza')?.classList.remove('winner-flash-bubble');
    document.getElementById('decor-salad')?.classList.remove('winner-flash-bubble');

    // Read win rate config from localStorage (default to 70% if not found)
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
    }
    
    const winningSlot = animalSlots[winningIndex];

    // targetSteps for scan animation
    // if Pizza/Salad, we cycle 3 full rounds (24 steps) and end
    const targetSteps = winningIndex < 8 ? (24 + winningIndex) : 24; 
    let currentStep = 0;

    function runStep() {
        const isSilent = gameScreen && gameScreen.classList.contains('hidden');
        const currentScanIdx = currentStep % 8; // only scan 8 visible grid cards
        
        cards.forEach(c => c.classList.remove('scanning-active'));
        if (cards[currentScanIdx]) cards[currentScanIdx].classList.add('scanning-active');
        
        if (!isSilent) {
            sound.playTick();
        }

        if (currentStep < targetSteps) {
            const progress = currentStep / targetSteps;
            const delay = 40 + Math.pow(progress, 3) * 600;
            currentStep++;
            setTimeout(runStep, delay);
        } else {
            // Stay highlighted on the final slot for landing duration
            setTimeout(() => {
                cards.forEach(c => c.classList.remove('scanning-active'));
                
                if (winningIndex < 8) {
                    cards[winningIndex].classList.add('winner-flash');
                    
                    // Prepend new history item
                    const historyList = document.getElementById('history-list');
                    if (historyList) {
                        const histItem = document.createElement('div');
                        histItem.className = 'history-item new-marker';
                        histItem.innerHTML = `<span class="item-pic">${winningSlot.icon}</span><span class="new-badge">NEW</span>`;
                        
                        const oldNew = historyList.querySelector('.new-badge');
                        if (oldNew) oldNew.remove();
                        const oldMarker = historyList.querySelector('.new-marker');
                        if (oldMarker) oldMarker.classList.remove('new-marker');

                        historyList.insertBefore(histItem, historyList.firstChild);
                    }

                    setTimeout(() => {
                        finishSpin(winningSlot, winningIndex);
                    }, 1200);
                } else {
                    // Light up header bubble and flash cards immediately
                    if (winningIndex === 8) {
                        document.getElementById('decor-pizza')?.classList.add('winner-flash-bubble');
                        // Flash all Meat cards in gold
                        const meatIndices = [0, 1, 2, 3];
                        meatIndices.forEach(idx => {
                            cards[idx].classList.add('winner-flash-special');
                        });
                    } else if (winningIndex === 9) {
                        document.getElementById('decor-salad')?.classList.add('winner-flash-bubble');
                        // Flash all Veg cards in gold
                        const vegIndices = [4, 5, 6, 7];
                        vegIndices.forEach(idx => {
                            cards[idx].classList.add('winner-flash-special');
                        });
                    }

                    // Prepend new history item
                    const historyList = document.getElementById('history-list');
                    if (historyList) {
                        const histItem = document.createElement('div');
                        histItem.className = 'history-item new-marker';
                        histItem.innerHTML = `<span class="item-pic">${winningSlot.icon}</span><span class="new-badge">NEW</span>`;
                        
                        const oldNew = historyList.querySelector('.new-badge');
                        if (oldNew) oldNew.remove();
                        const oldMarker = historyList.querySelector('.new-marker');
                        if (oldMarker) oldMarker.classList.remove('new-marker');

                        historyList.insertBefore(histItem, historyList.firstChild);
                    }

                    // Show result popup after delay
                    setTimeout(() => {
                        finishSpin(winningSlot, winningIndex);
                    }, 2500);
                }
            }, 600);
        }
    }
    runStep();
}



let notificationTimerInterval = null;

function finishSpin(winningSlot, winningIndex) {
    const isSilent = gameScreen && gameScreen.classList.contains('hidden');
    isSpinning = false;
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = false;
    spinsCountQuest++;

    const notificationOverlay = document.getElementById('notification-overlay');
    const resultTopIcon = document.getElementById('result-top-icon');
    const resultEmojiAvatar = document.getElementById('result-emoji-avatar');
    const resultRoundLabel = document.getElementById('result-round-label');
    const resultRoundIcon = document.getElementById('result-round-icon');
    const resultMessageText = document.getElementById('result-message-text');
    const timerBadge = document.getElementById('result-timer-badge');
    const closeBtn = document.getElementById('close-notification-btn');

    // Populate winning icons
    if (resultTopIcon) resultTopIcon.textContent = winningSlot.icon;
    if (resultRoundIcon) resultRoundIcon.textContent = winningSlot.icon;
    if (resultRoundLabel) resultRoundLabel.textContent = `The ${String(roundNumber).padStart(4, '0')} round's results:`;

    const totalCost = Object.values(selectedBets).reduce((sum, val) => sum + val, 0);
    const meatIndices = [0, 1, 2, 3];
    const vegIndices = [4, 5, 6, 7];
    
    let isWin = false;
    let totalWin = 0;

    if (winningIndex === 8) {
        // Pizza landed! Evaluate all Meat bets
        meatIndices.forEach(idx => {
            if (selectedBets[idx] !== undefined) {
                isWin = true;
                totalWin += selectedBets[idx] * animalSlots[idx].value;
            }
        });
        // Direct bet on Pizza itself
        if (selectedBets[8] !== undefined) {
            isWin = true;
            totalWin += selectedBets[8] * animalSlots[8].value;
        }
    } else if (winningIndex === 9) {
        // Salad landed! Evaluate all Veg bets
        vegIndices.forEach(idx => {
            if (selectedBets[idx] !== undefined) {
                isWin = true;
                totalWin += selectedBets[idx] * animalSlots[idx].value;
            }
        });
        // Direct bet on Salad itself
        if (selectedBets[9] !== undefined) {
            isWin = true;
            totalWin += selectedBets[9] * animalSlots[9].value;
        }
    } else {
        // Normal evaluation
        isWin = (winningIndex in selectedBets);
        if (isWin) {
            totalWin = selectedBets[winningIndex] * winningSlot.value;
        }
    }

    if (totalCost === 0) {
        // Spectator round
        if (resultEmojiAvatar) resultEmojiAvatar.textContent = '🤔';
        if (resultMessageText) {
            resultMessageText.innerHTML = `جولة مشاهدة ~<br><span style="font-size: 0.75rem; font-weight: normal; color: #7f8c8d;">لم تقم بوضع أي رهان</span>`;
        }
        if (closeBtn) closeBtn.textContent = 'العب الجولة القادمة';
    } else if (isWin) {
        balance += totalWin;
        todayProfit += (totalWin - totalCost);
        if (totalWin > maxSingleWinQuest) maxSingleWinQuest = totalWin;

        if (!isSilent) {
            sound.playWin();
        }

        if (resultEmojiAvatar) resultEmojiAvatar.textContent = '🤩';
        if (resultMessageText) {
            if (winningIndex === 8) {
                resultMessageText.innerHTML = `🥩 جاك بوت اللواحم! 🥩<br>ربحت عن جميع رهانات اللحوم!<br><span style="color: #2ecc71; font-size: 1.1rem; font-weight: bold;">+${totalWin.toLocaleString()} 🪙</span><br><span style="font-size: 0.75rem; color: #7f8c8d;">إجمالي الرهان: ${totalCost.toLocaleString()}</span>`;
            } else if (winningIndex === 9) {
                resultMessageText.innerHTML = `🌿 جاك بوت العواشب! 🌿<br>ربحت عن جميع رهانات الأعشاب!<br><span style="color: #2ecc71; font-size: 1.1rem; font-weight: bold;">+${totalWin.toLocaleString()} 🪙</span><br><span style="font-size: 0.75rem; color: #7f8c8d;">إجمالي الرهان: ${totalCost.toLocaleString()}</span>`;
            } else {
                resultMessageText.innerHTML = `تهانينا! لقد فزت 🎉<br><span style="color: #2ecc71; font-size: 1.1rem; font-weight: bold;">+${totalWin.toLocaleString()} 🪙</span><br><span style="font-size: 0.75rem; color: #7f8c8d;">إجمالي الرهان: ${totalCost.toLocaleString()}</span>`;
            }
        }
        if (closeBtn) closeBtn.textContent = 'العب مجدداً';
    } else {
        if (!isSilent) {
            sound.playLose();
        }
        todayProfit -= totalCost;

        if (resultEmojiAvatar) resultEmojiAvatar.textContent = '😓';
        if (resultMessageText) {
            if (winningIndex === 8) {
                resultMessageText.innerHTML = `ظهرت اللحوم! 🥩<br>لكن لم تراهن على اللواحم.<br><span style="font-size: 0.75rem; color: #e74c3c; font-weight: bold;">خسرت رهان: -${totalCost.toLocaleString()} 🪙</span>`;
            } else if (winningIndex === 9) {
                resultMessageText.innerHTML = `ظهرت الأعشاب! 🌿<br>لكن لم تراهن على العواشب.<br><span style="font-size: 0.75rem; color: #e74c3c; font-weight: bold;">خسرت رهان: -${totalCost.toLocaleString()} 🪙</span>`;
            } else {
                resultMessageText.innerHTML = `حظاً موفقاً المرة القادمة ~<br><span style="font-size: 0.75rem; color: #e74c3c; font-weight: bold;">خسرت رهان: -${totalCost.toLocaleString()} 🪙</span>`;
            }
        }
        if (closeBtn) closeBtn.textContent = 'إعادة المراهنة';
    }

    // Update round history list (for the modal)
    roundHistoryList.unshift({
        round: roundNumber,
        icon: winningSlot.icon,
        winAmount: totalWin,
        betAmount: totalCost,
        isWin: isWin
    });
    if (roundHistoryList.length > 20) roundHistoryList.pop();

    // Populate history modal dynamically
    const historyModalBody = document.getElementById('history-modal-body');
    if (historyModalBody) {
        historyModalBody.innerHTML = roundHistoryList.map(h => {
            const outcomeColor = h.betAmount === 0 ? '#7f8c8d' : (h.isWin ? '#44db5e' : '#ff4757');
            const outcomeText = h.betAmount === 0 ? 'مشاهدة' : (h.isWin ? `فوز +${h.winAmount.toLocaleString()}` : `خسارة -${h.betAmount.toLocaleString()}`);
            return `
                <div style="border: 2px solid ${outcomeColor}; padding: 8px 12px; background: rgba(0,0,0,0.4); display: flex; justify-content: space-between; align-items: center; border-radius: 12px; margin-bottom: 8px;">
                    <div style="display: flex; flex-direction: column; text-align: left;">
                        <span style="font-weight: bold; font-size: 0.9rem; color: #ffffff;">Round ${String(h.round).padStart(4, '0')}</span>
                        <span style="font-size: 0.8rem; color: ${outcomeColor}; font-weight: bold;">${outcomeText} 🪙</span>
                    </div>
                    <span style="font-size: 1.5rem;">${h.icon}</span>
                </div>
            `;
        }).join('');
    }

    updateUI();

    if (isSilent) {
        // Clear winner highlights quietly
        const cards = document.querySelectorAll('.animal-card');
        cards.forEach(c => {
            c.classList.remove('winner-flash');
            c.classList.remove('winner-flash-special');
        });
        document.getElementById('decor-pizza')?.classList.remove('winner-flash-bubble');
        document.getElementById('decor-salad')?.classList.remove('winner-flash-bubble');

        selectedBets = {};
        updateUI();

        roundNumber++;
        if (roundNumber > 3200) {
            roundNumber = 1;
        }
        localStorage.setItem('currentRoundNumber', roundNumber);

        const backBtn = document.getElementById('game-back-btn');
        if (backBtn) backBtn.textContent = `❮ Round ${String(roundNumber).padStart(4, '0')}`;

        timerCount = 29;
        isSpinning = false;
        return; // Complete background round cycle quietly without showing modal or starting overlay timer
    }

    notificationOverlay.classList.add('visible');

    // Live countdown inside the popup (now 5.0s)
    let popupTimer = 5.0;
    if (timerBadge) timerBadge.textContent = `${popupTimer.toFixed(1)}s`;
    
    if (notificationTimerInterval) clearInterval(notificationTimerInterval);
    notificationTimerInterval = setInterval(() => {
        popupTimer -= 0.1;
        if (popupTimer <= 0) {
            clearInterval(notificationTimerInterval);
            notificationTimerInterval = null;
        } else {
            if (timerBadge) timerBadge.textContent = `${popupTimer.toFixed(1)}s`;
        }
    }, 100);

    // Auto-close after 5.0 seconds to keep game looping continuously
    setTimeout(() => {
        if (notificationOverlay.classList.contains('visible')) {
            closeNotificationAndReset();
        }
    }, 5000);
}

function closeNotificationAndReset() {
    if (notificationTimerInterval) {
        clearInterval(notificationTimerInterval);
        notificationTimerInterval = null;
    }
    const notificationOverlay = document.getElementById('notification-overlay');
    if (notificationOverlay) notificationOverlay.classList.remove('visible');
    
    // Clear winner highlights
    const cards = document.querySelectorAll('.animal-card');
    cards.forEach(c => {
        c.classList.remove('winner-flash');
        c.classList.remove('winner-flash-special');
    });
    
    // Clear bubble highlights
    document.getElementById('decor-pizza')?.classList.remove('winner-flash-bubble');
    document.getElementById('decor-salad')?.classList.remove('winner-flash-bubble');

    // Reset bets for the new round
    selectedBets = {};
    updateUI();

    // Increment round count
    roundNumber++;
    if (roundNumber > 3200) {
        roundNumber = 1;
    }
    localStorage.setItem('currentRoundNumber', roundNumber);

    const backBtn = document.getElementById('game-back-btn');
    if (backBtn) backBtn.textContent = `❮ Round ${String(roundNumber).padStart(4, '0')}`;

    // Restart timer
    timerCount = 29;
    const timerPill = document.getElementById('timer-display-pill');
    if (timerPill) timerPill.textContent = `${timerCount}s`;
}

// Timer countdown simulation
let timerCount = 29;
let roundNumber = parseInt(localStorage.getItem('currentRoundNumber')) || 1;

// Simulate background rounds progression based on elapsed time since last visit
(function() {
    const lastTime = parseInt(localStorage.getItem('masoudi_last_round_time'));
    if (lastTime) {
        const diffMs = Date.now() - lastTime;
        if (diffMs > 0) {
            const roundsPassed = Math.floor(diffMs / 35000); // 35 seconds per round cycle
            if (roundsPassed > 0) {
                roundNumber += roundsPassed;
                if (roundNumber > 3200) {
                    roundNumber = (roundNumber - 1) % 3200 + 1;
                }
                localStorage.setItem('currentRoundNumber', roundNumber);
            }
            const remainingMs = diffMs % 35000;
            if (remainingMs < 30000) {
                timerCount = 30 - Math.floor(remainingMs / 1000);
            } else {
                timerCount = 29; // Fallback during spin action
            }
        }
    }
    localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
})();

function updateTimerPill() {
    const notificationOverlay = document.getElementById('notification-overlay');
    const isResultShowing = notificationOverlay && notificationOverlay.classList.contains('visible');

    const isSplashShowing = startScreen ? !startScreen.classList.contains('hidden') : true;

    if (isSpinning || isResultShowing || isSplashShowing) {
        // Update baseline time forward so background simulation behaves correctly during active game phases or loading screen
        localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
        return;
    }

    if (timerCount > 0) {
        timerCount--;
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = `${timerCount}s`;
        localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
    } else {
        // Countdown finished! Trigger auto-spin
        timerCount = 30; // reset
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = `0s`;

        spin();
    }
}
setInterval(updateTimerPill, 1000);

// Master Initialization on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    // 1. Map DOM Elements safely
    gridContainer = document.getElementById('betting-grid');
    startScreen = document.getElementById('splash-screen');
    gameScreen = document.getElementById('game-screen');
    balanceDisplays = document.querySelectorAll('.balance-value');
    playerBalanceEl = document.getElementById('player-balance');
    todayProfitValEl = document.getElementById('today-profit-val');
    freeCanvas = document.getElementById('free-spin-canvas');
    if (freeCanvas) freeCtx = freeCanvas.getContext('2d');

    const backBtn = document.getElementById('game-back-btn');
    if (backBtn) backBtn.textContent = `❮ Round ${String(roundNumber).padStart(4, '0')}`;

    // Progress Bar Loader Function
    function runSplashLoader() {
        const progressBar = document.getElementById('splash-progress');
        if (!progressBar) return;
        
        progressBar.style.width = '0%';
        let progress = 0;
        
        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        isAutoSpin = false;
        
        const duration = 2500; // 2.5 seconds loading time
        const intervalTime = 30; // 30ms step
        const step = (100 / (duration / intervalTime));
        
        const loaderInterval = setInterval(() => {
            progress += step;
            if (progress >= 100) {
                progress = 100;
                progressBar.style.width = '100%';
                clearInterval(loaderInterval);
                
                setTimeout(() => {
                    startScreen.classList.add('hidden');
                    gameScreen.classList.remove('hidden');
                    sound.startMusic();
                    initGrid();
                    updateUI();
                }, 300);
            } else {
                progressBar.style.width = `${progress}%`;
            }
        }, intervalTime);
    }

    // Start progress loading immediately
    runSplashLoader();

    // 2. Setup Navigation click actions
    document.getElementById('game-back-btn')?.addEventListener('click', () => {
        sound.playChip();
        // Redirect to the home landing page
        window.location.href = 'index.html';
    });

    // 3. Setup Bet quick select buttons mapping
    const quickBetBtns = document.querySelectorAll('.quick-bet-btn');
    quickBetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isSpinning) return;
            sound.playChip();
            quickBetBtns.forEach(b => b.classList.remove('active-bet-value'));
            btn.classList.add('active-bet-value');
            betAmount = parseInt(btn.getAttribute('data-bet'), 10);
            updateUI();
        });
    });

    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
        spinBtn.addEventListener('click', spin);
    }

    document.getElementById('close-notification-btn')?.addEventListener('click', () => {
        sound.playChip();
        closeNotificationAndReset();
    });

    // 5. Daily reward actions & modal setups
    setupModal('start-shop-btn', 'shop-modal');
    setupModal('start-settings-btn', 'settings-modal');
    document.getElementById('header-shop-btn')?.addEventListener('click', () => {
        sound.playChip();
        window.location.href = 'index.html?recharge=true';
    });
    setupModal('header-quests-btn', 'quests-modal');
    setupModal('header-settings-btn', 'settings-modal');
    setupModal('rule-btn', 'rules-modal');

    // Close overlays clicking outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                sound.playChip();
                modal.classList.remove('visible');
            }
        });
    });

    // Settings Toggles
    document.getElementById('settings-music-btn')?.addEventListener('click', (e) => {
        sound.playChip();
        isMusicEnabled = !isMusicEnabled;
        e.target.classList.toggle('active', isMusicEnabled);
        e.target.textContent = isMusicEnabled ? 'ON' : 'OFF';
        if (isMusicEnabled) sound.startMusic();
        else sound.stopMusic();
    });

    document.getElementById('settings-sound-btn')?.addEventListener('click', (e) => {
        sound.playChip();
        isSoundEnabled = !isSoundEnabled;
        e.target.classList.toggle('active', isSoundEnabled);
        e.target.textContent = isSoundEnabled ? 'ON' : 'OFF';
    });

    // Store Buying Actions
    document.querySelectorAll('.store-item').forEach(item => {
        item.addEventListener('click', () => {
            sound.playWin();
            const type = item.getAttribute('data-buy');
            const amount = item.getAttribute('data-amount');
            if (type === 'coins') {
                balance += parseInt(amount, 10);
                alert(`🛒 Purchase Complete: Added ${amount} Coins!`);
            } else if (type === 'vip') {
                isVipActive = true;
                localStorage.setItem('masoudi_vip_active', 'true');
                document.getElementById('vip-status-label').textContent = 'ACTIVE';
                alert('⭐ VIP Activated!');
            }
            updateUI();
        });
    });

    // Daily Streaks & Ads
    document.getElementById('claim-daily-btn')?.addEventListener('click', (e) => {
        if (dailyStreakClaimed) return;
        sound.playWin();
        dailyStreakClaimed = true;
        let win = dailyStreak * 150;
        if (isVipActive) {
            win *= 2;
        }
        balance += win;
        e.target.disabled = true;
        e.target.textContent = 'CLAIMED';
        alert(`📅 Streak claimed! Received ${win} Coins! ${isVipActive ? '(VIP 2x Activated!)' : ''}`);
        updateUI();
    });

    document.getElementById('watch-ad-btn')?.addEventListener('click', (e) => {
        sound.playChip();
        e.target.disabled = true;
        e.target.textContent = 'LOADING AD...';
        setTimeout(() => {
            sound.playWin();
            balance += 200;
            e.target.disabled = false;
            e.target.textContent = '📺 WATCH AD';
            alert('🪙 Video watched! Received 200 free coins!');
            updateUI();
        }, 2000);
    });

    document.getElementById('claim-quest-spins-btn')?.addEventListener('click', (e) => {
        sound.playWin();
        balance += 250;
        spinsCountQuest = 0;
        e.target.disabled = true;
        updateUI();
    });

    document.getElementById('claim-quest-win-btn')?.addEventListener('click', (e) => {
        sound.playWin();
        balance += 500;
        maxSingleWinQuest = 0;
        e.target.disabled = true;
        updateUI();
    });

    document.getElementById('spin-free-wheel-btn')?.addEventListener('click', () => {
        if (isFreeSpinning || dailyFreeSpinUsed) {
            alert('لقد استخدمت اللفة المجانية اليومية بالفعل!');
            return;
        }
        sound.playChip();
        isFreeSpinning = true;
        
        let startAngle = freeAngle;
        const totalSpins = 5 + Math.random() * 5;
        const targetAngle = startAngle + totalSpins * Math.PI * 2;
        const duration = 4000;
        const startTime = performance.now();
        
        function animateFreeSpin(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            freeAngle = startAngle + (targetAngle - startAngle) * ease;
            
            drawFreeWheel(freeAngle);
            
            if (progress < 1) {
                requestAnimationFrame(animateFreeSpin);
            } else {
                isFreeSpinning = false;
                dailyFreeSpinUsed = true;
                
                const numSectors = 8;
                const sectorArc = (Math.PI * 2) / numSectors;
                const normAngle = (Math.PI * 2 - (freeAngle % (Math.PI * 2))) % (Math.PI * 2);
                const pointerAngle = (normAngle + Math.PI * 1.5) % (Math.PI * 2);
                const winningSectorIdx = Math.floor(pointerAngle / sectorArc) % numSectors;
                
                const freePrizes = [100, 200, 300, 400, 500, 600, 800, 1000];
                let prize = freePrizes[winningSectorIdx];
                if (isVipActive) {
                    prize *= 2;
                }
                
                balance += prize;
                sound.playWin();
                alert(`🎉 مبروك! لقد ربحت ${prize} عملة مجانية! ${isVipActive ? '(VIP 2x Activated!)' : ''}`);
                updateUI();
                
                const spinFreeBtn = document.getElementById('spin-free-wheel-btn');
                if (spinFreeBtn) {
                    spinFreeBtn.disabled = true;
                    spinFreeBtn.textContent = 'USED TODAY';
                }
            }
        }
        requestAnimationFrame(animateFreeSpin);
    });

    drawFreeWheel(0);
    initGrid();
    updateUI();
});


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
