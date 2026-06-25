-- Fix rsvps RLS policies to reference events.id instead of meetings.id
-- The rsvps.meeting_id foreign key now references events.id

DROP POLICY IF EXISTS "rsvps_select" ON rsvps;
CREATE POLICY "rsvps_select" ON rsvps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())
);

DROP POLICY IF EXISTS "rsvps_insert" ON rsvps;
CREATE POLICY "rsvps_insert" ON rsvps FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())
);

DROP POLICY IF EXISTS "rsvps_update" ON rsvps;
CREATE POLICY "rsvps_update" ON rsvps FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())
);

DROP POLICY IF EXISTS "rsvps_delete" ON rsvps;
CREATE POLICY "rsvps_delete" ON rsvps FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())
);
