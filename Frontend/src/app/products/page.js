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
import ProductFilterSortBar from "@/components/ProductFilterSortBar";
import CartDrawer from "@/components/CartDrawer";
import LikesDrawer from "@/components/LikesDrawer";
import OrdersDrawer from "@/components/OrdersDrawer";
import ProductDetailOverlay from "@/components/ProductDetailOverlay";
import ProductSkeletonGrid from "@/components/ProductSkeletonGrid";
import ChatHistoryDrawer from "@/components/ChatHistoryDrawer";
import { Spinner } from "@/components/ui/spinner";
import IconButton from "@/components/ui/icon-button";
import {
  AlertCircle,
  History,
  MessageSquarePlus,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCartPreference,
  useLikesPreference,
  useQuantitiesPreference,
  useOrdersPreference,
  useLikedProductDetailsPreference,
  useConversationsPreference,
  useActiveConversationPreference,
} from "@/lib/usePreferences";
import {
  saveStoredPendingCheckout,
  createStoredLikedProduct,
} from "@/lib/storage";
import { extractNormalizedOffers } from "@/lib/variants";
import { useAuth } from "@/lib/useAuth";
import {
  fetchRemoteConversations,
  saveRemoteConversation,
  deleteRemoteConversation,
  clearRemoteConversations,
} from "@/lib/supabase";

import GsapTextReveal from "@/components/ui/GsapTextReveal";
import { useSavedProductHydration } from "@/lib/useSavedProductHydration";
import { useSupabaseUserData } from "@/lib/useSupabaseUserData";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

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

