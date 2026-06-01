"use client";

import { ThemeProvider } from "next-themes";

interface TheRoomsProviderProps {
  children: React.ReactNode;
}

export function TheRoomsProvider({ children }: TheRoomsProviderProps) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem>{children}</ThemeProvider>;
}
