"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import ProductCard from "@/components/ProductCard";
import GsapTextReveal from "@/components/ui/GsapTextReveal";

export default function ProductResultsSection({
  recommendations,
  intent,
  query,
  setQuery,
  onSearch,
  selectedOffers,
  onSelectOffer,
  quantities,
  onQuantityChange,
  onCheckout,
  checkoutProduct,
  likedIds,
  onToggleLike,
  onAddToCart,
  onOpenDetail,
}) {
  if (recommendations.length === 0) {
    return (
      <div id="results" className="w-full mt-8 mb-12">
        <div className="py-16 text-center text-[#4A5A3F] font-cal text-sm">
          No catalogue matches returned. Try a broader search prompt!
        </div>
      </div>
    );
  }

  return (
    <div id="results" className="w-full mt-8 mb-12">
      {/* Title above products */}
      <div className="mb-6">
        <GsapTextReveal
          as="h2"
          className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight"
          scrollTrigger={false}
          stagger={0.06}
          duration={0.75}
          rotate={true}
        >
          Products
        </GsapTextReveal>
      </div>

      {/* Top Bar matching Channel3 demo: View All & Directional Controls */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-700 px-0.5">
        <a
          href="#results"
          className="font-cal inline-flex items-center gap-1 font-medium hover:text-black transition-colors"
        >
          <span>View all products ({recommendations.length})</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
        <div className="flex items-center gap-1.5">
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

      {/* 4 Cards Grid with Sharp Borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 text-left w-full items-stretch">
        {recommendations.map((recommendation, index) => {
          const productId = recommendation.product?.productId;
          return (
            <ProductCard
              key={productId || recommendation.rank}
              index={index}
              recommendation={recommendation}
              selectedIndex={selectedOffers[productId] ?? 0}
              onSelectOffer={onSelectOffer}
              quantity={quantities[productId] ?? 1}
              onQuantityChange={onQuantityChange}
              onCheckout={onCheckout}
              checkingOut={checkoutProduct === productId}
              isLiked={likedIds.includes(productId)}
              onToggleLike={onToggleLike}
              onAddToCart={onAddToCart}
              onOpenDetail={onOpenDetail}
            />
          );
        })}
      </div>

      {/* Channel3 Conversational Response & Follow-up Prompt Chips */}
      <div className="mt-8 text-center space-y-3.5 max-w-2xl mx-auto">
        <GsapTextReveal
          as="p"
          className="font-cal text-xs sm:text-sm text-slate-700 leading-relaxed"
          scrollTrigger={false}
          stagger={0.018}
          duration={0.6}
          y="100%"
        >
          {`I found ${recommendations.length} live ${intent?.category || ""} options${intent?.searchQuery ? ` for "${intent.searchQuery}"` : ""}. Hover any card to inspect merchant stock stack and lock with PayPal:`}
        </GsapTextReveal>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            `Show lower price options`,
            `Show only verified in-stock`,
            `Compare top 2 stores`,
          ].map((promptChip) => (
            <button
              key={promptChip}
              type="button"
              onClick={() => {
                const newQuery = `${query} ${promptChip}`;
                setQuery(newQuery);
                onSearch(null, newQuery);
              }}
              className="font-cal px-3 py-1.5 rounded-none border border-slate-300 bg-white hover:bg-slate-100 text-xs text-slate-800 transition-colors cursor-pointer font-medium"
            >
              {promptChip}
            </button>
          ))}
        </div>

        <div className="pt-2 text-slate-400">
          <ChevronDown className="w-4 h-4 mx-auto animate-bounce" />
        </div>
      </div>
    </div>
  );
}

