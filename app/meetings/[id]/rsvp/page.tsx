'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, HelpCircle, Save } from 'lucide-react';

interface MeetingData {
  id: string;
  event_date: string;
  start_time: string;
  venue: string;
  cell_group_name: string;
  notes: string | null;
}

interface MemberRsvp {
  id: string;
  name: string;
  avatar_url: string | null;
  status: 'available' | 'unavailable' | 'tentative' | null;
  reason: string | null;
}

export default function RsvpPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [members, setMembers] = useState<MemberRsvp[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (eventId && user) fetchData();
  }, [eventId, user]);

  const fetchData = async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('id, event_date, start_time, venue, notes, cell_groups!inner(group_name)')
      .eq('id', eventId)
      .maybeSingle();
    if (eventData) {
      const cg = eventData.cell_groups as any;
      setMeeting({
        id: eventData.id,
        event_date: eventData.event_date,
        start_time: eventData.start_time,
        venue: eventData.venue,
        cell_group_name: cg?.group_name || '',
        notes: eventData.notes,
      });
    }

    const { data: membersData } = await supabase
      .from('members')
      .select('id, name, avatar_url, cell_group_id')
      .eq('is_active', true);
    if (membersData) {
      const { data: rsvps } = await supabase.from('rsvps').select('*').eq('meeting_id', eventId);
      const rsvpMap = new Map(rsvps?.map((r) => [r.member_id, r]) || []);
      setMembers(
        membersData.map((m) => {
          const r = rsvpMap.get(m.id);
          return { id: m.id, name: m.name, avatar_url: m.avatar_url, status: r?.status || null, reason: r?.reason || null };
        })
      );
    }
    setLoadingData(false);
  };

  const updateRsvp = async (memberId: string, status: 'available' | 'unavailable' | 'tentative') => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status } : m)));
  };

  const updateReason = (memberId: string, reason: string) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, reason } : m)));
  };

  const saveAll = async () => {
    setSaving(true);
    const rsvpRows = members
      .filter((m) => m.status)
      .map((m) => ({
        meeting_id: eventId,
        member_id: m.id,
        status: m.status,
        reason: m.reason,
      }));
    for (const row of rsvpRows) {
      await supabase.from('rsvps').upsert(row, { onConflict: 'meeting_id,member_id' });
    }
    setSaving(false);
    fetchData();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  const dateObj = meeting ? new Date(meeting.event_date + 'T' + meeting.start_time) : null;
  const available = members.filter((m) => m.status === 'available').length;
  const unavailable = members.filter((m) => m.status === 'unavailable').length;
  const tentative = members.filter((m) => m.status === 'tentative').length;
  const noResponse = members.filter((m) => !m.status).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {meeting && dateObj && (
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl shadow-lg p-6 text-white mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">{t('rsvp')}</h1>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{meeting.cell_group_name}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-200" />
                <span className="font-medium">{dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-200" />
                <span>{dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange-200" />
                <span>{meeting.venue}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <div className="text-xl font-bold text-green-700">{available}</div>
            <div className="text-xs text-green-600">{t('available')}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
            <div className="text-xl font-bold text-red-700">{unavailable}</div>
            <div className="text-xs text-red-600">{t('unavailable')}</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
            <div className="text-xl font-bold text-yellow-700">{tentative}</div>
            <div className="text-xs text-yellow-600">{t('tentative')}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-xl font-bold text-gray-700">{noResponse}</div>
            <div className="text-xs text-gray-600">No response</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t('members')}</h2>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? '...' : t('save')}
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{m.name}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => updateRsvp(m.id, 'available')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      m.status === 'available'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {t('available')}
                  </button>
                  <button
                    onClick={() => updateRsvp(m.id, 'unavailable')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      m.status === 'unavailable'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> {t('unavailable')}
                  </button>
                  <button
                    onClick={() => updateRsvp(m.id, 'tentative')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      m.status === 'tentative'
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-yellow-50'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> {t('tentative')}
                  </button>
                </div>
                {m.status === 'unavailable' && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('reason')}</label>
                    <select
                      value={m.reason || ''}
                      onChange={(e) => updateReason(m.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">{t('select')}</option>
                      <option value="Sick">Sick</option>
                      <option value="Work">Work</option>
                      <option value="Travel">Travel</option>
                      <option value="Family">Family</option>
                      <option value="Other">{t('other')}</option>
                    </select>
                    {m.reason === 'Other' && (
                      <input
                        value={m.reason || ''}
                        onChange={(e) => updateReason(m.id, e.target.value)}
                        placeholder={t('pleaseSpecify')}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
