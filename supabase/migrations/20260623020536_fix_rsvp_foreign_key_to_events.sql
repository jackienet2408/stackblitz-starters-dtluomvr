-- RSVP table was created referencing meetings.id but the app uses events.id
-- Fix the foreign key to point to events.id instead

ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_meeting_id_fkey;
ALTER TABLE rsvps ADD CONSTRAINT rsvps_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES events(id) ON DELETE CASCADE;

-- Also add cell_group_id to roster_assignments for easier querying
-- (it was already added by the first migration, but ensure it exists)
ALTER TABLE roster_assignments ADD COLUMN IF NOT EXISTS cell_group_id uuid;
