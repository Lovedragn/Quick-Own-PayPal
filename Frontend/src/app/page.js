"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import HeroSearchSection from "@/components/HeroSearchSection";
import ProductResultsSection from "@/components/ProductResultsSection";
import FeatureTicker from "@/components/FeatureTicker";
import ArchitectureSection from "@/components/ArchitectureSection";
import ProductShowcaseSection from "@/components/ProductShowcaseSection";
import CartDrawer from "@/components/CartDrawer";
import LikesDrawer from "@/components/LikesDrawer";
import OrdersDrawer from "@/components/OrdersDrawer";
import Footer from "@/components/Footer";
import ProductDetailOverlay from "@/components/ProductDetailOverlay";
import {
  useCartPreference,
  useLikesPreference,
  useQuantitiesPreference,
  useOrdersPreference,
} from "@/lib/usePreferences";
import {
  getStoredPagination,
  saveStoredPagination,
  saveStoredPendingCheckout,
} from "@/lib/storage";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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
  const [quantities, saveQuantities] = useQuantitiesPreference();
  const [searchComplete, setSearchComplete] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailVariantIndex, setDetailVariantIndex] = useState(0);
  const checkoutAttemptRef = useRef(null);

  // User Preferences State with Local Storage
  const [cart, saveCart] = useCartPreference();
  const [likedIds, saveLikes] = useLikesPreference();
  const [orders, saveOrders] = useOrdersPreference();
  const [pagination, setPagination] = useState(() => getStoredPagination());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Add Item to Cart
  function handleAddToCart(recommendation, offer, quantity = 1) {
    const product = recommendation?.product;
    if (!product || !offer) return;

    const existingIdx = cart.findIndex(
      (item) =>
        item.productId === product.productId &&
        item.offerUrl === offer.productUrl,
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
      (item) => !(item.productId === productId && item.offerUrl === offerUrl),
    );
    saveCart(nextCart);
  }

  function handleUpdateCartQuantity(productId, offerUrl, nextQuantity) {
    const clamped = Math.max(1, Math.min(10, nextQuantity));
    const nextCart = cart.map((item) => {
      if (item.productId === productId && item.offerUrl === offerUrl) {
        return { ...item, quantity: clamped };
      }
      return item;
    });
    saveCart(nextCart);
    saveQuantities({
      ...quantities,
      [productId]: clamped,
    });
  }

  // Toggle Liked Product
  function handleToggleLike(productId) {
    if (!productId) return;
    let nextLikes;
    if (likedIds.includes(productId)) {
      nextLikes = likedIds.filter((id) => id !== productId);
    } else {
      nextLikes = [...likedIds, productId];
    }
    saveLikes(nextLikes);
  }

  const cartTotalAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0,
    );
  }, [cart]);

  async function handleSearch(event, overrideQuery) {
    if (event) event.preventDefault();
    const searchQuery = (overrideQuery || query).trim();
    if (!searchQuery) {
      setError("Please describe what product you are looking for.");
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
        body: JSON.stringify({
          message: searchQuery,
        }),
      });

      const data = await readApiResponse(response);
      const results = Array.isArray(data.recommendations)
        ? data.recommendations
        : [];
      setRecommendations(results);
      setIntent(data.intent || null);
      setNotice(data.notice || "");
      setSearchComplete(true);

      const defaultOffers = {};
      const updatedQuantities = { ...quantities };
      results.forEach((rec) => {
        const product = rec.product;
        if (!product?.productId) return;
        const offers = getOffers(rec);
        const matchIdx = offers.findIndex(
          (o) => o.productUrl === rec.selectedOffer?.productUrl,
        );
        defaultOffers[product.productId] = matchIdx >= 0 ? matchIdx : 0;
        if (!updatedQuantities[product.productId]) {
          updatedQuantities[product.productId] = 1;
        }
      });
      setSelectedOffers(defaultOffers);
      saveQuantities(updatedQuantities);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not reach the shopping service. Make sure backend is running.",
      );
    } finally {
      setSearching(false);
    }
  }

  function selectOffer(productId, offerIndex) {
    setSelectedOffers((prev) => ({ ...prev, [productId]: offerIndex }));
  }

  function changeQuantity(productId, nextQuantity) {
    const clamped = Math.max(1, Math.min(10, nextQuantity));
    saveQuantities({
      ...quantities,
      [productId]: clamped,
    });

    // Also sync existing item in cart if present
    const inCart = cart.some((item) => item.productId === productId);
    if (inCart) {
      const nextCart = cart.map((item) => {
        if (item.productId === productId) {
          return { ...item, quantity: clamped };
        }
        return item;
      });
      saveCart(nextCart);
    }
  }

  async function beginCheckout(recommendation, offer, quantity) {
    const product = recommendation?.product;
    if (!product?.productId || !offer?.merchant || !offer?.productUrl) {
      setError(
        "The selected product offer is missing required catalogue details.",
      );
      return;
    }

    setCheckoutProduct(product.productId);
    setError("");

    try {
      const cartFingerprint = `${product.productId}:${offer.productUrl}:${quantity}`;
      if (
        !checkoutAttemptRef.current ||
        checkoutAttemptRef.current.fingerprint !== cartFingerprint
      ) {
        const idempotencyKey =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `quickown-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        checkoutAttemptRef.current = {
          fingerprint: cartFingerprint,
          key: idempotencyKey,
        };
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

      saveStoredPendingCheckout({
        orderId: order.orderId,
        items: [
          {
            productId: product.productId,
            name: product.name,
            imageUrl: product.imageUrl,
            merchant: offer.merchant,
            price: offer.price,
            currency: offer.currency,
            quantity,
            offerUrl: offer.productUrl,
          },
        ],
        total: offer.price ? Number(offer.price) * quantity : null,
        currency: offer.currency || "USD",
        source: "direct",
      });

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

      saveStoredPendingCheckout({
        orderId: order.orderId,
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          merchant: item.merchant,
          price: item.price,
          currency: item.currency,
          quantity: item.quantity,
          offerUrl: item.offerUrl,
        })),
        total: cartTotalAmount,
        currency: "USD",
        source: "cart",
      });

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
    <div className="relative min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      {/* Channel3 Site Frame: Two continuous vertical bars on two sides (border-x border-zinc-200) */}
      <div className="relative max-w-7xl mx-auto border-x border-zinc-200 min-h-screen flex flex-col bg-white">
        {/* Crosshair accents at top corners */}
        <div className="absolute -left-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>
        <div className="absolute -right-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>

        {/* Sticky Top Navigation */}
        <HeaderNav
          likedCount={likedIds.length}
          cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
          ordersCount={orders.length}
          onOpenLikes={() => setIsLikesOpen(true)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenOrders={() => setIsOrdersOpen(true)}
        />

        {/* Hero & Search Console */}
        <HeroSearchSection
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          searching={searching}
          error={error}
          onErrorDismiss={() => setError("")}
        />

        {/* Product Results (Divided as grid section) */}
        {searchComplete && !searching && (
          <main className="w-full px-4 sm:px-6 py-10 border-b border-zinc-200 bg-zinc-50/40">
            <div className="max-w-6xl mx-auto">
              <ProductResultsSection
                recommendations={recommendations}
                intent={intent}
                query={query}
                setQuery={setQuery}
                onSearch={handleSearch}
                selectedOffers={selectedOffers}
                onSelectOffer={selectOffer}
                quantities={quantities}
                onQuantityChange={changeQuantity}
                onCheckout={beginCheckout}
                checkoutProduct={checkoutProduct}
                likedIds={likedIds}
                onToggleLike={handleToggleLike}
                onAddToCart={handleAddToCart}
                onOpenDetail={(rec, swatchIdx) => {
                  setDetailProduct(rec);
                  setDetailVariantIndex(swatchIdx || 0);
                }}
              />
            </div>
          </main>
        )}

        {/* Key Feature Ticker */}
        <FeatureTicker />

        {/* Product Showcase Section (Shadcn UI Cards + Savings & Speed Recharts Chart) */}
        <ProductShowcaseSection />

        {/* System Architecture Section */}
        <ArchitectureSection />

        {/* Footer */}
        <Footer />
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        totalAmount={cartTotalAmount}
        onRemoveItem={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onCheckout={beginCartCheckout}
        isCheckingOut={checkoutProduct === "cart"}
        onOpenDetail={(rec, swatchIdx) => {
          setDetailProduct(rec);
          setDetailVariantIndex(swatchIdx || 0);
        }}
      />

      {/* Likes / Wishlist Drawer */}
      <LikesDrawer
        isOpen={isLikesOpen}
        onClose={() => setIsLikesOpen(false)}
        likedIds={likedIds}
        recommendations={recommendations}
        onToggleLike={handleToggleLike}
        onOpenDetail={(rec, swatchIdx) => {
          setDetailProduct(rec);
          setDetailVariantIndex(swatchIdx || 0);
        }}
      />

      {/* Ordered Products Drawer */}
      <OrdersDrawer
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        orders={orders}
        onOpenDetail={(rec, swatchIdx) => {
          setDetailProduct(rec);
          setDetailVariantIndex(swatchIdx || 0);
        }}
      />

      {/* Product Detail Overlay Modal */}
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
