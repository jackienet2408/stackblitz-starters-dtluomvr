import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      cell_groups: {
        Row: {
          id: string;
          group_name: string;
          created_at: string;
          user_id: string;
          description: string | null;
          venue: string | null;
          meeting_day: string | null;
          meeting_time: string | null;
          image_url: string | null;
        };
        Insert: {
          group_name: string;
          description?: string;
          venue?: string;
          meeting_day?: string;
          meeting_time?: string;
          image_url?: string;
        };
        Update: {
          group_name?: string;
          description?: string;
          venue?: string;
          meeting_day?: string;
          meeting_time?: string;
          image_url?: string;
        };
      };
      members: {
        Row: {
          id: string;
          cell_group_id: string;
          name: string;
          whatsapp_number: string | null;
          is_active: boolean;
          created_at: string;
          avatar_url: string | null;
          email: string | null;
          is_leader: boolean;
          role_capabilities: any;
        };
        Insert: {
          cell_group_id: string;
          name: string;
          whatsapp_number?: string;
          is_active?: boolean;
          avatar_url?: string;
          email?: string;
          is_leader?: boolean;
          role_capabilities?: any;
        };
        Update: {
          name?: string;
          whatsapp_number?: string;
          is_active?: boolean;
          avatar_url?: string;
          email?: string;
          is_leader?: boolean;
          role_capabilities?: any;
        };
      };
      roles: {
        Row: {
          id: string;
          role_name: string;
          cell_group_id: string;
          name_zh: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          role_name: string;
          cell_group_id: string;
          name_zh?: string;
          description?: string;
        };
        Update: {
          role_name?: string;
          name_zh?: string;
          description?: string;
        };
      };
      member_roles: {
        Row: {
          member_id: string;
          role_id: string;
        };
        Insert: {
          member_id: string;
          role_id: string;
        };
      };
      events: {
        Row: {
          id: string;
          cell_group_id: string;
          event_date: string;
          start_time: string;
          venue: string;
          itinerary: string | null;
          user_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          cell_group_id: string;
          event_date: string;
          start_time: string;
          venue: string;
          itinerary?: string;
          notes?: string;
        };
        Update: {
          event_date?: string;
          start_time?: string;
          venue?: string;
          itinerary?: string;
          notes?: string;
        };
      };
      roster_assignments: {
        Row: {
          id: string;
          event_id: string | null;
          role_id: string | null;
          member_id: string | null;
        };
        Insert: {
          event_id: string;
          role_id: string;
          member_id?: string;
        };
        Update: {
          member_id?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          language: string;
          created_at: string;
        };
      };
      itineraries: {
        Row: {
          id: string;
          cell_group_id: string;
          name: string;
          description: string | null;
          is_default: boolean;
          created_at: string;
        };
      };
      itinerary_items: {
        Row: {
          id: string;
          itinerary_id: string;
          activity: string;
          activity_zh: string | null;
          duration_minutes: number;
          order_index: number;
          role_id: string | null;
          created_at: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          cell_group_id: string;
          itinerary_id: string | null;
          date: string;
          start_time: string;
          venue: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      meeting_duties: {
        Row: {
          id: string;
          meeting_id: string;
          role_id: string;
          member_id: string | null;
          created_at: string;
        };
      };
      rsvps: {
        Row: {
          id: string;
          meeting_id: string;
          member_id: string;
          status: 'available' | 'unavailable' | 'tentative';
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
