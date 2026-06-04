"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/917204619899?text=Hi%2C%20I%27d%20like%20to%20book%20a%20room"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center pulse-ring"
    >
      <MessageCircle className="w-7 h-7" fill="currentColor" />
    </a>
  );
}
