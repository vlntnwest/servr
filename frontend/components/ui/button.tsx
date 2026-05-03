import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill font-sans font-medium transition-all outline-none tracking-cta focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 shadow-sm shadow-black/5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 text-body",
        sm: "h-9 px-4 text-body-sm gap-1.5",
        lg: "h-14 px-8 text-body",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
