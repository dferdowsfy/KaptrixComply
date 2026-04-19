-- Migration: Add user approval status
-- Allows restricting client creation to approved users only

ALTER TABLE public.users
ADD COLUMN approved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_users_approved ON public.users(approved);
