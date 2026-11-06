"use client";

import { useRef } from "react";
import { Search, AlertCircle, ImageIcon } from "lucide-react";
import SpinningRing from "@/components/ui/spinning-ring";

export default function HeroSearchSection({
  query,
  setQuery,
  onSearch,
  searching,
  error,
  onErrorDismiss,
  onImageSearch,
  imagePreview,
  onClearImage,
}) {
  const fileInputRef = useRef(null);

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      // Reset input value so re-selecting same file triggers onChange
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onImageSearch) {
      onImageSearch(file);
    } else {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setQuery(cleanName);
    }
  };

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
          <div className="max-w-2xl mx-auto mt-8 mb-4 w-full" id="search-console">
            <form onSubmit={onSearch} className="relative">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex-1 h-11 sm:h-12 relative flex items-center bg-white border border-[#B8C9AF] rounded-none shadow-xs focus-within:border-[#245A19] focus-within:ring-2 focus-within:ring-[#245A19]/20 transition-all">
                  <div className="pl-3.5 pr-2 text-[#4A5A3F] flex items-center pointer-events-none">
                    <Search className="w-4 h-4 flex-shrink-0" />
                  </div>
                  {imagePreview && (
                    <div className="flex items-center gap-1 bg-[#F4F7F2] border border-[#B8C9AF] px-1.5 py-0.5 text-xs text-[#245A19] mr-2 flex-shrink-0">
                      <span className="font-medium">Image active</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onClearImage) onClearImage();
                        }}
                        className="text-[#4A5A3F] hover:text-rose-600 font-bold ml-1 text-sm leading-none"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      imagePreview
                        ? "Optional text prompt to refine image search…"
                        : "Search products or describe what you need…"
                    }
                    aria-label="Search products or describe what you need"
                    disabled={searching}
                    className="w-full h-full pr-3.5 bg-transparent font-sans text-sm sm:text-base text-[#17270C] placeholder-[#5F6E5A] focus:outline-none"
                  />
                  {searching && (
                    <div className="pr-3.5 flex items-center flex-shrink-0">
                      <SpinningRing size="sm" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  aria-label="Search with image"
                  title={imagePreview ? "Change uploaded image" : "Upload image to search"}
                  className="h-11 w-11 sm:h-12 sm:w-12 aspect-square flex-shrink-0 flex items-center justify-center bg-white border border-[#B8C9AF] rounded-none shadow-xs hover:border-[#245A19] hover:bg-[#F4F7F2] text-[#17270C] transition-all focus:outline-none focus:ring-2 focus:ring-[#245A19]/20 cursor-pointer overflow-hidden p-0"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Uploaded search thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#17270C]" strokeWidth={1.75} />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </form>
          </div>

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
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 border border-emerald-200/80 shadow-xs">
                <SpinningRing size="lg" />
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
