-- Role-based admin access. No special tokens, no separate auth flows.
-- Check is_admin in admin routes. Set true for operators via SQL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
