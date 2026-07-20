import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://raivprjvcmvzmagdcwru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhaXZwcmp2Y212em1hZ2Rjd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mzg4MDAsImV4cCI6MjA5OTExNDgwMH0.JrVPG9ivVdZiHQm5hZ-uQfiRV38JSJMMG91HmIvrbSQ'
);

async function main() {
  // Step 1: Download current db.json from Supabase Storage
  console.log('Downloading db.json from Supabase Storage...');
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('images')
    .download('db.json');
  
  if (downloadError) {
    console.error('Download error:', downloadError.message);
    process.exit(1);
  }
  
  const text = await downloadData.text();
  const db = JSON.parse(text);
  
  console.log('Current isProduction:', db.settings?.pgConfig?.isProduction);
  console.log('Current currency:', db.settings?.pgConfig?.currency);
  
  // Step 2: Fix isProduction to false
  if (!db.settings) db.settings = {};
  if (!db.settings.pgConfig) db.settings.pgConfig = {};
  
  db.settings.pgConfig.isProduction = false;
  if (!db.settings.pgConfig.currency) db.settings.pgConfig.currency = 'USD';
  if (!db.settings.pgConfig.stagingOperatorToken) {
    db.settings.pgConfig.stagingOperatorToken = 'I-6c19673883aa410b98d1c0cb1a3c5edc';
  }
  if (!db.settings.pgConfig.stagingSecretKey) {
    db.settings.pgConfig.stagingSecretKey = 'c89632307f734f6192fa420864a2c847';
  }
  
  console.log('Fixed pgConfig:', JSON.stringify(db.settings.pgConfig, null, 2));
  
  // Step 3: Save locally
  fs.writeFileSync('c:/Users/Nitro i5-7300HQ/Downloads/العاب/db.json', JSON.stringify(db, null, 2), 'utf-8');
  console.log('Saved locally to db.json');
  
  // Step 4: Upload fixed db.json back to Supabase Storage
  const jsonStr = JSON.stringify(db, null, 2);
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload('db.json', Buffer.from(jsonStr), {
      contentType: 'application/json',
      upsert: true
    });
  
  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    process.exit(1);
  }
  
  console.log('✅ SUCCESS: db.json fixed on Supabase Storage! isProduction = false');
  console.log('The live Render server will use the correct Staging domain on next request.');
}

main().catch(console.error);
