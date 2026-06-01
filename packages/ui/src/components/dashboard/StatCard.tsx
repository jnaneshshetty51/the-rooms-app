"use client";

import { TrendingDown, TrendingUpDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  format?: "currency" | "number" | "percent";
  icon?: React.ElementType;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  format = "number",
  icon: Icon,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  const formattedValue =
    format === "currency" && typeof value === "number"
      ? formatCurrency(value)
      : format === "percent"
      ? `${value}%`
      : value;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-primary font-heading tracking-tight">{formattedValue}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
                {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
                {isNeutral && <TrendingUpDown className="h-4 w-4 text-muted" />}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isPositive && "text-success",
                    isNegative && "text-destructive",
                    isNeutral && "text-muted-foreground"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-accent p-2.5">
              <Icon className="h-5 w-5 text-secondary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
