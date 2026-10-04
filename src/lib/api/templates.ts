import { supabase } from '@/integrations/supabase/client';
import { downloadFile, arrayBufferToBase64 } from './storage';
import { renderFirstPage } from '@/lib/pdfjs';

export interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  theme: string | null;
  category: string | null;
  source_file_path: string;
  thumbnail_path: string | null;
  page_count: number;
  page_width: number;
  page_height: number;
  page_rotation: number;
  status: string;
  created_at: string;
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'template';
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TemplateRow[];
}

export async function getTemplateFile(t: Pick<TemplateRow, 'source_file_path'>) {
  return downloadFile('templates', t.source_file_path);
}

async function dataUrlToBase64(dataUrl: string) {
  return dataUrl.split(',')[1];
}

/** Envia o PDF para a Edge Function `validate-template`, que valida, guarda e cadastra. */
export async function uploadTemplate(params: { name: string; file: File | Blob; filename: string }) {
  const buf = await params.file.arrayBuffer();
  if (buf.byteLength > 20 * 1024 * 1024) throw new Error('PDF acima de 20 MB');

  let thumbnailBase64: string | null = null;
  try {
    const rendered = await renderFirstPage(buf, 400, 520);
    thumbnailBase64 = await dataUrlToBase64(rendered.dataUrl);
  } catch {
    thumbnailBase64 = null;
  }

  const { data, error } = await supabase.functions.invoke('validate-template', {
    body: {
      name: params.name,
      filename: params.filename,
      fileBase64: arrayBufferToBase64(buf),
      thumbnailBase64,
    },
  });
  if (error) {
    const msg = (data as any)?.error ?? error.message;
    throw new Error(typeof msg === 'string' ? msg : 'Falha ao validar template');
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).template as TemplateRow;
}

export async function deleteTemplate(t: TemplateRow) {
  await supabase.from('presets').delete().eq('template_id', t.id);
  const paths = [t.source_file_path];
  await supabase.storage.from('templates').remove(paths);
  if (t.thumbnail_path) await supabase.storage.from('template-thumbnails').remove([t.thumbnail_path]);
  const { error } = await supabase.from('templates').delete().eq('id', t.id);
  if (error) throw error;
}
