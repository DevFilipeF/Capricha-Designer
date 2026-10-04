
-- Templates: admin write, auth read
CREATE POLICY "templates_bucket_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'templates');
CREATE POLICY "templates_bucket_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

-- Thumbnails
CREATE POLICY "thumbnails_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'template-thumbnails');
CREATE POLICY "thumbnails_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "thumbnails_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "thumbnails_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Fonts
CREATE POLICY "fonts_bucket_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fonts');
CREATE POLICY "fonts_bucket_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fonts' AND public.has_role(auth.uid(), 'admin'));

-- Outputs: owner scoped by first-path-segment = user id
CREATE POLICY "outputs_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'outputs' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')
  ));
CREATE POLICY "outputs_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "outputs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'outputs' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')
  ));
