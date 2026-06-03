import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { TheRoomsProvider } from "@the-rooms/ui";
import { Toaster } from "react-hot-toast";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "The Rooms — Your Space. Your Stay.",
    template: "%s | The Rooms",
  },
  description:
    "Premium hotel accommodations in India. 36 rooms across Studio and Premium categories. Daily and monthly stays available.",
  keywords: ["hotel", "accommodation", "Bangalore", "Studio room", "Premium room", "monthly stay", "daily stay", "India"],
  authors: [{ name: "The Rooms" }],
  creator: "The Rooms",
  publisher: "The Rooms",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://therooms.in",
    siteName: "The Rooms",
    title: "The Rooms — Your Space. Your Stay.",
    description: "Premium hotel accommodations in India. 36 rooms across Studio and Premium categories. Daily and monthly stays available.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "The Rooms Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Rooms — Your Space. Your Stay.",
    description: "Premium hotel accommodations in India. 36 rooms across Studio and Premium categories.",
    images: ["/icons/icon-512x512.png"],
    creator: "@therooms",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Rooms",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#E17055",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <JsonLd />
      </head>
      <body className="font-sans antialiased bg-background text-primary min-h-screen flex flex-col">
        <TheRoomsProvider>
          <ReactQueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#2D3436",
                  color: "#FAFAF8",
                  borderRadius: "0.75rem",
                },
              }}
            />
            <PWAProvider />
          </ReactQueryProvider>
        </TheRoomsProvider>
      </body>
    </html>
  );
}
