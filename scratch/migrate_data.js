import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL or SUPABASE_KEY is missing from .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    const dbPath = resolve(__dirname, '..', 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.error("Error: db.json not found in root directory!");
      return;
    }

    console.log("Reading local db.json...");
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // 1. Migrate Settings
    if (db.settings) {
      console.log("Migrating settings...");
      const { error } = await supabase.from('settings').upsert({
        key: 'global',
        enable_preview: db.settings.enablePreview || false,
        show_balance: db.settings.showBalance || false,
        show_live_badge: db.settings.showLiveBadge || false,
        play_button_text: db.settings.playButtonText || 'العب الآن',
        coin_buy_rate: db.settings.coinBuyRate || 10000,
        coin_sell_rate: db.settings.coinSellRate || 20000
      });
      if (error) console.error("Error migrating settings:", error);
    }

    // 2. Migrate Banners
    if (db.banners && db.banners.length > 0) {
      console.log(`Migrating ${db.banners.length} banners...`);
      for (const b of db.banners) {
        const { error } = await supabase.from('banners').upsert({
          id: b.id,
          title: b.title || '',
          subtitle: b.subtitle || '',
          badge: b.badge || '',
          icon: b.icon || '',
          image: b.image,
          theme: b.theme || 'orange'
        });
        if (error) console.error(`Error migrating banner ${b.id}:`, error);
      }
    }

    // 3. Migrate Agents
    if (db.agents && db.agents.length > 0) {
      console.log(`Migrating ${db.agents.length} agents...`);
      for (const a of db.agents) {
        const { error } = await supabase.from('agents').upsert({
          id: a.id,
          name: a.name,
          country: a.country || a.countries?.[0] || '—',
          phone: a.phone || '',
          payment_methods: a.paymentMethods || '',
          rate: a.rate || '',
          player_id: a.playerId || null
        });
        if (error) console.error(`Error migrating agent ${a.id}:`, error);
      }
    }

    // 4. Migrate Games
    if (db.games && db.games.length > 0) {
      console.log(`Migrating ${db.games.length} games...`);
      for (const g of db.games) {
        const { error } = await supabase.from('games').upsert({
          id: g.id,
          title: g.title,
          category: g.category,
          provider: g.provider || null,
          launch_url: g.launchUrl,
          image: g.image
        });
        if (error) console.error(`Error migrating game ${g.id}:`, error);
      }
    }

    // 5. Migrate Admins
    if (db.admins && db.admins.length > 0) {
      console.log(`Migrating ${db.admins.length} admins...`);
      for (const admin of db.admins) {
        const { error } = await supabase.from('admins').upsert({
          id: admin.id,
          username: admin.username,
          display_name: admin.displayName || admin.username,
          password_hash: admin.passwordHash,
          role: admin.role || 'admin'
        });
        if (error) console.error(`Error migrating admin ${admin.username}:`, error);
      }
    }

    // Insert default superadmin just in case
    const defaultHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123
    const { error: superadminError } = await supabase.from('admins').upsert({
      id: 'admin-default',
      username: 'admin',
      display_name: 'المشرف العام',
      password_hash: defaultHash,
      role: 'superadmin'
    });
    if (superadminError) console.error("Error inserting default superadmin:", superadminError);

    // 6. Migrate Players & Transactions
    if (db.players && db.players.length > 0) {
      console.log(`Migrating ${db.players.length} players...`);
      for (const p of db.players) {
        const { error: playerError } = await supabase.from('players').upsert({
          id: p.id,
          name: p.name,
          email: p.email || '—',
          photo_url: p.photoUrl || '',
          balance: p.balance || 0,
          bonus: p.bonus || 0,
          status: p.status || 'active',
          is_agent: p.isAgent || false,
          agent_balance: p.agentBalance || 0,
          session_token: p.sessionToken || null,
          session_created_at: p.sessionCreatedAt || null,
          is_admin: p.isAdmin || false,
          join_date: p.joinDate ? new Date(p.joinDate).toISOString() : new Date().toISOString(),
          last_login: p.lastLogin ? new Date(p.lastLogin).toISOString() : new Date().toISOString()
        });

        if (playerError) {
          console.error(`Error migrating player ${p.id}:`, playerError);
          continue;
        }

        // Migrate player transactions
        if (p.transactions && p.transactions.length > 0) {
          console.log(`Migrating ${p.transactions.length} transactions for player ${p.id}...`);
          for (const tx of p.transactions) {
            let isoDate = new Date().toISOString();
            if (tx.date) {
              const timeMatch = tx.date.match(/(\d+):(\d+):(\d+)/);
              if (timeMatch) {
                const today = new Date();
                today.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), parseInt(timeMatch[3]));
                isoDate = today.toISOString();
              }
            }

            await supabase.from('transactions').insert({
              player_id: p.id,
              type: tx.type,
              amount: String(tx.amount),
              tx_id: tx.txId || null,
              ref: tx.ref || null,
              date: isoDate
            });
          }
        }
      }
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
