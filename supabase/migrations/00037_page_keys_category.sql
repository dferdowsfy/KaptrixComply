-- Migration: Register the Category Diligence page key and default it
-- to HIDDEN for every existing role so no user sees the new pathway
-- until an admin explicitly grants access.
--
-- DESIGN (see plan in /memories/session/plan.md):
--   Reuses the page-permissions machinery introduced in 00029. A
--   single new canonical page key ("category_home") gates the entire
--   AI Category Diligence surface. Future phases can add additional
--   keys (e.g. "category_screening" for the promotion flow) behind
--   the same mechanism.
--
-- SAFETY:
--   - Idempotent inserts (ON CONFLICT DO NOTHING) so re-running the
--     migration is a no-op.
--   - Every existing role is seeded with can_view = FALSE for this
--     key. The admin UI can flip it per role or per user.
--   - No role or user loses any permission they already had.

INSERT INTO public.page_keys (key, label, always_visible) VALUES
  ('category_home', 'AI Category Diligence', false)
ON CONFLICT (key) DO NOTHING;

-- Seed default role permissions: hidden for everyone until explicitly
-- enabled. This mirrors the pattern used in 00029 for the 'admin' key.
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'admin', 'operator', 'analyst', 'reviewer', 'client_viewer'
  ] LOOP
    INSERT INTO public.role_page_permissions (role, page_key, can_view)
    VALUES (r, 'category_home', FALSE)
    ON CONFLICT (role, page_key) DO NOTHING;
  END LOOP;
END $$;
