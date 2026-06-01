'use client';

// apps/guest-portal/src/components/navigation/BottomTabNav.tsx
// Bottom tab navigation for mobile guest portal

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, CalendarDays, FileText, User, Settings } from 'lucide-react';
import { cn } from '@the-rooms/ui';

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomTabNav() {
  const pathname = usePathname();

  // Check if current path matches nav item
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
                active 
                  ? 'text-[#E17055]' 
                  : 'text-[#636E72] hover:text-[#2D3436]'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'text-[#E17055]')} />
              <span className={cn(
                'text-[10px] font-medium',
                active ? 'text-[#E17055]' : 'text-[#636E72]'
              )}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-[#E17055] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabNav;