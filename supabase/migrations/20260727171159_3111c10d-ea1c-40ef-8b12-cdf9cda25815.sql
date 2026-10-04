
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- First user becomes admin automatically
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ TEMPLATES ============
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  theme TEXT,
  category TEXT,
  source_file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 1 CHECK (page_count >= 1),
  page_width NUMERIC NOT NULL,
  page_height NUMERIC NOT NULL,
  page_rotation INTEGER NOT NULL DEFAULT 0 CHECK (page_rotation IN (0,90,180,270)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read_authenticated" ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_admin_write" ON public.templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_update" ON public.templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_delete" ON public.templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FONTS ============
CREATE TABLE public.fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  family_name TEXT,
  subfamily_name TEXT,
  postscript_name TEXT,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  weight INTEGER NOT NULL DEFAULT 400,
  style TEXT NOT NULL DEFAULT 'normal' CHECK (style IN ('normal','italic')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','active','invalid','archived')),
  validation_error TEXT,
  license_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fonts TO authenticated;
GRANT ALL ON public.fonts TO service_role;
ALTER TABLE public.fonts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fonts_read_authenticated" ON public.fonts FOR SELECT TO authenticated USING (true);
CREATE POLICY "fonts_admin_write" ON public.fonts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_admin_update" ON public.fonts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fonts_admin_delete" ON public.fonts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fonts_updated_at BEFORE UPDATE ON public.fonts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRESETS ============
CREATE TABLE public.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL UNIQUE REFERENCES public.templates(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 2,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('valid','invalid','pending')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presets TO authenticated;
GRANT ALL ON public.presets TO service_role;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_read_authenticated" ON public.presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "presets_admin_write" ON public.presets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "presets_admin_update" ON public.presets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "presets_admin_delete" ON public.presets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER presets_updated_at BEFORE UPDATE ON public.presets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GENERATIONS ============
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  preset_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  output_file_path TEXT,
  output_size_bytes BIGINT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generations_own_read" ON public.generations FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "generations_own_insert" ON public.generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "generations_own_update" ON public.generations FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "generations_admin_delete" ON public.generations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ GENERATION ITEMS ============
CREATE TABLE public.generation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  sort_order INTEGER NOT NULL DEFAULT 0,
  rendered_values JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_items TO authenticated;
GRANT ALL ON public.generation_items TO service_role;
ALTER TABLE public.generation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generation_items_own_read" ON public.generation_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.generations g WHERE g.id = generation_id AND (g.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "generation_items_own_insert" ON public.generation_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.generations g WHERE g.id = generation_id AND g.created_by = auth.uid())
);
