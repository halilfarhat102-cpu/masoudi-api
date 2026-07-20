import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Copying updated game assets from public/games/bigfarm to masoudi_app/assets/game...");

    const srcAppJs = resolve('public/games/bigfarm/app.js');
    const destAppJs = resolve('masoudi_app/assets/game/app.js');

    const srcGameHtml = resolve('public/games/bigfarm/game.html');
    const destGameHtml = resolve('masoudi_app/assets/game/game.html');

    const srcStyleCss = resolve('public/games/bigfarm/style.css');
    const destStyleCss = resolve('masoudi_app/assets/game/style.css');

    try {
        fs.copyFileSync(srcAppJs, destAppJs);
        console.log("SUCCESS: Copied app.js to Flutter assets!");
        
        fs.copyFileSync(srcGameHtml, destGameHtml);
        console.log("SUCCESS: Copied game.html to Flutter assets!");

        fs.copyFileSync(srcStyleCss, destStyleCss);
        console.log("SUCCESS: Copied style.css to Flutter assets!");
    } catch (e) {
        console.error("Failed to copy assets:", e);
    }
}

main();
