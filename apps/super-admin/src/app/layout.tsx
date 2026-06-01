// apps/super-admin/src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: "Super Admin Portal — The Rooms",
  description: "The Rooms hotel management system — Super Admin control center",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Inter:wght@300..600;400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <TheRoomsProvider>{children}</TheRoomsProvider>
      </body>
    </html>
  );
}