function createConversationId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const [activeTurnId, setActiveTurnId] = useState(null);
  const checkoutAttemptRef = useRef(null);
  const lastExecutedKeyRef = useRef("");

  // User Preferences State with Local Storage
  const { user, session, loading: authLoading } = useAuth();
  const userId = user?.id;
  const accessToken = session?.access_token;
  const [cart, saveCart] = useCartPreference();
  const [likedIds, saveLikes] = useLikesPreference();
  const [likedProductDetails, saveLikedProductDetails] =
    useLikedProductDetailsPreference();
  const [orders, saveOrders] = useOrdersPreference();
  const [conversations, saveConversations] = useConversationsPreference();
  const [activeConversationId, saveActiveConversationId] =
    useActiveConversationPreference();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useSupabaseUserData({
    userId,
    likedIds,
    saveLikes,
    likedProductDetails,
    saveLikedProductDetails,
    orders,
    saveOrders,
  });

  // Filters & Sorting state (Channel3 & ComponentX reference)
  const [sortOption, setSortOption] = useState("relevance");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);

  const handleToggleBrand = useCallback((brandName) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName]
    );
  }, []);

  const handleToggleMerchant = useCallback((merchantName) => {
    setSelectedMerchants((prev) =>
      prev.includes(merchantName)
        ? prev.filter((m) => m !== merchantName)
        : [...prev, merchantName]
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setPriceRange({ min: "", max: "" });
    setSelectedBrands([]);
    setSelectedMerchants([]);
    setInStockOnly(false);
    setDealsOnly(false);
    setSortOption("relevance");
  }, []);

  // Auto-dismiss notice banner after 10 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice("");
    }, 10000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Compute available brands dynamically from recommendations
  const availableBrands = useMemo(() => {
    const counts = {};
    recommendations.forEach((rec) => {
      const b = (rec.product?.brand || "").trim();
      if (b) {
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [recommendations]);

  // Compute available merchants / retailers from recommendations
  const availableMerchants = useMemo(() => {
    const counts = {};
    recommendations.forEach((rec) => {
      const offers = getOffers(rec);
      offers.forEach((o) => {
        const d = (o.merchantDomain || o.merchant || "").trim();
        if (d) {
          counts[d] = (counts[d] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [recommendations]);

  // Real-time filtered & sorted recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    let list = [...recommendations];

    // 1. In Stock
    if (inStockOnly) {
      list = list.filter((rec) => {
        const offers = getOffers(rec);
        return offers.length > 0
          ? offers.some((o) => o.inStock !== false)
          : rec.product?.inStock !== false;
      });
    }

    // 2. Multi-Store Deals
    if (dealsOnly) {
      list = list.filter((rec) => {
        const offers = getOffers(rec);
        return offers.length > 1;
      });
    }

    // 3. Brands
    if (selectedBrands.length > 0) {
      const brandSet = new Set(selectedBrands.map((b) => b.toLowerCase()));
      list = list.filter((rec) => {
        const b = (rec.product?.brand || "").toLowerCase().trim();
        return brandSet.has(b);
      });
    }

    // 4. Merchants
    if (selectedMerchants.length > 0) {
      const merchantSet = new Set(
        selectedMerchants.map((m) => m.toLowerCase())
      );
      list = list.filter((rec) => {
        const offers = getOffers(rec);
        return offers.some((o) =>
          merchantSet.has((o.merchantDomain || o.merchant || "").toLowerCase())
        );
      });
    }

    // 5. Price Range
    const minP = priceRange.min !== "" ? parseFloat(priceRange.min) : null;
    const maxP = priceRange.max !== "" ? parseFloat(priceRange.max) : null;
    if (minP !== null || maxP !== null) {
      list = list.filter((rec) => {
        const price =
          rec.selectedOffer?.price ||
          rec.product?.offers?.[0]?.price ||
          0;
        if (minP !== null && !isNaN(minP) && price < minP) return false;
        if (maxP !== null && !isNaN(maxP) && price > maxP) return false;
        return true;
      });
    }

    // 6. Sorting
    switch (sortOption) {
      case "price-low":
        list.sort((a, b) => {
          const pa = a.selectedOffer?.price ?? a.product?.offers?.[0]?.price ?? 0;
          const pb = b.selectedOffer?.price ?? b.product?.offers?.[0]?.price ?? 0;
          return pa - pb;
        });
        break;
      case "price-high":
        list.sort((a, b) => {
          const pa = a.selectedOffer?.price ?? a.product?.offers?.[0]?.price ?? 0;
          const pb = b.selectedOffer?.price ?? b.product?.offers?.[0]?.price ?? 0;
          return pb - pa;
        });
        break;
      case "name-asc":
        list.sort((a, b) => {
          const na = (a.product?.name || "").toLowerCase();
          const nb = (b.product?.name || "").toLowerCase();
          return na.localeCompare(nb);
        });
        break;
      case "deals":
        list.sort((a, b) => {
          const offersA = (a.product?.offers || []).length;
          const offersB = (b.product?.offers || []).length;
          return offersB - offersA;
        });
        break;
      case "relevance":
      default:
        list.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        break;
    }

    return list;
  }, [
    recommendations,
    inStockOnly,
    dealsOnly,
    selectedBrands,
    selectedMerchants,
    priceRange,
    sortOption,
  ]);

  // Sync Supabase conversations when user logs in
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    fetchRemoteConversations(user.id).then((remoteConvs) => {
      if (isMounted && remoteConvs && remoteConvs.length > 0) {
        saveConversations(remoteConvs);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id, saveConversations]);

  useSavedProductHydration({
    likedIds,
    likedProductDetails,
    saveLikedProductDetails,
    orders,
    saveOrders,
    conversations,
  });

  const createConversation = useCallback(() => {
    const now = new Date().toISOString();
    const conversation = {
      id: createConversationId(),
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
      turns: [],
    };
    saveConversations([conversation, ...conversations].slice(0, 20));
    saveActiveConversationId(conversation.id);
    if (userId) {
      saveRemoteConversation(conversation, userId);
    }
    return conversation.id;
  }, [conversations, saveConversations, saveActiveConversationId, userId]);

  const persistConversationTurn = useCallback(
    (turnData, conversationIdOverride, channel3ConversationId) => {
      const now = new Date().toISOString();
      let conversationId = conversationIdOverride || activeConversationId;
      let current = conversations.find((item) => item.id === conversationId);

      if (!current) {
        conversationId = conversationId || createConversationId();
        current = {
          id: conversationId,
          title: "New conversation",
          createdAt: now,
          updatedAt: now,
          turns: [],
        };
      }

      const recommendations = (turnData.recommendations || [])
        .slice(0, 8)
        .map((recommendation) => {
          const product = recommendation?.product || {};
          return {
            ...recommendation,
            product: {
              source: product.source,
              productId: product.productId,
              name: product.name,
              brand: product.brand,
              category: product.category,
              description: product.description,
              imageUrl:
                typeof product.imageUrl === "string" &&
                !product.imageUrl.startsWith("data:")
                  ? product.imageUrl
                  : null,
              inStock: product.inStock,
              offers: Array.isArray(product.offers)
                ? product.offers.slice(0, 5)
                : [],
              variants: product.variants || null,
              images: Array.isArray(product.images)
                ? product.images.slice(0, 8)
                : [],
            },
          };
        });

      const turn = {
        id: createConversationId(),
        query: turnData.query || "",
        imageSearch: Boolean(turnData.imageSearch),
        status: turnData.status || "complete",
        createdAt: now,
        resultCount: recommendations.length,
        recommendations,
        assistantMessage: turnData.assistantMessage || "",
        intent: turnData.intent || null,
        notice: turnData.notice || "",
        error: turnData.error || "",
      };
      const turns = [...(current.turns || []), turn].slice(-12);
      const title =
        current.title && current.title !== "New conversation"
          ? current.title
          : (turn.query || "Image search").slice(0, 52);

      const updated = {
        ...current,
        title,
        updatedAt: now,
        channel3ConversationId:
          channel3ConversationId || current.channel3ConversationId || null,
        turns,
      };
      const next = [
        updated,
        ...conversations.filter((item) => item.id !== conversationId),
      ]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0),
        )
        .slice(0, 20);
      saveConversations(next);
      if (conversationId !== activeConversationId) {
        saveActiveConversationId(conversationId);
      }
    },
    [
      activeConversationId,
      conversations,
      saveActiveConversationId,
      saveConversations,
    ],
  );

  function handleRenameConversation(conversationId, title) {
    const cleanTitle = title.slice(0, 64);
    const updated = conversations.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, title: cleanTitle, updatedAt: new Date().toISOString() }
        : conversation,
    );
    saveConversations(updated);
    if (user?.id) {
      const match = updated.find((c) => c.id === conversationId);
      if (match) saveRemoteConversation(match, user.id);
    }
  }

  function handleDeleteConversation(conversationId) {
    saveConversations(
      conversations.filter(
        (conversation) => conversation.id !== conversationId,
      ),
    );
    if (user?.id) {
      deleteRemoteConversation(conversationId, user.id);
    }
    if (activeConversationId === conversationId) {
      saveActiveConversationId(null);
      setQuery("");
      setRecommendations([]);
      setIntent(null);
      setNotice("");
      setError("");
      setSearchComplete(false);
      lastExecutedKeyRef.current = "::noimg";
      router.replace("/products", { scroll: false });
    }
  }

  function handleClearHistory() {
    saveConversations([]);
    saveActiveConversationId(null);
    setQuery("");
    setRecommendations([]);
    setIntent(null);
    setNotice("");
    setError("");
    setSearchComplete(false);
    lastExecutedKeyRef.current = "::noimg";
    router.replace("/products", { scroll: false });
    if (user?.id) {
      clearRemoteConversations(user.id);
    }
  }

  const displayTurn = useCallback((turn) => {
    if (!turn) return;
    setActiveTurnId(turn.id);
    const restoredQuery = turn.query || "";

    const key = `${restoredQuery}::noimg`;
    lastExecutedKeyRef.current = key;
    setPrevUrlQuery(restoredQuery);
    setQuery(restoredQuery);
    setUploadedImagePreview(null);

    setRecommendations(turn.recommendations || []);
    setIntent(turn.intent || null);
    setNotice(turn.notice || "");
    setError("");
    setSearchComplete(
      turn.status !== "error" || (turn.recommendations || []).length > 0,
    );

    const restoredOffers = {};
    (turn.recommendations || []).forEach((recommendation) => {
      const productId = recommendation.product?.productId;
      if (!productId) return;
      const offers = getOffers(recommendation);
      const selectedIndex = offers.findIndex(
        (offer) =>
          offer.productUrl === recommendation.selectedOffer?.productUrl,
      );
      restoredOffers[productId] = selectedIndex >= 0 ? selectedIndex : 0;
    });
    setSelectedOffers(restoredOffers);

    if (typeof window !== "undefined") {
      const newUrl = restoredQuery
        ? `/products?q=${encodeURIComponent(restoredQuery)}`
        : "/products";
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  function handleOpenConversation(conversationId, turnId) {
    const conversation = conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;
    const turns = Array.isArray(conversation.turns) ? conversation.turns : [];
    const targetTurn =
      turns.find((turn) => turn.id === turnId) || turns[turns.length - 1];

    saveActiveConversationId(conversationId);
    setUploadedImagePreview(null);
    try {
      sessionStorage.removeItem("quickown_search_image");
    } catch {}

    if (targetTurn) {
      displayTurn(targetTurn);
    } else {
      setActiveTurnId(null);
      setQuery("");
      setPrevUrlQuery("");
      setRecommendations([]);
      setIntent(null);
      setNotice("");
      setError("");
      setSearchComplete(false);
      lastExecutedKeyRef.current = "::noimg";
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/products");
      }
    }
  }

  // Active conversation's turns (history within the single conversation)
  const currentConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

  const currentTurns = useMemo(() => {
    return Array.isArray(currentConversation?.turns)
      ? currentConversation.turns
      : [];
  }, [currentConversation]);

  const currentTurnIndex = useMemo(() => {
    if (!currentTurns || currentTurns.length === 0) return -1;
    if (activeTurnId) {
      const idx = currentTurns.findIndex((t) => t.id === activeTurnId);
      if (idx !== -1) return idx;
    }
    return currentTurns.length - 1;
  }, [currentTurns, activeTurnId]);

  const prevTurn =
    currentTurnIndex > 0 ? currentTurns[currentTurnIndex - 1] : null;

  const nextTurn =
    currentTurnIndex >= 0 && currentTurnIndex < currentTurns.length - 1
      ? currentTurns[currentTurnIndex + 1]
      : null;

  const handlePrevTurn = useCallback(() => {
    if (prevTurn) {
      displayTurn(prevTurn);
    }
  }, [prevTurn, displayTurn]);

  const handleNextTurn = useCallback(() => {
    if (nextTurn) {
      displayTurn(nextTurn);
    }
  }, [nextTurn, displayTurn]);

  // Close handler with slide down animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      saveActiveConversationId(null);
      router.push("/");
      setIsClosing(false);
    }, 280);
  }, [router, saveActiveConversationId]);

  // Start a fresh product conversation
  const handleNewConversation = useCallback(() => {
    createConversation();

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
    setActiveTurnId(null);

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
  }, [router, createConversation]);

  // Escape key listener to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === "Escape" &&
        !detailProduct &&
        !isCartOpen &&
        !isLikesOpen &&
        !isOrdersOpen &&
        !isHistoryOpen
      ) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleClose,
    detailProduct,
    isCartOpen,
    isLikesOpen,
    isOrdersOpen,
    isHistoryOpen,
  ]);

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
  function handleToggleLike(productId, recommendation) {
    if (!productId) return;

    if (likedIds.includes(productId)) {
      saveLikes(likedIds.filter((id) => id !== productId));
      const nextDetails = { ...likedProductDetails };
      delete nextDetails[productId];
      saveLikedProductDetails(nextDetails);
      return;
    }

    saveLikes([...likedIds, productId]);
    const sourceRecommendation =
      recommendation ||
      recommendations.find((item) => item.product?.productId === productId);
    const savedProduct = createStoredLikedProduct(sourceRecommendation);
    if (savedProduct) {
      saveLikedProductDetails({
        ...likedProductDetails,
        [productId]: savedProduct,
      });
    }
  }

  const cartTotalAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0,
    );
  }, [cart]);

  // Main search function. The server restores the Channel3 thread from Supabase.
  const executeSearch = useCallback(
    async (textQuery, imageSource) => {
      const activeText = (textQuery !== undefined ? textQuery : query).trim();
      const activeImage =
        imageSource !== undefined ? imageSource : uploadedImagePreview;

      if (!activeText && !activeImage) return;
      if (authLoading) {
        setError("Your account is still loading. Please try the search again.");
        return;
      }

      let currentConversation = conversations.find(
        (item) => item.id === activeConversationId,
      );
      let localConversationId = currentConversation?.id;
      if (!localConversationId) {
        localConversationId = createConversation();
        currentConversation = {
          id: localConversationId,
          title: "New conversation",
          turns: [],
          channel3ConversationId: null,
        };
      }

      const conversationTitle =
        currentConversation?.title && currentConversation.title !== "New conversation"
          ? currentConversation.title
          : (activeText || "Image search").slice(0, 52);

      setSearching(true);
      setError("");
      setNotice("");
      setRecommendations([]);
      setIntent(null);
      setSearchComplete(false);
      setActiveTurnId(null);

      try {
        const headers = { "Content-Type": "application/json" };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch("/api/conversations/turn", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: activeText,
            imageData: activeImage || undefined,
            localConversationId,
            channel3ConversationId:
              currentConversation?.channel3ConversationId || undefined,
            previousTurns: userId
              ? undefined
              : currentConversation?.turns || [],
            title: conversationTitle,
          }),
        });
        const data = await readApiResponse(response);
        if (!data.success) {
          throw new Error(data.error || "Channel3 could not process this request.");
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
            (offer) => offer.productUrl === rec.selectedOffer?.productUrl,
          );
          defaultOffers[product.productId] = matchIdx >= 0 ? matchIdx : 0;
          if (!updatedQuantities[product.productId]) {
            updatedQuantities[product.productId] = 1;
          }
        });
        setSelectedOffers(defaultOffers);
        saveQuantities(updatedQuantities);
        persistConversationTurn(
          {
            query: activeText,
            imageSearch: Boolean(activeImage),
            recommendations: results,
            intent: data.intent || null,
            notice: data.notice || "",
            assistantMessage: data.assistantMessage || "",
            status: "complete",
          },
          localConversationId,
          data.channel3ConversationId,
        );
      } catch (requestError) {
        const message =
          requestError.message ||
          "Could not reach Channel3. Please check the server configuration and retry.";
        setError(message);
        persistConversationTurn(
          {
            query: activeText,
            imageSearch: Boolean(activeImage),
            recommendations: [],
            status: "error",
            error: message,
          },
          localConversationId,
          currentConversation?.channel3ConversationId,
        );
      } finally {
        setSearching(false);
      }
    },
    [
      query,
      uploadedImagePreview,
      quantities,
      saveQuantities,
      conversations,
      activeConversationId,
      createConversation,
      authLoading,
      accessToken,
      userId,
      persistConversationTurn,
    ],
  );

  // Trigger search on mount or when urlQuery / image source changes
  useEffect(() => {
    const key = `${urlQuery}::${uploadedImagePreview ? "img" : "noimg"}`;
    if (
      !authLoading &&
      (urlQuery || uploadedImagePreview) &&
      lastExecutedKeyRef.current !== key
    ) {
      lastExecutedKeyRef.current = key;
      executeSearch(urlQuery, uploadedImagePreview);
    }
  }, [urlQuery, uploadedImagePreview, executeSearch, authLoading]);

  // Form submit from top search bar
  function handleFormSearch(event, overrideQuery) {
    if (event) event.preventDefault();
    if (authLoading) {
      setError("Please wait for your account to finish loading before searching.");
      return;
    }
    const targetQuery = (
      overrideQuery !== undefined ? overrideQuery : query
    ).trim();
    lastExecutedKeyRef.current = `${targetQuery}::${uploadedImagePreview ? "img" : "noimg"}`;
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
    if (authLoading) {
      setError("Please wait for your account to finish loading before searching.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUploadedImagePreview(dataUrl);
      lastExecutedKeyRef.current = `${query.trim()}::img`;
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
              productName: product.name || product.title || product.productName,
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
            name: product.name || product.title || product.productName,
            productName: product.name || product.title || product.productName,
            imageUrl: product.imageUrl,
            brand: product.brand,
            category: product.category,
            description: product.description,
            product: {
              source: product.source,
              productId: product.productId,
              name: product.name || product.title || product.productName,
              brand: product.brand,
              category: product.category,
              description: product.description,
              imageUrl: product.imageUrl,
              offers: Array.isArray(product.offers)
                ? product.offers.slice(0, 8)
                : [],
              images: Array.isArray(product.images)
                ? product.images.slice(0, 6)
                : [],
              inStock: product.inStock,
            },
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
        productName:
          item.productName ||
          item.recommendation?.product?.name ||
          item.name ||
          "Unnamed product",
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
          name:
            item.productName ||
            item.recommendation?.product?.name ||
            item.name ||
            "Unnamed product",
          productName:
            item.productName ||
            item.recommendation?.product?.name ||
            item.name ||
            "Unnamed product",
          imageUrl: item.imageUrl,
          brand: item.brand || item.recommendation?.product?.brand,
          description: item.recommendation?.product?.description,
          category: item.recommendation?.product?.category,
          product: item.recommendation?.product || {
            productId: item.productId,
            name: item.productName || item.name || "Unnamed product",
            brand: item.brand,
            imageUrl: item.imageUrl,
          },
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

        {/* Top Header Bar: Conversation controls, search, and close button */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 py-3.5 px-4 sm:px-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
            {/* Conversation controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleNewConversation}
                title="Start new conversation"
                aria-label="Start new conversation"
                className="inline-flex items-center justify-center w-9 h-9 text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-950 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                title="Open saved shopping conversations"
                aria-label="Conversation history"
                className="relative inline-flex items-center justify-center w-9 h-9 text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <History className="w-4 h-4" />
                {conversations.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {conversations.length}
                  </span>
                )}
              </button>
            </div>

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

            {/* Top Right: X Close Button */}
            <IconButton
              icon={X}
              onClick={handleClose}
              ariaLabel="Close products and return to home"
              title="Close (ESC)"
              rounded="none"
            />
          </div>
        </header>

        {/* Filters & Sorting Panel (directly under Search Bar) */}
        {!searching && recommendations.length > 0 && (
          <ProductFilterSortBar
            totalProducts={recommendations.length}
            filteredCount={filteredAndSortedRecommendations.length}
            availableBrands={availableBrands}
            availableMerchants={availableMerchants}
            sortOption={sortOption}
            onSortChange={setSortOption}
            priceRange={priceRange}
            onPriceChange={setPriceRange}
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            selectedMerchants={selectedMerchants}
            onToggleMerchant={handleToggleMerchant}
            inStockOnly={inStockOnly}
            onToggleInStock={() => setInStockOnly((v) => !v)}
            dealsOnly={dealsOnly}
            onToggleDeals={() => setDealsOnly((v) => !v)}
            onResetFilters={handleResetFilters}
          />
        )}

        {/* Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-4">
            <div className="p-3 sm:p-4 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-700 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate sm:whitespace-normal">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer transition-colors shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notice Banner */}
        {notice && !searching && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-3">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
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
                recommendations={filteredAndSortedRecommendations}
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
                onPrevTurn={handlePrevTurn}
                onNextTurn={handleNextTurn}
                hasPrevTurn={Boolean(prevTurn)}
                hasNextTurn={Boolean(nextTurn)}
                prevTurnQuery={prevTurn?.query || ""}
                nextTurnQuery={nextTurn?.query || ""}
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
                Search Products
              </GsapTextReveal>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {POPULAR_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (authLoading) {
                        setError("Please wait for your account to finish loading before searching.");
                        return;
                      }
                      setQuery(item);
                      lastExecutedKeyRef.current = `${item}::noimg`;
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
        likedProductDetails={likedProductDetails}
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

      {/* Saved shopping conversations */}
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onOpenConversation={handleOpenConversation}
        onCreateConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearHistory={handleClearHistory}
        isAuthenticated={Boolean(userId)}
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
