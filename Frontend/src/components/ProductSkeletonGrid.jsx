"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import IconButton from "@/components/ui/icon-button";

export function ProductCardSkeleton({ index = 0 }) {
  return (
    <div
      className="border border-[#e9e9e9] bg-white flex flex-col justify-between overflow-hidden relative shadow-2xs"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Alt Image Holder with Wave-Like Pattern */}
      <div className="relative w-full aspect-[4/3] bg-[#fafafa] shimmer-wave flex items-center justify-center border-b border-[#f0f0f0] overflow-hidden">
        <ImageIcon className="w-10 h-10 text-zinc-300/80" strokeWidth={1.75} />
      </div>

      {/* Content Skeleton */}
      <div className="bg-white px-3.5 pt-3 pb-3 sm:pb-3.5 flex-1 flex flex-col justify-between border-t border-[#f0f0f0]">
        <div>
          {/* Swatch placeholder dots */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-3.5 h-3.5 rounded-full shimmer-wave" />
            <div className="w-3.5 h-3.5 rounded-full shimmer-wave" />
            <div className="w-3.5 h-3.5 rounded-full shimmer-wave" />
          </div>

          {/* Product Title placeholder */}
          <div className="h-4 w-4/5 shimmer-wave mb-2 rounded-none" />
          <div className="h-3 w-1/2 shimmer-wave mb-3 rounded-none" />

          {/* Merchant Pill placeholder */}
          <div className="h-6 w-full shimmer-wave mb-3 rounded-none" />
        </div>

        {/* Price & Button row */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="h-5 w-20 shimmer-wave rounded-none" />
            <div className="h-3 w-12 shimmer-wave rounded-none" />
          </div>
          <div className="h-9 w-full shimmer-wave rounded-none" />
        </div>
      </div>
    </div>
  );
}

export default function ProductSkeletonGrid({ count = 4 }) {
  const skeletons = Array.from({ length: count });

  return (
    <div className="w-full mt-8 mb-12">
      {/* Title above products */}
      <div className="mb-6">
        <h2 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight">
          Products
        </h2>
      </div>

      {/* Top Bar matching Channel3 demo: View All & Directional Controls */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-700 px-0.5">
        <div className="font-cal inline-flex items-center gap-1 font-medium text-slate-700">
          <span>View all products</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <IconButton
            icon={ChevronLeft}
            ariaLabel="Previous products"
            title="Previous products"
            rounded="full"
          />
          <IconButton
            icon={ChevronRight}
            ariaLabel="Next products"
            title="Next products"
            rounded="full"
          />
        </div>
      </div>

      {/* 4 Cards Grid with Sharp Borders matching Channel3 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 text-left w-full items-stretch">
        {skeletons.map((_, i) => (
          <ProductCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
