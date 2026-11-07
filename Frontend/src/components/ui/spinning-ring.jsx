"use client";

import React from "react";

/**
 * Static spinning green ring animation component.
 * Features an outer glow track and a high-speed emerald spinning ring.
 */
export default function SpinningRing({
  size = "md",
  className = "",
  label = null,
}) {
  const sizeMap = {
    xs: { outer: "w-3.5 h-3.5", border: "border-[1.5px]" },
    sm: { outer: "w-4 h-4", border: "border-2" },
    md: { outer: "w-6 h-6", border: "border-2" },
    lg: { outer: "w-12 h-12", border: "border-[3px]" },
    xl: { outer: "w-16 h-16", border: "border-4" },
  };

  const { outer, border } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer subtle static track ring */}
      <span
        className={`absolute inset-0 rounded-full border-emerald-500/20 ${outer} ${border}`}
        aria-hidden="true"
      />

      {/* Active spinning green ring */}
      <span
        className={`rounded-full border-transparent border-t-[#16A34A] border-r-[#22C55E] animate-spin ${outer} ${border}`}
        style={{ animationDuration: "0.85s" }}
        role="status"
        aria-label={label || "Loading animation"}
      />

      {/* Inner glowing core accent */}
      <span
        className="absolute w-1.5 h-1.5 rounded-full bg-[#16A34A]/80 shadow-[0_0_8px_#22C55E]"
        aria-hidden="true"
      />
    </div>
  );
}

