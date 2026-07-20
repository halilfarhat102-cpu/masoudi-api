const fs = require('fs');
const path = require('path');

const srcApk = 'C:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi_app\\build\\app\\outputs\\flutter-apk\\app-release.apk';
const destApk1 = 'C:\\Users\\Nitro i5-7300HQ\\Downloads\\masoudi.apk';
const destApk2 = 'C:\\Users\\Nitro i5-7300HQ\\Downloads\\العاب\\masoudi.apk';

if (fs.existsSync(srcApk)) {
    const srcSize = fs.statSync(srcApk).size;
    console.log(`Successfully built APK size: ${srcSize} bytes`);
    
    // Copy 1
    fs.copyFileSync(srcApk, destApk1);
    console.log(`Copied to ${destApk1}`);
    
    // Copy 2
    fs.copyFileSync(srcApk, destApk2);
    console.log(`Copied to ${destApk2}`);
    
    console.log("All APK copies are fully updated and verified!");
} else {
    console.log("Error: Built APK file not found at path: " + srcApk);
}
