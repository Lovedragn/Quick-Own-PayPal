import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] hover:-translate-y-0.5",
        paypal:
          "bg-[var(--paypal)] text-white shadow-sm hover:bg-[var(--paypal-hover)] hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(0,112,186,0.25)] hover:shadow-[0_4px_14px_rgba(0,112,186,0.35)]",
        secondary:
          "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:bg-white hover:border-[var(--line-strong)]",
        ghost:
          "hover:bg-[var(--bg-band)] text-[var(--ink-2)] hover:text-[var(--ink)]",
        outline:
          "border border-[var(--line)] bg-transparent hover:bg-[var(--surface)] text-[var(--ink)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

