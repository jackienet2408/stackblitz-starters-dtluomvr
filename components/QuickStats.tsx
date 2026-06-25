'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language';
import { supabase } from '@/lib/supabase';
import { Users, UserCheck, Calendar, CircleAlert as AlertCircle } from 'lucide-react';

export default function QuickStats() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, active: 0, upcoming: 0, unassigned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: members } = await supabase.from('members').select('*');
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .gte('event_date', new Date().toISOString().split('T')[0]);
      const { data: assignments } = await supabase.from('roster_assignments').select('*');

      const total = members?.length || 0;
      const active = members?.filter((m) => m.is_active).length || 0;
      const upcoming = events?.length || 0;
      const assigned = assignments?.filter((a) => a.member_id).length || 0;
      const unassigned = (assignments?.length || 0) - assigned;

      setStats({ total, active, upcoming, unassigned });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />;
  }

  const items = [
    { label: t('totalMembers'), value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: t('activeMembers'), value: stats.active, icon: UserCheck, color: 'bg-green-50 text-green-600' },
    { label: t('upcomingMeetings'), value: stats.upcoming, icon: Calendar, color: 'bg-orange-50 text-orange-600' },
    { label: t('unassigned'), value: stats.unassigned, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
