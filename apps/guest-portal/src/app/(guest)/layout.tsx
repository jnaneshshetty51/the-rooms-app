import type { Metadata } from "next";
import GuestLayoutClient from "./GuestLayoutClient";

// ─── Guest Portal Layout Metadata ───────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "Guest Dashboard | The Rooms",
    template: "%s | The Rooms Guest",
  },
  description: "Access your guest dashboard to manage bookings, view invoices, request services, and more at The Rooms hotel.",
  keywords: [
    "hotel guest portal",
    "guest dashboard",
    "hotel booking management",
    "hotel services",
    "check-in online",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "The Rooms Guest Portal",
    title: "Guest Dashboard | The Rooms",
    description: "Access your guest dashboard to manage bookings, view invoices, request services, and more at The Rooms hotel.",
    url: "https://therooms.in/dashboard",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Rooms Guest Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@theroomsin",
    creator: "@theroomsin",
    title: "Guest Dashboard | The Rooms",
    description: "Access your guest dashboard to manage bookings, view invoices, request services, and more.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://therooms.in/dashboard",
  },
};

// ─── WebPage Structured Data ─────────────────────────────────────────────────
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "The Rooms Guest Dashboard",
  url: "https://therooms.in/dashboard",
  description: "Guest portal dashboard for managing hotel bookings and services.",
  isPartOf: {
    "@type": "WebSite",
    name: "The Rooms Guest Portal",
    url: "https://therooms.in",
  },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <GuestLayoutClient>{children}</GuestLayoutClient>
    </>
  );
}
