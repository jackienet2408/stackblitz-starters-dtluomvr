-- 1. Add default meeting day/time/venue support for cell groups
-- Multiple venues per cell group, each with its own day/time
CREATE TABLE IF NOT EXISTS cell_group_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_group_id UUID NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  venue TEXT NOT NULL,
  meeting_day TEXT,
  meeting_time TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cell_group_id, venue, meeting_day, meeting_time)
);

ALTER TABLE cell_group_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_defaults" ON cell_group_defaults FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_defaults" ON cell_group_defaults FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_defaults" ON cell_group_defaults FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_defaults" ON cell_group_defaults FOR DELETE
  TO authenticated USING (true);

-- 2. Add role-cell-group junction for multi-cell-group roles
CREATE TABLE IF NOT EXISTS role_cell_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  cell_group_id UUID NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role_id, cell_group_id)
);

ALTER TABLE role_cell_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_rcg" ON role_cell_groups FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_rcg" ON role_cell_groups FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_rcg" ON role_cell_groups FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_rcg" ON role_cell_groups FOR DELETE
  TO authenticated USING (true);

-- 3. Add is_global flag to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 4. Add custom reminder messages to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_message_en TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_message_zh TEXT;
