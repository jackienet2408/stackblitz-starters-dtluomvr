'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { UserPlus, CreditCard as Edit2, Trash2, Crown, Phone, CircleCheck as CheckCircle } from 'lucide-react';

interface Member {
  id: string;
  cell_group_id: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  is_active: boolean;
  is_leader: boolean;
  avatar_url: string | null;
  role_capabilities: string[];
  cell_group_name: string;
  created_at: string;
}

interface Role {
  id: string;
  role_name: string;
  name_zh: string | null;
  cell_group_id: string;
}

interface CellGroup {
  id: string;
  group_name: string;
}

export default function MembersPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [cellGroups, setCellGroups] = useState<Record<string, CellGroup>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: '', whatsapp_number: '', email: '', is_active: true, is_leader: false, role_capabilities: [] as string[], cell_group_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchMembers();
      fetchRoles();
      fetchCellGroups();
    }
  }, [user]);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('name');
    if (data) {
      const membersWithCg = await Promise.all(
        data.map(async (m) => {
          const { data: cg } = await supabase.from('cell_groups').select('group_name').eq('id', m.cell_group_id).single();
          return {
            ...m,
            role_capabilities: m.role_capabilities || [],
            cell_group_name: cg?.group_name || '',
          };
        })
      );
      setMembers(membersWithCg);
    }
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('role_name');
    if (data) setRoles(data);
  };

  const fetchCellGroups = async () => {
    const { data } = await supabase.from('cell_groups').select('id, group_name').order('group_name');
    if (data) {
      const map: Record<string, CellGroup> = {};
      data.forEach((cg) => { map[cg.id] = cg; });
      setCellGroups(map);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cell_group_id) return;
    setSaving(true);
    const payload = { ...form, cell_group_id: form.cell_group_id };
    if (editing) {
      await supabase.from('members').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('members').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', whatsapp_number: '', email: '', is_active: true, is_leader: false, role_capabilities: [], cell_group_id: '' });
    fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('areYouSure'))) return;
    await supabase.from('members').delete().eq('id', id);
    fetchMembers();
  };

  const toggleCapability = (roleId: string) => {
    setForm((prev) => ({
      ...prev,
      role_capabilities: prev.role_capabilities.includes(roleId)
        ? prev.role_capabilities.filter((id) => id !== roleId)
        : [...prev.role_capabilities, roleId],
    }));
  };

  const startEdit = (m: Member) => {
    setEditing(m);
    setForm({
      name: m.name,
      whatsapp_number: m.whatsapp_number || '',
      email: m.email || '',
      is_active: m.is_active,
      is_leader: m.is_leader,
      role_capabilities: m.role_capabilities || [],
      cell_group_id: m.cell_group_id,
    });
    setShowForm(true);
  };

  const filteredMembers = cellGroupId ? members.filter((m) => m.cell_group_id === cellGroupId) : members;

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
          <h1 className="text-2xl font-bold text-gray-900">{t('members')}</h1>
          <div className="flex gap-3 items-center">
            <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={true} />
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', whatsapp_number: '', email: '', is_active: true, is_leader: false, role_capabilities: [], cell_group_id: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <UserPlus className="w-4 h-4" /> {t('addMember')}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">{editing ? t('editMember') : t('addMember')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cellGroup')}</label>
                  <select
                    value={form.cell_group_id}
                    onChange={(e) => setForm({ ...form, cell_group_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">{t('select')}</option>
                    {Object.values(cellGroups).map((cg) => (
                      <option key={cg.id} value={cg.id}>{cg.group_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('whatsappNumber')}</label>
                  <input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-orange-600 rounded" />
                    <span className="text-sm">{t('isActive')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_leader} onChange={(e) => setForm({ ...form, is_leader: e.target.checked })} className="w-4 h-4 text-orange-600 rounded" />
                    <span className="text-sm">{t('isLeader')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tagToRoles')}</label>
                <div className="flex flex-wrap gap-2">
                  {roles.filter((r) => r.cell_group_id === form.cell_group_id || !form.cell_group_id).map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleCapability(role.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        form.role_capabilities.includes(role.id)
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {role.role_name}
                    </button>
                  ))}
                  {roles.length === 0 && <p className="text-sm text-gray-400">{t('noData')}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !form.cell_group_id} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50">{saving ? '...' : t('save')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">{t('cancel')}</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => (
            <div key={m.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition ${m.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      {m.is_leader && <Crown className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {m.whatsapp_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {m.whatsapp_number}</span>}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{m.cell_group_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {m.role_capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.role_capabilities.map((rc) => {
                    const role = roles.find((r) => r.id === rc);
                    return role ? (
                      <span key={rc} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-100">{role.role_name}</span>
                    ) : null;
                  })}
                </div>
              )}
              {m.is_active && <div className="mt-2 flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> {t('isActive')}</div>}
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
