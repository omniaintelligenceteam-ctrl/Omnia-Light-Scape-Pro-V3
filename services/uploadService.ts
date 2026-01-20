import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function uploadImage(base64Image: string, userId: string): Promise<string> {
  // Extract base64 data and mime type
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
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
  const { data, error } = await supabase.storage
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
