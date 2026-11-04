"use client";

import IconButton from "@/components/ui/icon-button";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDetailOverlay from "@/components/ProductDetailOverlay";
import { useCartPreference, useLikesPreference } from "@/lib/usePreferences";
import { getStoredPagination, saveStoredPagination } from "@/lib/storage";
import {
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Filter,
  Layers,
  Lock,
  Database,
  CreditCard,
  Quote,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowUpRight,
  Store,
  ShoppingCart,
  Heart,
  Trash2,
  X,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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

async function readApiResponse(response) {
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with HTTP ${response.status}`,
    );
  }
  return data;
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
      offer.productUrl,
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [intent, setIntent] = useState(null);
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState("");
  const [error, setError] = useState("");
  const [selectedOffers, setSelectedOffers] = useState({});
  const [quantities, setQuantities] = useState({});
  const [searchComplete, setSearchComplete] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailVariantIndex, setDetailVariantIndex] = useState(0);
  const checkoutAttemptRef = useRef(null);

  // User Preferences State with Local Storage
  const [cart, saveCart] = useCartPreference();
  const [likedIds, saveLikes] = useLikesPreference();
  const [pagination, setPagination] = useState(() => getStoredPagination());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);

  // Add Item to Cart
  function handleAddToCart(recommendation, offer, quantity = 1) {
    const product = recommendation?.product;
    if (!product || !offer) return;

    const existingIdx = cart.findIndex(
      (item) =>
        item.productId === product.productId &&
        item.offerUrl === offer.productUrl
    );

    let nextCart;
    if (existingIdx >= 0) {
      nextCart = [...cart];
      nextCart[existingIdx] = {
        ...nextCart[existingIdx],
        quantity: nextCart[existingIdx].quantity + quantity,
      };
    } else {
      nextCart = [
        ...cart,
        {
          productId: product.productId,
          productName: product.name,
          imageUrl: product.imageUrl,
          brand: product.brand,
          merchant: offer.merchant,
          offerUrl: offer.productUrl,
          price: offer.price,
          currency: offer.currency,
          quantity,
          recommendation,
          offer,
        },
      ];
    }
    saveCart(nextCart);
  }

  function handleRemoveFromCart(productId, offerUrl) {
    const nextCart = cart.filter(
      (item) => !(item.productId === productId && item.offerUrl === offerUrl)
    );
    saveCart(nextCart);
  }

  // Toggle Like Product
  function handleToggleLike(productId) {
    if (!productId) return;
    const exists = likedIds.includes(productId);
    const nextIds = exists
      ? likedIds.filter((id) => id !== productId)
      : [...likedIds, productId];
    saveLikes(nextIds);
  }

  // Update Pagination Preference (persisted for future use)
  function handlePaginationChange(newPagination) {
    setPagination(newPagination);
    saveStoredPagination(newPagination);
  }

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  }, [cart]);

  async function handleSearch(event, overrideQuery) {
    if (event) event.preventDefault();
    const message = (overrideQuery || query).trim();
    if (!message) {
      setError("Describe what you are looking for first.");
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");
    setRecommendations([]);
    setIntent(null);
    setSearchComplete(false);

    try {
      const response = await fetch(`${API_BASE}/api/ai/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await readApiResponse(response);
      const results = Array.isArray(data.recommendations)
        ? data.recommendations
        : [];

      const initialOffers = {};
      const initialQuantities = {};
      for (const recommendation of results) {
        const id = recommendation.product?.productId;
        if (!id) continue;
        const offers = getOffers(recommendation);
        const preferred = offers.findIndex(
          (offer) =>
            offer.productUrl === recommendation.selectedOffer?.productUrl,
        );
        initialOffers[id] = preferred >= 0 ? preferred : 0;
        initialQuantities[id] = 1;
      }

      setIntent(data.intent || null);
      setNotice(data.intent?.notice || "");
      setRecommendations(results);
      setSelectedOffers(initialOffers);
      setQuantities(initialQuantities);
      setSearchComplete(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to search the catalogue.");
    } finally {
      setSearching(false);
    }
  }

  function selectOffer(productId, index) {
    setSelectedOffers((current) => ({ ...current, [productId]: index }));
  }

  function changeQuantity(productId, quantity) {
    setQuantities((current) => ({ ...current, [productId]: quantity }));
  }

  async function beginCheckout(recommendation, offer, quantity) {
    const product = recommendation?.product;
    if (!product?.productId || !offer?.merchant || !offer?.productUrl) {
      setError("The selected product offer is missing required catalogue details.");
      return;
    }

    setCheckoutProduct(product.productId);
    setError("");

    try {
      const cartFingerprint = JSON.stringify({
        productId: product.productId,
        productName: product.name,
        merchantDomain: offer.merchant,
        quantity,
        offerUrl: offer.productUrl,
      });

      if (checkoutAttemptRef.current?.fingerprint !== cartFingerprint) {
        const idempotencyKey =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `quickown-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        checkoutAttemptRef.current = { fingerprint: cartFingerprint, key: idempotencyKey };
      }
      const idempotencyKey = checkoutAttemptRef.current.key;

      const response = await fetch(`${API_BASE}/api/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: [
            {
              productId: product.productId,
              productName: product.name,
              merchantDomain: offer.merchant,
              quantity,
              offerUrl: offer.productUrl,
            },
          ],
        }),
      });
      const order = await readApiResponse(response);

      if (!order.approvalUrl) {
        throw new Error("PayPal did not return an approval link.");
      }

      checkoutAttemptRef.current = null;
      window.location.assign(order.approvalUrl);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not create the PayPal Sandbox order. Please try again.",
      );
      setCheckoutProduct("");
    }
  }

  // Checkout whole cart with PayPal
  async function beginCartCheckout() {
    if (cart.length === 0) return;
    setCheckoutProduct("cart");
    setError("");

    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        merchantDomain: item.merchant,
        quantity: item.quantity,
        offerUrl: item.offerUrl,
      }));

      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `quickown-cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch(`${API_BASE}/api/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ items }),
      });
      const order = await readApiResponse(response);

      if (!order.approvalUrl) {
        throw new Error("PayPal did not return an approval link.");
      }

      window.location.assign(order.approvalUrl);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not create the PayPal Sandbox order for cart. Please try again.",
      );
      setCheckoutProduct("");
    }
  }

  return (
    <div className="relative min-h-screen bg-[#F2FBEF] text-[#17270C] overflow-x-hidden">
      {/* Painterly background flourishes (CrawlerPal aesthetic) */}
      <div className="splash splash-l" aria-hidden="true" />
      <div className="splash splash-r" aria-hidden="true" />

      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#F2FBEF]/85 backdrop-blur-md border-b border-[#D8E5D0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#002125] text-[#F2FBEF] flex items-center justify-center font-bold text-sm">
              q
            </div>
            <span className="font-cal font-bold text-xl tracking-tight text-[#17270C]">
              Quick<span className="em">Own</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A5A3F]">
            <a href="#how-it-works" className="hover:text-[#17270C] transition-colors">
              How it works
            </a>
            <a href="#architecture" className="hover:text-[#17270C] transition-colors">
              Architecture
            </a>
            <a href="#stats" className="hover:text-[#17270C] transition-colors">
              Guarantees
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wishlist / Liked Products Indicator */}
            <button
              type="button"
              onClick={() => setIsLikesOpen(true)}
              className="relative p-2 rounded-full hover:bg-[#E8F4E2] text-[#4A5A3F] hover:text-[#17270C] transition-colors cursor-pointer"
              title="Liked Products"
              aria-label="View liked products"
            >
              <Heart className={`w-5 h-5 ${likedIds.length > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
              {likedIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-cal text-[10px] flex items-center justify-center font-bold">
                  {likedIds.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-[#E8F4E2] text-[#4A5A3F] hover:text-[#17270C] transition-colors cursor-pointer"
              title="View Cart"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0070BA] text-white font-cal text-[10px] flex items-center justify-center font-bold">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-cal font-medium bg-[#E8F4E2] text-[#3F7A2E] border border-[#D8E5D0]">
              <span className="w-2 h-2 rounded-full bg-[#6FA956]" />
              PayPal Sandbox
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <header className="hero">
        <span className="splash splash-l" aria-hidden="true" />
        <span className="splash splash-r" aria-hidden="true" />
        <span className="splash splash-c" aria-hidden="true" />

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center">
          <div className="hero-inner w-full py-8">
            <h1 className="font-cal font-bold text-4xl sm:text-6xl lg:text-[64px] leading-[1.08] tracking-tight text-[#17270C] mb-4">
              Search less. Save more. <br />
              <span className="text-[#245A19]">Instant checkout with PayPal.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#4A5A3F] max-w-[50ch] mx-auto text-balance font-normal leading-relaxed">
              AI compares live prices across verified stores, locking the best deal for instant PayPal checkout.
            </p>

            {/* Channel3-Style Hero Search Bar (No button, submit on Enter) */}
            <div className="max-w-2xl mx-auto mt-8 mb-4 w-full" id="search-console">
              <form onSubmit={handleSearch} className="relative">
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
                    onClick={() => setError("")}
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

          {/* Results Section directly below search bar */}
          {searchComplete && !searching && (
            <div id="results" className="w-full mt-8 mb-12">
              {recommendations.length > 0 ? (
                <>
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
                          onSelectOffer={selectOffer}
                          quantity={quantities[productId] ?? 1}
                          onQuantityChange={changeQuantity}
                          onCheckout={beginCheckout}
                          checkingOut={checkoutProduct === productId}
                          isLiked={likedIds.includes(productId)}
                          onToggleLike={handleToggleLike}
                          onAddToCart={handleAddToCart}
                          onOpenDetail={(rec, swatchIdx) => {
                            setDetailProduct(rec);
                            setDetailVariantIndex(swatchIdx || 0);
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Channel3 Conversational Response & Follow-up Prompt Chips */}
                  <div className="mt-8 text-center space-y-3.5 max-w-2xl mx-auto">
                    <p className="font-cal text-xs sm:text-sm text-slate-700 leading-relaxed">
                      I found {recommendations.length} live {intent?.category || ""} options
                      {intent?.searchQuery ? ` for "${intent.searchQuery}"` : ""}. Hover any card to inspect merchant stock stack and lock with PayPal:
                    </p>

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
                            handleSearch(null, newQuery);
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
                </>
              ) : (
                <div className="py-16 text-center text-[#4A5A3F] font-cal text-sm">
                  No catalogue matches returned. Try a broader search prompt!
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0070BA]" />
                <h2 className="font-cal font-bold text-lg text-slate-900">Your Cart</h2>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                  {cart.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-cal text-sm">
                  Cart is empty! Find products and tap &quot;+ Cart&quot;.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.productId}-${item.offerUrl}`}
                    className="p-3 border border-slate-200 rounded-none flex items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="relative w-14 h-14 bg-white border border-slate-100 flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName || "Product"}
                          fill
                          unoptimized
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                          Q
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-500 font-cal truncate">{item.brand || item.merchant}</p>
                      <h4 className="text-xs font-bold font-cal text-slate-900 truncate">{item.productName}</h4>
                      <p className="text-xs font-bold text-[#0070BA] font-cal mt-0.5">
                        {formatPrice(item.price, item.currency)} × {item.quantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.productId, item.offerUrl)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between font-cal text-sm">
                  <span className="text-slate-600">Total Price:</span>
                  <span className="font-bold text-lg text-slate-900">
                    {formatPrice(cartTotalAmount, cart[0]?.currency || "USD")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={beginCartCheckout}
                  disabled={checkoutProduct === "cart"}
                  className="font-cal w-full py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
                  </svg>
                  <span>{checkoutProduct === "cart" ? "Locking Order…" : "Pay Cart with PayPal"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liked / Wishlist Drawer */}
      {isLikesOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn"
          onClick={() => setIsLikesOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <h2 className="font-cal font-bold text-lg text-slate-900">Liked Products</h2>
                <span className="text-xs bg-rose-50 px-2 py-0.5 rounded-full font-bold text-rose-600">
                  {likedIds.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLikesOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {likedIds.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-cal text-sm">
                  No liked products yet. Tap the heart on any product card!
                </div>
              ) : (
                likedIds.map((id) => {
                  const match = recommendations.find((r) => r.product?.productId === id);
                  return (
                    <div
                      key={id}
                      className="p-3 border border-slate-200 rounded-none flex items-center justify-between gap-3 bg-slate-50/50"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold font-cal text-slate-900 truncate">
                          {match?.product?.name || `Product #${id}`}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-cal">
                          {match?.product?.brand || "Saved preference"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleLike(id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticker Track (Below visible viewport - revealed on scroll) */}
      <div className="ticker" aria-label="Key features">
        <div className="ticker-track">
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Multi-Store Price Comparison</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Real-Time Merchant Stock Tracking</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>PayPal Sandbox Integration</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Sub-50ms Elastic Search Querying</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="w-full bg-[#E5F2E0] border-t border-[#D8E5D0] py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#002125] text-[#F2FBEF] flex items-center justify-center font-bold text-xs">
              q
            </div>
            <span className="font-cal font-bold text-base text-[#17270C]">
              Quick<span className="em">Own</span>
            </span>
          </div>

          <div className="text-xs font-cal text-[#4A5A3F] flex items-center gap-4">
            <span>Verified Stores</span>
            <span>&bull;</span>
            <span>Live Price Locks</span>
            <span>&bull;</span>
            <span>PayPal Sandbox</span>
          </div>

          <span className="text-xs font-cal px-3 py-1 rounded-full bg-[#E8F4E2] text-[#3F7A2E] border border-[#D8E5D0]">
            DEMO ENVIRONMENT &bull; NO LIVE CHARGES
          </span>
        </div>
      </footer>

      {/* Product Detail Overlay Modal (Channel3 PDP Style) */}
      {detailProduct && (
        <ProductDetailOverlay
          recommendation={detailProduct}
          selectedIndex={selectedOffers[detailProduct.product?.productId] ?? 0}
          onSelectOffer={selectOffer}
          quantity={quantities[detailProduct.product?.productId] ?? 1}
          onQuantityChange={changeQuantity}
          onCheckout={beginCheckout}
          checkingOut={checkoutProduct === detailProduct.product?.productId}
          initialVariantIndex={detailVariantIndex}
          isLiked={likedIds.includes(detailProduct.product?.productId)}
          onToggleLike={handleToggleLike}
          onAddToCart={handleAddToCart}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
}
