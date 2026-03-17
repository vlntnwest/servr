"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

const ResponsiveModal = DialogPrimitive.Root;
const ResponsiveModalTrigger = DialogPrimitive.Trigger;
const ResponsiveModalClose = DialogPrimitive.Close;
const ResponsiveModalPortal = DialogPrimitive.Portal;

const ResponsiveModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ResponsiveModalOverlay.displayName = "ResponsiveModalOverlay";

interface ResponsiveModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  /** Extra classes applied only on mobile (sheet mode) */
  mobileClassName?: string;
  /** Extra classes applied only on desktop (dialog mode) */
  desktopClassName?: string;
}

const ResponsiveModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResponsiveModalContentProps
>(
  (
    { className, mobileClassName, desktopClassName, children, hideCloseButton, ...props },
    ref
  ) => {
    const isMobile = useIsMobile();

    return (
      <ResponsiveModalPortal>
        <ResponsiveModalOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 bg-white shadow-xl",
            isMobile
              ? cn(
                  "inset-x-0 bottom-0",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                  "data-[state=closed]:duration-300 data-[state=open]:duration-500",
                  mobileClassName
                )
              : cn(
                  "left-1/2 top-1/2 w-full max-w-lg rounded-xl",
                  "-translate-x-1/2 -translate-y-1/2",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "duration-200",
                  desktopClassName
                ),
            className
          )}
          aria-describedby={undefined}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus:outline-none">
              <X className="h-5 w-5" strokeWidth={2} />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </ResponsiveModalPortal>
    );
  }
);
ResponsiveModalContent.displayName = "ResponsiveModalContent";

const ResponsiveModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-4 border-b border-black/8", className)} {...props} />
);
ResponsiveModalHeader.displayName = "ResponsiveModalHeader";

const ResponsiveModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold", className)}
    {...props}
  />
));
ResponsiveModalTitle.displayName = "ResponsiveModalTitle";

export {
  ResponsiveModal,
  ResponsiveModalTrigger,
  ResponsiveModalClose,
  ResponsiveModalPortal,
  ResponsiveModalOverlay,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
};
