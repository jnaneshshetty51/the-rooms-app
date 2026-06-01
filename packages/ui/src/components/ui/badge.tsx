import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        success: "border-transparent bg-success text-white shadow hover:bg-success/80",
        warning: "border-transparent bg-warning text-white shadow hover:bg-warning/80",
        outline: "text-foreground border border-border",
        vacant: "border-transparent bg-vacant text-white shadow",
        occupied: "border-transparent bg-occupied text-white shadow",
        maintenance: "border-transparent bg-maintenance text-white shadow",
        booked: "border-transparent bg-secondary text-white shadow",
        checked_in: "border-transparent bg-primary text-primary-foreground shadow",
        checked_out: "border-transparent bg-muted text-white shadow",
        cancelled: "border-transparent bg-destructive text-white shadow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
