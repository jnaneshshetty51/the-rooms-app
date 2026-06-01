'use client';

// apps/front-office/src/components/pwa/ServiceWorkerRegistration.tsx
// Registers service worker for front office PWA

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Front Office SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Front Office SW registration failed:', error);
        });
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;