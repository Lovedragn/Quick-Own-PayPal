"use client";

import { useRef } from "react";
import { Search, ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import IconButton from "@/components/ui/icon-button";

export default function SearchBar({
  query = "",
  setQuery,
  onSearch,
  searching = false,
  onImageSearch,
  imagePreview = null,
  onClearImage,
  className = "max-w-2xl mx-auto w-full",
  placeholder,
  autoFocus = false,
}) {
  const fileInputRef = useRef(null);

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onImageSearch) {
      onImageSearch(file);
    } else if (setQuery) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setQuery(cleanName);
    }
  };

  const defaultPlaceholder = imagePreview
    ? "Optional text prompt to refine image search…"
    : "Search products or describe what you need…";

  return (
    <div className={className} id="search-console">
      <form onSubmit={onSearch} className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex-1 h-9 relative flex items-center bg-white border border-[#B8C9AF] rounded-none shadow-xs focus-within:border-[#245A19] focus-within:ring-2 focus-within:ring-[#245A19]/20 transition-all">
            <div className="pl-3 pr-2 text-[#4A5A3F] flex items-center pointer-events-none">
              <Search className="w-4 h-4 flex-shrink-0" />
            </div>
            {imagePreview && (
              <div className="flex items-center gap-1 bg-[#F4F7F2] border border-[#B8C9AF] px-1.5 py-0.5 text-xs text-[#245A19] mr-1.5 flex-shrink-0">
                <span className="font-medium text-[11px]">Image active</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClearImage) onClearImage();
                  }}
                  className="text-[#4A5A3F] hover:text-rose-600 font-bold ml-1 text-xs leading-none cursor-pointer"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery && setQuery(e.target.value)}
              placeholder={placeholder || defaultPlaceholder}
              aria-label="Search products or describe what you need"
              disabled={searching}
              autoFocus={autoFocus}
              className="w-full h-full pr-3 bg-transparent font-sans text-sm text-[#17270C] placeholder-[#5F6E5A] focus:outline-none"
            />
            {searching && (
              <div className="pr-3 flex items-center flex-shrink-0">
                <Spinner size="sm" className="text-zinc-700" strokeWidth={3} />
              </div>
            )}
          </div>

          <IconButton
            icon={imagePreview ? undefined : ImageIcon}
            onClick={handleImageButtonClick}
            ariaLabel="Search with image"
            title={
              imagePreview ? "Change uploaded image" : "Upload image to search"
            }
            rounded="none"
           >
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Uploaded search thumbnail"
                className="w-full h-full object-cover"
              />
            )}
          </IconButton>
        </div>
      </form>
    </div>
  );
}
