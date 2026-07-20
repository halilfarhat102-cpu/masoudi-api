const https = require('https');

function checkUrl(url) {
    console.log("Requesting:", url);
    https.get(url, (res) => {
        console.log("Status:", res.statusCode);
        console.log("Headers:", JSON.stringify(res.headers, null, 2));
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log("Body length:", body.length);
            console.log("Body preview:", body.substring(0, 500));
        });
    }).on('error', (err) => {
        console.error("Error:", err);
    });
}

checkUrl("https://masoudi-api.onrender.com/app.js");
