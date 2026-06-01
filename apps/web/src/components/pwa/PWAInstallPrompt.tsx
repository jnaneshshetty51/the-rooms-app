'use client';

// apps/web/src/components/pwa/PWAInstallPrompt.tsx
// Shows "Add to Home Screen" prompt after 3s + 20% scroll (as per checklist)

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after delay (3s + 20% scroll per checklist)
      setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY / scrollHeight;
        
        if (scrolled >= 0.2 || window.scrollY > 500) {
          setShowPrompt(true);
        } else {
          // Listen for scroll threshold
          const handleScroll = () => {
            const newScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const newScrolled = window.scrollY / newScrollHeight;
            if (newScrolled >= 0.2 || window.scrollY > 500) {
              setShowPrompt(true);
              window.removeEventListener('scroll', handleScroll);
            }
          };
          window.addEventListener('scroll', handleScroll);
          return () => window.removeEventListener('scroll', handleScroll);
        }
      }, 3000);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  };

  if (!showPrompt || !deferredPrompt || hasBeenShown) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl p-4 border border-accent/20">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted hover:text-primary transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-primary text-sm mb-1">
              Install The Rooms App
            </h3>
            <p className="text-xs text-muted mb-3">
              Get quick access and a better experience on your device.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Type declaration for BeforeInstallPromptEvent
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default PWAInstallPrompt;