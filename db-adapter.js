import { supabase } from './supabase.js';

// Cache processed transaction IDs to avoid duplicate insertions
let processedTxCache = new Set();

export async function readDb() {
  try {
    const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'global').maybeSingle();
    const { data: banners } = await supabase.from('banners').select('*');
    const { data: agents } = await supabase.from('agents').select('*');
    const { data: games } = await supabase.from('games').select('*');
    const { data: players } = await supabase.from('players').select('*');
    const { data: transactions } = await supabase.from('transactions').select('*');
    const { data: admins } = await supabase.from('admins').select('*');

    // 1. Map Settings
    const settings = settingsData ? {
      enablePreview: settingsData.enable_preview,
      showBalance: settingsData.show_balance,
      showLiveBadge: settingsData.show_live_badge,
      playButtonText: settingsData.play_button_text,
      coinBuyRate: settingsData.coin_buy_rate,
      coinSellRate: settingsData.coin_sell_rate
    } : {
      enablePreview: false,
      showBalance: false,
      showLiveBadge: false,
      playButtonText: 'العب الآن',
      coinBuyRate: 10000,
      coinSellRate: 20000
    };

    // 2. Map Agents
    const mappedAgents = (agents || []).map(a => ({
      id: a.id,
      name: a.name,
      country: a.country,
      phone: a.phone,
      paymentMethods: a.payment_methods,
      rate: a.rate,
      playerId: a.player_id
    }));

    // 3. Map Players & Transactions
    const mappedPlayers = (players || []).map(p => {
      const playerTxs = (transactions || [])
        .filter(t => t.player_id === p.id)
        .map(t => {
          // If transaction has a tx_id, cache it
          if (t.tx_id) processedTxCache.add(t.tx_id);
          
          return {
            type: t.type,
            amount: parseFloat(t.amount) || 0,
            txId: t.tx_id || undefined,
            ref: t.ref || undefined,
            date: t.date ? new Date(t.date).toLocaleTimeString('ar') : 'الآن'
          };
        });

      return {
        id: p.id,
        name: p.name,
        email: p.email || '—',
        photoUrl: p.photo_url || '',
        balance: parseFloat(p.balance) || 0,
        bonus: parseFloat(p.bonus) || 0,
        status: p.status || 'active',
        isAgent: p.is_agent || false,
        agentBalance: parseFloat(p.agent_balance) || 0,
        sessionToken: p.session_token || undefined,
        sessionCreatedAt: p.session_created_at || undefined,
        isAdmin: p.is_admin || false,
        joinDate: p.join_date ? new Date(p.join_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        lastLogin: p.last_login ? new Date(p.last_login).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        transactions: playerTxs
      };
    });

    // 4. Map Admins
    const mappedAdmins = (admins || []).map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.display_name,
      passwordHash: a.password_hash,
      role: a.role,
      createdAt: a.created_at
    }));

    return {
      settings,
      banners: banners || [],
      agents: mappedAgents,
      games: games || [],
      players: mappedPlayers,
      admins: mappedAdmins,
      processedTxIds: Array.from(processedTxCache)
    };
  } catch (error) {
    console.error("Error reading database from Supabase:", error);
    throw error;
  }
}

export async function writeDb(db) {
  try {
    // 1. Settings
    if (db.settings) {
      await supabase.from('settings').upsert({
        key: 'global',
        enable_preview: db.settings.enablePreview,
        show_balance: db.settings.showBalance,
        show_live_badge: db.settings.showLiveBadge,
        play_button_text: db.settings.playButtonText,
        coin_buy_rate: db.settings.coinBuyRate,
        coin_sell_rate: db.settings.coinSellRate
      });
    }

    // 2. Banners
    if (db.banners) {
      const bannerIds = db.banners.map(b => b.id);
      if (bannerIds.length > 0) {
        await supabase.from('banners').delete().not('id', 'in', `(${bannerIds.map(id => `'${id}'`).join(',')})`);
      } else {
        await supabase.from('banners').delete().neq('id', 'placeholder');
      }
      for (const b of db.banners) {
        await supabase.from('banners').upsert({
          id: b.id,
          title: b.title || '',
          subtitle: b.subtitle || '',
          badge: b.badge || '',
          icon: b.icon || '',
          image: b.image,
          theme: b.theme || 'orange'
        });
      }
    }

    // 3. Agents
    if (db.agents) {
      const agentIds = db.agents.map(a => a.id);
      if (agentIds.length > 0) {
        await supabase.from('agents').delete().not('id', 'in', `(${agentIds.map(id => `'${id}'`).join(',')})`);
      } else {
        await supabase.from('agents').delete().neq('id', 'placeholder');
      }
      for (const a of db.agents) {
        await supabase.from('agents').upsert({
          id: a.id,
          name: a.name,
          country: a.country,
          phone: a.phone,
          payment_methods: a.paymentMethods,
          rate: a.rate,
          player_id: a.playerId || null
        });
      }
    }

    // 4. Games
    if (db.games) {
      const gameIds = db.games.map(g => g.id);
      if (gameIds.length > 0) {
        await supabase.from('games').delete().not('id', 'in', `(${gameIds.map(id => `'${id}'`).join(',')})`);
      } else {
        await supabase.from('games').delete().neq('id', 'placeholder');
      }
      for (const g of db.games) {
        await supabase.from('games').upsert({
          id: g.id,
          title: g.title,
          category: g.category,
          provider: g.provider || null,
          launch_url: g.launchUrl,
          image: g.image
        });
      }
    }

    // 5. Admins
    if (db.admins) {
      for (const admin of db.admins) {
        await supabase.from('admins').upsert({
          id: admin.id,
          username: admin.username,
          display_name: admin.displayName,
          password_hash: admin.passwordHash,
          role: admin.role || 'admin'
        });
      }
    }

    // 6. Players & Transactions
    if (db.players) {
      for (const p of db.players) {
        await supabase.from('players').upsert({
          id: p.id,
          name: p.name,
          email: p.email || '—',
          photo_url: p.photoUrl || '',
          balance: p.balance,
          bonus: p.bonus,
          status: p.status || 'active',
          is_agent: p.isAgent || false,
          agent_balance: p.agentBalance || 0,
          session_token: p.sessionToken || null,
          session_created_at: p.sessionCreatedAt || null,
          is_admin: p.isAdmin || false,
          join_date: p.joinDate || new Date().toISOString(),
          last_login: p.lastLogin || new Date().toISOString()
        });

        if (p.transactions && p.transactions.length > 0) {
          // Fetch existing transaction counts for this player
          const { data: dbTxs } = await supabase.from('transactions').select('tx_id, type, amount').eq('player_id', p.id);
          const dbTxCount = dbTxs ? dbTxs.length : 0;

          // If local transactions array has more items than database, insert the new ones
          if (p.transactions.length > dbTxCount) {
            const newTxs = p.transactions.slice(dbTxCount);
            for (const tx of newTxs) {
              // Ensure we don't insert duplicate transaction ids if present
              if (tx.txId && processedTxCache.has(tx.txId)) {
                continue;
              }

              if (tx.txId) processedTxCache.add(tx.txId);

              // Normalize date
              let isoDate = new Date().toISOString();
              if (tx.date) {
                // If it's a simple local time string, format it today
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
    }
  } catch (error) {
    console.error("Error writing database to Supabase:", error);
    throw error;
  }
}
