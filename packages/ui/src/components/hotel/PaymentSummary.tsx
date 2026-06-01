"use client";

import { Separator } from "../ui/separator";
import { formatCurrency, cn } from "../../lib/utils";

interface PaymentLineItem {
  label: string;
  amount: number;
  type?: "positive" | "negative" | "discount";
}

interface PaymentSummaryProps {
  items: PaymentLineItem[];
  total: number;
  currency?: string;
  className?: string;
}

export function PaymentSummary({ items, total, currency = "INR", className }: PaymentSummaryProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span
            className={cn(
              "font-medium",
              item.type === "discount" && "text-success",
              item.type === "negative" && "text-destructive"
            )}
          >
            {item.type === "negative" ? "−" : item.type === "discount" ? "−" : ""}
            {formatCurrency(item.amount, currency)}
          </span>
        </div>
      ))}
      <Separator />
      <div className="flex items-center justify-between font-bold">
        <span className="font-heading text-base">Total</span>
        <span className="font-heading text-lg text-primary">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}
