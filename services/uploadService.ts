import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Support both SERVICE_KEY (preferred for storage uploads) and ANON_KEY as fallback
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Compression settings
const MAX_WIDTH = 2048;
const MAX_HEIGHT = 2048;
const JPEG_QUALITY = 0.85;

/**
 * Compresses an image by resizing and converting to JPEG
 * @param base64Image - Original base64 image data URL
 * @returns Promise with compressed base64 data URL
 */
async function compressImage(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality setting
        const compressedDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        // Log compression ratio
        const originalSize = base64Image.length;
        const compressedSize = compressedDataUrl.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(`Image compressed: ${ratio}% reduction (${Math.round(originalSize/1024)}KB -> ${Math.round(compressedSize/1024)}KB)`);

        resolve(compressedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = base64Image;
  });
}

export async function uploadImage(base64Image: string, userId: string): Promise<string> {
  if (!supabase) {
    console.warn('Supabase not configured. Returning base64 image as fallback.');
    return base64Image;
  }

  // Compress image before upload
  let imageToUpload = base64Image;
  try {
    imageToUpload = await compressImage(base64Image);
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
  }

  // Extract base64 data and mime type
  const matches = imageToUpload.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  // Convert base64 to Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Generate unique filename
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `${userId}/${Date.now()}.${extension}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('project-images')
    .upload(filename, blob, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('project-images')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}
