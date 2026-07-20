import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The complete JSON data extracted from Git history
const dbBackup = {
  "settings": {
    "enablePreview": false,
    "showBalance": false,
    "showLiveBadge": false,
    "playButtonText": "العب الآن",
    "coinBuyRate": 10000,
    "coinSellRate": 20000
  },
  "banners": [
    {
      "id": "banner-1783249648300",
      "title": "مرحباً بك في عالم الألعاب",
      "subtitle": "اكتشف أفضل الألعاب واستمتع بتجربة لا تنتهي من المرح والإثارة",
      "badge": "جديد",
      "icon": "🎮",
      "image": "images/uploaded_1783249646987.png",
      "theme": "orange"
    },
    {
      "id": "banner-1783251638276",
      "title": "سياسة التطبيق",
      "subtitle": "نلتزم بحماية بياناتك وخصوصيتك وتقديم تجربة آمنة وموثوقة لك في مسعودي",
      "badge": "تنبيه",
      "icon": "🔒",
      "image": "images/uploaded_1783251631980.png",
      "theme": "emerald"
    }
  ],
  "agents": [
    {
      "id": "agent-1783265344524",
      "name": "خالد",
      "country": "🇪🇬 مصر",
      "phone": "+201008827375",
      "paymentMethods": "فودافون كاش",
      "rate": "1$=10,000 كوينز",
      "playerId": "519997"
    }
  ],
  "games": [
    {
      "id": "game-1",
      "title": "روليت البرق (Lightning Roulette)",
      "category": "live",
      "provider": "Evolution Gaming",
      "launchUrl": "https://v1.evolution.com/lightning-roulette-demo",
      "image": "images/uploaded_1783263729640.png"
    },
    {
      "id": "game-2",
      "title": "فتحات بوابات أوليمبوس (Gates of Olympus)",
      "category": "slots",
      "provider": "Pragmatic Play",
      "launchUrl": "https://demoplay.pragmaticplay.com/play/vs20olympgate",
      "image": "images/uploaded_1783263718442.png"
    },
    {
      "id": "game-3",
      "title": "مزرعة الحيوانات الكبيرة (Big Farm)",
      "category": "slots",
      "provider": "مسعودي Games",
      "launchUrl": "assets/game/game.html",
      "image": "assets/game/big_farm_icon.png"
    }
  ],
  "players": [
    {
      "id": "519997",
      "name": "Halil Farhat",
      "email": "halilfarhat102@gmail.com",
      "photoUrl": "https://lh3.googleusercontent.com/a/ACg8ocJELFMXgdKsguHqyYJGkwAof7yOdzEZwWXfdqUJbLXJxw9OuOk=s96-c",
      "balance": 7424,
      "bonus": 0,
      "status": "suspended",
      "isAgent": true,
      "agentBalance": 610000,
      "transactions": [
        { "type": "هدية التسجيل", "amount": 5000 },
        { "type": "إضافة رصيد", "amount": 555555 },
        { "type": "تصفير الرصيد", "amount": 0 },
        { "type": "إضافة رصيد", "amount": 52424 },
        { "type": "شحن كوينز وكيل (من الإدارة)", "amount": 5000 },
        { "type": "شحن كوينز وكيل (من الإدارة)", "amount": 50000 },
        { "type": "شحن رصيد وكالة (من الإدارة)", "amount": 5000 },
        { "type": "شحن رصيد وكالة (من الإدارة)", "amount": 500000 },
        { "type": "تحويل كوينز إلى لاعب (Master Msuodi)", "amount": -50000 },
        { "type": "سحب سريع", "amount": -50000 },
        { "type": "شحن رصيد وكالة (من الإدارة)", "amount": 50000 },
        { "type": "خصم رصيد", "amount": -50000 },
        { "type": "شراء كوينز من لاعب (Master Msuodi)", "amount": 5000 },
        { "type": "شراء كوينز من لاعب (Master Msuodi)", "amount": 50000 },
        { "type": "شراء كوينز من لاعب (Master Msuodi)", "amount": 50000 }
      ]
    },
    {
      "id": "303725",
      "name": "Master Msuodi",
      "email": "engyhamid860@gmail.com",
      "balance": 5000,
      "bonus": 500,
      "status": "active",
      "transactions": [
        { "type": "هدية التسجيل", "amount": 5000 },
        { "type": "شحن من الوكيل (Halil Farhat)", "amount": 50000 },
        { "type": "بيع كوينز للوكيل (خالد)", "amount": -5000 },
        { "type": "سحب سريع", "amount": 5000 },
        { "type": "بيع كوينز للوكيل (خالد)", "amount": -50000 },
        { "type": "سحب سريع", "amount": 50000 },
        { "type": "بيع كوينز للوكيل (خالد)", "amount": -50000 }
      ]
    },
    {
      "id": "127761",
      "name": "PartyU customers service",
      "email": "management135790@gmail.com",
      "balance": 5000,
      "bonus": 500,
      "status": "active",
      "transactions": [
        { "type": "هدية التسجيل", "amount": 5000 }
      ]
    },
    {
      "id": "840624",
      "name": "الامبرا طور",
      "email": "hyhyfarhad12369@gmail.com",
      "photoUrl": "https://lh3.googleusercontent.com/a/ACg8ocKd6RA_rxaHYSoeAvtWz0V3KoF_awiP8huPcKR9GPoWTvHUKWw=s96-c",
      "balance": 5000,
      "bonus": 500,
      "status": "active",
      "transactions": [
        { "type": "هدية التسجيل", "amount": 5000 }
      ]
    }
  ],
  "admins": [
    {
      "id": "admin-1",
      "username": "admin",
      "displayName": "المشرف العام",
      "passwordHash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
      "role": "superadmin",
      "createdAt": "2026-07-05"
    }
  ]
};

