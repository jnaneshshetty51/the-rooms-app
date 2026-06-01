"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white border-t shadow-lg lg:bottom-4 lg:left-4 lg:right-auto lg:max-w-sm lg:rounded-xl lg:border">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 p-1 rounded text-muted hover:text-primary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-sm text-primary/80 mb-4 pr-6">
        We use cookies to improve your experience. By continuing, you agree to our{" "}
        <Link href="/privacy" className="text-secondary underline">Privacy Policy</Link>.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="w-full py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
