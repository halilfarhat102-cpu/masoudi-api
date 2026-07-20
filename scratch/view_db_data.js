import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function view() {
  console.log("=== DB DATA FETCH ===");
  
  const { data: settings } = await supabase.from('settings').select('*');
  console.log("Settings count:", settings?.length, settings);
  
  const { data: banners } = await supabase.from('banners').select('*');
  console.log("Banners count:", banners?.length, banners);
  
  const { data: agents } = await supabase.from('agents').select('*');
  console.log("Agents count:", agents?.length, agents);
  
  const { data: games } = await supabase.from('games').select('*');
  console.log("Games count:", games?.length, games);
}

view();
