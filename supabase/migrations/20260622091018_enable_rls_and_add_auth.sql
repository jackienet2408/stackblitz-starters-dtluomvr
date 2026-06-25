/*
# Enable RLS and add auth/ownership to existing tables

1. Changes
- Add `user_id` to `cell_groups` to track ownership
- Add `user_id` to `events` to track ownership
- Enable RLS on all 6 existing tables
- Add RLS policies for authenticated users
- Add `name_zh` to roles for Chinese translation
- Add missing tables: profiles, itineraries, itinerary_items, meetings, meeting_duties, rsvps
- Add indexes for performance

2. Security
- All tables require RLS with ownership-based policies
- Users can only access their own cell_groups and related data
*/

-- Add user_id to cell_groups for ownership tracking
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS venue text;
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS meeting_day text;
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS meeting_time text;
ALTER TABLE cell_groups ADD COLUMN IF NOT EXISTS image_url text;

-- Add user_id to events for ownership
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes text;

-- Add name_zh to roles for Chinese translation
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name_zh text;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description text;

-- Add created_at to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_leader boolean DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS role_capabilities jsonb DEFAULT '[]';

-- Add created_at to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Enable RLS on existing tables
ALTER TABLE cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_assignments ENABLE ROW LEVEL SECURITY;

-- cell_groups policies (owner-based)
DROP POLICY IF EXISTS "cell_groups_select" ON cell_groups;
CREATE POLICY "cell_groups_select" ON cell_groups FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cell_groups_insert" ON cell_groups;
CREATE POLICY "cell_groups_insert" ON cell_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cell_groups_update" ON cell_groups;
CREATE POLICY "cell_groups_update" ON cell_groups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cell_groups_delete" ON cell_groups;
CREATE POLICY "cell_groups_delete" ON cell_groups FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- members policies (scoped through cell_groups)
DROP POLICY IF EXISTS "members_select" ON members;
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = members.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "members_insert" ON members;
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = members.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = members.cell_group_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = members.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = members.cell_group_id AND cell_groups.user_id = auth.uid()));

-- roles policies (scoped through cell_groups - we'll add cell_group_id to roles)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS cell_group_id uuid;
UPDATE roles SET cell_group_id = (SELECT id FROM cell_groups LIMIT 1) WHERE cell_group_id IS NULL;
ALTER TABLE roles ALTER COLUMN cell_group_id SET NOT NULL;
ALTER TABLE roles ADD CONSTRAINT roles_cell_group_id_fkey FOREIGN KEY (cell_group_id) REFERENCES cell_groups(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = roles.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roles_insert" ON roles;
CREATE POLICY "roles_insert" ON roles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = roles.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roles_update" ON roles;
CREATE POLICY "roles_update" ON roles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = roles.cell_group_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = roles.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roles_delete" ON roles;
CREATE POLICY "roles_delete" ON roles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = roles.cell_group_id AND cell_groups.user_id = auth.uid()));

-- member_roles policies (scoped through members -> cell_groups)
DROP POLICY IF EXISTS "member_roles_select" ON member_roles;
CREATE POLICY "member_roles_select" ON member_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN cell_groups ON cell_groups.id = members.cell_group_id WHERE members.id = member_roles.member_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "member_roles_insert" ON member_roles;
CREATE POLICY "member_roles_insert" ON member_roles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM members JOIN cell_groups ON cell_groups.id = members.cell_group_id WHERE members.id = member_roles.member_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "member_roles_update" ON member_roles;
CREATE POLICY "member_roles_update" ON member_roles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN cell_groups ON cell_groups.id = members.cell_group_id WHERE members.id = member_roles.member_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM members JOIN cell_groups ON cell_groups.id = members.cell_group_id WHERE members.id = member_roles.member_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "member_roles_delete" ON member_roles;
CREATE POLICY "member_roles_delete" ON member_roles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM members JOIN cell_groups ON cell_groups.id = members.cell_group_id WHERE members.id = member_roles.member_id AND cell_groups.user_id = auth.uid()));

-- events policies (scoped through cell_groups)
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = events.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = events.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = events.cell_group_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = events.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = events.cell_group_id AND cell_groups.user_id = auth.uid()));

-- roster_assignments policies (scoped through events -> cell_groups)
DROP POLICY IF EXISTS "roster_assignments_select" ON roster_assignments;
CREATE POLICY "roster_assignments_select" ON roster_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = roster_assignments.event_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roster_assignments_insert" ON roster_assignments;
CREATE POLICY "roster_assignments_insert" ON roster_assignments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = roster_assignments.event_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roster_assignments_update" ON roster_assignments;
CREATE POLICY "roster_assignments_update" ON roster_assignments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = roster_assignments.event_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = roster_assignments.event_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "roster_assignments_delete" ON roster_assignments;
CREATE POLICY "roster_assignments_delete" ON roster_assignments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events JOIN cell_groups ON cell_groups.id = events.cell_group_id WHERE events.id = roster_assignments.event_id AND cell_groups.user_id = auth.uid()));

