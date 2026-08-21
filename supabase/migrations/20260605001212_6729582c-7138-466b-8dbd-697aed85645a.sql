
-- Articles
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  author_name text,
  category text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view published articles" ON public.articles FOR SELECT USING (published = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write articles" ON public.articles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Instagram posts
CREATE TABLE public.instagram_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url text NOT NULL,
  caption text,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.instagram_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_posts TO authenticated;
GRANT ALL ON public.instagram_posts TO service_role;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view instagram" ON public.instagram_posts FOR SELECT USING (true);
CREATE POLICY "Admins write instagram" ON public.instagram_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER instagram_touch BEFORE UPDATE ON public.instagram_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Site settings (single row)
CREATE TABLE public.site_settings (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id = true),
  youtube_channel_id text,
  youtube_handle text DEFAULT 'sabercatsports3774',
  instagram_handle text DEFAULT 'sabercatsports',
  tagline text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins write settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.site_settings (id, youtube_handle, instagram_handle) VALUES (true, 'sabercatsports3774', 'sabercatsports');
