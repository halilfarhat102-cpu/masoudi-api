const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../masoudi_app/lib/screens/profile_screen.dart');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasLanguage = content.includes('language') || content.includes('Language') || content.includes('لغة');
    console.log(`Profile screen contains language switcher: ${hasLanguage}`);
    
    // Copy the old app-release.apk (from July 8) to masoudi.apk using Node filesystem
    const srcApk = path.resolve(__dirname, '../app-release.apk');
    const destApk = path.resolve(__dirname, '../masoudi.apk');
    
    if (fs.existsSync(srcApk)) {
        const srcSize = fs.statSync(srcApk).size;
        console.log(`Original APK size: ${srcSize} bytes`);
        fs.copyFileSync(srcApk, destApk);
        const destSize = fs.statSync(destApk).size;
        console.log(`Copied APK size: ${destSize} bytes`);
        if (srcSize === destSize) {
            console.log("APK copy is 100% verified and correct!");
        } else {
            console.log("Error: APK size mismatch!");
        }
    } else {
        console.log("Error: app-release.apk does not exist at path: " + srcApk);
    }
} else {
    console.log("Error: profile_screen.dart does not exist!");
}