async function uploadLocalFile(localPath, destName) {
  const imagesDir = resolve(__dirname, '..', 'images');
  const filePath = resolve(imagesDir, localPath.replace('images/', ''));
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File does not exist: ${filePath}, skipping upload.`);
    return null;
  }
  
  console.log(`Uploading ${localPath} to Supabase Storage...`);
  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine mime type
  const ext = localPath.split('.').pop() || 'png';
  let mimeType = 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'webp') mimeType = 'image/webp';
  
  const { data, error } = await supabase.storage
    .from('images')
    .upload(destName, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });
    
  if (error) {
    console.error(`Failed to upload ${localPath}:`, error);
    return null;
  }
  
  const { data: urlData } = supabase.storage.from('images').getPublicUrl(destName);
  console.log(`Uploaded successfully! CDN URL: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

async function restore() {
  console.log("Starting full database and media restoration...");
  
  // Ensure storage bucket images exists
  await supabase.storage.createBucket('images', { public: true }).catch(() => {});
  
  // 1. Upload banners and games images to Supabase Storage
  console.log("\n--- 1. Uploading Banners Images ---");
  for (const b of dbBackup.banners) {
    if (b.image && b.image.startsWith('images/')) {
      const destName = `banner_${b.id}.${b.image.split('.').pop()}`;
      const cdnUrl = await uploadLocalFile(b.image, destName);
      if (cdnUrl) b.image = cdnUrl;
    }
  }
  
  console.log("\n--- 2. Uploading Games Images ---");
  for (const g of dbBackup.games) {
    if (g.image && g.image.startsWith('images/')) {
      const destName = `game_${g.id}.${g.image.split('.').pop()}`;
      const cdnUrl = await uploadLocalFile(g.image, destName);
      if (cdnUrl) g.image = cdnUrl;
    }
  }
  
  // 2. Clear current database records
  console.log("\n--- 3. Clearing old Supabase records ---");
  await supabase.from('banners').delete().neq('id', 'placeholder');
  await supabase.from('agents').delete().neq('id', 'placeholder');
  await supabase.from('games').delete().neq('id', 'placeholder');
  await supabase.from('transactions').delete().neq('id', 'placeholder');
  await supabase.from('players').delete().neq('id', 'placeholder');
  await supabase.from('admins').delete().neq('id', 'placeholder');
  
  // 3. Insert Settings
  console.log("\n--- 4. Restoring Settings ---");
  await supabase.from('settings').upsert({
    key: 'global',
    enable_preview: dbBackup.settings.enablePreview,
    show_balance: dbBackup.settings.showBalance,
    show_live_badge: dbBackup.settings.showLiveBadge,
    play_button_text: dbBackup.settings.playButtonText,
    coin_buy_rate: dbBackup.settings.coinBuyRate,
    coin_sell_rate: dbBackup.settings.coinSellRate
  });
  
  // 4. Insert Banners
  console.log("\n--- 5. Restoring Banners ---");
  for (const b of dbBackup.banners) {
    await supabase.from('banners').insert({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      badge: b.badge,
      icon: b.icon,
      image: b.image,
      theme: b.theme
    });
  }
  
  // 5. Insert Games
  console.log("\n--- 6. Restoring Games ---");
  for (const g of dbBackup.games) {
    await supabase.from('games').insert({
      id: g.id,
      title: g.title,
      category: g.category,
      provider: g.provider,
      launch_url: g.launchUrl,
      image: g.image
    });
  }
  
  // 6. Insert Players and Transactions
  console.log("\n--- 7. Restoring Players & Transactions ---");
  for (const p of dbBackup.players) {
    await supabase.from('players').insert({
      id: p.id,
      name: p.name,
      email: p.email,
      photo_url: p.photoUrl,
      balance: p.balance,
      bonus: p.bonus,
      status: p.status,
      is_agent: p.isAgent || false,
      agent_balance: p.agentBalance || 0
    });
    
    if (p.transactions && p.transactions.length > 0) {
      for (const t of p.transactions) {
        await supabase.from('transactions').insert({
          player_id: p.id,
          type: t.type,
          amount: t.amount.toString()
        });
      }
    }
  }
  
  // 7. Insert Agents
  console.log("\n--- 8. Restoring Agents ---");
  for (const a of dbBackup.agents) {
    await supabase.from('agents').insert({
      id: a.id,
      name: a.name,
      country: a.country,
      phone: a.phone,
      payment_methods: a.paymentMethods,
      rate: a.rate,
      player_id: a.playerId
    });
  }
  
  // 8. Insert Admins
  console.log("\n--- 9. Restoring Admins ---");
  for (const admin of dbBackup.admins) {
    await supabase.from('admins').insert({
      id: admin.id,
      username: admin.username,
      display_name: admin.displayName,
      password_hash: admin.passwordHash,
      role: admin.role
    });
  }
  
  console.log("\n✅ Database and media successfully restored to Supabase!");
}

restore();
