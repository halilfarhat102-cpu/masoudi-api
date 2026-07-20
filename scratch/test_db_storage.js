import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  console.log("Testing JSON read/write to Supabase Storage...");
  try {
    const testData = { name: "test_db", timestamp: Date.now() };
    
    // Upload JSON
    console.log("Uploading JSON...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload('db_test.json', Buffer.from(JSON.stringify(testData, null, 2)), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      return console.error("Upload error:", uploadError);
    }
    console.log("Upload success:", uploadData);

    // Download JSON
    console.log("Downloading JSON...");
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('images')
      .download('db_test.json');

    if (downloadError) {
      return console.error("Download error:", downloadError);
    }
    
    const text = await downloadData.text();
    console.log("Downloaded text:", text);
    console.log("Parsed JSON:", JSON.parse(text));
  } catch (e) {
    console.error("Exception:", e);
  }
}

test();
