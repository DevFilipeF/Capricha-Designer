import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { requireAdmin, base64ToBytes } from '../_shared/admin.ts';

const MAX_BYTES = 20 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function slugify(input: string) {
  return (
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'template'
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const admin = auth.admin;

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? '').trim();
    const filename = String(body?.filename ?? '').trim();
    const fileBase64 = body?.fileBase64;
    const thumbnailBase64 = body?.thumbnailBase64;

    if (!name || name.length > 120) return json({ error: 'Nome do template inválido' }, 400);
    if (!filename || typeof fileBase64 !== 'string') return json({ error: 'Arquivo ausente' }, 400);
    if (!/\.pdf$/i.test(filename)) return json({ error: 'Somente arquivos .pdf são aceitos' }, 400);

    const bytes = base64ToBytes(fileBase64);
    if (bytes.byteLength === 0) return json({ error: 'Arquivo vazio' }, 400);
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'PDF acima de 20 MB' }, 400);
    if (String.fromCharCode(...bytes.subarray(0, 4)) !== '%PDF') {
      return json({ error: 'Arquivo não é um PDF válido' }, 400);
    }

    let pdf: any;
    try {
      pdf = await PDFDocument.load(bytes.slice().buffer as ArrayBuffer, { ignoreEncryption: false });
    } catch (_e) {
      return json({ error: 'Não foi possível abrir o PDF (corrompido ou protegido)' }, 400);
    }

    const pageCount = pdf.getPageCount();
    if (pageCount < 1) return json({ error: 'PDF sem páginas' }, 400);
    const page = pdf.getPage(0);
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle ?? 0;

    const slugBase = slugify(name);
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
    const storagePath = `${crypto.randomUUID()}.pdf`;

    const { error: upErr } = await admin.storage
      .from('templates')
      .upload(storagePath, bytes.slice().buffer as ArrayBuffer, { contentType: 'application/pdf', upsert: false });
    if (upErr) return json({ error: `Falha ao guardar o PDF: ${upErr.message}` }, 500);

    let thumbnailPath: string | null = null;
    if (typeof thumbnailBase64 === 'string' && thumbnailBase64.length > 0) {
      const thumbBytes = base64ToBytes(thumbnailBase64);
      const p = `${crypto.randomUUID()}.png`;
      const { error: thErr } = await admin.storage
        .from('template-thumbnails')
        .upload(p, thumbBytes.slice().buffer as ArrayBuffer, { contentType: 'image/png', upsert: false });
      if (!thErr) thumbnailPath = p;
    }

    const { data, error } = await admin
      .from('templates')
      .insert({
        name,
        slug,
        source_file_path: storagePath,
        thumbnail_path: thumbnailPath,
        page_count: pageCount,
        page_width: width,
        page_height: height,
        page_rotation: rotation,
        status: 'ready',
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      await admin.storage.from('templates').remove([storagePath]);
      if (thumbnailPath) await admin.storage.from('template-thumbnails').remove([thumbnailPath]);
      return json({ error: error.message }, 500);
    }

    return json({ template: data });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Erro inesperado' }, 500);
  }
});
