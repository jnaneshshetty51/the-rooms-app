"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Calendar } from "lucide-react";
import { cn } from "@the-rooms/ui";

const navLinks = [
  { href: "/home", label: "Home" },
  { href: "/rooms", label: "Rooms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/amenities", label: "Amenities" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">TR</span>
              </div>
              <span className={cn(
                "font-heading font-bold text-xl tracking-tight transition-colors",
                scrolled ? "text-primary" : "text-white"
              )}>
                THE ROOMS
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-secondary",
                    scrolled ? "text-primary/80" : "text-white/80 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/book"
                className={cn(
                  "hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  scrolled
                    ? "bg-secondary text-white hover:bg-secondary/90 shadow-md"
                    : "bg-white text-primary hover:bg-white/90 shadow-md"
                )}
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className={cn(
                  "lg:hidden p-2 rounded-lg transition-colors",
                  scrolled ? "text-primary hover:bg-accent" : "text-white hover:bg-white/10"
                )}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-heading font-bold text-lg text-primary">THE ROOMS</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <Link
                href="/book"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-secondary text-white rounded-lg font-semibold text-sm"
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
