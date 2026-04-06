-- Add milestones_seen column to track one-time milestone notifications.
-- Milestones fire once (on the page load where they first become true),
-- then subsequent loads find the key in this array and skip it.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS milestones_seen text[] DEFAULT '{}';

COMMENT ON COLUMN public.users.milestones_seen IS
  'Keys of momentum milestones the user has already seen (e.g. first_review, first_application). Prevents duplicate milestone banners.';
