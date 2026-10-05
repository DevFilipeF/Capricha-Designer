-- ============================================================
-- Corrige a persistência no Supabase (ambiente de produção/Vercel)
-- ============================================================
-- Motivos:
--  1. Os buckets de Storage nunca eram criados por migration — apenas as
--     policies. Sem o bucket, upload de template/fonte/PDF falha.
--  2. O app grava generations.status = 'completed', mas o CHECK original
--     aceitava apenas ('queued','processing','completed','failed'). Isso já
--     está correto; a constraint é reaplicada de forma idempotente para
--     garantir que ambientes criados fora das migrations fiquem iguais.

-- ---------- 1. Buckets de Storage ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('templates', 'templates', false, 20971520, ARRAY['application/pdf']),
  ('template-thumbnails', 'template-thumbnails', false, 5242880, ARRAY['image/png', 'image/jpeg']),
  ('fonts', 'fonts', false, 10485760, ARRAY['font/ttf', 'application/octet-stream']),
  ('outputs', 'outputs', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------- 2. Policies de Storage (idempotentes) ----------
DROP POLICY IF EXISTS "templates_read_auth" ON storage.objects;
CREATE POLICY "templates_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'templates');
DROP POLICY IF EXISTS "templates_admin_insert" ON storage.objects;
CREATE POLICY "templates_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "templates_admin_update" ON storage.objects;
CREATE POLICY "templates_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "templates_admin_delete" ON storage.objects;
CREATE POLICY "templates_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "thumbs_read_auth" ON storage.objects;
CREATE POLICY "thumbs_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'template-thumbnails');
DROP POLICY IF EXISTS "thumbs_admin_insert" ON storage.objects;
CREATE POLICY "thumbs_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "thumbs_admin_update" ON storage.objects;
CREATE POLICY "thumbs_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "thumbs_admin_delete" ON storage.objects;
CREATE POLICY "thumbs_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "fonts_read_auth" ON storage.objects;
CREATE POLICY "fonts_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fonts');
DROP POLICY IF EXISTS "fonts_admin_insert" ON storage.objects;
CREATE POLICY "fonts_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "fonts_admin_update" ON storage.objects;
CREATE POLICY "fonts_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "fonts_admin_delete" ON storage.objects;
CREATE POLICY "fonts_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "outputs_own_read" ON storage.objects;
CREATE POLICY "outputs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'outputs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "outputs_own_insert" ON storage.objects;
CREATE POLICY "outputs_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "outputs_own_delete" ON storage.objects;
CREATE POLICY "outputs_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'outputs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- ---------- 3. Status de geração ----------
-- O app grava 'completed'. Normaliza valores legados antes de reaplicar o CHECK.
UPDATE public.generations SET status = 'completed' WHERE status = 'done';

ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_status_check;
ALTER TABLE public.generations
  ADD CONSTRAINT generations_status_check
  CHECK (status IN ('queued', 'processing', 'completed', 'failed'));

-- ---------- 4. Garante a leitura pública das tabelas de catálogo ----------
-- Reforça que usuários autenticados conseguem listar templates/fontes/presets,
-- necessário para a tela de produção no Vercel.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fonts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_items TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- ---------- 5. Buckets: policy de leitura para o dono no upload ----------
-- Sem isso, o upload via service_role funciona mas o download assinado
-- a partir do browser do usuário falhava em alguns casos.
GRANT USAGE ON SCHEMA storage TO authenticated, anon;