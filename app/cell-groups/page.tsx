'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import {
  Building2,
  Plus,
  CreditCard as Edit2,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Phone,
  Crown,
  CircleCheck as CheckCircle,
} from 'lucide-react';

interface CellGroup {
  id: string;
  group_name: string;
  description: string | null;
  venue: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  image_url: string | null;
  created_at: string;
}

interface Member {
  id: string;
  cell_group_id: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  is_active: boolean;
  is_leader: boolean;
  role_capabilities: string[];
}

interface Role {
  id: string;
  role_name: string;
  cell_group_id: string;
}

export default function CellGroupsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CellGroup | null>(null);
  const [form, setForm] = useState({
    group_name: '',
    description: '',
    venue: '',
    meeting_day: '',
    meeting_time: '',
  });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    whatsapp_number: '',
    email: '',
    is_active: true,
    is_leader: false,
    role_capabilities: [] as string[],
  });
  const [memberSaving, setMemberSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCellGroups();
      fetchMembers();
      fetchRoles();
    }
  }, [user]);

  const fetchCellGroups = async () => {
    const { data } = await supabase
      .from('cell_groups')
      .select('*')
      .order('group_name');
    if (data) setCellGroups(data);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('name');
    if (data)
      setMembers(
        data.map((m) => ({
          ...m,
          role_capabilities: m.role_capabilities || [],
        }))
      );
  };

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('role_name');
    if (data) setRoles(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await supabase.from('cell_groups').update(form).eq('id', editing.id);
    } else {
      await supabase.from('cell_groups').insert(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({
      group_name: '',
      description: '',
      venue: '',
      meeting_day: '',
      meeting_time: '',
    });
    fetchCellGroups();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('areYouSure'))) return;
    await supabase.from('cell_groups').delete().eq('id', id);
    fetchCellGroups();
  };

  const startEdit = (cg: CellGroup) => {
    setEditing(cg);
    setForm({
      group_name: cg.group_name,
      description: cg.description || '',
      venue: cg.venue || '',
      meeting_day: cg.meeting_day || '',
      meeting_time: cg.meeting_time || '',
    });
    setShowForm(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedId) return;
    setMemberSaving(true);
    const payload = {
      ...memberForm,
      cell_group_id: expandedId,
    };
    await supabase.from('members').insert(payload);
    setMemberSaving(false);
    setShowMemberForm(false);
    setMemberForm({
      name: '',
      whatsapp_number: '',
      email: '',
      is_active: true,
      is_leader: false,
      role_capabilities: [],
    });
    fetchMembers();
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm(t('areYouSure'))) return;
    await supabase.from('members').delete().eq('id', id);
    fetchMembers();
  };

  const toggleMemberCapability = (roleId: string) => {
    setMemberForm((prev) => ({
      ...prev,
      role_capabilities: prev.role_capabilities.includes(roleId)
        ? prev.role_capabilities.filter((id) => id !== roleId)
        : [...prev.role_capabilities, roleId],
    }));
  };

  const getMembersForGroup = (groupId: string) =>
    members.filter((m) => m.cell_group_id === groupId);

  const days = [
    t('monday'),
    t('tuesday'),
    t('wednesday'),
    t('thursday'),
    t('friday'),
    t('saturday'),
    t('sunday'),
  ];
  const dayKeys = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('cellGroups')}</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setForm({
                group_name: '',
                description: '',
                venue: '',
                meeting_day: '',
                meeting_time: '',
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <Plus className="w-4 h-4" /> {t('addCellGroup')}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? t('editCellGroup') : t('addCellGroup')}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('cellGroupName')}
                  </label>
                  <input
                    value={form.group_name}
                    onChange={(e) =>
                      setForm({ ...form, group_name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('venue')}
                  </label>
                  <input
                    value={form.venue}
                    onChange={(e) =>
                      setForm({ ...form, venue: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('meetingDay')}
                  </label>
                  <select
                    value={form.meeting_day}
                    onChange={(e) =>
                      setForm({ ...form, meeting_day: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">{t('select')}</option>
                    {dayKeys.map((dk, i) => (
                      <option key={dk} value={dk}>
                        {days[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('meetingTime')}
                  </label>
                  <input
                    type="time"
                    value={form.meeting_time}
                    onChange={(e) =>
                      setForm({ ...form, meeting_time: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('description')}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {saving ? '...' : t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {cellGroups.map((cg) => {
            const cgMembers = getMembersForGroup(cg.id);
            const isExpanded = expandedId === cg.id;
            return (
              <div
                key={cg.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-5 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : cg.id)
                        }
                        className="p-1 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {cg.group_name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600 mt-1">
                          {cg.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />{' '}
                              {cg.venue}
                            </div>
                          )}
                          {cg.meeting_day && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />{' '}
                              {cg.meeting_day}
                            </div>
                          )}
                          {cg.meeting_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />{' '}
                              {cg.meeting_time}
                            </div>
                          )}
                        </div>
                        {cg.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {cg.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {cgMembers.length} {t('members').toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(cg)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cg.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {t('members')}
                      </h4>
                      <button
                        onClick={() => {
                          setShowMemberForm(true);
                          setMemberForm({
                            name: '',
                            whatsapp_number: '',
                            email: '',
                            is_active: true,
                            is_leader: false,
                            role_capabilities: [],
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm hover:bg-orange-100 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> {t('addMember')}
                      </button>
                    </div>

                    {showMemberForm && (
                      <div className="mb-4 bg-gray-50 rounded-lg p-4">
                        <form onSubmit={handleSaveMember} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t('name')}
                              </label>
                              <input
                                value={memberForm.name}
                                onChange={(e) =>
                                  setMemberForm({
                                    ...memberForm,
                                    name: e.target.value,
                                  })
                                }
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t('whatsappNumber')}
                              </label>
                              <input
                                value={memberForm.whatsapp_number}
                                onChange={(e) =>
                                  setMemberForm({
                                    ...memberForm,
                                    whatsapp_number: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t('email')}
                              </label>
                              <input
                                type="email"
                                value={memberForm.email}
                                onChange={(e) =>
                                  setMemberForm({
                                    ...memberForm,
                                    email: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={memberForm.is_active}
                                onChange={(e) =>
                                  setMemberForm({
                                    ...memberForm,
                                    is_active: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="text-sm">{t('isActive')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={memberForm.is_leader}
                                onChange={(e) =>
                                  setMemberForm({
                                    ...memberForm,
                                    is_leader: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="text-sm">{t('isLeader')}</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              {t('tagToRoles')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {roles
                                .filter(
                                  (r) =>
                                    r.cell_group_id === cg.id ||
                                    !r.cell_group_id
                                )
                                .map((role) => (
                                  <button
                                    key={role.id}
                                    type="button"
                                    onClick={() =>
                                      toggleMemberCapability(role.id)
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                      memberForm.role_capabilities.includes(
                                        role.id
                                      )
                                        ? 'bg-orange-50 border-orange-300 text-orange-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                  >
                                    {role.role_name}
                                  </button>
                                ))}
                              {roles.filter(
                                (r) =>
                                  r.cell_group_id === cg.id ||
                                  !r.cell_group_id
                              ).length === 0 && (
                                <p className="text-sm text-gray-400">
                                  {t('noData')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={memberSaving}
                              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition disabled:opacity-50"
                            >
                              {memberSaving ? '...' : t('save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowMemberForm(false)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-2">
                      {cgMembers.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            m.is_active
                              ? 'bg-white border-gray-100'
                              : 'bg-gray-50 border-gray-100 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {m.name}
                                </span>
                                {m.is_leader && (
                                  <Crown className="w-3.5 h-3.5 text-orange-500" />
                                )}
                                {m.is_active && (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {m.whatsapp_number && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />{' '}
                                    {m.whatsapp_number}
                                  </span>
                                )}
                                {m.email && (
                                  <span>{m.email}</span>
                                )}
                              </div>
                              {m.role_capabilities.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.role_capabilities.map((rc) => {
                                    const role = roles.find(
                                      (r) => r.id === rc
                                    );
                                    return role ? (
                                      <span
                                        key={rc}
                                        className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-100"
                                      >
                                        {role.role_name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {cgMembers.length === 0 && !showMemberForm && (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-400">
                          {t('noData')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cellGroups.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">{t('noCellGroups')}</p>
            <p className="text-sm text-gray-400">
              {t('createCellGroupFirst')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
