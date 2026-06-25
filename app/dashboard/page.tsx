'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import HeroCard from '@/components/HeroCard';
import UpcomingMeetings from '@/components/UpcomingMeetings';
import QuickStats from '@/components/QuickStats';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('welcome')}, {user.display_name || user.email?.split('@')[0] || t('appName')}
        </h1>
        <HeroCard />
        <QuickStats />
        <UpcomingMeetings />
      </main>
    </div>
  );
}
