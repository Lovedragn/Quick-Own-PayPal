import ProductSkeletonGrid from "@/components/ProductSkeletonGrid";

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-zinc-100/70 text-zinc-900 overflow-x-hidden">
      <div className="relative max-w-7xl mx-auto border-x border-zinc-200 min-h-screen flex flex-col bg-white shadow-2xl animate-card-slide-up">
        {/* Crosshair accents at top corners */}
        <div className="absolute -left-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>
        <div className="absolute -right-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>

        {/* Top Header Shell */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 py-3.5 px-4 sm:px-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
            <div className="h-9 w-32 bg-[#fafafa] border border-zinc-200 shimmer-wave flex-shrink-0 hidden sm:block" />
            <div className="flex-1 max-w-3xl mx-auto">
              <div className="h-9 w-full bg-[#fafafa] border border-zinc-200 shimmer-wave" />
            </div>
            <div className="h-9 w-9 bg-[#fafafa] border border-zinc-200 shimmer-wave flex-shrink-0" />
          </div>
        </header>

        {/* Main Skeleton Grid with wave-like alt image holders */}
        <main className="flex-1 w-full px-4 sm:px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <ProductSkeletonGrid count={8} />
          </div>
        </main>
      </div>
    </div>
  );
}
