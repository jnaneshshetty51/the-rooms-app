import * as React from "react";
import * as FormPrimitive from "@radix-ui/react-form";
import { cn } from "../../lib/utils";

// Re-export the primitives that exist in this version of @radix-ui/react-form
const Form = FormPrimitive.Root;
const FormField = FormPrimitive.Field;
const FormLabel = FormPrimitive.Label;
const FormControl = FormPrimitive.Control;
const FormMessage = FormPrimitive.Message;
const FormSubmit = FormPrimitive.Submit;

// Item and Description don't exist in this Radix version — use div/span instead
interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}
const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
);
FormItem.displayName = "FormItem";

interface FormDescriptionProps extends React.HTMLAttributes<HTMLSpanElement> {}
const FormDescription = React.forwardRef<HTMLSpanElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
FormDescription.displayName = "FormDescription";

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSubmit,
};