-- New tables for full app schema
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_group_id uuid NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  activity text NOT NULL,
  activity_zh text,
  duration_minutes integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_group_id uuid NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  itinerary_id uuid REFERENCES itineraries(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  venue text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('available', 'unavailable', 'tentative')),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "itineraries_select" ON itineraries;
CREATE POLICY "itineraries_select" ON itineraries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = itineraries.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itineraries_insert" ON itineraries;
CREATE POLICY "itineraries_insert" ON itineraries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = itineraries.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itineraries_update" ON itineraries;
CREATE POLICY "itineraries_update" ON itineraries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = itineraries.cell_group_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = itineraries.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itineraries_delete" ON itineraries;
CREATE POLICY "itineraries_delete" ON itineraries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = itineraries.cell_group_id AND cell_groups.user_id = auth.uid()));

DROP POLICY IF EXISTS "itinerary_items_select" ON itinerary_items;
CREATE POLICY "itinerary_items_select" ON itinerary_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM itineraries JOIN cell_groups ON cell_groups.id = itineraries.cell_group_id WHERE itineraries.id = itinerary_items.itinerary_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itinerary_items_insert" ON itinerary_items;
CREATE POLICY "itinerary_items_insert" ON itinerary_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM itineraries JOIN cell_groups ON cell_groups.id = itineraries.cell_group_id WHERE itineraries.id = itinerary_items.itinerary_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itinerary_items_update" ON itinerary_items;
CREATE POLICY "itinerary_items_update" ON itinerary_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM itineraries JOIN cell_groups ON cell_groups.id = itineraries.cell_group_id WHERE itineraries.id = itinerary_items.itinerary_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM itineraries JOIN cell_groups ON cell_groups.id = itineraries.cell_group_id WHERE itineraries.id = itinerary_items.itinerary_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "itinerary_items_delete" ON itinerary_items;
CREATE POLICY "itinerary_items_delete" ON itinerary_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM itineraries JOIN cell_groups ON cell_groups.id = itineraries.cell_group_id WHERE itineraries.id = itinerary_items.itinerary_id AND cell_groups.user_id = auth.uid()));

DROP POLICY IF EXISTS "meetings_select" ON meetings;
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = meetings.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meetings_insert" ON meetings;
CREATE POLICY "meetings_insert" ON meetings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = meetings.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meetings_update" ON meetings;
CREATE POLICY "meetings_update" ON meetings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = meetings.cell_group_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = meetings.cell_group_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meetings_delete" ON meetings;
CREATE POLICY "meetings_delete" ON meetings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM cell_groups WHERE cell_groups.id = meetings.cell_group_id AND cell_groups.user_id = auth.uid()));

DROP POLICY IF EXISTS "meeting_duties_select" ON meeting_duties;
CREATE POLICY "meeting_duties_select" ON meeting_duties FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = meeting_duties.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meeting_duties_insert" ON meeting_duties;
CREATE POLICY "meeting_duties_insert" ON meeting_duties FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = meeting_duties.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meeting_duties_update" ON meeting_duties;
CREATE POLICY "meeting_duties_update" ON meeting_duties FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = meeting_duties.meeting_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = meeting_duties.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "meeting_duties_delete" ON meeting_duties;
CREATE POLICY "meeting_duties_delete" ON meeting_duties FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = meeting_duties.meeting_id AND cell_groups.user_id = auth.uid()));

DROP POLICY IF EXISTS "rsvps_select" ON rsvps;
CREATE POLICY "rsvps_select" ON rsvps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "rsvps_insert" ON rsvps;
CREATE POLICY "rsvps_insert" ON rsvps FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "rsvps_update" ON rsvps;
CREATE POLICY "rsvps_update" ON rsvps FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid()));
DROP POLICY IF EXISTS "rsvps_delete" ON rsvps;
CREATE POLICY "rsvps_delete" ON rsvps FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM meetings JOIN cell_groups ON cell_groups.id = meetings.cell_group_id WHERE meetings.id = rsvps.meeting_id AND cell_groups.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_members_cell_group ON members(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_roles_cell_group ON roles(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_member ON member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role ON member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_cell_group ON itineraries(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_meetings_cell_group_date ON meetings(cell_group_id, date);
CREATE INDEX IF NOT EXISTS idx_meeting_duties_meeting ON meeting_duties(meeting_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_meeting ON rsvps(meeting_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_member ON rsvps(member_id);
CREATE INDEX IF NOT EXISTS idx_events_cell_group ON events(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_event ON roster_assignments(event_id);
