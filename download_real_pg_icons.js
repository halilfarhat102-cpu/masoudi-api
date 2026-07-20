import fs from 'fs';
import path from 'path';

const games = [
  { code: '126', name: 'fortune_tiger' },
  { code: '95', name: 'fortune_ox' },
  { code: '65', name: 'mahjong_ways' },
  { code: '74', name: 'mahjong_ways_2' },
  { code: '98', name: 'ganesha_gold' },
  { code: '35', name: 'ganesha_gold_35' }
];

const candidateUrlPatterns = [
  (code) => `https://static.pgsoft-games.com/images/games/icons/${code}.png`,
  (code) => `https://www.pgsoft.com/uploads/games/${code}/icon.png`,
  (code) => `https://m.eajzzxhro.com/${code}/images/icon.png`,
  (code) => `https://m.eajzzxhro.com/${code}/icon.png`,
  (code) => `https://www.pgsoft.com/static/images/games/icons/${code}.png`,
  (code) => `https://www.pgsoft.com/static/images/games/icons/square/${code}.png`
];

const outputDir = 'c:/Users/Nitro i5-7300HQ/Downloads/العاب/images';

async function downloadIcons() {
  console.log("Searching and downloading official PG Soft game icons...");
  
  for (const game of games) {
    let downloaded = false;
    for (const patternFn of candidateUrlPatterns) {
      const url = patternFn(game.code);
      try {
        const res = await fetch(url);
        if (res.ok && res.headers.get('content-type')?.includes('image')) {
          const buffer = await res.arrayBuffer();
          const targetPath = path.join(outputDir, `${game.name}_real.png`);
          fs.writeFileSync(targetPath, Buffer.from(buffer));
          console.log(`✓ SUCCESS: Downloaded real icon for [${game.name}] (Code ${game.code}) from ${url}`);
          downloaded = true;
          break;
        }
      } catch (e) {}
    }
    if (!downloaded) {
      console.log(`x Could not fetch direct CDN icon for [${game.name}] (Code ${game.code})`);
    }
  }
}

downloadIcons();
