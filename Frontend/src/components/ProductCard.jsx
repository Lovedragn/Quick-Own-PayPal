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
  ImageIcon,
} from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import {
  normalizeProductVariants,
  getColorHex,
  isValueOutOfStock,
  isValueMissing,
  extractImageUrl,
  buildCleanedUrlMap,
  getPrimaryCleanedImage,
  deduplicateImages,
  extractNormalizedOffers,
} from "@/lib/variants";
import {
  fetchProductSampleImages,
  getCachedProductImages,
  getCachedProduct,
} from "@/lib/productDetailService";

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
  return extractNormalizedOffers(recommendation);
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
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

  // Extra full product details (hydrated from Channel3 retrieve on mount or cache)
  const [extraProduct, setExtraProduct] = useState(() => {
    return getCachedProduct(product?.productId) || null;
  });

  // Lazy-loaded or cached product sample images
  const [sampleImages, setSampleImages] = useState(() => {
    const cachedImages = getCachedProductImages(product?.productId);
    if (cachedImages && cachedImages.length) return cachedImages;
    const cachedProd = getCachedProduct(product?.productId);
    if (cachedProd?.images && cachedProd.images.length) return cachedProd.images;
    return Array.isArray(product?.images) ? product.images : [];
  });

  // Auto-fetch full product details for variants and images if not present
  useEffect(() => {
    if (!product?.productId) return;
    let isSubscribed = true;
    fetchProductSampleImages(product.productId).then((data) => {
      if (!isSubscribed || !data) return;
      if (data.rawProduct) {
        setExtraProduct(data.rawProduct);
      }
      if (data.images?.length) {
        setSampleImages(data.images);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [product?.productId]);

  // Cleaned image map (raw URL/UUID -> cleaned_url)
  const cleanedMap = useMemo(() => {
    return buildCleanedUrlMap(product, extraProduct);
  }, [product, extraProduct]);

  const activeProduct = useMemo(() => {
    if (!extraProduct) return product;
    const rawImgs =
      extraProduct.images && extraProduct.images.length > 0
        ? extraProduct.images
        : product?.images;
    const normalizedImages = Array.isArray(rawImgs)
      ? deduplicateImages(rawImgs, cleanedMap)
      : [];

    return {
      ...product,
      ...extraProduct,
      imageUrl:
        getPrimaryCleanedImage(product, extraProduct, cleanedMap) ||
        extractImageUrl(extraProduct.imageUrl, cleanedMap) ||
        extractImageUrl(product?.imageUrl, cleanedMap) ||
        (normalizedImages.length > 0 ? normalizedImages[0] : null),
      variants: extraProduct.variants || product?.variants,
      images: normalizedImages,
    };
  }, [product, extraProduct, cleanedMap]);

  // Variants and swatches calculation & normalization using activeProduct and cleanedMap
  const variantData = useMemo(
    () => normalizeProductVariants(activeProduct, cleanedMap),
    [activeProduct, cleanedMap]
  );
  const colorOption = variantData.colorOption;

  const swatches = useMemo(() => {
    // 1. Genuine color variants from Channel3 UCP variants object
    if (variantData.isUcp && colorOption?.values && colorOption.values.length > 0) {
      const rawList = colorOption.values.map((v, i) => {
        const thumb =
          extractImageUrl(v.thumbnailUrl, cleanedMap) ||
          extractImageUrl(v.thumbnail_url, cleanedMap) ||
          extractImageUrl(v.imageUrl, cleanedMap) ||
          extractImageUrl(v.image_url, cleanedMap);
        const img =
          extractImageUrl(v.imageUrl, cleanedMap) ||
          extractImageUrl(v.image_url, cleanedMap) ||
          thumb;
        return {
          id: v.id || v.product_id || v.label || `var-${i}`,
          label: v.label || `Option ${i + 1}`,
          thumbnailUrl: thumb,
          imageUrl: img,
          available: v.available,
          exists: v.exists !== false,
          productId: v.product_id || v.productId || null,
        };
      });

      // Put the product's active colorway at index 0 so the first swatch always matches the main card image!
      const currentLabel =
        variantData.selectedMap?.[colorOption.name] ||
        product?.color ||
        "";
      const currentProdId = product?.productId || activeProduct?.productId;

      const activeIdx = rawList.findIndex(
        (s) =>
          (currentProdId && s.productId === currentProdId) ||
          (currentLabel && s.label === currentLabel)
      );

      if (activeIdx > 0) {
        const activeItem = rawList[activeIdx];
        const rest = rawList.filter((_, idx) => idx !== activeIdx);
        return [activeItem, ...rest];
      }

      return rawList;
    }

    // 2. Legacy flat variants list
    if (Array.isArray(activeProduct?.variants) && activeProduct.variants.length > 0) {
      return activeProduct.variants.map((v, i) => {
        const thumb =
          extractImageUrl(v.thumbnailUrl, cleanedMap) ||
          extractImageUrl(v.imageUrl, cleanedMap);
        const img = extractImageUrl(v.imageUrl, cleanedMap) || thumb;
        return {
          id: v.id || `var-${i}`,
          label: v.name || v.label || `Option ${i + 1}`,
          thumbnailUrl: thumb,
          imageUrl: img,
          available: v.available === false ? "OutOfStock" : "InStock",
          exists: true,
        };
      });
    }

    // 3. No variants: Current product itself is the single variant
    const defaultThumb =
      getPrimaryCleanedImage(product, activeProduct, cleanedMap) ||
      extractImageUrl(activeProduct?.imageUrl, cleanedMap) ||
      extractImageUrl(activeProduct?.image, cleanedMap) ||
      extractImageUrl(product?.imageUrl, cleanedMap) ||
      null;
    return [
      {
        id: activeProduct?.productId || activeProduct?.id || "var-default",
        label: activeProduct?.color || activeProduct?.name || "Standard",
        thumbnailUrl: defaultThumb,
        imageUrl: defaultThumb,
        available: activeProduct?.inStock !== false ? "InStock" : "OutOfStock",
        exists: true,
      },
    ];
  }, [colorOption, activeProduct, variantData.isUcp, product, cleanedMap, variantData.selectedMap]);

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const [userClickedVariant, setUserClickedVariant] = useState(false);
  const [hoveredVariantIndex, setHoveredVariantIndex] = useState(null);

  const displayVariantIndex =
    hoveredVariantIndex !== null ? hoveredVariantIndex : selectedVariantIndex;

  const activeVariant = swatches[displayVariantIndex] || swatches[0] || null;

  const primaryCleanedImage =
    getPrimaryCleanedImage(product, extraProduct, cleanedMap) ||
    extractImageUrl(activeProduct?.imageUrl, cleanedMap) ||
    extractImageUrl(product?.imageUrl, cleanedMap) ||
    (sampleImages && sampleImages.length > 0
      ? extractImageUrl(sampleImages[0], cleanedMap)
      : null) ||
    null;

  let currentImage = null;
  // Semi-detail card ONLY switches image when hovering a small variant swatch, or when clicked
  if (hoveredVariantIndex !== null) {
    currentImage =
      extractImageUrl(activeVariant?.imageUrl, cleanedMap) ||
      extractImageUrl(activeVariant?.thumbnailUrl, cleanedMap) ||
      primaryCleanedImage;
  } else if (userClickedVariant && (activeVariant?.imageUrl || activeVariant?.thumbnailUrl)) {
    currentImage =
      extractImageUrl(activeVariant.imageUrl, cleanedMap) ||
      extractImageUrl(activeVariant.thumbnailUrl, cleanedMap) ||
      primaryCleanedImage;
  } else {
    currentImage =
      extractImageUrl(activeVariant?.imageUrl, cleanedMap) ||
      extractImageUrl(activeVariant?.thumbnailUrl, cleanedMap) ||
      primaryCleanedImage ||
      extractImageUrl(swatches[0]?.imageUrl, cleanedMap) ||
      extractImageUrl(swatches[0]?.thumbnailUrl, cleanedMap) ||
      extractImageUrl(activeProduct?.imageUrl, cleanedMap) ||
      extractImageUrl(product?.imageUrl, cleanedMap) ||
      (sampleImages && sampleImages.length > 0
        ? extractImageUrl(sampleImages[0], cleanedMap)
        : null) ||
      null;
  }

  const [prevImage, setPrevImage] = useState(currentImage);
  if (prevImage !== currentImage) {
    setPrevImage(currentImage);
    setIsImageLoaded(false);
  }

  const MAX_VISIBLE_SWATCHES = 6;
  const visibleSwatches = swatches.slice(0, MAX_VISIBLE_SWATCHES);
  const overflowSwatches = swatches.length - visibleSwatches.length;

  const activeDetailVariant = userClickedVariant
    ? swatches[selectedVariantIndex]?.label || selectedVariantIndex
    : null;

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
          fetchProductSampleImages(product.productId).then((data) => {
            if (data?.images?.length) {
              setSampleImages((prev) => {
                if (prev.length >= data.images.length) return prev;
                return data.images;
              });
            }
          });
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* 1. Base In-Flow Card (holds grid spot rock solid - NEVER affected or jittered) */}
      <div
        onClick={() => onOpenDetail && onOpenDetail(recommendation, activeDetailVariant)}
        className={`relative bg-white border border-[#EAECEF] hover:border-slate-300 rounded-none transition-all duration-200 flex flex-col cursor-pointer h-full z-10 ${
          isHovered
            ? "shadow-[0_12px_36px_rgba(0,0,0,0.16)]"
            : "shadow-none"
        }`}
      >
        {/* Aspect-Square Image Box */}
        <div
          className="relative aspect-square w-full bg-transparent rounded-none flex items-center justify-center overflow-hidden"
        >
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
                  if (onToggleLike && product?.productId) {
                    onToggleLike(product.productId, recommendation);
                  }
                }}
                ariaLabel="Add to wishlist"
                title="Add to wishlist"
              />
            </div>
          )}

          {/* Wave Shimmer Alt Image Placeholder while image loads */}
          {!isImageLoaded && (
            <div
              className="absolute inset-0 z-0 shimmer-wave flex flex-col items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <ImageIcon className="w-9 h-9 text-zinc-300/80" strokeWidth={1.5} />
            </div>
          )}

          {Boolean(currentImage && typeof currentImage === "string" && currentImage.trim()) ? (
            <Image
              src={currentImage.trim()}
              alt={activeVariant?.label || product.name || "Product"}
              fill
              unoptimized
              onLoad={() => setIsImageLoaded(true)}
              onError={(e) => {
                setIsImageLoaded(true);
                const target = e.currentTarget;
                if (target.src && target.src.includes("/cleaned/v1/")) {
                  target.src = target.src.replace("/cleaned/v1/", "/");
                } else if (primaryCleanedImage && target.src !== primaryCleanedImage) {
                  target.src = primaryCleanedImage;
                }
              }}
              className={`object-contain w-full h-full p-2 group-hover:scale-105 transition-all duration-300 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <div className="text-3xl font-cal text-slate-300 font-bold">Q</div>
          )}
        </div>

        {/* Content Section Below Image - flex-1 flex flex-col justify-between keeps amount ALWAYS at bottom */}
        <div className="bg-white px-3.5 pt-3 pb-3 sm:pb-3.5 flex-1 flex flex-col justify-between border-t border-[#EAECEF]">
          <div>
            {visibleSwatches.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 px-0.5 overflow-x-auto py-0.5 scrollbar-none">
                {visibleSwatches.map((v, idx) => {
                  const isSelected = displayVariantIndex === idx;
                  const isOutOfStock = isValueOutOfStock(v);
                  const isMissing = isValueMissing(v);
                  const thumb =
                    (typeof v.thumbnailUrl === "string" && v.thumbnailUrl.trim()) ||
                    (typeof v.imageUrl === "string" && v.imageUrl.trim()) ||
                    null;
                  return (
                    <button
                      key={v.id || v.label || idx}
                      type="button"
                      onMouseEnter={() => setHoveredVariantIndex(idx)}
                      onMouseLeave={() => setHoveredVariantIndex(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVariantIndex(idx);
                        setUserClickedVariant(true);
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
                      {thumb ? (
                        <Image
                          src={thumb}
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
                {overflowSwatches > 0 && (
                  <span
                    className="text-[11px] font-bold text-slate-500 font-cal flex-shrink-0 self-center pl-0.5"
                    title={`${overflowSwatches} more variants`}
                  >
                    +{overflowSwatches}
                  </span>
                )}
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
                onOpenDetail && onOpenDetail(recommendation, activeDetailVariant);
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
                  if (onToggleLike && product?.productId) {
                    onToggleLike(product.productId, recommendation);
                  }
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
                  onOpenDetail && onOpenDetail(recommendation, activeDetailVariant);
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
