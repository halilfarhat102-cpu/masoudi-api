// Player Application Logic (index.html)

// Global State
let playerBalance = 250500.00;
let primaryBalance = 240000.00;
let bonusBalance = 10500.00;
const playerId = "879204";

// Load dynamic data from localStorage or set defaults
let dynamicGames = [];

const transactions = [
    { id: "TX-99837", type: "إيداع", amount: "+5,000 ر.س", date: "اليوم، 12:45 ص", status: "ناجحة" },
    { id: "TX-99712", type: "لعب (سلوتس API)", amount: "-1,200 ر.س", date: "أمس، 08:30 م", status: "ناجحة" },
    { id: "TX-99645", type: "سحب", amount: "-10,000 ر.س", date: "أمس، 02:15 م", status: "ناجحة" },
    { id: "TX-99501", type: "إيداع", amount: "+25,000 ر.س", date: "02 يوليو 2026", status: "ناجحة" }
];

const winners = [
    { name: "خالد المري", prize: "15,000 ر.س", game: "روليت البرق" },
    { name: "أبو فهد", prize: "8,500 ر.س", game: "فتحات أوليمبوس" },
    { name: "سارة الدوسري", prize: "32,000 ر.س", game: "بلاك جاك مسعودي" },
    { name: "سلطان العتيبي", prize: "6,200 ر.س", game: "سلوتس كليوباترا" }
];

// Filter State
let currentSearchQuery = "";
let currentCategory = "all";

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    fetchServerData(); // Dynamically load games and banners from Render server API!
    updateBalanceUI();
    renderTransactions();
    initWinnersTicker();
    
    // Splash screen loader animation
    const loaderBar = document.getElementById("loaderBar");
    const splashLoader = document.getElementById("splashLoader");
    const btnEnterApp = document.getElementById("btnEnterApp");
    
    setTimeout(() => {
        if (loaderBar) loaderBar.style.width = "100%";
    }, 150);
    
    setTimeout(() => {
        if (splashLoader) splashLoader.style.display = "none";
        if (btnEnterApp) btnEnterApp.classList.add("active");
    }, 2200);

    // Search bar event handler
    const searchInput = document.getElementById("gameSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value;
            renderDynamicGames();
        });
    }
    
    // Sync games in real-time from localStorage as local fallback
    window.addEventListener("storage", (e) => {
        if (e.key === "masoudi_games") {
            loadGamesFromStorage();
            renderDynamicGames();
        }
    });

    // Auto-poll server data every 6 seconds so game additions & edits appear quickly and stay updated
    setInterval(() => {
        fetchServerData();
    }, 6000);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            fetchServerData();
        }
    });

    // Register Service Worker for PWA installation
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.log('Service Worker registration failed', err));
        });
    }
});

function loadGamesFromStorage() {
    // Detect base URL (works in APK WebView and browser)
    const BASE = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? window.location.origin
        : 'https://masoudi-api.onrender.com';

    // Built-in games hosted on our server — use full URL so APK WebView loads them correctly
    const builtInGames = [
        {
            id: "fortune-gems",
            title: "Fortune Gems 3 — سلوتس الجواهر",
            category: "slots",
            provider: "مسعودي Games",
            launchUrl: BASE + "/public/games/fortune_gems.html",
            image: BASE + "/public/games/fortune_gems_icon.png"
        },
        {
            id: "fruit-slots",
            title: "Fruit Slots — سلوت الفواكه الكلاسيكية",
            category: "slots",
            provider: "مسعودي Games",
            launchUrl: BASE + "/public/games/fruit_slots.html",
            image: BASE + "/public/games/fruit_slots_icon.png"
        }
    ];

    const savedGames = JSON.parse(localStorage.getItem("masoudi_games")) || [];
    // Merge: built-in games first, then admin-added games (avoid duplicates by id)
    const extras = savedGames.filter(g => !['fortune-gems', 'fruit-slots'].includes(g.id));
    dynamicGames = [...builtInGames, ...extras];
}


