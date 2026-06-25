'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface NextMeeting {
  id: string;
  date: string;
  start_time: string;
  venue: string | null;
  cell_group_name: string;
  notes: string | null;
}

export default function HeroCard() {
  const { t } = useLanguage();
  const [meeting, setMeeting] = useState<NextMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNextMeeting = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, event_date, start_time, venue, notes, cell_groups!inner(group_name)')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        const cg = data.cell_groups as any;
        setMeeting({
          id: data.id,
          date: data.event_date,
          start_time: data.start_time,
          venue: data.venue,
          cell_group_name: cg?.group_name || '',
          notes: data.notes,
        });
      }
      setLoading(false);
    };
    fetchNextMeeting();
  }, []);

  if (loading) {
    return <div className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />;
  }

  if (!meeting) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-orange-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('nextMeeting')}</h2>
        <p className="text-gray-500">{t('noUpcomingMeetings')}</p>
        <Link href="/meetings" className="mt-3 inline-flex items-center text-orange-600 text-sm font-medium hover:text-orange-700">
          {t('addMeeting')} <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    );
  }

  const dateObj = new Date(meeting.date + 'T' + meeting.start_time);
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('nextMeeting')}</h2>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{meeting.cell_group_name}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-orange-200" />
          <span className="text-lg font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-orange-200" />
          <span>{timeStr}</span>
        </div>
        {meeting.venue && (
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-orange-200" />
            <span>{meeting.venue}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-3">
        <Link
          href="/meetings"
          className="inline-flex items-center px-4 py-2 bg-white text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50 transition"
        >
          {t('viewSchedule')}
        </Link>
        <Link
          href={`/meetings/${meeting.id}/rsvp`}
          className="inline-flex items-center px-4 py-2 bg-orange-500/30 text-white rounded-lg text-sm font-medium hover:bg-orange-500/40 transition"
        >
          {t('rsvp')}
        </Link>
      </div>
    </div>
  );
}
