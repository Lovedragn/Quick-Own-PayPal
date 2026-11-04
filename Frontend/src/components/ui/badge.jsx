import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium w-fit transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-white shadow-xs",
        secondary:
          "border-[var(--line)] bg-[var(--bg-band)] text-[var(--ink-2)]",
        outline:
          "border-[var(--line)] text-[var(--ink-2)] bg-transparent",
        stock:
          "border-[rgba(111,169,86,0.3)] bg-[rgba(111,169,86,0.15)] text-[var(--accent-text)] font-semibold",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-800",
        paypal:
          "border-transparent bg-[var(--paypal)] text-white font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

