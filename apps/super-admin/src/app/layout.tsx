// apps/super-admin/src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <TheRoomsProvider>{children}</TheRoomsProvider>
      </body>
    </html>
  );
}
