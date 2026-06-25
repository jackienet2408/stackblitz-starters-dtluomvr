'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Meeting {
  id: string;
  date: string;
  start_time: string;
  venue: string | null;
  cell_group_name: string;
  notes: string | null;
}

export default function UpcomingMeetings() {
  const { t } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, event_date, start_time, venue, notes, cell_groups!inner(group_name)')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      if (data) {
        setMeetings(
          data.map((d) => {
            const cg = d.cell_groups as any;
            return {
              id: d.id,
              date: d.event_date,
              start_time: d.start_time,
              venue: d.venue,
              cell_group_name: cg?.group_name || '',
              notes: d.notes,
            };
          })
        );
      }
      setLoading(false);
    };
    fetchMeetings();
  }, []);

  if (loading) {
    return <div className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />;
  }

  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('upcomingMeetings')}</h2>
        <p className="text-gray-500">{t('noUpcomingMeetings')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{t('upcomingMeetings')}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {meetings.map((meeting) => {
          const dateObj = new Date(meeting.date + 'T' + meeting.start_time);
          return (
            <div key={meeting.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-orange-600">{meeting.cell_group_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {meeting.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {meeting.venue}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-100">
        <Link
          href="/meetings"
          className="flex items-center justify-center text-sm font-medium text-orange-600 hover:text-orange-700 transition"
        >
          {t('viewSchedule')} <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
