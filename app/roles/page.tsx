'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import CellGroupSelector from '@/components/CellGroupSelector';
import { BookOpen, Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';

interface Role {
  id: string;
  role_name: string;
  name_zh: string | null;
  description: string | null;
  cell_group_id: string;
  created_at: string;
}

export default function RolesPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [cellGroupId, setCellGroupId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [cellGroups, setCellGroups] = useState<Record<string, { group_name: string }>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ role_name: '', name_zh: '', description: '', cell_group_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchRoles();
      fetchCellGroups();
    }
  }, [user]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('role_name');
    if (data) setRoles(data);
  };

  const fetchCellGroups = async () => {
    const { data } = await supabase.from('cell_groups').select('id, group_name').order('group_name');
    if (data) {
      const map: Record<string, { group_name: string }> = {};
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
      await supabase.from('roles').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('roles').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ role_name: '', name_zh: '', description: '', cell_group_id: '' });
    fetchRoles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('areYouSure'))) return;
    await supabase.from('roles').delete().eq('id', id);
    fetchRoles();
  };

  const startEdit = (r: Role) => {
    setEditing(r);
    setForm({ role_name: r.role_name, name_zh: r.name_zh || '', description: r.description || '', cell_group_id: r.cell_group_id });
    setShowForm(true);
  };

  const filteredRoles = cellGroupId ? roles.filter((r) => r.cell_group_id === cellGroupId) : roles;

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
          <h1 className="text-2xl font-bold text-gray-900">{t('roles')}</h1>
          <div className="flex gap-3 items-center">
            <CellGroupSelector value={cellGroupId} onChange={setCellGroupId} showAllOption={true} />
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm({ role_name: '', name_zh: '', description: '', cell_group_id: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-4 h-4" /> {t('addRole')}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">{editing ? t('editRole') : t('addRole')}</h2>
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
                    {Object.entries(cellGroups).map(([id, cg]) => (
                      <option key={id} value={id}>{cg.group_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('roleName')}</label>
                  <input value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('roleName')} (ZH)</label>
                  <input value={form.name_zh} onChange={(e) => setForm({ ...form, name_zh: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
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
          {filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.role_name}</h3>
                    {role.name_zh && <p className="text-xs text-gray-500">{role.name_zh}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(role)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{cellGroups[role.cell_group_id]?.group_name || ''}</span>
              </div>
              {role.description && <p className="text-sm text-gray-600 mt-2">{role.description}</p>}
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
