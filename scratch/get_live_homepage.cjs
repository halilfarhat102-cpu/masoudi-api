const https = require('https');
const fs = require('fs');
const path = require('path');

const url = "https://masoudi-api.onrender.com/";

https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        fs.writeFileSync(path.resolve(__dirname, 'live_homepage.html'), body);
        console.log("Saved live homepage. Length:", body.length);
    });
}).on('error', (err) => {
    console.error("Error:", err);
});
