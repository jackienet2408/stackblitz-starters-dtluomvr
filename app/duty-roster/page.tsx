'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { ClipboardList, Zap, Trash2, Copy, ChevronDown, ChevronUp, Calendar, Clock, MapPin, CircleCheck as CheckCircle } from 'lucide-react';

interface Role {
  id: string;
  role_name: string;
  cell_group_id: string;
}

interface Meeting {
  id: string;
  event_date: string;
  start_time: string;
  venue: string;
  cell_group_id: string;
  cell_group_name: string;
  roles: Role[];
}

interface Member {
  id: string;
  name: string;
  cell_group_id: string;
  is_active: boolean;
  role_capabilities: string[];
}

interface Assignment {
  id: string;
  event_id: string;
  role_id: string;
  member_id: string | null;
}

interface Rsvp {
  meeting_id: string;
  member_id: string;
  status: 'available' | 'unavailable' | 'tentative';
}

interface ServingStats {
  member_id: string;
  name: string;
  count1m: number;
  count3m: number;
  count6m: number;
  count12m: number;
}

type TimeRange = 4 | 8 | 12;

export default function DutyRosterPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<TimeRange>(8);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [stats, setStats] = useState<ServingStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCell, setActiveCell] = useState<string | null>(null); // "eventId:roleId"
  const [showAllStats, setShowAllStats] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, cellGroupId, weeks]);

  const fetchAll = async () => {
    setLoadingData(true);
    await Promise.all([fetchMeetings(), fetchRoles(), fetchMembers(), fetchRsvps()]);
    setLoadingData(false);
  };

  const fetchMeetings = async () => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + weeks * 7);

    const query = supabase
      .from('events')
      .select('id, event_date, start_time, venue, notes, cell_group_id, cell_groups!inner(group_name)')
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    const { data } = await query;
    if (data) {
      setMeetings(
        data.map((d) => {
          const cg = d.cell_groups as any;
          return {
            id: d.id,
            event_date: d.event_date,
            start_time: d.start_time,
            venue: d.venue,
            cell_group_id: d.cell_group_id,
            cell_group_name: cg?.group_name || '',
            roles: [],
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
    if (data) {
      const mapped = data.map((m) => ({
        ...m,
        role_capabilities: m.role_capabilities || [],
      }));
      setMembers(mapped);
    }
  };

  const fetchRsvps = async () => {
    const { data } = await supabase.from('rsvps').select('meeting_id, member_id, status');
    if (data) setRsvps(data);
  };

  const fetchAssignments = async (eventIds: string[]) => {
    if (eventIds.length === 0) {
      setAssignments([]);
      return;
    }
    const { data } = await supabase
      .from('roster_assignments')
      .select('id, event_id, role_id, member_id')
      .in('event_id', eventIds);
    if (data) {
      setAssignments(data);
    }
  };

  const fetchServingStats = async (memberIds: string[]) => {
    if (memberIds.length === 0) {
      setStats([]);
      return;
    }
    const now = new Date();
    const d1 = new Date(now);
    d1.setMonth(now.getMonth() - 1);
    const d3 = new Date(now);
    d3.setMonth(now.getMonth() - 3);
    const d6 = new Date(now);
    d6.setMonth(now.getMonth() - 6);
    const d12 = new Date(now);
    d12.setMonth(now.getMonth() - 12);

    const { data } = await supabase
      .from('roster_assignments')
      .select('event_id, member_id, events!inner(event_date)')
      .in('member_id', memberIds)
      .not('member_id', 'is', null);

    const memberMap = new Map<string, { name: string; count1m: number; count3m: number; count6m: number; count12m: number }>();
    for (const m of members) {
      if (memberIds.includes(m.id)) {
        memberMap.set(m.id, { name: m.name, count1m: 0, count3m: 0, count6m: 0, count12m: 0 });
      }
    }

    if (data) {
      for (const row of data) {
        const e = row.events as any;
        const date = e?.event_date ? new Date(e.event_date) : null;
        if (!date || !row.member_id) continue;
        const rec = memberMap.get(row.member_id);
        if (!rec) continue;
        if (date >= d1) rec.count1m++;
        if (date >= d3) rec.count3m++;
        if (date >= d6) rec.count6m++;
        if (date >= d12) rec.count12m++;
      }
    }

    setStats(
      Array.from(memberMap.entries()).map(([member_id, v]) => ({
        member_id,
        name: v.name,
        count1m: v.count1m,
        count3m: v.count3m,
        count6m: v.count6m,
        count12m: v.count12m,
      }))
    );
  };

  useEffect(() => {
    const eventIds = filteredMeetings.map((m) => m.id);
    fetchAssignments(eventIds);
  }, [meetings, cellGroupId]);

  useEffect(() => {
    const memberIds = filteredMembers.map((m) => m.id);
    fetchServingStats(memberIds);
  }, [members, cellGroupId]);

  const filteredMeetings = useMemo(() => {
    if (!cellGroupId) return meetings;
    return meetings.filter((m) => m.cell_group_id === cellGroupId);
  }, [meetings, cellGroupId]);

  const filteredRoles = useMemo(() => {
    if (!cellGroupId) return roles;
    return roles.filter((r) => r.cell_group_id === cellGroupId);
  }, [roles, cellGroupId]);

  const filteredMembers = useMemo(() => {
    if (!cellGroupId) return members;
    return members.filter((m) => m.cell_group_id === cellGroupId);
  }, [members, cellGroupId]);

  const getCellRoles = (meeting: Meeting) => {
    const cellRoles = roles.filter((r) => r.cell_group_id === meeting.cell_group_id);
    return cellRoles;
  };

  const getAssignment = (eventId: string, roleId: string) => {
    return assignments.find((a) => a.event_id === eventId && a.role_id === roleId);
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const m = members.find((mem) => mem.id === memberId);
    return m?.name || null;
  };

  const getMemberStat = (memberId: string | null) => {
    if (!memberId) return null;
    return stats.find((s) => s.member_id === memberId);
  };

  const getRsvp = (meetingId: string, memberId: string) => {
    return rsvps.find((r) => r.meeting_id === meetingId && r.member_id === memberId);
  };

  const getCapableMembers = (roleId: string) => {
    return filteredMembers.filter((m) => m.role_capabilities.includes(roleId));
  };

  const getServingStatus = (count1m: number) => {
    if (count1m === 0) return { label: t('idle'), color: 'bg-red-50 text-red-700 border-red-200' };
    if (count1m <= 2) return { label: t('underServed'), color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    if (count1m <= 5) return { label: t('balanced'), color: 'bg-green-50 text-green-700 border-green-200' };
    return { label: t('overServed'), color: 'bg-orange-50 text-orange-700 border-orange-200' };
  };

  const getMemberStatusColor = (meetingId: string, memberId: string | null) => {
    if (!memberId) return 'bg-gray-100 text-gray-400 border-gray-200';
    const rsvp = getRsvp(meetingId, memberId);
    if (rsvp?.status === 'available') return 'bg-green-50 text-green-700 border-green-200';
    if (rsvp?.status === 'tentative') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (rsvp?.status === 'unavailable') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const assignMember = async (assignmentId: string, memberId: string | null) => {
    setSaving(true);
    await supabase.from('roster_assignments').update({ member_id: memberId }).eq('id', assignmentId);
    const eventIds = filteredMeetings.map((m) => m.id);
    await fetchAssignments(eventIds);
    const memberIds = filteredMembers.map((m) => m.id);
    await fetchServingStats(memberIds);
    setSaving(false);
    setActiveCell(null);
  };

  const createAssignment = async (eventId: string, roleId: string, memberId: string | null) => {
    setSaving(true);
    const { data } = await supabase
      .from('roster_assignments')
      .insert({ event_id: eventId, role_id: roleId, member_id: memberId })
      .select('id, event_id, role_id, member_id')
      .single();
    if (data) {
      setAssignments((prev) => [...prev, data]);
    }
    const memberIds = filteredMembers.map((m) => m.id);
    await fetchServingStats(memberIds);
    setSaving(false);
    setActiveCell(null);
  };

  const handleCellClick = (eventId: string, roleId: string) => {
    const key = `${eventId}:${roleId}`;
    setActiveCell((prev) => (prev === key ? null : key));
  };

  const handleSelectMember = async (eventId: string, roleId: string, memberId: string | null) => {
    const existing = getAssignment(eventId, roleId);
    if (existing) {
      await assignMember(existing.id, memberId);
    } else {
      await createAssignment(eventId, roleId, memberId);
    }
  };

  const handleClearAll = async () => {
    if (!cellGroupId) return;
    const ids = filteredMeetings.map((m) => m.id);
    if (ids.length === 0) return;
    await supabase.from('roster_assignments').delete().in('event_id', ids);
    setAssignments((prev) => prev.filter((a) => !ids.includes(a.event_id)));
    const memberIds = filteredMembers.map((m) => m.id);
    await fetchServingStats(memberIds);
  };

  const handleAutoAssign = async () => {
    if (!cellGroupId || filteredMeetings.length === 0) return;
    setSaving(true);

    const eventIds = filteredMeetings.map((m) => m.id);
    const { data: allAssignments } = await supabase
      .from('roster_assignments')
      .select('id, event_id, role_id, member_id')
      .in('event_id', eventIds);

    const assignmentMap = new Map<string, Assignment[]>();
    if (allAssignments) {
      for (const a of allAssignments) {
        const list = assignmentMap.get(a.event_id) || [];
        list.push(a);
        assignmentMap.set(a.event_id, list);
      }
    }

    const allEventIds = filteredMeetings.map((m) => m.id);
    const existingIds = new Set((allAssignments || []).map((a) => a.id));

    const memberIds = filteredMembers.map((m) => m.id);
    const currentStats = new Map<string, number>();
    for (const s of stats) {
      currentStats.set(s.member_id, s.count1m);
    }

    for (const meeting of filteredMeetings) {
      const meetingRoles = getCellRoles(meeting);
      const meetingAssignments = assignmentMap.get(meeting.id) || [];
      const assignedMemberIds = new Set(
        meetingAssignments.filter((a) => a.member_id).map((a) => a.member_id!)
      );

      for (const role of meetingRoles) {
        const existing = meetingAssignments.find((a) => a.role_id === role.id);
        if (existing && existing.member_id) continue;

        const candidates = filteredMembers.filter((m) => {
          if (!m.role_capabilities.includes(role.id)) return false;
          if (assignedMemberIds.has(m.id)) return false;
          const rsvp = getRsvp(meeting.id, m.id);
          if (rsvp?.status === 'unavailable') return false;
          return true;
        });

        if (candidates.length === 0) continue;

        candidates.sort((a, b) => {
          const aRsvp = getRsvp(meeting.id, a.id);
          const bRsvp = getRsvp(meeting.id, b.id);
          const aAvailable = aRsvp?.status === 'available' ? 0 : 1;
          const bAvailable = bRsvp?.status === 'available' ? 0 : 1;
          if (aAvailable !== bAvailable) return aAvailable - bAvailable;

          const aCount = currentStats.get(a.id) || 0;
          const bCount = currentStats.get(b.id) || 0;
          return aCount - bCount;
        });

        const chosen = candidates[0];
        if (existing) {
          await supabase.from('roster_assignments').update({ member_id: chosen.id }).eq('id', existing.id);
        } else {
          await supabase.from('roster_assignments').insert({ event_id: meeting.id, role_id: role.id, member_id: chosen.id });
        }
        assignedMemberIds.add(chosen.id);
        const current = currentStats.get(chosen.id) || 0;
        currentStats.set(chosen.id, current + 1);
      }
    }

    await fetchAssignments(allEventIds);
    await fetchServingStats(memberIds);
    setSaving(false);
  };

  const copyReminder = (meeting: Meeting) => {
    const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
    const lines = [
      `*${meeting.cell_group_name}*`,
      ``,
      `${t('meetingDate')}: ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      `${t('startTime')}: ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      `${t('venue')}: ${meeting.venue}`,
    ];
    const cellRoles = getCellRoles(meeting);
    if (cellRoles.length > 0) {
      lines.push(``);
      lines.push(`*${t('dutyRoster')}:*`);
      for (const role of cellRoles) {
        const a = getAssignment(meeting.id, role.id);
        const name = a?.member_id ? getMemberName(a.member_id) : null;
        lines.push(`- ${role.role_name}: ${name || t('unassigned')}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => a.count1m - b.count1m);
  }, [stats]);

  const statsToShow = showAllStats ? sortedStats : sortedStats.slice(0, 6);

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
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('dutyRosterPlanner')}</h1>
          <div className="flex gap-3 items-center flex-wrap">
            <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={false} />
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value) as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value={4}>{t('nextWeeks')} 4 {t('weeks')}</option>
              <option value={8}>{t('nextWeeks')} 8 {t('weeks')}</option>
              <option value={12}>{t('nextWeeks')} 12 {t('weeks')}</option>
            </select>
            {cellGroupId && (
              <>
                <button
                  onClick={handleAutoAssign}
                  disabled={saving || filteredMeetings.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" /> {t('autoAssign')}
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={saving || filteredMeetings.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> {t('clearAll')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stats sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-orange-600" />
                {t('servingStats')}
              </h2>
              {sortedStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('noData')}</p>
              ) : (
                <div className="space-y-2">
                  {statsToShow.map((stat) => {
                    const status = getServingStatus(stat.count1m);
                    return (
                      <div key={stat.member_id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                            {stat.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{stat.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold text-gray-700">
                            {stat.count1m}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {sortedStats.length > 6 && (
                    <button
                      onClick={() => setShowAllStats(!showAllStats)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition"
                    >
                      {showAllStats ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> {t('showLess')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> {t('showMore')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-500">1m</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {stats.reduce((sum, s) => sum + s.count1m, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">3m</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {stats.reduce((sum, s) => sum + s.count3m, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">6m</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {stats.reduce((sum, s) => sum + s.count6m, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">12m</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {stats.reduce((sum, s) => sum + s.count12m, 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matrix */}
          <div className="flex-1 min-w-0">
            {!cellGroupId ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('selectCellGroup')}</p>
              </div>
            ) : loadingData ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent mx-auto" />
                <p className="text-gray-500 mt-3 text-sm">{t('loading')}</p>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('noUpcomingMeetings')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Sticky header */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid sticky top-0 z-10 bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: `200px repeat(${filteredRoles.length}, minmax(140px, 1fr))` }}>
                      <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200">
                        {t('meetingDate')}
                      </div>
                      {filteredRoles.map((role) => (
                        <div key={role.id} className="px-3 py-3 text-xs font-semibold text-gray-700 text-center border-l border-gray-200">
                          {role.role_name}
                        </div>
                      ))}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100">
                      {filteredMeetings.map((meeting) => {
                        const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
                        const cellRoles = getCellRoles(meeting);
                        return (
                          <div key={meeting.id} className="grid" style={{ gridTemplateColumns: `200px repeat(${filteredRoles.length}, minmax(140px, 1fr))` }}>
                            {/* Meeting info cell */}
                            <div className="px-4 py-3 border-r border-gray-100 sticky left-0 bg-white z-10">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 flex-shrink-0">
                                  <span className="text-xs font-bold">{dateObj.getDate()}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                <MapPin className="w-3 h-3" /> {meeting.venue}
                              </div>
                              <button
                                onClick={() => copyReminder(meeting)}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100 transition"
                              >
                                {copiedId === meeting.id ? (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                {copiedId === meeting.id ? t('reminderCopied') : t('copyReminder')}
                              </button>
                            </div>

                            {/* Role cells */}
                            {filteredRoles.map((role) => {
                              const assignment = getAssignment(meeting.id, role.id);
                              const memberId = assignment?.member_id || null;
                              const memberName = getMemberName(memberId);
                              const stat = getMemberStat(memberId);
                              const cellKey = `${meeting.id}:${role.id}`;
                              const isActive = activeCell === cellKey;
                              const capable = getCapableMembers(role.id);
                              const statusColor = getMemberStatusColor(meeting.id, memberId);

                              return (
                                <div
                                  key={role.id}
                                  className="px-2 py-2 border-l border-gray-100 relative"
                                >
                                  <button
                                    onClick={() => handleCellClick(meeting.id, role.id)}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg border text-sm transition ${
                                      memberName
                                        ? `${statusColor} hover:shadow-sm`
                                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={memberName ? 'font-medium' : 'italic'}>
                                        {memberName || t('unassigned')}
                                      </span>
                                      {stat && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          {stat.count1m}x
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {isActive && (
                                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                                      <button
                                        onClick={() => handleSelectMember(meeting.id, role.id, null)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition border-b border-gray-100"
                                      >
                                        {t('unassigned')}
                                      </button>
                                      {capable.length > 0 && (
                                        <div className="px-3 py-1 text-xs font-semibold text-orange-600 bg-orange-50">
                                          {t('recommended')}
                                        </div>
                                      )}
                                      {capable
                                        .sort((a, b) => {
                                          const aStat = getMemberStat(a.id);
                                          const bStat = getMemberStat(b.id);
                                          return (aStat?.count1m ?? 0) - (bStat?.count1m ?? 0);
                                        })
                                        .map((m) => {
                                          const mStat = getMemberStat(m.id);
                                          const rsvp = getRsvp(meeting.id, m.id);
                                          return (
                                            <button
                                              key={m.id}
                                              onClick={() => handleSelectMember(meeting.id, role.id, m.id)}
                                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition flex items-center justify-between gap-2"
                                            >
                                              <span className="text-gray-900">{m.name}</span>
                                              <div className="flex items-center gap-1.5">
                                                {rsvp?.status === 'available' && (
                                                  <span className="w-2 h-2 rounded-full bg-green-500" title="Available" />
                                                )}
                                                {rsvp?.status === 'tentative' && (
                                                  <span className="w-2 h-2 rounded-full bg-yellow-500" title="Tentative" />
                                                )}
                                                {rsvp?.status === 'unavailable' && (
                                                  <span className="w-2 h-2 rounded-full bg-red-500" title="Unavailable" />
                                                )}
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                  {mStat?.count1m ?? 0}x
                                                </span>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      {filteredMembers.filter(
                                        (m) => !capable.find((c) => c.id === m.id)
                                      ).length > 0 && (
                                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-100">
                                          {t('otherMembers')}
                                        </div>
                                      )}
                                      {filteredMembers
                                        .filter((m) => !capable.find((c) => c.id === m.id))
                                        .map((m) => (
                                          <button
                                            key={m.id}
                                            onClick={() => handleSelectMember(meeting.id, role.id, m.id)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition flex items-center justify-between gap-2"
                                          >
                                            <span className="text-gray-600">{m.name}</span>
                                            <span className="text-[10px] text-gray-400">
                                              {(getMemberStat(m.id)?.count1m ?? 0)}x
                                            </span>
                                          </button>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          {t('saving')}
        </div>
      )}
    </div>
  );
}
