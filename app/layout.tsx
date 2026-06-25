import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/language';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cell Group Duty Roster',
  description: 'Manage cell group duty rosters, meetings, and member availability',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
