'use client';

// apps/web/src/components/pwa/PWAProvider.tsx
// Wraps PWA components - ServiceWorkerRegistration and InstallPrompt

import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { usePathname } from 'next/navigation';

// Only show install prompt on marketing pages (not booking flow)
const MARKETING_PATHS = ['/', '/home', '/rooms', '/pricing', '/amenities', '/contact', '/faq'];

export function PWAProvider() {
  const pathname = usePathname();
  const isMarketingPage = MARKETING_PATHS.some(path => pathname === path || pathname.startsWith(path));

  return (
    <>
      <ServiceWorkerRegistration />
      {isMarketingPage && <PWAInstallPrompt />}
    </>
  );
}

export default PWAProvider;