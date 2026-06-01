// apps/admin/src/app/layout.tsx
import type { Metadata } from "next";
import "@/app/globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: {
    default: "Admin Portal — The Rooms",
    template: "%s | The Rooms Admin",
  },
  description: "The Rooms Hotel Administration Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><TheRoomsProvider>{children}</TheRoomsProvider></body>
    </html>
  );
}
