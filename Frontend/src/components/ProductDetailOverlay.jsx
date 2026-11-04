"use client";

import IconButton from "@/components/ui/icon-button";
import {
  normalizeProductVariants,
  getColorHex,
  isValueOutOfStock,
  isValueMissing,
} from "@/lib/variants";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  X,
  Store,
  ExternalLink,
  ShieldCheck,
  Check,
  Heart,
  Scale,
  Sparkles,
} from "lucide-react";

function formatPrice(value, currency) {
  if (value === null || value === undefined || !currency) return "Price unavailable";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getOffers(recommendation) {
  const offers = Array.isArray(recommendation?.product?.offers)
    ? [...recommendation.product.offers]
    : [];
  const chosen = recommendation?.selectedOffer;
  if (
    chosen &&
    !offers.some((offer) => offer.productUrl === chosen.productUrl)
  ) {
    offers.unshift(chosen);
  }
  return offers.filter(
    (offer) =>
      offer &&
      offer.merchant &&
      offer.price !== null &&
      offer.price !== undefined &&
      offer.currency &&
      offer.productUrl
  );
}

export default function ProductDetailOverlay({
  recommendation,
  onClose,
  selectedIndex = 0,
  onSelectOffer,
  quantity = 1,
  onQuantityChange,
  onCheckout,
  checkingOut = false,
  initialVariantIndex = 0,
}) {
  const product = recommendation?.product;
  const offers = useMemo(() => getOffers(recommendation), [recommendation]);
  const [selectedOfferIdx, setSelectedOfferIdx] = useState(
    selectedIndex >= 0 && selectedIndex < offers.length ? selectedIndex : 0
  );
  const [selectedVariant, setSelectedVariant] = useState(initialVariantIndex);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [compared, setCompared] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll when overlay is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!product) return null;

  const selectedOffer = offers[selectedOfferIdx] || offers[0];

  // Price calculations
  const prices = offers.map((o) => Number(o.price)).filter(Number.isFinite);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : Number(selectedOffer?.price || 0);
  const highestPrice = prices.length > 0 ? Math.max(...prices) : Number(selectedOffer?.price || 0);
  const hasDiscount = highestPrice > lowestPrice;
  const originalPrice = hasDiscount ? highestPrice : Number(selectedOffer?.price || 0) * 1.15;

  // Variants calculation & normalization
  const variantData = useMemo(() => normalizeProductVariants(product), [product]);
  const [selectedOptions, setSelectedOptions] = useState(() => variantData.selectedMap);

  useEffect(() => {
    setSelectedOptions(variantData.selectedMap);
  }, [variantData]);

  const colorOption = variantData.colorOption;
  const colorValues = colorOption?.values || [];

  const activeColorLabel =
    (colorOption && selectedOptions[colorOption.name]) ||
    colorOption?.values[selectedVariant]?.label ||
    "Standard Edition";

  const [hoveredVariantIdx, setHoveredVariantIdx] = useState(null);

  const activeColorValue =
    colorValues.find((v) => v.label === activeColorLabel) ||
    colorValues[selectedVariant] ||
    null;

  const previewColorValue =
    (hoveredVariantIdx !== null ? colorValues[hoveredVariantIdx] : null) ||
    activeColorValue;

  const channel3SizeOption = variantData.sizeOption;
  const activeSizeLabel = channel3SizeOption
    ? selectedOptions[channel3SizeOption.name] || ""
    : selectedSize;

  // Dynamic Size calculation fallback based on product attributes / category
  const { sizes, sizeType } = useMemo(() => {
    if (channel3SizeOption) return { sizes: [], sizeType: "" };
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return { sizes: product.sizes, sizeType: "Options" };
    }
    if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0) {
      return { sizes: product.sizeOptions, sizeType: "Options" };
    }

    const nameLower = (product.name || "").toLowerCase();
    const catLower = (product.category || "").toLowerCase();

    const isFootwear =
      nameLower.includes("shoe") ||
      nameLower.includes("sneaker") ||
      nameLower.includes("runner") ||
      nameLower.includes("nitro") ||
      nameLower.includes("boot") ||
      nameLower.includes("slide") ||
      catLower.includes("shoe") ||
      catLower.includes("footwear") ||
      catLower.includes("sneaker");
    if (isFootwear) {
      return {
        sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
        sizeType: "US Men / Women",
      };
    }

    const isApparel =
      nameLower.includes("shirt") ||
      nameLower.includes("t-shirt") ||
      nameLower.includes("tee") ||
      nameLower.includes("hoodie") ||
      nameLower.includes("jacket") ||
      nameLower.includes("jersey") ||
      nameLower.includes("pants") ||
      nameLower.includes("shorts") ||
      catLower.includes("clothing") ||
      catLower.includes("apparel");
    if (isApparel) {
      return {
        sizes: ["XS", "S", "M", "L", "XL", "2XL"],
        sizeType: "Standard Sizing",
      };
    }

    const isTech =
      nameLower.includes("phone") ||
      nameLower.includes("iphone") ||
      nameLower.includes("ipad") ||
      nameLower.includes("macbook") ||
      nameLower.includes("laptop") ||
      nameLower.includes("ssd");
    if (isTech) {
      return {
        sizes: ["128GB", "256GB", "512GB", "1TB"],
        sizeType: "Capacity",
      };
    }

    return { sizes: [], sizeType: "" };
  }, [product, channel3SizeOption]);

  const currentFeaturedImage =
    previewColorValue?.imageUrl ||
    previewColorValue?.thumbnailUrl ||
    activeColorValue?.imageUrl ||
    activeColorValue?.thumbnailUrl ||
    product.imageUrl;

  const isSelectedVariantOutOfStock = useMemo(() => {
    if (!variantData.hasVariants) return false;
    if (activeColorValue && isValueOutOfStock(activeColorValue)) {
      return true;
    }
    if (channel3SizeOption) {
      const chosenSize = selectedOptions[channel3SizeOption.name];
      const sizeVal = channel3SizeOption.values.find((v) => v.label === chosenSize);
      if (sizeVal && isValueOutOfStock(sizeVal)) {
        return true;
      }
    }
    return false;
  }, [variantData, activeColorValue, channel3SizeOption, selectedOptions]);

  // Gallery angle thumbnails
  const galleryImages = [
    currentFeaturedImage,
    product.imageUrl,
    product.imageUrl,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative bg-white w-full max-w-5xl my-auto rounded-none shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#FAFAFA]">
          <IconButton
            icon={ArrowLeft}
            onClick={onClose}
            ariaLabel="Back"
            title="Back"
            rounded="full"
          />

          <IconButton
            icon={X}
            onClick={onClose}
            ariaLabel="Close modal"
            title="Close modal"
            rounded="full"
          />
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 flex flex-col items-center">
            {/* Featured Image Canvas (Transparent - no gray box) */}
            <div className="relative w-full aspect-square bg-transparent rounded-none flex items-center justify-center p-6 border border-slate-100 overflow-hidden">
              {/* Floating Compare & Heart Buttons */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                <IconButton
                  icon={Scale}
                  active={compared}
                  activeVariant="primary"
                  rounded="full"
                  onClick={() => setCompared((prev) => !prev)}
                  ariaLabel="Compare product"
                  title="Compare product"
                />
                <IconButton
                  icon={Heart}
                  active={liked}
                  activeVariant="rose"
                  rounded="full"
                  onClick={() => setLiked((prev) => !prev)}
                  ariaLabel="Add to wishlist"
                  title="Add to wishlist"
                />
              </div>

              {currentFeaturedImage ? (
                <Image
                  src={currentFeaturedImage}
                  alt={product.name || "Product"}
                  fill
                  unoptimized
                  className="object-contain p-6 transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="text-4xl font-cal text-slate-300 font-bold">Q</div>
              )}
            </div>

            {/* Thumbnail Gallery Strip */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 mt-3 w-full overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseEnter={() => setActiveImageIndex(idx)}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 flex-shrink-0 bg-[#F6F7F9] rounded-none border transition-all cursor-pointer p-1 overflow-hidden ${
                      activeImageIndex === idx
                        ? "border-black ring-1 ring-black"
                        : "border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Angle ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details, Variants, Size & Checkout */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Brand */}
              <p className="font-cal text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                {product.brand || product.category || "Puma"}
              </p>

              {/* Product Title */}
              <h2 className="font-cal text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h2>

              {/* Price Row */}
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-cal tracking-tight">
                  {formatPrice(selectedOffer?.price || lowestPrice, selectedOffer?.currency || "USD")}
                </span>
                {originalPrice > (selectedOffer?.price || lowestPrice) && (
                  <span className="text-xs text-slate-400 line-through font-cal">
                    {formatPrice(originalPrice, selectedOffer?.currency || "USD")}
                  </span>
                )}
              </div>

              {/* Colorway Selection */}
              {colorValues.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="text-[14px] text-slate-600 mb-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-cal font-semibold text-slate-800">
                        {colorOption?.name || "Color"}:{" "}
                      </span>
                      <span>{activeColorLabel}</span>
                    </div>
                    {activeColorValue && isValueOutOfStock(activeColorValue) && (
                      <span className="text-[11px] font-bold text-rose-600 font-cal bg-rose-50 px-2 py-0.5 border border-rose-200">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Circular Variant Swatches */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                    {colorValues.map((v, idx) => {
                      const isSelected = activeColorLabel === v.label || selectedVariant === idx;
                      const isOutOfStock = isValueOutOfStock(v);
                      const isMissing = isValueMissing(v);
                      return (
                        <button
                          key={v.id || v.label || idx}
                          type="button"
                          onMouseEnter={() => setHoveredVariantIdx(idx)}
                          onMouseLeave={() => setHoveredVariantIdx(null)}
                          onClick={() => {
                            setSelectedVariant(idx);
                            setHoveredVariantIdx(null);
                            if (colorOption) {
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [colorOption.name]: v.label,
                              }));
                            }
                          }}
                          className={`relative w-7 h-7 rounded-full overflow-hidden border bg-[#F6F7F9] transition-all cursor-pointer flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "ring-1.5 ring-offset-1 ring-black border-black scale-105 shadow-xs"
                              : "border-slate-300 hover:border-slate-400 opacity-80 hover:opacity-100"
                          } ${isOutOfStock ? "opacity-60" : ""} ${isMissing ? "opacity-30 border-dashed" : ""}`}
                          title={`${v.label}${isOutOfStock ? " (Out of Stock)" : ""}`}
                          aria-label={`${v.label}${isOutOfStock ? " (Out of Stock)" : ""}`}
                        >
                          {v.thumbnailUrl || v.imageUrl ? (
                            <Image
                              src={v.thumbnailUrl || v.imageUrl}
                              alt={v.label || "Variant"}
                              fill
                              unoptimized
                              className="object-contain p-[1px] rounded-full"
                            />
                          ) : (
                            <span
                              className="w-full h-full rounded-full"
                              style={{ backgroundColor: getColorHex(v.label) }}
                            />
                          )}
                          {isOutOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-full h-[1.5px] bg-rose-500/80 rotate-45 transform" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Size Selector: Channel3 UCP or category fallback */}
              {channel3SizeOption && channel3SizeOption.values.length > 0 ? (
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-1.5">
                    <span className="font-cal font-semibold text-slate-800">
                      {channel3SizeOption.name} {activeSizeLabel ? `· ${activeSizeLabel}` : ""}
                    </span>
                    <span className="text-slate-400 font-cal text-xs">Options</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {channel3SizeOption.values.map((v) => {
                      const isSelected = selectedOptions[channel3SizeOption.name] === v.label;
                      const isOutOfStock = isValueOutOfStock(v);
                      const isMissing = isValueMissing(v);
                      return (
                        <button
                          key={v.label}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [channel3SizeOption.name]: v.label,
                            }))
                          }
                          className={`relative h-[32px] px-3 min-w-[36px] text-[14px] font-cal font-medium rounded-none border text-center transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? "bg-black text-white border-black font-bold shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                          } ${isOutOfStock ? "text-slate-400 bg-slate-50 opacity-60 line-through" : ""} ${
                            isMissing ? "opacity-30 border-dashed" : ""
                          }`}
                          title={`${v.label}${isOutOfStock ? " (Out of Stock)" : ""}`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : sizes.length > 0 ? (
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-1.5">
                    <span className="font-cal font-semibold text-slate-800">
                      Size {selectedSize ? `· ${selectedSize}` : ""}
                    </span>
                    <span className="text-slate-400 font-cal text-xs">{sizeType}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`h-[32px] px-3 min-w-[36px] text-[14px] font-cal font-medium rounded-none border text-center transition-all cursor-pointer flex items-center justify-center ${
                          selectedSize === size
                            ? "bg-black text-white border-black font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Other Options */}
              {variantData.otherOptions.map((opt) => (
                <div key={opt.name} className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-1.5">
                    <span className="font-cal font-semibold text-slate-800">
                      {opt.name} {selectedOptions[opt.name] ? `· ${selectedOptions[opt.name]}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.values.map((v) => {
                      const isSelected = selectedOptions[opt.name] === v.label;
                      const isOutOfStock = isValueOutOfStock(v);
                      return (
                        <button
                          key={v.label}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [opt.name]: v.label,
                            }))
                          }
                          className={`h-[30px] px-3 text-xs font-cal rounded-none border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-black text-white border-black font-bold"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                          } ${isOutOfStock ? "opacity-50 line-through" : ""}`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Merchant Comparison Table: "Available at" */}
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[14px] mb-1.5">
                  <span className="font-cal font-semibold text-slate-800">Available at ({offers.length} stores)</span>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                  {offers.map((offer, idx) => {
                    const isSelected = idx === selectedOfferIdx;
                    return (
                      <div
                        key={`${offer.merchant}-${idx}`}
                        onClick={() => {
                          setSelectedOfferIdx(idx);
                          if (onSelectOffer) {
                            onSelectOffer(product.productId, idx);
                          }
                        }}
                        className={`p-2 rounded-none border text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/90 border-[#0070BA] ring-1 ring-[#0070BA]"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-4 h-4 rounded-none flex items-center justify-center text-[9px] font-bold ${
                              isSelected
                                ? "bg-[#0070BA] text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {offer.merchant?.charAt(0).toUpperCase() || "S"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-cal font-semibold text-slate-800 text-[11px]">
                              {offer.merchant}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {offer.availability || "In stock"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 font-cal text-[11px]">
                            {formatPrice(offer.price, offer.currency)}
                          </span>
                          {offer.productUrl && (
                            <a
                              href={offer.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-[#0070BA] p-0.5 transition-colors"
                              title="Open store listing"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Quantity + PayPal Instant Checkout */}
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-cal text-slate-500 font-medium">Quantity:</span>
                <div className="flex items-center border border-slate-300 rounded-none bg-slate-50 text-xs font-bold">
                  <button
                    type="button"
                    className="px-2.5 py-0.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    onClick={() =>
                      onQuantityChange &&
                      onQuantityChange(product.productId, Math.max(1, quantity - 1))
                    }
                  >
                    -
                  </button>
                  <span className="px-2.5 py-0.5 bg-white text-slate-900 min-w-6 text-center font-cal text-xs">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-0.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    onClick={() =>
                      onQuantityChange &&
                      onQuantityChange(product.productId, Math.min(10, quantity + 1))
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {selectedOffer && (
                <button
                  type="button"
                  onClick={() => onCheckout(recommendation, selectedOffer, quantity)}
                  disabled={checkingOut || isSelectedVariantOutOfStock}
                  className={`font-cal w-full py-2.5 px-3 rounded-none font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isSelectedVariantOutOfStock
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                      : "bg-[#0070BA] hover:bg-[#005ea6] text-white disabled:opacity-60 disabled:cursor-wait"
                  }`}
                >
                  {isSelectedVariantOutOfStock ? (
                    <span>Out of Stock · Choose another option</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                        <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
                      </svg>
                      <span>
                        {checkingOut ? "Locking Order…" : "Pay via PayPal"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

