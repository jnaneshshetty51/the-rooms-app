// apps/guest-portal/src/app/layout.tsx
import type { Metadata } from "next";
import "@/app/globals.css";
import { TheRoomsProvider } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: {
    default: "Guest Portal — The Rooms",
    template: "%s | The Rooms Guest",
  },
  description: "Your personal guest portal — manage bookings, documents, and services at The Rooms hotel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TheRoomsProvider>{children}</TheRoomsProvider>
      </body>
    </html>
  );
}
