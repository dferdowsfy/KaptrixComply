-- Migration: auto-approve new users, seed admin, admin-controlled menu visibility
-- Rationale:
--   * Product decision: if a user signs up they get full access automatically.
--   * dferdows@gmail.com is the platform admin and must bypass any role gating.
--   * Admin can hide/show menu options per user — stored server-side so the
--     preference follows the user across browsers and can't be unhidden locally.

-- 1. Per-user menu visibility controlled by admin.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hidden_menu_keys TEXT[] NOT NULL DEFAULT '{}';

-- 2. Default approval to TRUE going forward and backfill existing rows.
ALTER TABLE public.users
  ALTER COLUMN approved SET DEFAULT true;

UPDATE public.users SET approved = true WHERE approved = false;

-- 3. Trigger: when a new auth.users row is created, mirror it into public.users
--    with approved=true. The designated admin email is elevated to role=admin.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT := 'dferdows@gmail.com';
  resolved_role TEXT;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(NEW.email) = lower(admin_email) THEN
    resolved_role := 'admin';
  ELSE
    resolved_role := 'operator';
  END IF;

  INSERT INTO public.users (id, email, role, approved)
  VALUES (NEW.id, NEW.email, resolved_role, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = CASE
          WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'admin'
          ELSE public.users.role
        END,
        approved = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Backfill: ensure the designated admin row exists with role=admin if the
--    auth user already exists in this environment.
INSERT INTO public.users (id, email, role, approved)
SELECT au.id, au.email, 'admin', true
FROM auth.users au
WHERE lower(au.email) = 'dferdows@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin', approved = true;

-- 5. Admin RLS: allow admins to read/update every user row (for the admin panel).
DROP POLICY IF EXISTS users_admin_select ON public.users;
CREATE POLICY users_admin_select ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );

DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );
