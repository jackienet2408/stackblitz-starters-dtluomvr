'use client';

import { useEffect, useState } from 'react';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Initialize PWA functionality only on the server to avoid hydration mismatch
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setMounted(true);

      // Add apple-touch-icon for iOS
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = '/apple-touch-icon.png';
      document.head.appendChild(link);

      // Register SW on first visit (only in production)
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

  // Render children only after mounting to prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen"></div>;
  }

  return children;
}