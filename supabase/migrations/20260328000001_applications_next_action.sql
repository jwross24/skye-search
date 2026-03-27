-- Add next_action and next_action_date to applications table
-- Fixes data persistence violation: updateApplicationNotes was accepting
-- these fields but silently discarding them (TODO from initial implementation)

alter table public.applications add column if not exists next_action text;
alter table public.applications add column if not exists next_action_date date;
