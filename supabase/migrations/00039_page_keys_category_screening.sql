-- Migration: Register the category_screening page key (default HIDDEN
-- for every role). Gates the AI Category Diligence → target promotion
-- surface. Same design + safety notes as migration 00037.

INSERT INTO public.page_keys (key, label, always_visible) VALUES
  ('category_screening', 'AI Category Diligence — Target Screening', false)
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'admin', 'operator', 'analyst', 'reviewer', 'client_viewer'
  ] LOOP
    INSERT INTO public.role_page_permissions (role, page_key, can_view)
    VALUES (r, 'category_screening', FALSE)
    ON CONFLICT (role, page_key) DO NOTHING;
  END LOOP;
END $$;
