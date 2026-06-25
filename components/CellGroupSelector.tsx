'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language';
import { supabase } from '@/lib/supabase';
import { Building2, ChevronDown } from 'lucide-react';

interface CellGroup {
  id: string;
  group_name: string;
  venue: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
}

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  showAllOption?: boolean;
  className?: string;
}

export default function CellGroupSelector({ value, onChange, showAllOption = true, className = '' }: Props) {
  const { t } = useLanguage();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCellGroups = async () => {
      const { data } = await supabase.from('cell_groups').select('id, group_name, venue, meeting_day, meeting_time').order('group_name');
      if (data) setCellGroups(data);
      setLoading(false);
    };
    fetchCellGroups();
  }, []);

  const selected = cellGroups.find((cg) => cg.id === value);

  if (loading) return <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-orange-400 transition ${className}`}
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.group_name : t('allCellGroups')}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {showAllOption && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-orange-50 transition ${
                value === null ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{t('allCellGroups')}</div>
            </button>
          )}
          {cellGroups.map((cg) => (
            <button
              key={cg.id}
              onClick={() => {
                onChange(cg.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-orange-50 transition ${
                value === cg.id ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{cg.group_name}</div>
              {cg.venue && <div className="text-xs text-gray-500">{cg.venue}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
