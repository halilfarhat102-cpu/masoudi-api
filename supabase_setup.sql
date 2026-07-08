-- 1. جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY DEFAULT 'global',
    enable_preview BOOLEAN DEFAULT false,
    show_balance BOOLEAN DEFAULT false,
    show_live_badge BOOLEAN DEFAULT false,
    play_button_text TEXT DEFAULT 'العب الآن',
    coin_buy_rate INTEGER DEFAULT 10000,
    coin_sell_rate INTEGER DEFAULT 20000
);

-- إدخال الإعدادات الافتراضية
INSERT INTO settings (key) VALUES ('global') ON CONFLICT DO NOTHING;

-- 2. جدول اللاعبين
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    photo_url TEXT,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    bonus NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active',
    is_agent BOOLEAN DEFAULT false,
    agent_balance NUMERIC(15, 2) DEFAULT 0.00,
    session_token TEXT,
    session_created_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN DEFAULT false,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول العمليات الماليّة
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount TEXT NOT NULL,
    tx_id TEXT,
    ref TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'ناجحة'
);

-- 4. جدول الوكلاء
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT NOT NULL,
    payment_methods TEXT NOT NULL,
    rate TEXT NOT NULL,
    player_id TEXT
);

-- 5. جدول الألعاب
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    provider TEXT,
    launch_url TEXT NOT NULL,
    image TEXT NOT NULL
);

-- 6. جدول البنرات الإعلانية
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title TEXT,
    subtitle TEXT,
    badge TEXT,
    icon TEXT,
    image TEXT NOT NULL,
    theme TEXT DEFAULT 'orange'
);

-- 7. جدول المشرفين (Admins)
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدخال مشرف افتراضي (اسم المستخدم: admin، كلمة المرور: admin123)
-- كلمة المرور مشفرة بـ SHA256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO admins (id, username, display_name, password_hash, role) 
VALUES ('admin-default', 'admin', 'المشرف العام', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'superadmin')
ON CONFLICT (username) DO NOTHING;
