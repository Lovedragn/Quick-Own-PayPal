"use client";

import { Search, Sparkles, AlertCircle } from "lucide-react";

export default function HeroSearchSection({
  query,
  setQuery,
  onSearch,
  searching,
  error,
  onErrorDismiss,
}) {
  return (
    <header className="hero">
      <span className="splash splash-l" aria-hidden="true" />
      <span className="splash splash-r" aria-hidden="true" />
      <span className="splash splash-c" aria-hidden="true" />

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center">
        <div className="hero-inner w-full py-8">
          <h1 className="font-cal font-bold text-4xl sm:text-6xl lg:text-[64px] leading-[1.08] tracking-tight text-[#17270C] mb-4">
            Search less. Save more. <br />
            <span className="text-[#245A19]">
              Instant checkout with PayPal.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#4A5A3F] max-w-[50ch] mx-auto text-balance font-normal leading-relaxed">
            AI compares live prices across verified stores, locking the best
            deal for instant PayPal checkout.
          </p>

          {/* Channel3-Style Hero Search Bar */}
          <div className="max-w-2xl mx-auto mt-8 mb-4 w-full" id="search-console">
            <form onSubmit={onSearch} className="relative">
              <div className="relative flex items-center bg-white border border-[#B8C9AF] shadow-xs focus-within:border-[#245A19] focus-within:ring-2 focus-within:ring-[#245A19]/20 transition-all">
                <div className="pl-3.5 pr-2 text-[#4A5A3F] flex items-center pointer-events-none">
                  <Search className="w-4 h-4 flex-shrink-0" />
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products or describe what you need…"
                  aria-label="Search products or describe what you need"
                  disabled={searching}
                  className="w-full py-2.5 pr-3.5 bg-transparent font-sans text-sm sm:text-base text-[#17270C] placeholder-[#5F6E5A] focus:outline-none"
                />
                {searching && (
                  <div className="pr-3.5 flex items-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin text-[#245A19]" />
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="max-w-2xl mx-auto w-full px-4 mt-4">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={onErrorDismiss}
                  className="text-rose-700 font-bold px-2"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Searching State */}
          {searching && (
            <div className="py-16 text-center max-w-xl mx-auto px-4 w-full">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F4E2] text-[#3F7A2E] flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-cal font-bold text-2xl text-[#17270C] mb-2">
                Searching Verified Stores…
              </h3>
              <p className="text-sm text-[#4A5A3F]">
                Comparing merchant offers &bull; Checking live stock &bull; Finding best prices
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

