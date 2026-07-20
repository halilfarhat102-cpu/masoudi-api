const fs = require('fs');
const path = require('path');

const srcFab = `C:\\Users\\Nitro i5-7300HQ\\.gemini\\antigravity\\brain\\18c8a8d5-163d-4a0e-a806-d5723b734dcc\\fox_fab_mascot_1784077073072.png`;
const srcLogin = `C:\\Users\\Nitro i5-7300HQ\\.gemini\\antigravity\\brain\\18c8a8d5-163d-4a0e-a806-d5723b734dcc\\fox_login_mascot_1784077083203.png`;
const srcSplash = `C:\\Users\\Nitro i5-7300HQ\\.gemini\\antigravity\\brain\\18c8a8d5-163d-4a0e-a806-d5723b734dcc\\fox_splash_mascot_1784077093427.png`;

const destFlutterDir = path.resolve(__dirname, '../masoudi_app/assets/images');
const destWebDir = path.resolve(__dirname, '../images');

// Create directories if not exist
if (!fs.existsSync(destFlutterDir)) {
    fs.mkdirSync(destFlutterDir, { recursive: true });
}
if (!fs.existsSync(destWebDir)) {
    fs.mkdirSync(destWebDir, { recursive: true });
}

// Copy to Flutter
fs.copyFileSync(srcFab, path.join(destFlutterDir, 'fox_fab.png'));
fs.copyFileSync(srcLogin, path.join(destFlutterDir, 'fox_login.png'));
fs.copyFileSync(srcSplash, path.join(destFlutterDir, 'fox_mascot.png'));
console.log("Copied mascots to Flutter assets/images/");

// Copy to Web
fs.copyFileSync(srcFab, path.join(destWebDir, 'fox_fab.png'));
fs.copyFileSync(srcLogin, path.join(destWebDir, 'fox_login.png'));
fs.copyFileSync(srcSplash, path.join(destWebDir, 'fox_mascot.png'));
console.log("Copied mascots to Web images/");
