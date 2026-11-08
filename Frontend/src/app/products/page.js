"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ProductResultsSection from "@/components/ProductResultsSection";
import CartDrawer from "@/components/CartDrawer";
import LikesDrawer from "@/components/LikesDrawer";
import OrdersDrawer from "@/components/OrdersDrawer";
import ProductDetailOverlay from "@/components/ProductDetailOverlay";
import ProductSkeletonGrid from "@/components/ProductSkeletonGrid";
import IconButton from "@/components/ui/icon-button";
import { AlertCircle, MessageSquarePlus, Sparkles, X } from "lucide-react";
import {
  useCartPreference,
  useLikesPreference,
  useQuantitiesPreference,
  useOrdersPreference,
} from "@/lib/usePreferences";
import { saveStoredPendingCheckout } from "@/lib/storage";
import { extractNormalizedOffers } from "@/lib/variants";
import GsapTextReveal from "@/components/ui/GsapTextReveal";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const POPULAR_SUGGESTIONS = [
  "Sony WH-1000XM5 Headphones",
  "Nike Air Max Sneakers",
  "Mechanical Keyboard",
  "Kindle Paperwhite",
  "Patagonia Fleece Jacket",
  "Dyson Supersonic Hair Dryer",
];

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
  return extractNormalizedOffers(recommendation);
}

function ProductsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery =
    searchParams.get("q") ||
    searchParams.get("query") ||
    searchParams.get("search") ||
    "";

  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [isClosing, setIsClosing] = useState(false);

  // Synchronize state when URL query parameter changes without cascading renders
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const [uploadedImagePreview, setUploadedImagePreview] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("quickown_search_image");
      if (stored) {
        sessionStorage.removeItem("quickown_search_image");
        return stored;
      }
    } catch {}
    return null;
  });

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
  const lastExecutedKeyRef = useRef("");

  // User Preferences State with Local Storage
  const [cart, saveCart] = useCartPreference();
  const [likedIds, saveLikes] = useLikesPreference();
  const [orders, saveOrders] = useOrdersPreference();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Always ensure page is open and visible on mount or when route changes
  useEffect(() => {
    setIsClosing(false);
    return () => {
      setIsClosing(false);
    };
  }, [searchParams]);

  // Close handler with slide down animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      router.push("/");
      setIsClosing(false);
    }, 280);
  }, [router]);

  // Start a fresh product conversation
  const handleNewConversation = useCallback(() => {
    // 1. Reset query & sync tracker
    setQuery("");
    setPrevUrlQuery("");

    // 2. Clear uploaded image & storage
    setUploadedImagePreview(null);
    try {
      sessionStorage.removeItem("quickown_search_image");
    } catch {}

    // 3. Clear results, intent, notice, error, and flags
    setRecommendations([]);
    setIntent(null);
    setNotice("");
    setError("");
    setSearching(false);
    setSearchComplete(false);

    // 4. Mark execution key as clean so nothing auto-searches
    lastExecutedKeyRef.current = "::noimg";

    // 5. Clean URL in browser history and router
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/products");
    }
    router.replace("/products", { scroll: false });

    // 6. Focus search input for new prompt
    setTimeout(() => {
      const searchInput =
        document.querySelector('input[type="search"]') ||
        document.querySelector('input[type="text"]');
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    }, 50);
  }, [router]);

  // Escape key listener to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === "Escape" &&
        !detailProduct &&
        !isCartOpen &&
        !isLikesOpen &&
        !isOrdersOpen
      ) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, detailProduct, isCartOpen, isLikesOpen, isOrdersOpen]);

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

  // Main search function
  const executeSearch = useCallback(
    async (textQuery, imageSource) => {
      const activeText = (textQuery !== undefined ? textQuery : query).trim();
      const activeImage =
        imageSource !== undefined ? imageSource : uploadedImagePreview;

      if (!activeText && !activeImage) {
        return;
      }

      setSearching(true);
      setError("");
      setNotice("");
      setRecommendations([]);
      setIntent(null);
      setSearchComplete(false);

      try {
        let data;
        if (activeImage) {
          const response = await fetch("/api/products/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Image: activeImage,
              query: activeText || undefined,
              limit: 10,
            }),
          });
          data = await readApiResponse(response);
          if (!data.success) {
            throw new Error(
              data.error || "Failed to search products by image.",
            );
          }
        } else {
          const response = await fetch(`${API_BASE}/api/ai/recommendations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: activeText,
            }),
          });
          data = await readApiResponse(response);
        }

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
    },
    [query, uploadedImagePreview, quantities, saveQuantities],
  );

  // Trigger search on mount or when urlQuery / image source changes
  useEffect(() => {
    const key = `${urlQuery}::${uploadedImagePreview ? "img" : "noimg"}`;
    if (
      (urlQuery || uploadedImagePreview) &&
      lastExecutedKeyRef.current !== key
    ) {
      lastExecutedKeyRef.current = key;
      executeSearch(urlQuery, uploadedImagePreview);
    }
  }, [urlQuery, uploadedImagePreview, executeSearch]);

  // Form submit from top search bar
  function handleFormSearch(event, overrideQuery) {
    if (event) event.preventDefault();
    const targetQuery = (
      overrideQuery !== undefined ? overrideQuery : query
    ).trim();
    if (targetQuery) {
      router.replace(`/products?q=${encodeURIComponent(targetQuery)}`, {
        scroll: false,
      });
    }
    executeSearch(targetQuery, uploadedImagePreview);
  }

  // Image search from top search bar
  function handleImageSearch(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUploadedImagePreview(dataUrl);
      executeSearch(query, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleClearImage() {
    setUploadedImagePreview(null);
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

  // Instant Checkout via PayPal
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
    <div className="relative min-h-screen bg-zinc-100/70 text-zinc-900 overflow-x-hidden">
      {/* Product Page Card Frame with slide-in from bottom to top */}
      <div
        className={`relative max-w-7xl mx-auto border-x border-zinc-200 min-h-screen flex flex-col bg-white shadow-2xl ${
          isClosing ? "animate-card-slide-down" : "animate-card-slide-up"
        }`}
      >
        {/* Crosshair accents at top corners */}
        <div className="absolute -left-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>
        <div className="absolute -right-[7px] -top-[10px] text-zinc-300 font-mono text-xs select-none pointer-events-none">
          +
        </div>

        {/* Top Header Bar: Top Left X Close Button + Centered Search Bar + Top Right New Conversation Button */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 py-3.5 px-4 sm:px-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
            {/* Top Left: X Close Button */}
            <IconButton
              icon={X}
              onClick={handleClose}
              ariaLabel="Close products and return to home"
              title="Close (ESC)"
              rounded="none"
             />

            {/* Search Bar matching exact style */}
            <div className="flex-1 max-w-3xl mx-auto">
              <SearchBar
                query={query}
                setQuery={setQuery}
                onSearch={handleFormSearch}
                searching={searching}
                onImageSearch={handleImageSearch}
                imagePreview={uploadedImagePreview}
                onClearImage={handleClearImage}
                className="w-full"
                placeholder={
                  uploadedImagePreview
                    ? "Optional text to refine image search…"
                    : "Search products or describe what you need…"
                }
              />
            </div>

            {/* Top Right: New Button */}
            <button
              type="button"
              onClick={handleNewConversation}
              title="Start a new conversation for products"
              aria-label="New"
              className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 text-xs font-cal font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-all shadow-2xs flex-shrink-0 cursor-pointer active:scale-95"
            >
              <MessageSquarePlus className="w-4 h-4 text-zinc-600" />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-4">
            <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError("")}
                className="text-rose-700 font-bold px-2 cursor-pointer"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Notice Banner */}
        {notice && !searching && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              {notice}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full px-4 sm:px-6 py-8">
          {/* Searching State: Alt Image Holder Wave Skeletons */}
          {searching && (
            <div className="max-w-6xl mx-auto">
              <ProductSkeletonGrid count={8} />
            </div>
          )}

          {/* Render Products Results */}
          {!searching && searchComplete && (
            <div className="max-w-6xl mx-auto">
              <ProductResultsSection
                recommendations={recommendations}
                intent={intent}
                query={query}
                setQuery={setQuery}
                onSearch={handleFormSearch}
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
                onNewConversation={handleNewConversation}
              />
            </div>
          )}

          {/* Initial / Empty Prompt State */}
          {!searching && !searchComplete && (
            <div className="py-16 sm:py-24 text-center max-w-2xl mx-auto px-4">
              <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-700">
                <Sparkles className="w-6 h-6" />
              </div>
              <GsapTextReveal
                as="h2"
                className="font-cal font-bold text-2xl sm:text-3xl text-zinc-950 mb-6 sm:mb-8"
                scrollTrigger={false}
                delay={0.1}
                stagger={0.05}
                duration={0.8}
                rotate={true}
              >
                Start a New Shopping Conversation
              </GsapTextReveal>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {POPULAR_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      router.replace(
                        `/products?q=${encodeURIComponent(item)}`,
                        { scroll: false },
                      );
                      executeSearch(item, null);
                    }}
                    className="text-xs px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 font-cal transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-zinc-100/70 text-zinc-900 overflow-x-hidden">
          <div className="relative max-w-7xl mx-auto border-x border-zinc-200 min-h-screen flex flex-col bg-white shadow-2xl animate-card-slide-up">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 py-3.5 px-4 sm:px-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
                <div className="h-9 w-32 bg-[#fafafa] border border-zinc-200 shimmer-wave flex-shrink-0 hidden sm:block" />
                <div className="flex-1 max-w-3xl mx-auto">
                  <div className="h-9 w-full bg-[#fafafa] border border-zinc-200 shimmer-wave" />
                </div>
                <div className="h-9 w-9 bg-[#fafafa] border border-zinc-200 shimmer-wave flex-shrink-0" />
              </div>
            </header>
            <main className="flex-1 w-full px-4 sm:px-6 py-8">
              <div className="max-w-6xl mx-auto">
                <ProductSkeletonGrid count={8} />
              </div>
            </main>
          </div>
        </div>
      }
    >
      <ProductsView />
    </Suspense>
  );
}
