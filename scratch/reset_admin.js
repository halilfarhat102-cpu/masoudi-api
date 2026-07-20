import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  // Set password to 'admin123'
  const newHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  
  const { data, error } = await supabase
    .from('admins')
    .update({ password_hash: newHash })
    .eq('username', 'admin');
    
  if (error) {
    console.error("Error updating admin password:", error);
  } else {
    console.log("Successfully updated admin password to 'admin123' in Supabase!");
  }
}

reset();
