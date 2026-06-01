// apps/web/src/app/offline/page.tsx
// Offline fallback page - shown when network is unavailable

import { Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl">
        {/* Offline Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-bold text-primary mb-3">
          You're Offline
        </h1>
        <p className="text-muted mb-6">
          Please check your internet connection and try again. Your booking
          progress has been saved locally.
        </p>

        {/* What you can do offline */}
        <div className="bg-accent/10 rounded-xl p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-primary mb-2">
            While offline you can:
          </h2>
          <ul className="text-sm text-muted space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              View previously visited pages
            </li>
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              Browse room details from cache
            </li>
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              View pricing information
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Homepage
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted mt-6">
          Need help? Call us at +91-XXXXXXXXXX
        </p>
      </div>
    </div>
  );
}