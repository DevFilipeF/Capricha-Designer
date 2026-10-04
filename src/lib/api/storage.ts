import { supabase } from '@/integrations/supabase/client';

export async function downloadFile(bucket: string, path: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return await data.arrayBuffer();
}

export async function signedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
