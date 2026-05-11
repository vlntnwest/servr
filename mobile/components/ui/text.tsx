import { cn } from "@/lib/utils";
import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText, type Role } from "react-native";

const textVariants = cva(
  cn(
    "text-foreground text-base font-sans",
    Platform.select({
      web: "select-text",
    }),
  ),
  {
    variants: {
      variant: {
        default: "text-body",
        display: cn(
          "font-display text-display tracking-tighter leading-none",
          Platform.select({ web: "text-balance" }),
        ),
        h1: cn(
          "font-display text-4xl tracking-tight leading-none",
          Platform.select({ web: "scroll-m-20 text-balance" }),
        ),
        h2: cn(
          "font-display text-3xl tracking-tight",
          Platform.select({ web: "scroll-m-20 first:mt-0" }),
        ),
        h3: cn(
          "font-display text-2xl tracking-tight",
          Platform.select({ web: "scroll-m-20" }),
        ),
        h4: cn(
          "font-sans-semibold text-xl",
          Platform.select({ web: "scroll-m-20" }),
        ),
        cardLabel: "font-display-italic text-card-label leading-none",
        p: "mt-3 leading-7 sm:mt-6",
        blockquote: "mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6",
        code: cn(
          "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm",
        ),
        lead: "text-muted-foreground text-xl",
        large: "font-sans-semibold text-lg",
        small: "font-sans-medium text-sm leading-none",
        caption: "font-sans-medium text-caption uppercase tracking-widest",
        muted: "text-muted-foreground text-sm",
        badge: "font-sans-semibold text-caption",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  blockquote: Platform.select({ web: "blockquote" as Role }),
  code: Platform.select({ web: "code" as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: "1",
  h2: "2",
  h3: "3",
  h4: "4",
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = "default",
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, textVariants, TextClassContext };
