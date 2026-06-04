import Link from "next/link";
import { MapPin, Phone, Mail, MessageCircle, Instagram, Facebook, Twitter } from "lucide-react";

const quickLinks = [
  { href: "/rooms", label: "Rooms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/amenities", label: "Amenities" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const policies = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cancellation", label: "Cancellation Policy" },
];

export function SiteFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo-white.svg" alt="The Rooms Logo" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Your space. Your stay. Premium hotel accommodations for daily and monthly stays.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              Explore
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              Policies
            </h3>
            <ul className="space-y-2">
              {policies.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-secondary shrink-0" />
                <span className="text-sm text-white/70">
                  The Rooms Hotel, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary shrink-0" />
                <a href="tel:+917349047799" className="text-sm text-white/70 hover:text-white transition-colors">
                  +91 73490 47799
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary shrink-0" />
                <a href="mailto:hello@therooms.in" className="text-sm text-white/70 hover:text-white transition-colors">
                  hello@therooms.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-secondary shrink-0" />
                <a href="https://wa.me/917204619899" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-white transition-colors">
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © 2026 The Rooms. All rights reserved. GST: 29XXXXXXXXX1Z5
          </p>
          <p className="text-xs text-white/30">
            Built with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}
