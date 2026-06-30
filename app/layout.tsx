'use client';

import { Inter } from 'next/font/google';

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/language';
import { useEffect, useCallback, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cell Group Duty Roster',
  description: 'Manage cell group duty rosters, meetings, and member availability',
  manifest: '/manifest.json',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Add apple-touch-icon for iOS
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = '/apple-touch-icon.png';
      document.head.appendChild(link);

      // Register SW on first visit (if available)
      if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => console.log('[SW] Registered:', reg.scope))
            .catch((err) => console.log('[SW] Registration failed:', err));
        });
      }
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cell Group Duty Roster" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
