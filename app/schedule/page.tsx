'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { Calendar, MapPin, Clock, Users, CircleCheck as CheckCircle } from 'lucide-react';

interface Meeting {
  id: string;
  cell_group_id: string;
  event_date: string;
  start_time: string;
  venue: string;
  cell_group_name: string;
  notes: string | null;
}

interface Assignment {
  event_id: string;
  role_name: string;
  member_name: string | null;
}

interface Rsvp {
  meeting_id: string;
  status: string;
}

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, event_date, start_time, venue, notes, cell_group_id, cell_groups!inner(group_name)')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });
    if (eventsData) {
      setMeetings(
        eventsData.map((d) => {
          const cg = d.cell_groups as any;
          return {
            id: d.id,
            cell_group_id: d.cell_group_id,
            event_date: d.event_date,
            start_time: d.start_time,
            venue: d.venue,
            cell_group_name: cg?.group_name || '',

            notes: d.notes,
          };
        })
      );
    }

    const { data: assignmentsData } = await supabase
      .from('roster_assignments')
      .select('event_id, roles!inner(role_name), members(name), cell_group_id');
    if (assignmentsData) {
      setAssignments(
        assignmentsData.map((d) => {
          const r = d.roles as any;
          const m = d.members as any;
          return { event_id: d.event_id, role_name: r?.role_name || '', member_name: m?.name || null };
        })
      );
    }

    const { data: rsvpsData } = await supabase.from('rsvps').select('meeting_id, status');
    if (rsvpsData) setRsvps(rsvpsData);
    setLoadingData(false);
  };

  const filteredMeetings = cellGroupId ? meetings.filter((m) => m.cell_group_id === cellGroupId) : meetings;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('schedule')}</h1>
          <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={true} />
        </div>

        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
            const meetingAssignments = assignments.filter((a) => a.event_id === meeting.id);
            const meetingRsvps = rsvps.filter((r) => r.meeting_id === meeting.id);
            const availableCount = meetingRsvps.filter((r) => r.status === 'available').length;
            const unavailableCount = meetingRsvps.filter((r) => r.status === 'unavailable').length;
            const tentativeCount = meetingRsvps.filter((r) => r.status === 'tentative').length;

            return (
              <div key={meeting.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex flex-col items-center justify-center text-orange-600 flex-shrink-0">
                    <span className="text-xs font-medium uppercase">{dateObj.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-lg font-bold">{dateObj.getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{meeting.cell_group_name}</h3>
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{meeting.cell_group_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {meeting.venue}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span className="text-green-600 font-medium">{availableCount}</span>
                        <span>/</span>
                        <span className="text-red-600 font-medium">{unavailableCount}</span>
                        <span>/</span>
                        <span className="text-yellow-600 font-medium">{tentativeCount}</span>
                      </div>
                    </div>
                    {meeting.notes && (
                      <div className="text-sm text-gray-500 mb-2">{meeting.notes}</div>
                    )}
                    {meetingAssignments.length > 0 && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">{t('dutyRoster')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {meetingAssignments.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">{a.role_name}:</span>
                              <span className={a.member_name ? 'font-medium text-gray-900' : 'text-gray-400 italic'}>
                                {a.member_name || t('unassigned')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {meeting.notes && <p className="text-sm text-gray-500 mt-2">{meeting.notes}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noUpcomingMeetings')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
