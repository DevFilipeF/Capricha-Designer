import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import fontkit from 'npm:fontkit@2.0.2';
import { requireAdmin, base64ToBytes, sha256Hex } from '../_shared/admin.ts';

const MAX_BYTES = 10 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const admin = auth.admin;

    const body = await req.json().catch(() => null);
    const displayName = String(body?.displayName ?? '').trim();
    const filename = String(body?.filename ?? '').trim();
    const fileBase64 = body?.fileBase64;
    const licenseConfirmed = body?.licenseConfirmed === true;

    if (!displayName || displayName.length > 120) return json({ error: 'Nome da fonte inválido' }, 400);
    if (!filename || typeof fileBase64 !== 'string') return json({ error: 'Arquivo ausente' }, 400);
    if (!licenseConfirmed) return json({ error: 'Confirme que possui licença de uso da fonte' }, 400);
    if (!/\.ttf$/i.test(filename)) return json({ error: 'Somente arquivos .ttf são aceitos' }, 400);

    const bytes = base64ToBytes(fileBase64);
    if (bytes.byteLength === 0) return json({ error: 'Arquivo vazio' }, 400);
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'Arquivo acima de 10 MB' }, 400);

    // Assinatura binária
    const tag = String.fromCharCode(...bytes.subarray(0, 4));
    const sfnt = new DataView(bytes.slice(0, 4).buffer).getUint32(0);
    if (tag === 'ttcf') return json({ error: 'Coleções de fontes (.ttc) não são suportadas' }, 400);
    if (tag === 'OTTO') return json({ error: 'Fontes OpenType CFF (OTTO) não são suportadas — use .ttf' }, 400);
    if (tag === 'wOFF' || tag === 'wOF2') return json({ error: 'WOFF/WOFF2 não são suportados — use .ttf' }, 400);
    if (sfnt !== 0x00010000 && tag !== 'true') return json({ error: 'Arquivo não é uma fonte TrueType válida' }, 400);

    // Metadados via fontkit
    let font: any;
    try {
      // deno-lint-ignore no-explicit-any
      font = (fontkit as any).create(bytes);
    } catch (_e) {
      return json({ error: 'Não foi possível ler a fonte (arquivo corrompido)' }, 400);
    }
    if (Array.isArray(font?.fonts)) return json({ error: 'Coleções de fontes não são suportadas' }, 400);
    if (font?.variationAxes && Object.keys(font.variationAxes).length > 0) {
      return json({ error: 'Fontes variáveis não são suportadas' }, 400);
    }

    const sha256 = await sha256Hex(bytes);
    const { data: dup } = await admin.from('fonts').select('id, display_name').eq('sha256', sha256).maybeSingle();
    if (dup) return json({ error: `Esta fonte já está cadastrada como "${dup.display_name}"` }, 409);

    const subfamily = font?.subfamilyName ?? 'Regular';
    const isItalic = /italic|oblique/i.test(String(subfamily));
    const weight = Number(font?.['OS/2']?.usWeightClass) || 400;

    const storagePath = `${crypto.randomUUID()}.ttf`;
    const { error: upErr } = await admin.storage
      .from('fonts')
      .upload(storagePath, bytes.slice().buffer as ArrayBuffer, { contentType: 'font/ttf', upsert: false });
    if (upErr) return json({ error: `Falha ao guardar a fonte: ${upErr.message}` }, 500);

    const { data, error } = await admin
      .from('fonts')
      .insert({
        display_name: displayName,
        family_name: font?.familyName ?? null,
        subfamily_name: subfamily ?? null,
        postscript_name: font?.postscriptName ?? null,
        original_filename: filename,
        storage_path: storagePath,
        mime_type: 'font/ttf',
        file_size_bytes: bytes.byteLength,
        sha256,
        weight,
        style: isItalic ? 'italic' : 'normal',
        status: 'active',
        license_confirmed: true,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      await admin.storage.from('fonts').remove([storagePath]);
      return json({ error: error.message }, 500);
    }

    return json({ font: data });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Erro inesperado' }, 500);
  }
});
