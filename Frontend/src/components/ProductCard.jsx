"use client";

import Image from "next/image";
import { useMemo, useState, useRef, useEffect } from "react";
import gsap from "gsap";
import {
  Sparkles,
  ArrowUpRight,
  Store,
  Check,
  Scale,
  Heart,
  ShoppingCart,
} from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import {
  normalizeProductVariants,
  getColorHex,
  isValueOutOfStock,
  isValueMissing,
} from "@/lib/variants";
import { fetchProductSampleImages } from "@/lib/productDetailService";

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

export function getCleanedImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("cdn.trychannel3.com/cleaned/v1/")) {
    return url.replace("/cleaned/v1/", "/");
  }
  return url;
}

function getOffers(recommendation) {
  const offers = Array.isArray(recommendation.product?.offers)
    ? [...recommendation.product.offers]
    : [];
  const chosen = recommendation.selectedOffer;
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

export default function ProductCard({
  recommendation,
  selectedIndex,
  onSelectOffer,
  quantity,
  onQuantityChange,
  onCheckout,
  checkingOut,
  onOpenDetail,
  onAddToCart,
  isLiked = false,
  onToggleLike,
  index = 0,
}) {
  const liked = isLiked;
  const [compared, setCompared] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const sidePanelRef = useRef(null);

  const product = recommendation.product;
  const offers = useMemo(() => getOffers(recommendation), [recommendation]);
  const safeIndex =
    selectedIndex >= 0 && selectedIndex < offers.length
      ? selectedIndex
      : 0;
  const selected = offers[safeIndex] || offers[0];

  // Price calculations
  const prices = offers.map((o) => Number(o.price)).filter(Number.isFinite);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : Number(selected?.price || 0);

  // Variants calculation & normalization
  const variantData = useMemo(() => normalizeProductVariants(product), [product]);
  const colorOption = variantData.colorOption;
  const colorValues = useMemo(() => {
    if (colorOption?.values && colorOption.values.length > 0) {
      return colorOption.values;
    }
    // Guaranteed single variant button for any product
    return [
      {
        label: product?.color || product?.name || "Standard",
        exists: true,
        available: product?.inStock !== false ? "InStock" : "OutOfStock",
        thumbnailUrl: product?.imageUrl || "",
        imageUrl: product?.imageUrl || "",
        id: product?.productId || "var-default",
      },
    ];
  }, [colorOption, product]);

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(() => {
    if (colorValues.length > 0) {
      const activeLabel = variantData.selectedMap[colorOption?.name];
      const matchIdx = colorValues.findIndex((v) => v.label === activeLabel);
      if (matchIdx >= 0) return matchIdx;
      return 0;
    }
    return 0;
  });

  const [hoveredVariantIndex, setHoveredVariantIndex] = useState(null);

  const displayVariantIndex =
    hoveredVariantIndex !== null ? hoveredVariantIndex : selectedVariantIndex;

  const activeVariant = colorValues[displayVariantIndex] || null;
  const currentImage =
    activeVariant?.imageUrl || activeVariant?.thumbnailUrl || product.imageUrl;

  // If on right side of screen, extend to the left; otherwise extend to the right!
  const isRightSideLg = (index % 4) >= 2;
  const isRightSideSm = (index % 2) === 1;

  const expandToLeft = isRightSideLg || isRightSideSm;
  // Position flush next to base card with exact gap offset:
  // on lg screens gap is 1.5rem (24px) / sm screens gap is 1.25rem (20px)
  const sidePlacementClass = expandToLeft
    ? "right-full -mr-[1px]"
    : "left-full -ml-[1px]";

  // Animate sideways panel scroll-like reveal from top to bottom (like unrolling parchment / top reveal)
  useEffect(() => {
    const el = sidePanelRef.current;
    if (!el) return;

    if (isHovered) {
      gsap.killTweensOf(el);
      // Immediately force visible, front z-index and top reveal position
      gsap.set(el, {
        display: "block",
        zIndex: 100,
        y: 0,
      });
      gsap.fromTo(
        el,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          opacity: 0,
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          duration: 0.32,
          ease: "power2.out",
          pointerEvents: "auto",
        }
      );
    } else {
      gsap.killTweensOf(el);
      gsap.to(el, {
        clipPath: "inset(0% 0% 100% 0%)",
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        pointerEvents: "none",
        onComplete: () => {
          gsap.set(el, { display: "none" });
        },
      });
    }
  }, [isHovered]);

  return (
    <div
      className={`relative group h-full transition-shadow duration-300 ${
        isHovered
          ? "z-50 shadow-[0_20px_50px_rgba(0,0,0,0.22)]"
          : "z-10 shadow-none"
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        if (product?.productId) {
          fetchProductSampleImages(product.productId);
        }
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Base In-Flow Card (holds grid spot rock solid - NEVER affected or jittered) */}
      <div
        onClick={() => onOpenDetail && onOpenDetail(recommendation, selectedVariantIndex)}
        className={`relative bg-white border border-[#EAECEF] hover:border-slate-300 rounded-none transition-all duration-200 flex flex-col cursor-pointer h-full z-10 ${
          isHovered
            ? "shadow-[0_12px_36px_rgba(0,0,0,0.16)]"
            : "shadow-none"
        }`}
      >
        {/* Aspect-Square Image Box */}
        <div className="relative aspect-square w-full bg-transparent rounded-none flex items-center justify-center overflow-hidden">
          {/* Normal view: Compare button removed; Heart shown ONLY if user already liked it */}
          {liked && (
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
              <IconButton
                icon={Heart}
                active={true}
                activeVariant="rose"
                rounded="full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleLike && product?.productId) onToggleLike(product.productId);
                }}
                ariaLabel="Add to wishlist"
                title="Add to wishlist"
              />
            </div>
          )}

          {currentImage ? (
            <Image
              src={currentImage}
              alt={activeVariant?.label || product.name || "Product"}
              fill
              unoptimized
              className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src && target.src.includes("/cleaned/v1/")) {
                  target.src = target.src.replace("/cleaned/v1/", "/");
                } else {
                  target.style.display = "none";
                }
              }}
            />
          ) : (
            <div className="text-3xl font-cal text-slate-300 font-bold">Q</div>
          )}
        </div>

        {/* Content Section Below Image - flex-1 flex flex-col justify-between keeps amount ALWAYS at bottom */}
        <div className="bg-white px-3.5 pt-3 pb-3 sm:pb-3.5 flex-1 flex flex-col justify-between border-t border-[#EAECEF]">
          <div>
            {colorValues.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 px-0.5 overflow-x-auto py-0.5 scrollbar-none">
                {colorValues.map((v, idx) => {
                  const isSelected = displayVariantIndex === idx;
                  const isOutOfStock = isValueOutOfStock(v);
                  const isMissing = isValueMissing(v);
                  return (
                    <button
                      key={v.id || v.label || idx}
                      type="button"
                      onMouseEnter={() => setHoveredVariantIndex(idx)}
                      onMouseLeave={() => setHoveredVariantIndex(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVariantIndex(idx);
                        setHoveredVariantIndex(null);
                      }}
                      className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border bg-white transition-all cursor-pointer flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "border-slate-900 ring-1.5 ring-slate-900 scale-105 shadow-xs"
                          : "border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100"
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
            )}

            <div className="px-0.5">
              <p className="font-cal text-xs text-[#6B7280] font-medium tracking-wide truncate" title={product.brand || product.category || "Puma"}>
                {product.brand || product.category}
              </p>
              <h3 className="font-cal text-sm font-bold text-[#111827] truncate mt-0.5 tracking-tight" title={product.name}>
                {product.name}
              </h3>
            </div>
          </div>

          {/* Amount ALWAYS pinned at bottom */}
          <div className="px-0.5 mt-auto pt-2.5 pb-1 sm:pb-1.5 flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#111827] font-cal tracking-tight leading-none block">
              {formatPrice(selected?.price || lowestPrice, selected?.currency || "USD")}
            </span>
            <span className="text-xs text-slate-500 font-cal font-medium flex items-center gap-1 sm:hidden">
              <Store className="w-3 h-3 text-[#0070BA]" />
              {offers.length} {offers.length === 1 ? "store" : "stores"}
            </span>
          </div>

          {/* Mobile-only Action Bar (Quick compare & buy on small screens) */}
          <div className="sm:hidden mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail && onOpenDetail(recommendation, selectedVariantIndex);
              }}
              className="font-cal w-full py-1.5 px-3 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>Compare & Buy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Expanded Sideways Semi-Details Panel (Reveals in front from top to bottom) */}
      <div
        ref={sidePanelRef}
        style={{ display: "none" }}
        className={`hidden sm:block absolute top-0 ${sidePlacementClass} w-[calc(100%+1.25rem)] lg:w-[calc(100%+1.5rem)] h-full z-[100] bg-white border border-slate-300 p-3.5 cursor-default overflow-hidden ${
          expandToLeft
            ? "shadow-[-20px_25px_50px_rgba(0,0,0,0.32)]"
            : "shadow-[20px_25px_50px_rgba(0,0,0,0.32)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header Action Bar: Heart, Cart, Compare, Open Detail in exact requested order */}
            <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-100 flex-shrink-0">
              <IconButton
                icon={Heart}
                active={liked}
                activeVariant="rose"
                rounded="full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleLike && product?.productId) onToggleLike(product.productId);
                }}
                ariaLabel="Add to wishlist"
                title="Add to wishlist"
              />
              <IconButton
                icon={justAddedToCart ? Check : ShoppingCart}
                active={justAddedToCart}
                activeVariant="primary"
                rounded="full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddToCart && selected) {
                    onAddToCart(recommendation, selected, quantity);
                    setJustAddedToCart(true);
                    setTimeout(() => setJustAddedToCart(false), 1200);
                  }
                }}
                ariaLabel="Add to cart"
                title="Add to cart"
              />
              <IconButton
                icon={Scale}
                active={compared}
                activeVariant="primary"
                rounded="full"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompared((prev) => !prev);
                }}
                ariaLabel="Compare product"
                title="Compare product"
              />
              <IconButton
                icon={ArrowUpRight}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail && onOpenDetail(recommendation, selectedVariantIndex);
                }}
                ariaLabel="View full details"
                title="View full details & all stores"
                rounded="full"
              />
            </div>

            {/* Stores Stack */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-1">
              <div className="font-cal flex items-center text-[12px] font-semibold text-slate-700 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#0070BA]" />
                  <span>Store Offers ({offers.length})</span>
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
                {offers.map((offer, idx) => {
                  const isSelected = idx === safeIndex;
                  return (
                    <div
                      key={`${offer.merchant}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOffer(product.productId, idx);
                      }}
                      className={`p-1.5 sm:p-2 rounded-none border text-xs transition-all cursor-pointer flex items-center justify-between flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-50/90 border-[#0070BA] ring-1 ring-[#0070BA]"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <div
                          className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isSelected
                              ? "bg-[#0070BA] text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {offer.merchant?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-cal font-semibold text-slate-800 text-[11px] truncate">
                            {offer.merchant}
                          </span>
                          <span className="text-[9px] text-slate-400 font-cal truncate">
                            {offer.availability || "In stock"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-bold text-slate-900 font-cal text-xs sm:text-sm">
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
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quantity Selector + PayPal Button */}
          {selected && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-cal text-slate-500 font-medium">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-none overflow-hidden bg-slate-50 text-xs font-bold">
                  <button
                    type="button"
                    className="px-2 py-0.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer rounded-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(product.productId, Math.max(1, quantity - 1));
                    }}
                  >
                    -
                  </button>
                  <span className="px-2 py-0.5 bg-white text-slate-900 min-w-5 text-center font-cal text-xs">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="px-2 py-0.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer rounded-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(product.productId, Math.min(10, quantity + 1));
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckout(recommendation, selected, quantity);
                  }}
                  disabled={checkingOut || !selected}
                  className="font-cal w-full py-2 px-2.5 rounded-none bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-white flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
                  </svg>
                  <span className="truncate">
                    {checkingOut
                      ? "Locking…"
                      : `PayPal · ${formatPrice(selected.price * quantity, selected.currency)}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { IconButton } from "@/components/ui/icon-button";
