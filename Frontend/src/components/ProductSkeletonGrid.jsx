"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import IconButton from "@/components/ui/icon-button";

export function ProductCardSkeleton({ index = 0 }) {
  return (
    <div
      className="relative bg-white border border-[#EAECEF] rounded-none flex flex-col h-full overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Aspect-Square Image Box with Wave Shimmer */}
      <div className="relative aspect-square w-full bg-[#fafafa] shimmer-wave flex items-center justify-center overflow-hidden">
        <ImageIcon className="w-9 h-9 text-zinc-300/80" strokeWidth={1.5} />
      </div>

      {/* Content Section Below Image matching ProductCard */}
      <div className="bg-white px-3.5 pt-3 pb-3 sm:pb-3.5 flex-1 flex flex-col justify-between border-t border-[#EAECEF]">
        <div>
          {/* Swatches placeholder row matching variant swatches */}
          <div className="flex items-center gap-1.5 mb-2 px-0.5 overflow-x-auto py-0.5 scrollbar-none">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 shimmer-wave flex-shrink-0" />
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 shimmer-wave flex-shrink-0" />
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 shimmer-wave flex-shrink-0" />
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 shimmer-wave flex-shrink-0" />
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 shimmer-wave flex-shrink-0" />
          </div>

          {/* Brand & Title placeholders */}
          <div className="px-0.5">
            <div className="h-3 w-16 shimmer-wave mb-1.5 rounded-none" />
            <div className="h-4 w-4/5 shimmer-wave mt-0.5 rounded-none" />
          </div>
        </div>

        {/* Amount ALWAYS pinned at bottom */}
        <div className="px-0.5 mt-auto pt-2.5 pb-1 sm:pb-1.5 flex items-baseline justify-between gap-1">
          <div className="h-6 sm:h-7 lg:h-8 w-24 shimmer-wave rounded-none" />
        </div>

        {/* Mobile-only Action Bar skeleton */}
        <div className="sm:hidden mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="h-7 w-full shimmer-wave rounded-none" />
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
