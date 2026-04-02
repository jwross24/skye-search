-- Add push_subscription column to users table.
-- Stores the Web Push subscription object (endpoint, keys) as JSONB.
-- One subscription per user (overwritten on re-subscribe from a new device).
-- NULL = not subscribed to push notifications.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_subscription jsonb;
