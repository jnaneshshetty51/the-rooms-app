'use client';

// apps/guest-portal/src/components/layout/GuestPortalFooter.tsx
// Footer for guest portal

import Link from 'next/link';

export function GuestPortalFooter({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-white border-t border-gray-200 px-4 py-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Logo and Tagline */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-[#E17055] flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-bold text-sm text-[#2D3436]">The Rooms</span>
          </div>
          <p className="text-xs text-[#636E72]">Your Space. Your Stay.</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <h4 className="font-medium text-[#2D3436] mb-2 text-xs uppercase tracking-wide text-[#636E72]">Quick Links</h4>
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard" className="text-[#636E72] hover:text-[#E17055] text-xs">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="text-[#636E72] hover:text-[#E17055] text-xs">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href="/documents" className="text-[#636E72] hover:text-[#E17055] text-xs">
                  Documents
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-[#2D3436] mb-2 text-xs uppercase tracking-wide text-[#636E72]">Support</h4>
            <ul className="space-y-1">
              <li>
                <Link href="/complaints" className="text-[#636E72] hover:text-[#E17055] text-xs">
                  Raise Issue
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-[#636E72] hover:text-[#E17055] text-xs">
                  Share Feedback
                </Link>
              </li>
              <li>
                <a 
                  href="https://therooms.in/contact" 
                  className="text-[#636E72] hover:text-[#E17055] text-xs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-xs text-[#636E72]">
            &copy; {currentYear} The Rooms. All rights reserved.
          </p>
          <p className="text-[10px] text-[#B2BEC3] mt-1">
            GST: 29AAACH1234P1Z5
          </p>
        </div>
      </div>
    </footer>
  );
}

export default GuestPortalFooter;