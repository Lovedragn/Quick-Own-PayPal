"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
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
  Store,
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
  const checkoutAttemptRef = useRef(null);

  async function handleSearch(event) {
    if (event) event.preventDefault();
    const message = query.trim();
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
    const product = recommendation.product;
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

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#E8F4E2] text-[#3F7A2E] border border-[#D8E5D0]">
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
            <h1>
              Search less. Save more. <br />
              <span className="em">Instant checkout with PayPal.</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {recommendations.map((recommendation) => {
                    const productId = recommendation.product?.productId;
                    return (
                      <ProductCard
                        key={productId || recommendation.rank}
                        recommendation={recommendation}
                        selectedIndex={selectedOffers[productId] ?? 0}
                        onSelectOffer={selectOffer}
                        quantity={quantities[productId] ?? 1}
                        onQuantityChange={changeQuantity}
                        onCheckout={beginCheckout}
                        checkingOut={checkoutProduct === productId}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-[#4A5A3F] font-mono text-sm">
                  No catalogue matches returned. Try a broader search prompt!
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Ticker Track (Below visible viewport - revealed on scroll) */}
      <div className="ticker" aria-label="Key features">
        <div className="ticker-track">
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Multi-Store Price Comparison</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Live Stock Verification</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>One-Click PayPal Checkout</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Guaranteed Price Locks</span>
          </div>
        </div>
      </div>

      {/* RAG-Style Pipeline Process Strip (CrawlerPal signature) */}
      <section id="how-it-works" className="py-24 border-t border-[#D8E5D0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl sm:text-5xl text-[#17270C] font-normal mb-4 text-balance">
              From natural language <span className="italic text-[#245A19]">to PayPal approval</span>.
            </h2>
            <p className="text-sm sm:text-base text-[#4A5A3F] max-w-[65ch] mx-auto text-pretty">
              AI helps structure what you need, but the server deterministically revalidates
              every offer and you still approve the final PayPal transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#D8E5D0] shadow-xs flex flex-col justify-between hover:border-[#245A19]/30 transition-all">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#E8F4E2] text-[#3F7A2E] flex items-center justify-center font-mono font-medium text-xs mb-4">
                  01
                </div>
                <h3 className="font-cal font-bold text-lg text-[#17270C] mb-2">
                  Understand Request
                </h3>
                <p className="text-sm text-[#4A5A3F] leading-relaxed">
                  Extracts your desired product specifications, budget limits, and preferred features from plain English.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#D8E5D0] shadow-xs flex flex-col justify-between hover:border-[#245A19]/30 transition-all">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#E8F4E2] text-[#3F7A2E] flex items-center justify-center font-mono font-medium text-xs mb-4">
                  02
                </div>
                <h3 className="font-cal font-bold text-lg text-[#17270C] mb-2">
                  Scan Top Stores
                </h3>
                <p className="text-sm text-[#4A5A3F] leading-relaxed">
                  Searches verified retailers to compare current prices, real images, and genuine inventory.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#D8E5D0] shadow-xs flex flex-col justify-between hover:border-[#245A19]/30 transition-all">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#E8F4E2] text-[#3F7A2E] flex items-center justify-center font-mono font-medium text-xs mb-4">
                  03
                </div>
                <h3 className="font-cal font-bold text-lg text-[#17270C] mb-2">
                  Lock Best Price
                </h3>
                <p className="text-sm text-[#4A5A3F] leading-relaxed">
                  Confirms the exact offer price and merchant stock availability directly before checkout starts.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#D8E5D0] shadow-xs flex flex-col justify-between hover:border-[#0070BA]/30 transition-all">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#0070BA]/10 text-[#0070BA] flex items-center justify-center font-mono font-medium text-xs mb-4">
                  04
                </div>
                <h3 className="font-cal font-bold text-lg text-[#17270C] mb-2">
                  Secure Checkout
                </h3>
                <p className="text-sm text-[#4A5A3F] leading-relaxed">
                  Review your items and complete payment in one click with official PayPal buyer protection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Guarantees Section */}
      <section id="stats" className="py-20 bg-[#E8F4E2]/70 border-t border-[#D8E5D0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-3xl sm:text-5xl text-[#17270C] font-normal mb-3 text-balance">
              Guaranteed <span className="italic text-[#245A19]">authenticity</span>.
            </h2>
            <p className="text-sm sm:text-base text-[#4A5A3F] max-w-[65ch] mx-auto text-pretty">
              Every merchant offer is verified in real time from retailer inventory. Zero guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-[#FBFEF9] border border-[#D8E5D0] shadow-xs">
              <div className="font-serif text-5xl font-normal text-[#17270C] mb-3">
                100<span className="italic text-[#245A19]">%</span>
              </div>
              <h3 className="font-cal font-bold text-lg text-[#17270C] mb-1">
                Live Store Verification
              </h3>
              <p className="text-sm text-[#4A5A3F] max-w-[65ch] text-pretty">
                Prices are re-verified with retailer servers in real-time before checkout is generated.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FBFEF9] border border-[#D8E5D0] shadow-xs">
              <div className="font-serif text-5xl font-normal text-[#17270C] mb-3">
                0<span className="italic text-[#245A19]">x</span>
              </div>
              <h3 className="font-cal font-bold text-lg text-[#17270C] mb-1">
                Fabricated Prices
              </h3>
              <p className="text-sm text-[#4A5A3F] max-w-[65ch] text-pretty">
                Every price, store listing, and product link comes from actual merchant data.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FBFEF9] border border-[#D8E5D0] shadow-xs">
              <div className="font-serif text-5xl font-normal text-[#17270C] mb-3">
                <span className="italic text-[#245A19]">✓</span>
              </div>
              <h3 className="font-cal font-bold text-lg text-[#17270C] mb-1">
                Buyer Protection
              </h3>
              <p className="text-sm text-[#4A5A3F] max-w-[65ch] text-pretty">
                Official PayPal checkout session with full transaction verification and buyer protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#D8E5D0] bg-[#FBFEF9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#002125] text-[#F2FBEF] flex items-center justify-center font-bold text-xs">
              q
            </div>
            <span className="font-cal font-bold text-base text-[#17270C]">
              Quick<span className="em">Own</span>
            </span>
          </div>

          <div className="text-xs font-mono text-[#4A5A3F] flex items-center gap-4">
            <span>Verified Stores</span>
            <span>&bull;</span>
            <span>Live Price Locks</span>
            <span>&bull;</span>
            <span>PayPal Sandbox</span>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#E8F4E2] text-[#3F7A2E] border border-[#D8E5D0]">
            DEMO ENVIRONMENT &bull; NO LIVE CHARGES
          </span>
        </div>
      </footer>
    </div>
  );
}
