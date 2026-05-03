import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-body font-sans text-foreground shadow-sm shadow-black/5 transition-[color,box-shadow,border-color]",
            "placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground",
            "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive"
              : "border-input",
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-action",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
