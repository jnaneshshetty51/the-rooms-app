"use client";

import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, subtitle, actions, className }: PageHeaderProps) {
  const desc = description ?? subtitle;
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-6", className)}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-primary tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">{actions}</div>}
    </div>
  );
}
