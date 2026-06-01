'use client';

// apps/guest-portal/src/app/not-found.tsx
// 404 page for guest portal

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@the-rooms/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E17055] flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <span className="font-bold text-sm text-[#2D3436]">The Rooms</span>
            <p className="text-[10px] text-[#636E72] leading-tight">Guest Portal</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-8xl font-bold text-[#E17055] mb-4">404</div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-2">
            Page Not Found
          </h1>
          <p className="text-[#636E72] mb-6">
            Sorry, we couldn't find the page you're looking for. 
            It might have been moved or deleted.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              asChild 
              className="bg-[#E17055] hover:bg-[#D35B3F]"
            >
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-4 py-4 text-center">
        <p className="text-xs text-[#636E72]">
          &copy; {new Date().getFullYear()} The Rooms. All rights reserved.
        </p>
      </footer>
    </div>
  );
}