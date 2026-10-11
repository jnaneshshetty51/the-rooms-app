// apps/guest-portal/src/app/layout.tsx
import type { Metadata } from "next";
import "@/app/globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";

// ─── Hotel Structured Data ──────────────────────────────────────────────────
const hotelSchema = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "The Rooms",
  description: "A premium hotel property management system offering comfortable stays with modern amenities.",
  url: "https://therooms.in",
  telephone: "+91-80-xxxx-xxxx",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "12.9716",
    longitude: "77.5946",
  },
  starRating: {
    "@type": "Rating",
    ratingValue: "4",
  },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Free WiFi" },
    { "@type": "LocationFeatureSpecification", name: "Air Conditioning" },
    { "@type": "LocationFeatureSpecification", name: "Room Service" },
    { "@type": "LocationFeatureSpecification", name: "Parking" },
  ],
};

// ─── WebSite Structured Data ─────────────────────────────────────────────────
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "The Rooms Guest Portal",
  url: "https://therooms.in",
  description: "Guest portal for managing bookings, payments, and services at The Rooms hotel.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://therooms.in/bookings?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://therooms.in"),
  title: {
    default: "Guest Portal — The Rooms",
    template: "%s | The Rooms Guest",
  },
  description: "Your personal guest portal — manage bookings, documents, and services at The Rooms hotel. Easy check-in, payments, and more.",
  keywords: [
    "hotel booking",
    "guest portal",
    "hotel management",
    "room booking",
    "check-in",
    "hotel services",
    "The Rooms hotel",
    "Bangalore hotel",
  ],
  authors: [{ name: "The Rooms" }],
  creator: "The Rooms",
  publisher: "The Rooms",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "The Rooms Guest Portal",
    title: "Guest Portal — The Rooms",
    description: "Your personal guest portal — manage bookings, documents, and services at The Rooms hotel.",
    url: "https://therooms.in",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Rooms Guest Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@theroomsin",
    creator: "@theroomsin",
    title: "Guest Portal — The Rooms",
    description: "Your personal guest portal — manage bookings, documents, and services at The Rooms hotel.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://therooms.in",
    languages: {
      "en-IN": "https://therooms.in",
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <TheRoomsProvider>{children}</TheRoomsProvider>
      </body>
    </html>
  );
}
