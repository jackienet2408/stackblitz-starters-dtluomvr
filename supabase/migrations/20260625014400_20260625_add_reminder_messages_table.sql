CREATE TABLE IF NOT EXISTS reminder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_group_id UUID NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  message_en TEXT NOT NULL,
  message_zh TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reminder_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_reminder_messages" ON reminder_messages FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_reminder_messages" ON reminder_messages FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_reminder_messages" ON reminder_messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_reminder_messages" ON reminder_messages FOR DELETE
  TO authenticated USING (true);
