'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { MessageSquare, Copy, CircleCheck as CheckCircle, Calendar, Clock, MapPin, ChevronDown, ChevronUp, CreditCard as Edit3, Save, RotateCcw, Info } from 'lucide-react';

interface Meeting {
  id: string;
  event_date: string;
  start_time: string;
  venue: string;
  cell_group_name: string;
  cell_group_id: string;
  notes: string | null;
}

interface Assignment {
  event_id: string;
  role_name: string;
  member_name: string | null;
}

interface ReminderTemplate {
  id: string;
  cell_group_id: string;
  message_en: string;
  message_zh: string;
}

const DEFAULT_TEMPLATE_EN = `*{{groupName}}*

{{date}} | {{time}}
{{venue}}

{{roles}}`;

const DEFAULT_TEMPLATE_ZH = `*{{groupName}}*

{{date}} | {{time}}
{{venue}}

{{roles}}`;

const PLACEHOLDERS = [
  { key: '{{groupName}}', label: 'placeholderGroupName' },
  { key: '{{date}}', label: 'placeholderDate' },
  { key: '{{time}}', label: 'placeholderTime' },
  { key: '{{venue}}', label: 'placeholderVenue' },
  { key: '{{roles}}', label: 'placeholderRoles' },
];

export default function RemindersPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [template, setTemplate] = useState<ReminderTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateEn, setTemplateEn] = useState(DEFAULT_TEMPLATE_EN);
  const [templateZh, setTemplateZh] = useState(DEFAULT_TEMPLATE_ZH);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchTemplate();
    }
  }, [user, cellGroupId]);

  const fetchData = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, event_date, start_time, venue, notes, cell_group_id, cell_groups!inner(group_name)')
      .order('event_date', { ascending: true });
    if (eventsData) {
      setMeetings(
        eventsData.map((d) => {
          const cg = d.cell_groups as any;
          return {
            id: d.id,
            event_date: d.event_date,
            start_time: d.start_time,
            venue: d.venue,
            cell_group_name: cg?.group_name || '',
            cell_group_id: d.cell_group_id,
            notes: d.notes,
          };
        })
      );
    }
    const { data: assignmentsData } = await supabase
      .from('roster_assignments')
      .select('event_id, roles!inner(role_name), members(name)');
    if (assignmentsData) {
      setAssignments(
        assignmentsData.map((d) => {
          const r = d.roles as any;
          const m = d.members as any;
          return { event_id: d.event_id, role_name: r?.role_name || '', member_name: m?.name || null };
        })
      );
    }
  };

  const fetchTemplate = async () => {
    if (!cellGroupId) {
      setTemplate(null);
      return;
    }
    const { data } = await supabase
      .from('reminder_messages')
      .select('id, cell_group_id, message_en, message_zh')
      .eq('cell_group_id', cellGroupId)
      .maybeSingle();
    if (data) {
      setTemplate(data);
      setTemplateEn(data.message_en || DEFAULT_TEMPLATE_EN);
      setTemplateZh(data.message_zh || DEFAULT_TEMPLATE_ZH);
    } else {
      setTemplate(null);
      setTemplateEn(DEFAULT_TEMPLATE_EN);
      setTemplateZh(DEFAULT_TEMPLATE_ZH);
    }
  };

  const saveTemplate = async () => {
    if (!cellGroupId) return;
    setSavingTemplate(true);
    if (template) {
      await supabase
        .from('reminder_messages')
        .update({ message_en: templateEn, message_zh: templateZh, updated_at: new Date().toISOString() })
        .eq('id', template.id);
    } else {
      await supabase
        .from('reminder_messages')
        .insert({ cell_group_id: cellGroupId, message_en: templateEn, message_zh: templateZh });
    }
    await fetchTemplate();
    setSavingTemplate(false);
    setEditingTemplate(false);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  const resetTemplate = () => {
    setTemplateEn(DEFAULT_TEMPLATE_EN);
    setTemplateZh(DEFAULT_TEMPLATE_ZH);
  };

  const buildReminder = (meeting: Meeting) => {
    const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const a = assignments.filter((a) => a.event_id === meeting.id);
    let rolesStr = '';
    if (a.length > 0) {
      rolesStr = a.map((as) => `- ${as.role_name}: ${as.member_name || t('unassigned')}`).join('\n');
    } else {
      rolesStr = t('noData');
    }

    const raw = lang === 'zh' ? (template?.message_zh || templateZh) : (template?.message_en || templateEn);

    return raw
      .replace(/\{\{groupName\}\}/g, meeting.cell_group_name)
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{time\}\}/g, timeStr)
      .replace(/\{\{venue\}\}/g, meeting.venue)
      .replace(/\{\{roles\}\}/g, rolesStr);
  };

  const copyReminder = (meeting: Meeting) => {
    const text = buildReminder(meeting);
    navigator.clipboard.writeText(text);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addToCalendar = (meeting: Meeting) => {
    const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
    const start = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.cell_group_name)}&dates=${start}/${end}&details=${encodeURIComponent(meeting.notes || '')}&location=${encodeURIComponent(meeting.venue)}`;
    window.open(url, '_blank');
  };

  const filteredMeetings = cellGroupId ? meetings.filter((m) => m.cell_group_id === cellGroupId) : meetings;

  const previewMeeting = useMemo(() => {
    if (filteredMeetings.length === 0) return null;
    return filteredMeetings[0];
  }, [filteredMeetings]);

  const previewText = useMemo(() => {
    if (!previewMeeting) return '';
    return buildReminder(previewMeeting);
  }, [previewMeeting, template, templateEn, templateZh, assignments, lang]);

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
          <h1 className="text-2xl font-bold text-gray-900">{t('reminders')}</h1>
          <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={true} />
        </div>

        {/* Template section */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">{t('reminderMessageTemplate')}</h2>
                <p className="text-xs text-gray-500">
                  {cellGroupId
                    ? (template ? t('templateSaved') : t('defaultReminderMessage'))
                    : t('selectCellGroup')}
                </p>
              </div>
            </div>
            {showTemplate ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showTemplate && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {!cellGroupId ? (
                <div className="py-6 text-center text-gray-500 text-sm">{t('selectCellGroup')}</div>
              ) : (
                <div className="pt-4 space-y-4">
                  {/* Placeholders */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mr-1">
                      <Info className="w-3 h-3" /> {t('placeholders')}:
                    </span>
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => {
                          const text = p.key;
                          const activeEl = document.activeElement as HTMLTextAreaElement | null;
                          if (activeEl && activeEl.tagName === 'TEXTAREA') {
                            const start = activeEl.selectionStart;
                            const end = activeEl.selectionEnd;
                            const val = activeEl.value;
                            const newVal = val.slice(0, start) + text + val.slice(end);
                            if (activeEl.name === 'en') setTemplateEn(newVal);
                            if (activeEl.name === 'zh') setTemplateZh(newVal);
                            setTimeout(() => {
                              activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
                              activeEl.focus();
                            }, 0);
                          }
                        }}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition border border-blue-200"
                        title="Click to insert at cursor"
                      >
                        {p.key} ({t(p.label)})
                      </button>
                    ))}
                  </div>

                  {/* Template editors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('messageTemplate')} (EN)</label>
                      <textarea
                        name="en"
                        value={templateEn}
                        onChange={(e) => setTemplateEn(e.target.value)}
                        rows={6}
                        disabled={!editingTemplate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono disabled:bg-gray-50 disabled:text-gray-500 resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('messageTemplate')} (ZH)</label>
                      <textarea
                        name="zh"
                        value={templateZh}
                        onChange={(e) => setTemplateZh(e.target.value)}
                        rows={6}
                        disabled={!editingTemplate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono disabled:bg-gray-50 disabled:text-gray-500 resize-y"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('preview')}</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono whitespace-pre-wrap text-gray-700 min-h-[80px]">
                      {previewText || t('noData')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {!editingTemplate ? (
                      <button
                        onClick={() => setEditingTemplate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                      >
                        <Edit3 className="w-4 h-4" /> {t('editTemplate')}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={saveTemplate}
                          disabled={savingTemplate}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" /> {savingTemplate ? '...' : t('saveTemplate')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingTemplate(false);
                            fetchTemplate();
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={resetTemplate}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                        >
                          <RotateCcw className="w-4 h-4" /> {t('useDefaultTemplate')}
                        </button>
                      </>
                    )}
                    {templateSaved && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" /> {t('templateSaved')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meetings list */}
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const dateObj = new Date(meeting.event_date + 'T' + meeting.start_time);
            const meetingAssignments = assignments.filter((a) => a.event_id === meeting.id);
            return (
              <div key={meeting.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{meeting.cell_group_name}</h3>
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{meeting.cell_group_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {meeting.venue}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCalendar(meeting)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                    >
                      <Calendar className="w-3.5 h-3.5" /> {t('addToCalendar')}
                    </button>
                    <button
                      onClick={() => copyReminder(meeting)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                    >
                      {copiedId === meeting.id ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === meeting.id ? t('reminderCopied') : t('copyReminder')}
                    </button>
                  </div>
                </div>
                {meetingAssignments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">{t('dutyRoster')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      {meetingAssignments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-gray-600">{a.role_name}:</span>
                          <span className={a.member_name ? 'font-medium text-gray-900' : 'text-gray-400 italic'}>
                            {a.member_name || t('unassigned')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
