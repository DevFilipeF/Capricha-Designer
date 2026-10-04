import { supabase } from '@/integrations/supabase/client';
import { downloadFile, arrayBufferToBase64 } from './storage';

export interface FontRow {
  id: string;
  display_name: string;
  family_name: string | null;
  subfamily_name: string | null;
  postscript_name: string | null;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  sha256: string;
  weight: number;
  style: string;
  status: string;
  validation_error: string | null;
  license_confirmed: boolean;
  created_at: string;
}

export async function listFonts(): Promise<FontRow[]> {
  const { data, error } = await supabase
    .from('fonts')
    .select('*')
    .order('display_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FontRow[];
}

export async function getFontFile(f: Pick<FontRow, 'storage_path'>) {
  return downloadFile('fonts', f.storage_path);
}

export async function uploadFont(params: {
  displayName: string;
  file: File | Blob;
  filename: string;
  licenseConfirmed: boolean;
}) {
  const buf = await params.file.arrayBuffer();
  if (buf.byteLength > 10 * 1024 * 1024) throw new Error('Fonte acima de 10 MB');

  const { data, error } = await supabase.functions.invoke('validate-font', {
    body: {
      displayName: params.displayName,
      filename: params.filename,
      fileBase64: arrayBufferToBase64(buf),
      licenseConfirmed: params.licenseConfirmed,
    },
  });
  if (error) {
    const msg = (data as any)?.error ?? error.message;
    throw new Error(typeof msg === 'string' ? msg : 'Falha ao validar fonte');
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).font as FontRow;
}

export async function deleteFont(f: FontRow) {
  await supabase.storage.from('fonts').remove([f.storage_path]);
  const { error } = await supabase.from('fonts').delete().eq('id', f.id);
  if (error) throw error;
}

const loadedFaces = new Map<string, string>();

/** Registra a fonte no navegador e devolve o nome da família CSS. */
export async function ensureFontFace(font: FontRow): Promise<string> {
  const cssName = `cp-font-${font.id}`;
  if (loadedFaces.has(font.id)) return cssName;
  const buf = await getFontFile(font);
  const face = new FontFace(cssName, buf);
  await face.load();
  (document as any).fonts.add(face);
  loadedFaces.set(font.id, cssName);
  return cssName;
}