// Update Balance UI everywhere
function updateBalanceUI() {
    const total = playerBalance.toFixed(2);
    const primary = primaryBalance.toFixed(2);
    const bonus = bonusBalance.toFixed(2);

    const topBarBalanceEl = document.getElementById("topBarBalance");
    if (topBarBalanceEl) {
        topBarBalanceEl.innerText = Math.floor(playerBalance).toLocaleString();
    }

    const headerBalEl = document.getElementById("headerBalance");
    if (headerBalEl) {
        headerBalEl.innerText = Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    
    const walletBalEl = document.getElementById("walletBalance");
    if (walletBalEl) {
        walletBalEl.innerText = Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    
    const primaryBalEl = document.getElementById("primaryBalance");
    if (primaryBalEl) {
        primaryBalEl.innerText = Number(primary).toLocaleString('en-US', { minimumFractionDigits: 2 }) + " ر.س";
    }
    
    const bonusBalEl = document.getElementById("bonusBalance");
    if (bonusBalEl) {
        bonusBalEl.innerText = Number(bonus).toLocaleString('en-US', { minimumFractionDigits: 2 }) + " ر.س";
    }
    
    const gamePlayBalEl = document.getElementById("gamePlayBalance");
    if (gamePlayBalEl) {
        gamePlayBalEl.innerText = Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
}

// Render Transactions Table
function renderTransactions() {
    const tbody = document.getElementById("txTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    transactions.forEach(tx => {
        const isPlus = tx.amount.startsWith("+");
        const amountClass = isPlus ? "plus-txt" : "minus-txt";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${tx.id}</td>
            <td>${tx.type}</td>
            <td class="${amountClass}">${tx.amount}</td>
            <td>${tx.date}</td>
            <td><span class="status-badge ${tx.status === 'ناجحة' ? 'status-success' : 'status-pending'}">${tx.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Initialize Winners Ticker
function initWinnersTicker() {
    const ticker = document.getElementById("winnersTicker");
    if (!ticker) return;
    
    const combinedWinners = [...winners, ...winners, ...winners];
    ticker.innerHTML = "";
    
    combinedWinners.forEach(w => {
        const item = document.createElement("div");
        item.className = "winner-item";
        item.innerHTML = `
            <span class="winner-name">${w.name}</span>
            <span class="winner-game">في ${w.game}</span>
            <span class="winner-prize">فاز بـ ${w.prize} <i class="fa-solid fa-trophy"></i></span>
        `;
        ticker.appendChild(item);
    });
}

// Switch Bottom Tabs
function switchTab(viewName) {
    const views = document.querySelectorAll(".app-view");
    views.forEach(view => view.classList.remove("active"));
    
    const navItems = document.querySelectorAll(".bottom-nav-bar .nav-item");
    navItems.forEach(item => item.classList.remove("active"));
    
    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.getElementById(`nav-${viewName}`);
    
    if (targetView && targetNav) {
        targetView.classList.add("active");
        targetNav.classList.add("active");
    }
}

// Toast Alert Helper
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");
    
    toastMsg.innerText = message;
    if (type === 'success') {
        toastIcon.className = "fa-solid fa-circle-check text-emerald";
        toast.style.borderColor = "var(--emerald-primary)";
    } else {
        toastIcon.className = "fa-solid fa-circle-exclamation text-danger";
        toast.style.borderColor = "#ff5252";
    }
    
    toast.classList.add("active");
    setTimeout(() => {
        toast.classList.remove("active");
    }, 3000);
}

// Presets inputs helpers
function setDepositAmount(amount) {
    document.getElementById("depositInput").value = amount;
}

function setWithdrawAmount(amount) {
    document.getElementById("withdrawInput").value = amount;
}

// Deposit and Withdraw handlers
function executeDeposit() {
    const input = document.getElementById("depositInput");
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        showToast("يرجى إدخال مبلغ إيداع صحيح", "error");
        return;
    }
    
    playerBalance += amount;
    primaryBalance += amount;
    updateBalanceUI();
    
    const txId = "TX-" + Math.floor(10000 + Math.random() * 90000);
    transactions.unshift({
        id: txId,
        type: "إيداع",
        amount: `+${amount.toLocaleString()} ر.س`,
        date: "الآن",
        status: "ناجحة"
    });
    
    document.getElementById("lastTxDetails").innerHTML = `شحن رصيد بقيمة <span class="plus-txt">+${amount.toLocaleString()} ر.س</span> - ناجحة`;
    renderTransactions();
    showToast(`تم إيداع ${amount.toLocaleString()} ر.س بنجاح في محفظتك`);
    input.value = "";
}

function executeWithdraw() {
    const input = document.getElementById("withdrawInput");
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        showToast("يرجى إدخال مبلغ سحب صحيح", "error");
        return;
    }
    
    if (amount > primaryBalance) {
        showToast("رصيدك الأساسي غير كافٍ لإتمام عملية السحب", "error");
        return;
    }
    
    playerBalance -= amount;
    primaryBalance -= amount;
    updateBalanceUI();
    
    const txId = "TX-" + Math.floor(10000 + Math.random() * 90000);
    transactions.unshift({
        id: txId,
        type: "سحب",
        amount: `-${amount.toLocaleString()} ر.س`,
        date: "الآن",
        status: "ناجحة"
    });
    
    document.getElementById("lastTxDetails").innerHTML = `سحب رصيد بقيمة <span class="minus-txt">-${amount.toLocaleString()} ر.س</span> - ناجحة`;
    renderTransactions();
    showToast(`تم سحب ${amount.toLocaleString()} ر.س بنجاح إلى حسابك`);
    input.value = "";
}

// Modals Trigger Handlers
function openDepositModal() {
    document.getElementById("depositModal").classList.add("active");
}

function closeDepositModal() {
    document.getElementById("depositModal").classList.remove("active");
}

function executeModalDeposit() {
    const val = parseFloat(document.getElementById("modalDepositInput").value);
    if (isNaN(val) || val <= 0) {
        showToast("يرجى إدخال مبلغ صحيح", "error");
        return;
    }
    playerBalance += val;
    primaryBalance += val;
    updateBalanceUI();
    
    const txId = "TX-" + Math.floor(10000 + Math.random() * 90000);
    transactions.unshift({
        id: txId,
        type: "إيداع سريع",
        amount: `+${val.toLocaleString()} ر.س`,
        date: "الآن",
        status: "ناجحة"
    });
    
    document.getElementById("lastTxDetails").innerHTML = `شحن سريع بقيمة <span class="plus-txt">+${val.toLocaleString()} ر.س</span> - ناجحة`;
    renderTransactions();
    closeDepositModal();
    showToast(`تم شحن ${val.toLocaleString()} ر.س بنجاح`);
    document.getElementById("modalDepositInput").value = "";
}

function openWithdrawModal() {
    document.getElementById("withdrawModal").classList.add("active");
}

function closeWithdrawModal() {
    document.getElementById("withdrawModal").classList.remove("active");
}

function executeModalWithdraw() {
    const val = parseFloat(document.getElementById("modalWithdrawInput").value);
    if (isNaN(val) || val <= 0) {
        showToast("يرجى إدخال مبلغ صحيح", "error");
        return;
    }
    if (val > primaryBalance) {
        showToast("الرصيد غير كافٍ", "error");
        return;
    }
    playerBalance -= val;
    primaryBalance -= val;
    updateBalanceUI();
    
    const txId = "TX-" + Math.floor(10000 + Math.random() * 90000);
    transactions.unshift({
        id: txId,
        type: "سحب سريع",
        amount: `-${val.toLocaleString()} ر.س`,
        date: "الآن",
        status: "ناجحة"
    });
    
    document.getElementById("lastTxDetails").innerHTML = `سحب سريع بقيمة <span class="minus-txt">-${val.toLocaleString()} ر.س</span> - ناجحة`;
    renderTransactions();
    closeWithdrawModal();
    showToast(`تم تأكيد سحب ${val.toLocaleString()} ر.س فوراً`);
    document.getElementById("modalWithdrawInput").value = "";
}


// Helper to format game tag text for card badges
function translateTagBadge(tag) {
    if (!tag) return '';
    const t = tag.toLowerCase().trim();
    if (t === 'hot' || t === 'popular' || t === 'شائع') return '🔥 شائع';
    if (t === 'new' || t === 'جديد') return '✨ جديد';
    if (t === 'vip') return '👑 VIP';
    return tag;
}

// Render Games on Homepage (with Filter & Search logic matching Flutter)
function renderDynamicGames() {
    const grid = document.getElementById("dynamicGamesGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    // Filter games list
    const filteredGames = dynamicGames.filter(game => {
        const tagLower = (game.tag || '').toLowerCase().trim();
        const matchesCategory = (
            currentCategory === "all" || 
            game.category === currentCategory || 
            (currentCategory === "hot" && (tagLower === "hot" || tagLower === "popular" || tagLower === "شائع" || game.category === "hot"))
        );
        const matchesSearch = game.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) || 
                              (game.provider && game.provider.toLowerCase().includes(currentSearchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (filteredGames.length === 0) {
        grid.innerHTML = `
            <div class="empty-grid-placeholder">
                <i class="fa-solid fa-gamepad fa-3x"></i>
                <span class="main-txt">لا توجد ألعاب متوفرة!</span>
                <span class="sub-txt">لم نجد أي لعبة تطابق بحثك أو تصنيفك الحالي.</span>
            </div>
        `;
        return;
    }
    
    filteredGames.forEach(game => {
        const card = document.createElement("div");
        card.className = "game-card-premium";
        
        const tagText = translateTagBadge(game.tag);
        const tagBadgeHtml = tagText ? `<span class="game-tag-badge-overlay ${game.tag || ''}">${tagText}</span>` : '';

        // Use double image layout and a bottom title overlay (exactly mirroring the Flutter UI cards!)
        card.innerHTML = `
            <div class="game-image-box" onclick="launchDynamicGame('${game.id}')">
                ${tagBadgeHtml}
                <img src="${game.image}" alt="${game.title}" class="game-img-blur-bg" onerror="this.style.display='none'">
                <img src="${game.image}" alt="${game.title}" class="game-img-front" onerror="this.src='images/app_icon.png'">
                <span class="provider-badge">${game.provider || 'مسعودي'}</span>
                <div class="game-title-overlay">
                    <div class="title-txt">${game.title}</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function translateCategory(cat) {
    if (cat === 'slots') return 'سلوتس';
    if (cat === 'table') return 'ألعاب طاولة';
    if (cat === 'live') return 'كازينو مباشر';
    return 'لعبة فورية';
}

// Category Filter Controller (matching Flutter category chips)
function setCategoryFilter(category) {
    currentCategory = category;
    
    // Update active states on visual chips
    const chips = document.querySelectorAll(".category-chips-row .chip");
    chips.forEach(chip => {
        if (chip.getAttribute("data-category") === category) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
    
    renderDynamicGames();
}
window.setCategoryFilter = setCategoryFilter;

// Render Banners dynamically on UI
function renderBanners(bannersList) {
    const wrapper = document.getElementById("promoCarouselWrapper");
    const dotsContainer = document.getElementById("promoDots");
    if (!wrapper || !dotsContainer) return;

    wrapper.innerHTML = "";
    dotsContainer.innerHTML = "";

    bannersList.forEach((banner, index) => {
        const slide = document.createElement("div");
        slide.className = "promo-slide";
        
        let cardStyle = "";
        let cardContent = "";

        if (banner.image) {
            // Resolve image path
            const BASE = window.location.origin;
            const imageUrl = banner.image.startsWith('http') ? banner.image : (BASE + '/' + (banner.image.startsWith('/') ? banner.image.slice(1) : banner.image));
            cardStyle = `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`;
            cardContent = ``; // Hide text overlay for dynamic design banner images
        } else {
            cardStyle = ""; // fall back to css gradient theme
            cardContent = `
                <span class="promo-badge">${banner.badge || 'حصري'}</span>
                <div class="promo-title">${banner.title || ''}</div>
                <div class="promo-subtitle">${banner.subtitle || ''}</div>
            `;
        }

        slide.innerHTML = `
            <div class="promo-card promo-${banner.theme || 'orange'}" style="${cardStyle}">
                ${cardContent}
            </div>
        `;
        wrapper.appendChild(slide);

        // Dot indicator
        const dot = document.createElement("div");
        dot.className = `promo-dot ${index === 0 ? 'active' : ''}`;
        dot.setAttribute("data-slide", index);
        dotsContainer.appendChild(dot);
    });

    let currentSlide = 0;
    const slidesCount = bannersList.length;

    // Automatic slider loop every 5 seconds (matching Flutter)
    if (window.bannerIntervalId) clearInterval(window.bannerIntervalId);
    window.bannerIntervalId = setInterval(() => {
        if (slidesCount > 0) {
            currentSlide = (currentSlide + 1) % slidesCount;
            updateCarouselPosition();
        }
    }, 5000);

    function updateCarouselPosition() {
        wrapper.style.transform = `translateX(${currentSlide * 100}%)`;
        
        // Update dots
        const dots = dotsContainer.querySelectorAll(".promo-dot");
        dots.forEach((dot, index) => {
            if (index === currentSlide) {
                dot.classList.add("active");
            } else {
                dot.classList.remove("active");
            }
        });
    }
}

// Fetch dynamic games & banners from the API server (sync with DB & Flutter App!)
async function fetchServerData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            
            // 1. Load Banners
            if (data.banners && data.banners.length > 0) {
                renderBanners(data.banners);
            } else {
                initDefaultBanners();
            }

            // 2. Load Games
            if (data.games) {
                const BASE = window.location.origin;
                const builtInGames = [
                    {
                        id: "fortune-gems",
                        title: "Fortune Gems 3 — سلوتس الجواهر",
                        category: "slots",
                        provider: "مسعودي Games",
                        launchUrl: BASE + "/public/games/fortune_gems.html",
                        image: BASE + "/public/games/fortune_gems_icon.png"
                    },
                    {
                        id: "fruit-slots",
                        title: "Fruit Slots — سلوت الفواكه الكلاسيكية",
                        category: "slots",
                        provider: "مسعودي Games",
                        launchUrl: BASE + "/public/games/fruit_slots.html",
                        image: BASE + "/public/games/fruit_slots_icon.png"
                    }
                ];

                const serverGames = data.games.map(g => ({
                    ...g,
                    image: g.image.startsWith('http') ? g.image : (BASE + '/' + (g.image.startsWith('/') ? g.image.slice(1) : g.image))
                }));

                // Keep built-in games only if they are not overridden in serverGames
                const remainingBuiltIn = builtInGames.filter(bg => !serverGames.some(sg => sg.id === bg.id));
                dynamicGames = [...remainingBuiltIn, ...serverGames];
                renderDynamicGames();
            }
        } else {
            throw new Error("API failed");
        }
    } catch (err) {
        console.warn("API error, loading local games & default banners:", err);
        loadGamesFromStorage();
        renderDynamicGames();
        initDefaultBanners();
    }
}

function initDefaultBanners() {
    const defaultBanners = [
        {
            title: "مكافأة الترحيب 150%",
            subtitle: "أودع الآن واحصل على ضعف رصيدك فوراً في محفظتك الشخصية",
            badge: "حصري",
            theme: "emerald"
        },
        {
            title: "جاكبوت روليت البرق",
            subtitle: "الجائزة الكبرى تصل إلى 500,000 $ نقداً للرابحين المميزين",
            badge: "مباشر",
            theme: "purple"
        },
        {
            title: "بطولة الأسبوع VIP",
            subtitle: "المركز الأول يربح 25,000 $ كاش هدايا مباشرة للأعضاء",
            badge: "جديد",
            theme: "gold"
        }
    ];
    renderBanners(defaultBanners);
}

window.fetchServerData = fetchServerData;

// Launch Game in Dynamic Iframe (The VIP API play zone)
function launchDynamicGame(gameId) {
    const game = dynamicGames.find(g => g.id === gameId);
    if (!game) return;
    
    const modal = document.getElementById("gamePlayModal");
    const playArea = document.getElementById("gamePlayArea");
    const title = document.getElementById("gameModalTitle");
    
    updateBalanceUI();
    modal.classList.add("active");
    title.innerText = game.title;
    
    // Determine the correct launch URL:
    // - If launchUrl is a pure number (PG Soft game_code) → route through our /api/pg/launch
    // - If launchUrl is a full URL (built-in games) → open directly in iframe
    let secureLaunchUrl;
    const isPGSoftGame = game.provider === 'PG' || /^\d+$/.test((game.launchUrl || '').trim());
    
    if (isPGSoftGame) {
        const gameCode = (game.launchUrl || '').trim();
        secureLaunchUrl = `/api/pg/launch?player_id=${playerId}&game_code=${gameCode}`;
    } else {
        const separator = game.launchUrl.includes("?") ? "&" : "?";
        secureLaunchUrl = `${game.launchUrl}${separator}player_id=${playerId}&balance=${playerBalance}&token=secure_session_masoudi&provider=${encodeURIComponent(game.provider)}`;
    }
    
    playArea.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:15px; color:var(--gold-text); font-weight:700; font-size:13px;" id="gameLoader">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
            <span>جاري الاتصال بـ API ومصادقة بيانات اللاعب...</span>
        </div>
    `;
    
    setTimeout(() => {
        playArea.innerHTML = `<iframe src="${secureLaunchUrl}" class="game-iframe" allow="autoplay; fullscreen" id="gameFrame"></iframe>`;
    }, 1200);
}

function closeGamePlayModal() {
    const playArea = document.getElementById("gamePlayArea");
    playArea.innerHTML = "";
    document.getElementById("gamePlayModal").classList.remove("active");
}

// Bind all interactive functions to the window object for module compatibility
window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.executeModalDeposit = executeModalDeposit;
window.openWithdrawModal = openWithdrawModal;
window.closeWithdrawModal = closeWithdrawModal;
window.executeModalWithdraw = executeModalWithdraw;
window.switchTab = switchTab;
window.setDepositAmount = setDepositAmount;
window.setWithdrawAmount = setWithdrawAmount;
window.executeDeposit = executeDeposit;
window.executeWithdraw = executeWithdraw;
window.closeGamePlayModal = closeGamePlayModal;
window.launchDynamicGame = launchDynamicGame;

function enterApp() {
    const splash = document.getElementById("splashScreen");
    if (splash) {
        splash.classList.add("fade-out");
        setTimeout(() => {
            splash.style.display = "none";
        }, 800);
    }
}
window.enterApp = enterApp;
