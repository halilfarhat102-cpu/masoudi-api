import fetch from 'node-fetch';

async function test() {
  console.log("Testing Base64 image upload to live Render server...");
  
  // Dummy 1x1 transparent PNG image base64
  const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  try {
    const res = await fetch("https://masoudi-api.onrender.com/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "test_dummy_cdn.png",
        fileData: dummyBase64
      })
    });
    
    const data = await res.json();
    console.log("Upload Response Status:", res.status);
    console.log("Upload Response Data:", data);
    
    if (data.success && data.url.startsWith("https://")) {
      console.log("✅ SUCCESS: Uploaded successfully and returned Supabase CDN URL!");
    } else {
      console.log("❌ FAILURE: Upload failed or returned local fallback url:", data);
    }
  } catch (e) {
    console.error("❌ ERROR: Connection failed:", e);
  }
}

test();
