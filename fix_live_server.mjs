import https from 'https';
import fs from 'fs';

// This script will:
// 1. Download the current live DB from /api/data
// 2. Fix isProduction to false
// 3. Push it back via POST /api/data (which saves to Supabase AND local file)

async function fix() {
  const SERVER = 'masoudi-api.onrender.com';
  
  console.log('Step 1: Getting current live DB from Render...');
  const getResult = await new Promise((resolve) => {
    https.get(`https://${SERVER}/api/data`, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(body) }); }
        catch(e) { resolve({ ok: false, text: body.substring(0, 200) }); }
      });
    }).on('error', e => resolve({ ok: false, error: e.message }));
  });

  if (!getResult.ok) {
    console.error('Failed to get DB:', getResult.error || getResult.text);
    return;
  }

  const db = getResult.data;
  console.log('Current isProduction:', db.settings?.pgConfig?.isProduction);
  console.log('Current currency:', db.settings?.pgConfig?.currency);
  
  // Fix isProduction
  if (!db.settings) db.settings = {};
  if (!db.settings.pgConfig) db.settings.pgConfig = {};
  db.settings.pgConfig.isProduction = false;
  if (!db.settings.pgConfig.currency) db.settings.pgConfig.currency = 'USD';
  
  console.log('\nStep 2: Pushing fixed DB back to Render (will update both local file and Supabase)...');
  
  const postBody = JSON.stringify(db);
  const postResult = await new Promise((resolve) => {
    const req = https.request({
      hostname: SERVER,
      path: '/api/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, text: body }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(postBody);
    req.end();
  });
  
  console.log('POST /api/data result:', postResult.status, JSON.stringify(postResult.data || postResult.text));
  
  // Step 3: Verify the fix took effect
  console.log('\nStep 3: Verifying fix on live server...');
  await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
  
  const verifyResult = await new Promise((resolve) => {
    https.get(`https://${SERVER}/api/data`, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve(null); }
      });
    }).on('error', e => resolve(null));
  });
  
  const liveIsProd = verifyResult?.settings?.pgConfig?.isProduction;
  console.log('Live isProduction after fix:', liveIsProd);
  
  if (liveIsProd === false) {
    console.log('\n✅ SUCCESS! isProduction = false on live server!');
    
    // Step 4: Test game launch
    console.log('\nStep 4: Testing game launch...');
    const launchTest = await new Promise((resolve) => {
      https.get(`https://${SERVER}/api/pg/launch?player_id=519997&game_code=126`, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode, size: body.length, body }));
      }).on('error', e => resolve({ error: e.message }));
    });
    
    console.log('Launch status:', launchTest.status, '| Size:', launchTest.size, 'bytes');
    if (launchTest.body?.includes('ENOTFOUND')) {
      console.log('❌ STILL USING WRONG DOMAIN');
    } else if (launchTest.body?.includes('fetch failed')) {
      console.log('❌ fetch failed - server may need restart');
      console.log('Response:', launchTest.body.substring(0, 200));
    } else if (launchTest.size > 10000) {
      console.log('✅ Game launch working! Large HTML returned.');
    } else {
      console.log('Response:', launchTest.body?.substring(0, 300));
    }
  } else {
    console.log('❌ Fix did not take effect. isProduction still:', liveIsProd);
  }
  
  // Save corrected db locally
  fs.writeFileSync('c:/Users/Nitro i5-7300HQ/Downloads/العاب/db.json', JSON.stringify(db, null, 2));
  console.log('\nLocal db.json updated.');
}

fix().catch(console.error);
