"use client";

import { AlertCircle } from "lucide-react";
import SearchBar from "@/components/SearchBar";

export default function HeroSearchSection({
  query,
  setQuery,
  onSearch,
  searching = false,
  error,
  onErrorDismiss,
  onImageSearch,
  imagePreview,
  onClearImage,
}) {
  return (
    <header className="hero">
      <span className="splash splash-l" aria-hidden="true" />
      <span className="splash splash-r" aria-hidden="true" />
      <span className="splash splash-c" aria-hidden="true" />

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center">
        <div className="hero-inner w-full py-8 text-center">
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
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={onSearch}
            searching={false}
            onImageSearch={onImageSearch}
            imagePreview={imagePreview}
            onClearImage={onClearImage}
            className="max-w-2xl mx-auto mt-8 mb-4 w-full"
          />

          {/* Error Banner */}
          {error && (
            <div className="max-w-2xl mx-auto w-full px-4 mt-4 text-left">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={onErrorDismiss}
                  className="text-rose-700 font-bold px-2 cursor-pointer"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
