import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink)] shadow-xs transition-all duration-200 hover:border-[var(--line-strong)] hover:shadow-md flex flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-2.5 p-5 pb-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "font-serif font-bold text-lg leading-snug tracking-tight text-[var(--ink)]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-xs text-[var(--ink-2)] leading-relaxed", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-5 pt-0 flex-1 flex flex-col gap-3.5", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex flex-col gap-3 p-5 pt-3 border-t border-[var(--line)] bg-[var(--surface)]",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

