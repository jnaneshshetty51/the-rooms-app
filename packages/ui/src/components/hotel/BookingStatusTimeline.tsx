"use client";

import { CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface Step {
  label: string;
  status: "completed" | "active" | "pending" | "skipped";
  date?: string;
}

interface BookingStatusTimelineProps {
  steps: Step[];
  className?: string;
}

export function BookingStatusTimeline({ steps, className }: BookingStatusTimelineProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                step.status === "completed" && "border-success bg-success text-white",
                step.status === "active" && "border-primary bg-primary text-primary-foreground shadow-md",
                step.status === "pending" && "border-muted bg-muted/30 text-muted-foreground",
                step.status === "skipped" && "border-dashed border-muted text-muted-foreground"
              )}
            >
              {step.status === "completed" && <CheckCircle className="h-4 w-4" />}
            </div>
            <div className="mt-1.5 text-center">
              <p
                className={cn(
                  "text-xs font-medium",
                  step.status === "active" && "text-primary font-semibold",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "skipped" && "text-muted-foreground italic",
                  step.status === "completed" && "text-success"
                )}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-[10px] text-muted-foreground">{step.date}</p>
              )}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-[2px] w-12 sm:w-20 mx-1",
                steps[i + 1].status === "completed" ? "bg-success" : "bg-muted/40"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
