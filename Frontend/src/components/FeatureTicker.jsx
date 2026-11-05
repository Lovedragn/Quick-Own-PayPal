"use client";

export default function FeatureTicker() {
  return (
    <div className="w-full bg-zinc-50 border-b border-zinc-200 py-3.5 px-4 overflow-hidden" aria-label="Key features">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-mono text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="text-[#16A34A]">✦</span>
          <span>100M+ Channel3 Product Graph</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#16A34A]">✦</span>
          <span>Multi-Merchant Real-Time Stock & Prices</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#16A34A]">✦</span>
          <span>PayPal Orders v2 Sandbox Checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#16A34A]">✦</span>
          <span>Sub-50ms Hybrid Elasticsearch Retrieval</span>
        </div>
      </div>
    </div>
  );
}
