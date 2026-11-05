"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Unified IconButton Component
 * Consistent centralized size (w-9 h-9), consistent color (Channel3 border-slate-300 / white / hover:slate-100),
 * accepts any SVG icon as a parameter or child.
 */
export default function IconButton({
  icon: Icon,
  children,
  onClick,
  active = false,
  activeVariant = "primary",
  title,
  ariaLabel,
  className,
  rounded = "full",
  href,
  target,
  rel,
  disabled = false,
  type = "button",
  ...props
}) {
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-none";

  const getActiveClass = () => {
    if (!active) {
      return "bg-white hover:bg-slate-100 text-slate-700 hover:text-black border-slate-300";
    }
    if (activeVariant === "rose") {
      return "bg-rose-50 border-rose-500 text-rose-600 hover:bg-rose-100";
    }
    return "bg-[#0070BA] text-white border-[#0070BA]";
  };

  const baseClasses = cn(
    "w-9 h-9 flex-shrink-0 flex items-center justify-center border shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
    roundedClass,
    getActiveClass(),
    className
  );

  const iconElement = Icon ? (
    <Icon
      className={cn(
        "w-4 h-4 transition-transform",
        active && activeVariant === "rose" ? "fill-rose-600 text-rose-600" : ""
      )}
    />
  ) : (
    children
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || title}
        className={baseClasses}
        {...props}
      >
        {iconElement}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
      className={baseClasses}
      {...props}
    >
      {iconElement}
    </button>
  );
}

export { IconButton };

