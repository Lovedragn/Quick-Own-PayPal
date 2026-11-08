"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, ChevronDown, MessageSquarePlus, Sparkles } from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import ProductCard from "@/components/ProductCard";
import GsapTextReveal from "@/components/ui/GsapTextReveal";

const NO_RESULT_SUGGESTIONS = [
  "Sony WH-1000XM5 Headphones",
  "Nike Air Max Sneakers",
  "Mechanical Keyboard",
  "Kindle Paperwhite",
  "Patagonia Fleece Jacket",
  "Dyson Supersonic Hair Dryer",
];

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
  onNewConversation,
}) {
  if (recommendations.length === 0) {
    return (
      <div id="results" className="w-full mt-8 mb-12">
        <div className="py-16 sm:py-20 text-center max-w-xl mx-auto px-4 border border-dashed border-zinc-200 bg-zinc-50/60">
          <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-600 shadow-2xs">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <h3 className="font-cal font-bold text-xl sm:text-2xl text-zinc-950 mb-2">
            No products found
          </h3>
          <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
            {query
              ? `We couldn't find any products matching "${query}".`
              : "No catalogue matches returned for this search."}{" "}
            Start a fresh conversation or try one of the popular items below:
          </p>

          {onNewConversation && (
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={onNewConversation}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-cal font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Start New Conversation</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-zinc-200/80">
            {NO_RESULT_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (onSearch) {
                    onSearch(null, item);
                  }
                }}
                className="text-xs px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100 font-cal transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
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

