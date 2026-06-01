"use client";

import { cn } from "@the-rooms/ui";

interface Step {
  number: number;
  label: string;
}

interface BookingStepsProps {
  steps: Step[];
  currentStep?: number;
}

export function BookingSteps({ steps, currentStep = 1 }: BookingStepsProps) {
  return (
    <div className="hidden sm:flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  isCompleted && "bg-vacant text-white",
                  isCurrent && "bg-secondary text-white ring-4 ring-secondary/20",
                  !isCompleted && !isCurrent && "bg-accent text-muted"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className={cn(
                "mt-1.5 text-xs font-medium whitespace-nowrap",
                isCurrent ? "text-secondary" : isCompleted ? "text-vacant" : "text-muted"
              )}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                "w-16 sm:w-24 h-0.5 mx-1 mb-5 transition-colors",
                isCompleted ? "bg-vacant" : "bg-accent"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
