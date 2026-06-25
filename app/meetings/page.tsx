'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { Calendar, Plus, CreditCard as Edit2, Trash2, MapPin, Clock, ClipboardCopy, CircleCheck as CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Meeting {
  id: string;
  cell_group_id: string;
  event_date: string;
  start_time: string;
  venue: string;
  notes: string | null;
  cell_group_name: string;
}

interface Role {
  id: string;
  role_name: string;
  cell_group_id: string;
}

interface Member {
  id: string;
  name: string;
  cell_group_id: string;
  role_capabilities: string[];
  is_active: boolean;
}

interface RosterAssignment {
  id: string;
  event_id: string;
  role_id: string;
  member_id: string | null;
  role_name: string;
  member_name: string | null;
}

export default function MeetingsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<RosterAssignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState({ event_date: '', start_time: '', venue: '', notes: '', cell_group_id: '' });
  const [saving, setSaving] = useState(false);
  const [showDutyModal, setShowDutyModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchMeetings();
      fetchRoles();
      fetchMembers();
    }
  }, [user]);

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, cell_groups!inner(group_name)')
      .order('event_date', { ascending: false });
    if (data) {
      setMeetings(
        data.map((d) => {
          const cg = d.cell_groups as any;
          return {
            id: d.id,
            cell_group_id: d.cell_group_id,
            event_date: d.event_date,
            start_time: d.start_time,
            venue: d.venue,

            notes: d.notes,
            cell_group_name: cg?.group_name || '',
          };
        })
      );
    }
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('role_name');
    if (data) setRoles(data);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').eq('is_active', true).order('name');
    if (data) setMembers(data.map((m) => ({ ...m, is_active: m.is_active ?? true, role_capabilities: m.role_capabilities || [] })));
  };

  const fetchAssignments = async (eventId: string) => {
    const { data } = await supabase
      .from('roster_assignments')
      .select('id, event_id, role_id, member_id, roles!inner(role_name), members(name)')
      .eq('event_id', eventId);
    if (data) {
      setAssignments(
        data.map((d) => {
          const r = d.roles as any;
          const m = d.members as any;
          return {
            id: d.id,
            event_id: d.event_id,
            role_id: d.role_id,
            member_id: d.member_id,
            role_name: r?.role_name || '',
            member_name: m?.name || null,
          };
        })
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cell_group_id) return;
    setSaving(true);
    const payload = { event_date: form.event_date, start_time: form.start_time, venue: form.venue, notes: form.notes, cell_group_id: form.cell_group_id };
    if (editing) {
      await supabase.from('events').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('events').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ event_date: '', start_time: '', venue: '', notes: '', cell_group_id: '' });
    fetchMeetings();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('areYouSure'))) return;
    await supabase.from('events').delete().eq('id', id);
    fetchMeetings();
  };

  const startEdit = (m: Meeting) => {
    setEditing(m);
    setForm({
      event_date: m.event_date,
      start_time: m.start_time,
      venue: m.venue,

      notes: m.notes || '',
      cell_group_id: m.cell_group_id,
    });
    setShowForm(true);
  };

  const openDutyModal = async (eventId: string) => {
    setShowDutyModal(eventId);
    await fetchAssignments(eventId);
    const existingRoleIds = new Set(assignments.filter((a) => a.event_id === eventId).map((a) => a.role_id));
    const missingRoles = roles.filter((r) => !existingRoleIds.has(r.id));
    for (const role of missingRoles) {
      await supabase.from('roster_assignments').insert({ event_id: eventId, role_id: role.id });
    }
    if (missingRoles.length > 0) await fetchAssignments(eventId);
  };

  const assignMember = async (assignmentId: string, memberId: string | null) => {
    await supabase.from('roster_assignments').update({ member_id: memberId }).eq('id', assignmentId);
    if (showDutyModal) await fetchAssignments(showDutyModal);
  };

  const autoAssign = async (eventId: string) => {
    const { data: allAssignments } = await supabase
      .from('roster_assignments')
      .select('id, role_id, member_id')
      .eq('event_id', eventId);
    if (!allAssignments) return;
    for (const assignment of allAssignments) {
      if (assignment.member_id) continue;
      const role = roles.find((r) => r.id === assignment.role_id);
      if (!role) continue;
      const capableMembers = members.filter((m) => m.role_capabilities.includes(role.id) && m.is_active && m.cell_group_id === role.cell_group_id);
      if (capableMembers.length > 0) {
        const random = capableMembers[Math.floor(Math.random() * capableMembers.length)];
        await supabase.from('roster_assignments').update({ member_id: random.id }).eq('id', assignment.id);
      }
    }
    await fetchAssignments(eventId);
  };

  const copyReminder = (meeting: Meeting) => {
    const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
    const lines = [
      `*${meeting.cell_group_name}*`,
      ``,
      `Date: ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      `Time: ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      `Venue: ${meeting.venue}`,
    ];

    if (meeting.notes) lines.push(`Notes: ${meeting.notes}`);
    const a = assignments.filter((a) => a.event_id === meeting.id);
    if (a.length > 0) {
      lines.push(``);
      lines.push(`*Duty Roster:*`);
      a.forEach((as) => lines.push(`- ${as.role_name}: ${as.member_name || 'Unassigned'}`));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCapableMembers = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return members.filter((m) => m.role_capabilities.includes(roleId) && m.is_active && m.cell_group_id === role?.cell_group_id);
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
          <h1 className="text-2xl font-bold text-gray-900">{t('meetings')}</h1>
          <div className="flex gap-3 items-center">
            <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={true} />
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm({ event_date: '', start_time: '', venue: '', notes: '', cell_group_id: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-4 h-4" /> {t('addMeeting')}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">{editing ? t('editMeeting') : t('addMeeting')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cellGroup')}</label>
                  <CellGroupSelector value={form.cell_group_id} onChange={(id) => setForm({ ...form, cell_group_id: id || '' })} showAllOption={false} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('meetingDate')}</label>
                  <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('venue')}</label>
                  <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !form.cell_group_id} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50">{saving ? '...' : t('save')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">{t('cancel')}</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
            const isPast = dateObj < new Date();
            return (
              <div key={meeting.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition ${isPast ? 'border-gray-200 opacity-70' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-600'}`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {meeting.venue}</span>
                        </div>
                      </div>
                    </div>
                    {meeting.notes && <p className="text-sm text-gray-500 ml-13">{meeting.notes}</p>}
                    <div className="flex items-center gap-2 ml-13">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{meeting.cell_group_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => copyReminder(meeting)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title={t('copyReminder')}>
                      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openDutyModal(meeting.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition" title={t('assignDuty')}>
                      <Calendar className="w-4 h-4" />
                    </button>
                    <Link href={`/meetings/${meeting.id}/rsvp`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title={t('rsvp')}>
                      <CheckCircle className="w-4 h-4" />
                    </Link>
                    <button onClick={() => startEdit(meeting)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(meeting.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMeetings.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        )}

        {showDutyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('assignDuty')}</h2>
                <div className="flex gap-2">
                  <button onClick={() => autoAssign(showDutyModal)} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition">{t('autoAssign')}</button>
                  <button onClick={() => setShowDutyModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">x</button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {assignments
                  .filter((a) => a.event_id === showDutyModal)
                  .map((a) => {
                    const capable = getCapableMembers(a.role_id);
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <span className="w-32 text-sm font-medium text-gray-700 truncate">{a.role_name}</span>
                        <select
                          value={a.member_id || ''}
                          onChange={(e) => assignMember(a.id, e.target.value || null)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                          <option value="">{t('unassigned')}</option>
                          <optgroup label="Recommended">
                            {capable.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="All members">
                            {members.filter((m) => !capable.find((c) => c.id === m.id)).map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    );
                  })}
                {assignments.filter((a) => a.event_id === showDutyModal).length === 0 && (
                  <p className="text-gray-500 text-center">{t('noData')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
