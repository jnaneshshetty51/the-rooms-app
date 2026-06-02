"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "../components/dashboard/ToastProvider";

interface TheRoomsProviderProps {
  children: React.ReactNode;
}

export function TheRoomsProvider({ children }: TheRoomsProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
