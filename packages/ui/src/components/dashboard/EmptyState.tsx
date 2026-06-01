"use client";

import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="mb-4 text-muted-foreground">
        {icon || (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-40"
          >
            <rect x="10" y="20" width="60" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="32" x2="70" y2="32" stroke="currentColor" strokeWidth="2" />
            <line x1="26" y1="32" x2="26" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="42" y1="32" x2="42" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="58" y1="32" x2="58" y2="60" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </div>
      <h3 className="font-heading text-lg font-semibold text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
