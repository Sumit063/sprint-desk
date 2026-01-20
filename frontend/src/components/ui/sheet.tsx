import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({ className, ...props }: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/30" />
      <DialogPrimitive.Content
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-slate-200 bg-white p-6 shadow-xl",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: DialogPrimitive.DialogTitleProps) {
  return (
    <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />
  );
}

export function SheetDescription({ className, ...props }: DialogPrimitive.DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-slate-600", className)}
      {...props}
    />
  );
}
