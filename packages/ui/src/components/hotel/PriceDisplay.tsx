"use client";

import { cn, formatCurrency } from "../../lib/utils";

interface PriceDisplayProps {
  amount: number;
  original?: number;
  discount?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({
  amount,
  original,
  discount,
  currency = "INR",
  size = "md",
  className,
}: PriceDisplayProps) {
  const showOriginal = original && original > amount;
  const savePercent = discount ?? (showOriginal ? Math.round(((original! - amount) / original!) * 100) : 0);

  const SIZE_CLASSES = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-bold text-primary font-heading", SIZE_CLASSES[size])}>
        {formatCurrency(amount, currency)}
      </span>
      {showOriginal && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(original!, currency)}
          </span>
          {savePercent > 0 && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-white">
              {savePercent}% OFF
            </span>
          )}
        </>
      )}
    </div>
  );
}
