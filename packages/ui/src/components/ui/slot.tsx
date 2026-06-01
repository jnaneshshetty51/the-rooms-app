import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const slotVariants = cva("inline-flex items-center justify-center");

const SlotElement = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return <Comp ref={ref as React.Ref<HTMLDivElement>} className={cn(slotVariants(), className)} {...props} />;
  }
);
SlotElement.displayName = "SlotElement";

export { SlotElement };
