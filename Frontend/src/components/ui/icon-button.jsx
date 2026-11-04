"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Unified IconButton Component
 * Consistent size (w-7 h-7), consistent color (Channel3 border-slate-300 / white / hover:slate-100),
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
  rounded = "none",
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
      return "bg-rose-500 text-white border-rose-500";
    }
    return "bg-[#0070BA] text-white border-[#0070BA]";
  };

  const baseClasses = cn(
    "w-7 h-7 flex-shrink-0 flex items-center justify-center border shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
    roundedClass,
    getActiveClass(),
    className
  );

  const iconElement = Icon ? (
    <Icon
      className={cn(
        "w-3.5 h-3.5 transition-transform",
        active && activeVariant === "rose" && "fill-white"
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

