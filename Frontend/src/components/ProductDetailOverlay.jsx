"use client";

import IconButton from "@/components/ui/icon-button";
import {
  normalizeProductVariants,
  getColorHex,
  isValueOutOfStock,
  isValueMissing,
} from "@/lib/variants";
import {
  fetchProductSampleImages,
  getCachedProductImages,
} from "@/lib/productDetailService";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  X,
  Store,
  ExternalLink,
  Check,
  Heart,
  Scale,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  ShoppingCart,
} from "lucide-react";

function formatPrice(value, currency) {
  if (value === null || value === undefined || !currency)
    return "Price unavailable";
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

function cleanDescription(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      offer.productUrl,
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
  isLiked = false,
  onToggleLike,
  onAddToCart,
}) {
  const product = recommendation?.product;
  const offers = useMemo(() => getOffers(recommendation), [recommendation]);
  const [selectedOfferIdx, setSelectedOfferIdx] = useState(
    selectedIndex >= 0 && selectedIndex < offers.length ? selectedIndex : 0,
  );
  const [selectedVariant, setSelectedVariant] = useState(initialVariantIndex);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [compared, setCompared] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [fetchedImages, setFetchedImages] = useState(() => {
    const cached = getCachedProductImages(product?.productId);
    if (cached && cached.length) return cached;
    return Array.isArray(product?.images) ? product.images : [];
  });

  // Lazy-load sample images if not already present on product
  useEffect(() => {
    if (!product?.productId) return;
    const initialImages = Array.isArray(product.images) ? product.images : [];
    if (initialImages.length > 1) return;
    // Fetch from Channel3 API on detail open
    let isSubscribed = true;
    fetchProductSampleImages(product.productId).then((data) => {
      if (isSubscribed && data?.images?.length) {
        setFetchedImages(data.images);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [product?.productId, product?.images]);

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

  const selectedOffer = offers[selectedOfferIdx] || offers[0];

  // Price calculations
  const prices = offers.map((o) => Number(o.price)).filter(Number.isFinite);
  const lowestPrice =
    prices.length > 0 ? Math.min(...prices) : Number(selectedOffer?.price || 0);
  const highestPrice =
    prices.length > 0 ? Math.max(...prices) : Number(selectedOffer?.price || 0);
  const hasDiscount = highestPrice > lowestPrice;
  const originalPrice = hasDiscount
    ? highestPrice
    : Number(selectedOffer?.price || 0) * 1.15;
  const discountPercent =
    hasDiscount && highestPrice > 0
      ? Math.round(
          ((highestPrice - (selectedOffer?.price || lowestPrice)) /
            highestPrice) *
            100,
        )
      : null;

  // Variants calculation & normalization
  const variantData = useMemo(
    () => normalizeProductVariants(product),
    [product],
  );
  const [userSelectedOptions, setUserSelectedOptions] = useState({});
  const selectedOptions = useMemo(
    () => ({ ...(variantData?.selectedMap || {}), ...userSelectedOptions }),
    [variantData, userSelectedOptions],
  );

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
    hoveredVariantIdx !== null ? colorValues[hoveredVariantIdx] : null;

  const channel3SizeOption = variantData.sizeOption;
  const activeSizeLabel = channel3SizeOption
    ? selectedOptions[channel3SizeOption.name] || ""
    : selectedSize;

  // Size calculation from product options
  const { sizes, sizeType } = useMemo(() => {
    if (!product) return { sizes: [], sizeType: "" };
    if (channel3SizeOption) return { sizes: [], sizeType: "" };
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return { sizes: product.sizes, sizeType: "Options" };
    }
    if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0) {
      return { sizes: product.sizeOptions, sizeType: "Options" };
    }
    return { sizes: [], sizeType: "" };
  }, [product, channel3SizeOption]);

  // Collect all unique sample images from variant swatches, fetched images, product images, and fallback
  const galleryImages = useMemo(() => {
    const list = [
      previewColorValue?.imageUrl,
      previewColorValue?.thumbnailUrl,
      activeColorValue?.imageUrl,
      activeColorValue?.thumbnailUrl,
      ...(Array.isArray(fetchedImages) ? fetchedImages : []),
      ...(Array.isArray(product?.images) ? product.images : []),
      product?.imageUrl,
    ].filter(Boolean);

    // Deduplicate preserving order
    return Array.from(new Set(list));
  }, [previewColorValue, activeColorValue, fetchedImages, product]);

  // Main featured image priority:
  // 1. Swatch preview (if currently hovering color swatch)
  // 2. Active gallery thumbnail selection
  // 3. Active color value
  // 4. Default product imageUrl
  const currentFeaturedImage = useMemo(() => {
    if (previewColorValue?.imageUrl || previewColorValue?.thumbnailUrl) {
      return previewColorValue.imageUrl || previewColorValue.thumbnailUrl;
    }
    if (galleryImages.length > 0 && galleryImages[activeImageIndex]) {
      return galleryImages[activeImageIndex];
    }
    return (
      activeColorValue?.imageUrl ||
      activeColorValue?.thumbnailUrl ||
      product?.imageUrl ||
      ""
    );
  }, [previewColorValue, galleryImages, activeImageIndex, activeColorValue, product]);

  const isSelectedVariantOutOfStock = useMemo(() => {
    if (!variantData.hasVariants) return false;
    if (activeColorValue && isValueOutOfStock(activeColorValue)) {
      return true;
    }
    if (channel3SizeOption) {
      const chosenSize = selectedOptions[channel3SizeOption.name];
      const sizeVal = channel3SizeOption.values.find(
        (v) => v.label === chosenSize,
      );
      if (sizeVal && isValueOutOfStock(sizeVal)) {
        return true;
      }
    }
    return false;
  }, [variantData, activeColorValue, channel3SizeOption, selectedOptions]);

  if (!product) return null;

  // Additional details extraction
  const rawDescription = cleanDescription(product.description);
  const isDescriptionLong = rawDescription
    ? rawDescription.length > 200
    : false;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative bg-white w-full max-w-5xl my-auto rounded-none shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[94vh] md:h-[88vh] max-h-[900px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 bg-[#FAFAFA] shrink-0">
          <IconButton
            icon={ArrowLeft}
            onClick={onClose}
            ariaLabel="Back to results"
            title="Back to results"
            rounded="full"
          />

          <span className="font-cal text-xs sm:text-sm uppercase tracking-wider text-slate-700 font-bold absolute left-1/2 -translate-x-1/2 pointer-events-none">
            Product Overview
          </span>

          <IconButton
            icon={X}
            onClick={onClose}
            ariaLabel="Close modal"
            title="Close modal"
            rounded="full"
          />
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Left Column: Image Gallery (stays in view) */}
          <div className="md:col-span-6 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 md:overflow-y-auto">
            {/* Featured Image Canvas with Amazon-Style Hover Zoom Lens */}
            <div
              className={`relative w-full aspect-square bg-white rounded-none flex items-center justify-center p-6 border border-slate-100 overflow-hidden group select-none ${
                isZooming ? "cursor-none" : "cursor-crosshair"
              }`}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(
                  0,
                  Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
                );
                const y = Math.max(
                  0,
                  Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
                );
                setZoomPos({ x, y });
              }}
            >
              {currentFeaturedImage ? (
                <>
                  {/* Stable Base Image: always fully visible, unpadded so image reaches full canvas edges */}
                  <div className="relative w-full h-full">
                    <Image
                      src={currentFeaturedImage}
                      alt={product.name || "Product"}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>

                  {/* Magnifier Glass Box following cursor: contains zoomed product image preview */}
                  {isZooming && (
                    <div
                      className="absolute pointer-events-none w-60 h-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border-1 border-slate-900/80 bg-white bg-no-repeat z-30 overflow-hidden"
                      style={{
                        left: `${zoomPos.x}%`,
                        top: `${zoomPos.y}%`,
                        backgroundImage: `url(${currentFeaturedImage})`,
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundSize: "200%",
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="text-4xl font-cal text-slate-300 font-bold">
                  Q
                </div>
              )}
            </div>

            {/* Thumbnail Gallery Strip */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 mt-4 w-full overflow-x-auto pb-1 scrollbar-none">
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

            {/* Action Buttons Below Images: Heart, Compare, Cart */}
            <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
              <IconButton
                icon={Heart}
                active={isLiked}
                activeVariant="rose"
                rounded="full"
                className="w-10 h-10 [&_svg]:w-4.5 [&_svg]:h-4.5"
                onClick={() => {
                  if (onToggleLike && product?.productId) {
                    onToggleLike(product.productId);
                  }
                }}
                ariaLabel="Add to wishlist"
                title="Add to wishlist"
              />
              <IconButton
                icon={Scale}
                active={compared}
                activeVariant="primary"
                rounded="full"
                className="w-10 h-10 [&_svg]:w-4.5 [&_svg]:h-4.5"
                onClick={() => setCompared((prev) => !prev)}
                ariaLabel="Compare product"
                title="Compare product"
              />
              <IconButton
                icon={justAddedToCart ? Check : ShoppingCart}
                active={justAddedToCart}
                activeVariant="primary"
                rounded="full"
                className="w-10 h-10 [&_svg]:w-4.5 [&_svg]:h-4.5"
                disabled={isSelectedVariantOutOfStock}
                onClick={() => {
                  if (onAddToCart && selectedOffer) {
                    onAddToCart(recommendation, selectedOffer, quantity);
                    setJustAddedToCart(true);
                    setTimeout(() => setJustAddedToCart(false), 1200);
                  }
                }}
                ariaLabel="Add to cart"
                title={
                  isSelectedVariantOutOfStock ? "Out of stock" : "Add to cart"
                }
              />
            </div>
          </div>

          {/* Right Column: Independently Scrollable Details */}
          <div className="md:col-span-6 flex flex-col h-full min-h-0 p-4 sm:p-6 md:p-8 bg-white">
            {/* Scrollable Content Container */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2.5 space-y-4">
              {/* Product Header: Brand & Title */}
              <div>
                <p className="font-cal text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                  {product.brand || product.category || "Exclusive"}
                </p>

                <h2 className="font-cal text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {product.name}
                </h2>

                {/* Price Row */}
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-cal tracking-tight">
                    {formatPrice(
                      selectedOffer?.price || lowestPrice,
                      selectedOffer?.currency || "USD",
                    )}
                  </span>
                  {originalPrice > (selectedOffer?.price || lowestPrice) && (
                    <span className="text-sm text-slate-400 line-through font-cal">
                      {formatPrice(
                        originalPrice,
                        selectedOffer?.currency || "USD",
                      )}
                    </span>
                  )}
                  {discountPercent && discountPercent > 0 ? (
                    <span className="text-xs font-cal font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5">
                      Save {discountPercent}%
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Colorway Selection */}
              {colorValues.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[14px] text-slate-600 mb-2 flex items-center justify-between">
                    <div>
                      <span className="font-cal font-semibold text-slate-800">
                        {colorOption?.name || "Color"}:{" "}
                      </span>
                      <span>{activeColorLabel}</span>
                    </div>
                    {activeColorValue &&
                      isValueOutOfStock(activeColorValue) && (
                        <span className="text-[11px] font-bold text-rose-600 font-cal bg-rose-50 px-2 py-0.5 border border-rose-200">
                          Out of Stock
                        </span>
                      )}
                  </div>

                  {/* Circular Variant Swatches */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                    {colorValues.map((v, idx) => {
                      const isSelected =
                        activeColorLabel === v.label || selectedVariant === idx;
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
                              setUserSelectedOptions((prev) => ({
                                ...prev,
                                [colorOption.name]: v.label,
                              }));
                            }
                          }}
                          className={`relative w-9 h-9 rounded-full overflow-hidden border bg-[#F6F7F9] transition-all cursor-pointer flex-shrink-0 flex items-center justify-center ${
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
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-2">
                    <span className="font-cal font-semibold text-slate-800">
                      {channel3SizeOption.name}{" "}
                      {activeSizeLabel ? `· ${activeSizeLabel}` : ""}
                    </span>
                    <span className="text-slate-400 font-cal text-xs">
                      Options
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {channel3SizeOption.values.map((v) => {
                      const isSelected =
                        selectedOptions[channel3SizeOption.name] === v.label;
                      const isOutOfStock = isValueOutOfStock(v);
                      const isMissing = isValueMissing(v);
                      return (
                        <button
                          key={v.label}
                          type="button"
                          onClick={() =>
                            setUserSelectedOptions((prev) => ({
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
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-2">
                    <span className="font-cal font-semibold text-slate-800">
                      Size {selectedSize ? `· ${selectedSize}` : ""}
                    </span>
                    <span className="text-slate-400 font-cal text-xs">
                      {sizeType}
                    </span>
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
                <div key={opt.name} className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-2">
                    <span className="font-cal font-semibold text-slate-800">
                      {opt.name}{" "}
                      {selectedOptions[opt.name]
                        ? `· ${selectedOptions[opt.name]}`
                        : ""}
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
                            setUserSelectedOptions((prev) => ({
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

              {/* About Product / Description */}
              {rawDescription ? (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[14px] mb-1.5">
                    <span className="font-cal font-semibold text-slate-800">
                      Product Description
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed font-sans">
                    <p
                      className={
                        !isDescriptionExpanded && isDescriptionLong
                          ? "line-clamp-3"
                          : ""
                      }
                    >
                      {rawDescription}
                    </p>
                    {isDescriptionLong && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsDescriptionExpanded((prev) => !prev)
                        }
                        className="font-cal text-[#0070BA] hover:underline font-semibold mt-1 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {isDescriptionExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Read full description</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Product Specifications Table */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[14px] mb-2">
                  <span className="font-cal font-semibold text-slate-800">
                    Specifications & Details
                  </span>
                </div>
                <div className="border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-2 p-2 bg-[#FAFAFA]">
                    <span className="text-slate-500 font-cal">Brand</span>
                    <span className="text-slate-900 font-medium font-sans">
                      {product.brand || "Standard"}
                    </span>
                  </div>
                  {product.category && (
                    <div className="grid grid-cols-2 p-2">
                      <span className="text-slate-500 font-cal">Category</span>
                      <span className="text-slate-900 font-medium font-sans">
                        {product.category}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 p-2 bg-[#FAFAFA]">
                    <span className="text-slate-500 font-cal">
                      Availability
                    </span>
                    <span className="text-slate-900 font-medium font-sans flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${product.inStock !== false ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                      {product.inStock !== false ? "In Stock" : "Limited stock"}
                    </span>
                  </div>
                  {product.productId && (
                    <div className="grid grid-cols-2 p-2">
                      <span className="text-slate-500 font-cal">
                        Product ID / SKU
                      </span>
                      <span className="text-slate-700 font-mono text-[11px] truncate">
                        {product.productId}
                      </span>
                    </div>
                  )}
                  {offers.length > 0 && (
                    <div className="grid grid-cols-2 p-2 bg-[#FAFAFA]">
                      <span className="text-slate-500 font-cal">
                        Retailer Stores
                      </span>
                      <span className="text-slate-900 font-medium font-sans">
                        {offers.length} stores compared
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Merchant Comparison Table: "Available at" */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[14px] mb-2">
                  <span className="font-cal font-semibold text-slate-800">
                    Available at ({offers.length} stores)
                  </span>
                  <span className="text-[11px] font-cal text-slate-400">
                    Select store to buy from
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {offers.map((offer, idx) => {
                    const isSelected = idx === selectedOfferIdx;
                    const isBestPrice =
                      Number(offer.price) === lowestPrice && offers.length > 1;

                    return (
                      <div
                        key={`${offer.merchant}-${idx}`}
                        onClick={() => {
                          setSelectedOfferIdx(idx);
                          if (onSelectOffer) {
                            onSelectOffer(product.productId, idx);
                          }
                        }}
                        className={`p-2.5 rounded-none border text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/90 border-[#0070BA] ring-1 ring-[#0070BA]"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold ${
                              isSelected
                                ? "bg-[#0070BA] text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {offer.merchant?.charAt(0).toUpperCase() || "S"}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-cal font-semibold text-slate-800 text-xs">
                                {offer.merchant}
                              </span>
                              {isBestPrice && (
                                <span className="text-[9px] font-cal font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2">
                                  Best Price
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {offer.availability || "In stock"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                              title="Open store listing in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Quantity + PayPal Instant Checkout (Pinned at bottom of right column) */}
            <div className="shrink-0 pt-3 border-t border-slate-200 space-y-2.5 mt-auto bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-cal text-slate-500 font-medium">
                  Quantity:
                </span>
                <div className="flex items-center border border-slate-300 rounded-none bg-slate-50 text-xs font-bold">
                  <button
                    type="button"
                    className="px-2.5 py-0.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    onClick={() =>
                      onQuantityChange &&
                      onQuantityChange(
                        product.productId,
                        Math.max(1, quantity - 1),
                      )
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
                      onQuantityChange(
                        product.productId,
                        Math.min(10, quantity + 1),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {selectedOffer && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      onCheckout(recommendation, selectedOffer, quantity)
                    }
                    disabled={checkingOut || isSelectedVariantOutOfStock}
                    className={`font-cal w-full py-2.5 px-3 rounded-none font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      isSelectedVariantOutOfStock
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                        : "bg-[#0070BA] hover:bg-[#005ea6] text-white disabled:opacity-60 disabled:cursor-wait"
                    }`}
                  >
                    {isSelectedVariantOutOfStock ? (
                      <span>Out of Stock</span>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 fill-white"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
                        </svg>
                        <span>
                          {checkingOut
                            ? "Locking Order…"
                            : `Pay via PayPal · ${formatPrice((selectedOffer.price || 0) * quantity, selectedOffer.currency)}`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
