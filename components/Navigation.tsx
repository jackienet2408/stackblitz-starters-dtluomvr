'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { usePathname } from 'next/navigation';
import { Menu, X, Hop as Home, Users, BookOpen, Clock, Calendar, MessageSquare, Settings, LogOut, Globe, ClipboardList, ChevronDown, FolderCog } from 'lucide-react';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);

  const mainNavItems = [
    { href: '/dashboard', label: t('dashboard'), icon: Home },
    { href: '/schedule', label: t('schedule'), icon: Calendar },
    { href: '/reminders', label: t('reminders'), icon: MessageSquare },
  ];

  const planningItems = [
    { href: '/meetings', label: t('meetings'), icon: Calendar },
    { href: '/duty-roster', label: t('dutyRosterPlanner'), icon: ClipboardList },
  ];

  const manageItems = [
    { href: '/cell-groups', label: t('cellGroups'), icon: Users },
    { href: '/members', label: t('members'), icon: Users },
    { href: '/roles', label: t('roles'), icon: BookOpen },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isManageActive = manageItems.some((item) => isActive(item.href));
  const isPlanningActive = planningItems.some((item) => isActive(item.href));

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              CG
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">{t('appNameShort')}</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isActive(item.href)
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <div className="relative">
              <button
                onClick={() => setPlanningOpen(!planningOpen)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isPlanningActive || planningOpen
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {t('planning')}
                <ChevronDown className={`w-3 h-3 transition ${planningOpen ? 'rotate-180' : ''}`} />
              </button>
              {planningOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  {planningItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setPlanningOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
                        isActive(item.href)
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setManageOpen(!manageOpen)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isManageActive || manageOpen
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FolderCog className="w-4 h-4" />
                {t('manage')}
                <ChevronDown className={`w-3 h-3 transition ${manageOpen ? 'rotate-180' : ''}`} />
              </button>
              {manageOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  {manageItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setManageOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
                        isActive(item.href)
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              title={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs ml-1">{lang === 'en' ? 'EN' : 'ZH'}</span>
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-2 space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(item.href)
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Calendar className="w-3 h-3" /> {t('planning')}
            </div>
            {planningItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <FolderCog className="w-3 h-3" /> {t('manage')}
            </div>
            {manageItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
