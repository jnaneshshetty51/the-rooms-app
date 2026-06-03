import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: {
    default: "Front Office — The Rooms",
    template: "%s | The Rooms Front Office",
  },
  description: "The Rooms Hotel Front Office Portal",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#E17055",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TheRoomsProvider>
          {children}
          <ServiceWorkerRegistration />
        </TheRoomsProvider>
      </body>
    </html>
  );
}
