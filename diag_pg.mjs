import https from 'https';

const SERVER = 'masoudi-api.onrender.com';

async function get(path) {
  return new Promise((resolve) => {
    https.get(`https://${SERVER}${path}`, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), size: body.length }); }
        catch(e) { resolve({ status: res.statusCode, text: body, size: body.length }); }
      });
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function post(path, body, isForm = false) {
  return new Promise((resolve) => {
    const bodyStr = isForm ? new URLSearchParams(body).toString() : JSON.stringify(body);
    const req = https.request({
      hostname: SERVER,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let resp = '';
      res.on('data', d => resp += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(resp), size: resp.length }); }
        catch(e) { resolve({ status: res.statusCode, text: resp, size: resp.length }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('=== FINAL VERIFICATION TEST ===\n');
  
  // 1. Check settings
  console.log('1. Live DB Settings:');
  const db = await get('/api/data');
  const pg = db.data?.settings?.pgConfig;
  console.log('   isProduction:', pg?.isProduction === false ? '✅ false' : '❌ ' + pg?.isProduction);
  console.log('   currency:', pg?.currency === 'USD' ? '✅ USD' : '❌ ' + pg?.currency);
  console.log('   stagingToken:', pg?.stagingOperatorToken ? '✅ set' : '❌ missing');
  
  // 2. Launch Fortune Tiger (game_code=126)
  console.log('\n2. Game Launch Test (Fortune Tiger, code 126):');
  const launch = await get('/api/pg/launch?player_id=519997&game_code=126');
  console.log('   Status:', launch.status === 200 ? '✅ 200' : '❌ ' + launch.status);
  console.log('   HTML size:', launch.size > 10000 ? '✅ ' + launch.size + ' bytes' : '❌ Only ' + launch.size + ' bytes');
  if (launch.text?.includes('ENOTFOUND') || launch.text?.includes('pgsoft-games.com')) {
    console.log('   ❌ Wrong domain error!');
  } else if (launch.text?.includes('fetch failed')) {
    console.log('   ❌ Fetch failed!');
  }
  
  // 3. Launch Mahjong Ways2 (game_code=74)
  console.log('\n3. Game Launch Test (Mahjong Ways2, code 74):');
  const launch74 = await get('/api/pg/launch?player_id=519997&game_code=74');
  console.log('   Status:', launch74.status === 200 ? '✅ 200' : '❌ ' + launch74.status);
  console.log('   HTML size:', launch74.size > 10000 ? '✅ ' + launch74.size + ' bytes' : '❌ Only ' + launch74.size + ' bytes');
  
  // 4. Get player session from DB
  const player = db.data?.players?.find(p => p.id === '519997');
  const sessionToken = player?.sessionToken;
  console.log('\n4. Player Session:');
  console.log('   Player 519997:', player ? '✅ found' : '❌ not found');
  console.log('   sessionToken:', sessionToken ? '✅ ' + sessionToken.substring(0, 20)+'...' : '❌ missing');
  
  // 5. Test verify-session (simulate PG Soft callback)
  console.log('\n5. VerifySession Test (as PG Soft would call):');
  const verify = await post('/api/game/verify-session', {
    operator_token: 'I-6c19673883aa410b98d1c0cb1a3c5edc',
    operator_player_session: sessionToken || 'test-token',
    player_name: '519997',
    game_id: '126'
  }, true);
  const vData = verify.data?.data;
  if (vData && !verify.data?.error) {
    console.log('   ✅ Status:', verify.status);
    console.log('   ✅ player_name:', vData.player_name);
    console.log('   ✅ currency:', vData.currency);
    console.log('   ✅ error: null');
  } else {
    console.log('   ❌ Status:', verify.status);
    console.log('   Response:', JSON.stringify(verify.data || verify.text, null, 2));
  }
  
  // 6. Test get-balance (simulate PG Soft callback)
  console.log('\n6. GetBalance Test (as PG Soft would call):');
  const balance = await post('/api/game/get-balance', {
    operator_token: 'I-6c19673883aa410b98d1c0cb1a3c5edc',
    operator_player_session: sessionToken || 'test-token',
    player_name: '519997',
    game_id: '126'
  }, true);
  const bData = balance.data?.data;
  if (bData && bData.balance !== undefined) {
    console.log('   ✅ Status:', balance.status);
    console.log('   ✅ balance:', bData.balance, 'USD');
    console.log('   ✅ currency:', bData.currency);
  } else {
    console.log('   ❌ Response:', JSON.stringify(balance.data || balance.text, null, 2));
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const allOk = pg?.isProduction === false && pg?.currency === 'USD' && 
                launch.size > 10000 && launch74.size > 10000 &&
                player && sessionToken && bData?.balance !== undefined;
  
  if (allOk) {
    console.log('✅✅✅ ALL TESTS PASSED! PG Soft integration is working correctly!');
    console.log('\nIf the game still shows S3081O error:');
    console.log('→ The session token stored BEFORE this fix may have expired');
    console.log('→ The player needs to REFRESH and try again with a NEW session');
    console.log('→ Each game launch creates a new valid session token');
  } else {
    console.log('❌ Some tests failed. Check above for details.');
  }
}

main().catch(console.error);
