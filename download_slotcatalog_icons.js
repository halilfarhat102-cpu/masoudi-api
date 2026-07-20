import fs from 'fs';
import path from 'path';

const games = [
  { name: 'fortune_tiger', query: 'Fortune-Tiger' },
  { name: 'fortune_ox', query: 'Fortune-Ox' },
  { name: 'mahjong_ways', query: 'Mahjong-Ways' },
  { name: 'mahjong_ways_2', query: 'Mahjong-Ways-2' },
  { name: 'ganesha_gold', query: 'Ganesha-Gold' }
];

const outputDir = 'c:/Users/Nitro i5-7300HQ/Downloads/العاب/images';

async function downloadSlotCatalogIcons() {
  console.log("Downloading real official PG Soft game images from SlotCatalog...");
  
  for (const game of games) {
    // Try multiple image extensions and naming conventions
    const urls = [
      `https://slotcatalog.com/img/games/PG-Soft-${game.query}.jpg`,
      `https://slotcatalog.com/img/games/PG-Soft-${game.query}.png`,
      `https://slotcatalog.com/img/games/${game.query}.jpg`,
      `https://slotcatalog.com/img/games/PG-soft-${game.query}.jpg`
    ];

    let success = false;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok && res.headers.get('content-type')?.includes('image')) {
          const buffer = await res.arrayBuffer();
          const targetPath = path.join(outputDir, `${game.name}_real.jpg`);
          fs.writeFileSync(targetPath, Buffer.from(buffer));
          console.log(`✓ SUCCESS: Downloaded real official image for [${game.name}] -> ${targetPath}`);
          success = true;
          break;
        }
      } catch (e) {}
    }

    if (!success) {
      console.log(`x Could not fetch direct image for [${game.name}]`);
    }
  }
}

downloadSlotCatalogIcons();
