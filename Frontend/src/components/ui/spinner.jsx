"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Spinner({
  className,
  size = "default",
  strokeWidth = 3,
  ...props
}) {
  const sizeMap = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    default: "h-6 w-6",
    lg: "h-10 w-10",
    xl: "h-14 w-14",
  };

  const resolvedSize = sizeMap[size] || sizeMap.default;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin text-current", resolvedSize, className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export { Spinner };
export default Spinner;

