-- Templates bucket
CREATE POLICY "templates_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'templates');
CREATE POLICY "templates_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

-- Thumbnails bucket
CREATE POLICY "thumbs_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'template-thumbnails');
CREATE POLICY "thumbs_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "thumbs_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "thumbs_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Fonts bucket
CREATE POLICY "fonts_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fonts');
CREATE POLICY "fonts_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));

-- Outputs bucket (per-user folder = auth.uid())
CREATE POLICY "outputs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'outputs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "outputs_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "outputs_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'outputs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));