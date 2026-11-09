"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  ArrowUpDown,
  DollarSign,
  Tag,
  Store,
  Check,
  ChevronDown,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";

export const SORT_OPTIONS = [
  { id: "relevance", label: "Featured / Best Match" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "name-asc", label: "Name: A to Z" },
  { id: "deals", label: "Best Value / Multi-Merchant" },
];

export const QUICK_PRICE_TIERS = [
  { id: "all", label: "All Prices", min: null, max: null },
  { id: "under-50", label: "Under $50", min: 0, max: 50 },
  { id: "50-100", label: "$50 to $100", min: 50, max: 100 },
  { id: "100-250", label: "$100 to $250", min: 100, max: 250 },
  { id: "250-plus", label: "$250 & Above", min: 250, max: null },
];

export default function ProductFilterSortBar({
  totalProducts = 0,
  filteredCount = 0,
  availableBrands = [],
  availableMerchants = [],
  sortOption = "relevance",
  onSortChange,
  priceRange = { min: "", max: "" },
  onPriceChange,
  selectedBrands = [],
  onToggleBrand,
  selectedMerchants = [],
  onToggleMerchant,
  inStockOnly = false,
  onToggleInStock,
  dealsOnly = false,
  onToggleDeals,
  onResetFilters,
}) {
  const [openDropdown, setOpenDropdown] = useState(null); // 'sort' | 'price' | 'brand' | 'merchant' | null
  const [brandSearch, setBrandSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = Boolean(
    priceRange.min !== "" ||
      priceRange.max !== "" ||
      selectedBrands.length > 0 ||
      selectedMerchants.length > 0 ||
      inStockOnly ||
      dealsOnly,
  );

  const filteredBrandsList = useMemo(() => {
    if (!brandSearch.trim()) return availableBrands;
    const lower = brandSearch.toLowerCase();
    return availableBrands.filter((b) => b.name.toLowerCase().includes(lower));
  }, [availableBrands, brandSearch]);

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.id === sortOption)?.label || "Sort by";

  return (
    <div
      ref={dropdownRef}
      className="w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/90 py-2.5 px-4 sm:px-6 transition-all relative z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Filter Buttons & Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Indicator Label */}
            <div className="inline-flex items-center gap-1.5 font-mono text-zinc-500 mr-1 select-none text-[11px] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-700" />
              <span>Filters</span>
            </div>

            {/* Price Filter Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) => (prev === "price" ? null : "price"))
                }
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-none border font-cal text-xs transition-colors cursor-pointer ${
                  priceRange.min !== "" || priceRange.max !== ""
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {priceRange.min !== "" || priceRange.max !== ""
                    ? `$${priceRange.min || "0"} - $${priceRange.max || "Any"}`
                    : "Price"}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    openDropdown === "price" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Price Dropdown Popover */}
              {openDropdown === "price" && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-zinc-200 shadow-xl p-3.5 z-50 text-xs">
                  <div className="font-cal font-bold text-zinc-900 mb-2.5 flex items-center justify-between">
                    <span>Price Range ($)</span>
                    {(priceRange.min !== "" || priceRange.max !== "") && (
                      <button
                        type="button"
                        onClick={() => onPriceChange({ min: "", max: "" })}
                        className="text-[11px] font-mono text-zinc-500 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Quick Price Buttons */}
                  <div className="flex flex-col gap-1 mb-3">
                    {QUICK_PRICE_TIERS.map((tier) => {
                      const isActive =
                        tier.min === (priceRange.min === "" ? null : Number(priceRange.min)) &&
                        tier.max === (priceRange.max === "" ? null : Number(priceRange.max));
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            onPriceChange({
                              min: tier.min !== null ? String(tier.min) : "",
                              max: tier.max !== null ? String(tier.max) : "",
                            });
                            setOpenDropdown(null);
                          }}
                          className={`text-left px-2.5 py-1.5 rounded-none font-cal transition-colors flex items-center justify-between cursor-pointer ${
                            isActive
                              ? "bg-zinc-900 text-white"
                              : "hover:bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          <span>{tier.label}</span>
                          {isActive && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Min / Max Inputs */}
                  <div className="pt-2.5 border-t border-zinc-100 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) =>
                        onPriceChange({ ...priceRange, min: e.target.value })
                      }
                      className="w-1/2 px-2.5 py-1.5 border border-zinc-200 outline-none text-xs focus:border-zinc-900"
                    />
                    <span className="text-zinc-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) =>
                        onPriceChange({ ...priceRange, max: e.target.value })
                      }
                      className="w-1/2 px-2.5 py-1.5 border border-zinc-200 outline-none text-xs focus:border-zinc-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Brand Filter Button */}
            {availableBrands.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === "brand" ? null : "brand"))
                  }
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-none border font-cal text-xs transition-colors cursor-pointer ${
                    selectedBrands.length > 0
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    Brand{" "}
                    {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      openDropdown === "brand" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Brand Dropdown Popover */}
                {openDropdown === "brand" && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-zinc-200 shadow-xl p-3 z-50 text-xs">
                    <div className="font-cal font-bold text-zinc-900 mb-2 flex items-center justify-between">
                      <span>Brands ({availableBrands.length})</span>
                      {selectedBrands.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            selectedBrands.forEach((b) => onToggleBrand(b));
                          }}
                          className="text-[11px] font-mono text-zinc-500 hover:text-rose-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {availableBrands.length > 6 && (
                      <input
                        type="text"
                        placeholder="Filter brands…"
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="w-full px-2.5 py-1 mb-2 border border-zinc-200 outline-none text-xs focus:border-zinc-900"
                      />
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredBrandsList.map((brand) => {
                        const isChecked = selectedBrands.includes(brand.name);
                        return (
                          <label
                            key={brand.name}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded-none cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleBrand(brand.name)}
                                className="accent-zinc-900 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-cal text-zinc-800">
                                {brand.name}
                              </span>
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {brand.count}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Merchant / Retailer Filter Button */}
            {availableMerchants.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((prev) =>
                      prev === "merchant" ? null : "merchant",
                    )
                  }
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-none border font-cal text-xs transition-colors cursor-pointer ${
                    selectedMerchants.length > 0
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>
                    Retailer{" "}
                    {selectedMerchants.length > 0 &&
                      `(${selectedMerchants.length})`}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      openDropdown === "merchant" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Merchant Popover */}
                {openDropdown === "merchant" && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-zinc-200 shadow-xl p-3 z-50 text-xs">
                    <div className="font-cal font-bold text-zinc-900 mb-2 flex items-center justify-between">
                      <span>Retailers</span>
                      {selectedMerchants.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            selectedMerchants.forEach((m) => onToggleMerchant(m));
                          }}
                          className="text-[11px] font-mono text-zinc-500 hover:text-rose-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableMerchants.map((merchant) => {
                        const isChecked = selectedMerchants.includes(
                          merchant.name,
                        );
                        return (
                          <label
                            key={merchant.name}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded-none cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleMerchant(merchant.name)}
                                className="accent-zinc-900 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-cal text-zinc-800">
                                {merchant.name}
                              </span>
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {merchant.count}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* In Stock Only Toggle Button */}
            <button
              type="button"
              onClick={onToggleInStock}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-none border font-cal text-xs transition-colors cursor-pointer ${
                inStockOnly
                  ? "bg-emerald-800 text-white border-emerald-800 shadow-2xs"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 ${
                  inStockOnly ? "text-white" : "text-zinc-400"
                }`}
              />
              <span>In Stock Only</span>
            </button>

            {/* Multi-Merchant / Deals Toggle Button */}
            <button
              type="button"
              onClick={onToggleDeals}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-none border font-cal text-xs transition-colors cursor-pointer ${
                dealsOnly
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  dealsOnly ? "text-amber-400" : "text-zinc-400"
                }`}
              />
              <span>Multi-Store Offers</span>
            </button>
          </div>

          {/* Right: Sorting Selector & Counts */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Products Counter */}
            <div className="font-mono text-zinc-500 text-[11px] hidden sm:inline-block">
              Showing{" "}
              <strong className="text-zinc-900 font-bold">{filteredCount}</strong>{" "}
              of {totalProducts}
            </div>

            {/* Sorting Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) => (prev === "sort" ? null : "sort"))
                }
                className="inline-flex items-center gap-2 h-8 px-3 bg-white text-zinc-800 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-none font-cal text-xs transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-semibold">{currentSortLabel}</span>
                <ChevronDown
                  className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${
                    openDropdown === "sort" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "sort" && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-zinc-200 shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 font-mono text-[10px] uppercase text-zinc-400 tracking-wider">
                    Sort Products
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSortChange(opt.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 font-cal transition-colors flex items-center justify-between cursor-pointer ${
                        sortOption === opt.id
                          ? "bg-zinc-900 text-white font-bold"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortOption === opt.id && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Active Filters Strip (Rendered when any filter active) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
            <span className="font-mono text-[10px] uppercase text-zinc-400 mr-1 select-none">
              Active:
            </span>

            {/* Price Chip */}
            {(priceRange.min !== "" || priceRange.max !== "") && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-800 text-[11px] font-mono border border-zinc-200">
                <span>
                  Price: ${priceRange.min || "0"} - ${priceRange.max || "Any"}
                </span>
                <button
                  type="button"
                  onClick={() => onPriceChange({ min: "", max: "" })}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  aria-label="Remove price filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Brand Chips */}
            {selectedBrands.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-800 text-[11px] font-mono border border-zinc-200"
              >
                <span>Brand: {brand}</span>
                <button
                  type="button"
                  onClick={() => onToggleBrand(brand)}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  aria-label={`Remove brand ${brand}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Merchant Chips */}
            {selectedMerchants.map((merchant) => (
              <span
                key={merchant}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-800 text-[11px] font-mono border border-zinc-200"
              >
                <span>Store: {merchant}</span>
                <button
                  type="button"
                  onClick={() => onToggleMerchant(merchant)}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  aria-label={`Remove retailer ${merchant}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* In-Stock Chip */}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-mono border border-emerald-200">
                <span>In Stock Only</span>
                <button
                  type="button"
                  onClick={onToggleInStock}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  aria-label="Remove in stock filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Multi-Store Chip */}
            {dealsOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-800 text-[11px] font-mono border border-zinc-200">
                <span>Multi-Store Offers</span>
                <button
                  type="button"
                  onClick={onToggleDeals}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                  aria-label="Remove multi-store filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Reset All Filters Button */}
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-rose-600 hover:text-rose-800 hover:underline cursor-pointer ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

