"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import HeroSearchSection from "@/components/HeroSearchSection";
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
  saveStoredPendingCheckout,
  saveStoredActiveConversationId,
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

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [checkoutProduct, setCheckoutProduct] = useState("");
  const [selectedOffers, setSelectedOffers] = useState({});
  const [quantities, saveQuantities] = useQuantitiesPreference();
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailVariantIndex, setDetailVariantIndex] = useState(0);
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);

  // User Preferences State with Local Storage
  const [cart, saveCart] = useCartPreference();
  const [likedIds, saveLikes] = useLikesPreference();
  const [orders, saveOrders] = useOrdersPreference();
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

  function handleSearch(event) {
    if (event) event.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery && !uploadedImagePreview) {
      setError("Please describe what product you are looking for or upload an image.");
      return;
    }

    if (uploadedImagePreview) {
      try {
        sessionStorage.setItem("quickown_search_image", uploadedImagePreview);
      } catch (e) {
        console.warn("Could not save image to sessionStorage", e);
      }
    }

    saveStoredActiveConversationId(null);
    const targetUrl = searchQuery
      ? `/products?q=${encodeURIComponent(searchQuery)}`
      : `/products`;
    router.push(targetUrl);
  }

  function handleImageSearch(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUploadedImagePreview(dataUrl);
      try {
        sessionStorage.setItem("quickown_search_image", dataUrl);
      } catch (e) {
        console.warn("Could not save image to sessionStorage", e);
      }
      saveStoredActiveConversationId(null);
      const targetUrl = query.trim()
        ? `/products?q=${encodeURIComponent(query.trim())}`
        : `/products`;
      router.push(targetUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleClearImage() {
    setUploadedImagePreview(null);
    try {
      sessionStorage.removeItem("quickown_search_image");
    } catch {}
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
          error={error}
          onErrorDismiss={() => setError("")}
          onImageSearch={handleImageSearch}
          imagePreview={uploadedImagePreview}
          onClearImage={handleClearImage}
        />

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
        recommendations={[]}
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
          onCheckout={() => {}}
          checkingOut={false}
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
