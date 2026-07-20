import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log("Cleaning up test game...");
  const { error } = await supabase.from('games').delete().eq('id', 'test-game-123');
  console.log("Cleanup Error:", error);
}

clean();
