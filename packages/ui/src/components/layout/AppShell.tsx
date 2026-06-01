"use client";

import { cn } from "../../lib/utils";

interface AppShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ header, sidebar, children, className }: AppShellProps) {
  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", className)}>
      {sidebar && <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border">{sidebar}</aside>}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {header && <header className="shrink-0 border-b border-border">{header}</header>}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
