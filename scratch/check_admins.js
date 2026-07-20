import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function run() {
  // 1. Get all admins
  const { data: admins, error } = await supabase.from('admins').select('*');
  if (error) {
    console.error("Error fetching admins:", error);
    return;
  }
  console.log("Current Admins:", admins);

  // 2. Insert or update a clean admin with password 'admin123'
  const newHash = sha256('admin123');
  console.log("Calculated hash for admin123:", newHash);

  const { data: upsertData, error: upsertError } = await supabase.from('admins').upsert({
    id: 'admin-default',
    username: 'admin',
    display_name: 'المشرف العام',
    password_hash: newHash,
    role: 'superadmin'
  });

  if (upsertError) {
    console.error("Error upserting admin:", upsertError);
  } else {
    console.log("Successfully upserted admin with password 'admin123'");
  }
}

run();
