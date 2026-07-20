import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  console.log("Testing Supabase Storage...");
  try {
    // List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("List buckets error:", listError);
    } else {
      console.log("Buckets:", buckets);
    }

    // Try to create a bucket named 'images' if it doesn't exist
    const hasImages = buckets?.some(b => b.name === 'images');
    if (!hasImages) {
      console.log("Creating 'images' bucket...");
      const { data: createData, error: createError } = await supabase.storage.createBucket('images', {
        public: true
      });
      if (createError) {
        console.error("Create bucket error:", createError);
      } else {
        console.log("Bucket created:", createData);
      }
    }

    // Try to upload a test file
    console.log("Uploading test file...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload('test.txt', Buffer.from('hello world'), {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error("Upload file error:", uploadError);
    } else {
      console.log("Upload success:", uploadData);
      const { data: urlData } = supabase.storage.from('images').getPublicUrl('test.txt');
      console.log("Public URL:", urlData.publicUrl);
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}

test();
