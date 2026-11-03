"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const PROMPTS = [
  "Find me an iPhone 16 under $700 USD",
  "Find noise-cancelling headphones under ₹6,000 with long battery life",
  "I need wireless earbuds for travel with good noise cancellation",
];

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

function ProductCard({
  recommendation,
  selectedIndex,
  onSelectOffer,
  quantity,
  onQuantityChange,
  onCheckout,
  checkingOut,
}) {
  const product = recommendation.product;
  const offers = useMemo(() => getOffers(recommendation), [recommendation]);
  const safeIndex =
    selectedIndex >= 0 && selectedIndex < offers.length
      ? selectedIndex
      : Math.max(
          0,
          offers.findIndex(
            (offer) =>
              offer.productUrl === recommendation.selectedOffer?.productUrl,
          ),
        );
  const selected = offers[safeIndex];

  return (
    <article className="product-card">
      <div className="product-visual">
        <span className="source-pill">{product.source || "Catalogue"}</span>
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name || "Recommended product"}
            width={520}
            height={400}
            unoptimized
            className="product-image"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="product-placeholder" aria-hidden="true">
            <span>Q</span>
          </div>
        )}
        <span className="rank-pill">#{recommendation.rank} match</span>
      </div>

      <div className="product-content">
        <div className="product-heading">
          <div>
            <p className="eyebrow">
              {product.brand || product.category || "AI recommendation"}
            </p>
            <h3>{product.name}</h3>
          </div>
          <span className="stock-indicator">
            <span className="stock-dot" />
            {product.inStock ? "In catalogue" : "Check availability"}
          </span>
        </div>

        {product.description && (
          <p className="product-description">{product.description}</p>
        )}

        {recommendation.explanation && (
          <div className="match-note">
            <span className="match-spark">✳</span>
            <span>{recommendation.explanation}</span>
          </div>
        )}

        {recommendation.matchedFeatures?.length > 0 && (
          <div className="feature-list">
            {recommendation.matchedFeatures.map((feature) => (
              <span className="feature-chip" key={feature}>
                ✓ {feature}
              </span>
            ))}
          </div>
        )}

        <div className="offer-panel">
          <div className="offer-panel-title">
            <span>Available merchant offers</span>
            <span className="offer-count">
              {offers.length} {offers.length === 1 ? "offer" : "offers"}
            </span>
          </div>

          {selected ? (
            <>
              <label className="field-label" htmlFor={`offer-${product.productId}`}>
                Choose the offer you want
              </label>
              <select
                id={`offer-${product.productId}`}
                className="offer-select"
                value={safeIndex}
                onChange={(event) =>
                  onSelectOffer(product.productId, Number(event.target.value))
                }
              >
                {offers.map((offer, index) => (
                  <option value={index} key={`${offer.productUrl}-${index}`}>
                    {offer.merchant} · {formatPrice(offer.price, offer.currency)} ·{" "}
                    {offer.availability || "Availability unknown"}
                  </option>
                ))}
              </select>

              <div className="offer-total-row">
                <div>
                  <p className="eyebrow">Selected offer</p>
                  <p className="merchant-name">{selected.merchant}</p>
                </div>
                <div className="price-block">
                  <strong>{formatPrice(selected.price, selected.currency)}</strong>
                  <span>{selected.availability || "Availability not confirmed"}</span>
                </div>
              </div>

              <div className="quantity-checkout-row">
                <label className="quantity-control">
                  <span>Qty</span>
                  <select
                    aria-label={`Quantity for ${product.name}`}
                    value={quantity}
                    onChange={(event) =>
                      onQuantityChange(product.productId, Number(event.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((number) => (
                      <option value={number} key={number}>
                        {number}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="checkout-button"
                  onClick={() => onCheckout(recommendation, selected, quantity)}
                  disabled={checkingOut || !selected}
                >
                  {checkingOut ? "Preparing PayPal…" : "Continue with PayPal"}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
              <p className="offer-disclaimer">
                The backend checks this exact product, merchant, offer URL, stock
                and current price again before creating the Sandbox order.
              </p>
            </>
          ) : (
            <p className="empty-offers">
              No eligible merchant offer was returned for this product.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [query, setQuery] = useState(PROMPTS[0]);
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
    event.preventDefault();
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

      // Keep one key for this exact cart attempt. If the network fails after PayPal
      // created the order, clicking again must replay the same request rather than
      // creating a second PayPal order.
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
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Quick-Own home">
          <span className="brand-mark">q</span>
          <span>quick<span className="brand-accent">own</span></span>
        </Link>
        <nav className="top-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#results">Discover</a>
          <span className="sandbox-badge"><span /> Sandbox mode</span>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="kicker-star">✳</span>
            AI-POWERED AGENTIC COMMERCE
          </div>
          <h1>
            Tell us what you need.
            <span> We’ll find your best buy.</span>
          </h1>
          <p className="hero-description">
            One conversation. Real catalogue offers. Clear comparisons.
            Checkout approval powered by PayPal.
          </p>

          <div className="hero-proof">
            <div className="proof-item">
              <span className="proof-icon">✦</span>
              <div><strong>AI understands</strong><small>Your needs, not just keywords</small></div>
            </div>
            <div className="proof-item">
              <span className="proof-icon">⌕</span>
              <div><strong>Live offers</strong><small>Catalogue-backed choices</small></div>
            </div>
            <div className="proof-item">
              <span className="proof-icon">↗</span>
              <div><strong>PayPal checkout</strong><small>Secure Sandbox approval</small></div>
            </div>
          </div>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">
            <span className="orbit-spark">✳</span>
            <span>Q</span>
          </div>
          <span className="orbit-node node-one">AI</span>
          <span className="orbit-node node-two">↗</span>
          <span className="orbit-node node-three">₹</span>
          <span className="orbit-caption">SHOPPING, CONNECTED</span>
        </div>
      </section>

      <section className="search-wrap" aria-labelledby="search-heading">
        <div className="search-card">
          <div className="search-card-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL SHOPPING AGENT</p>
              <h2 id="search-heading">What are you shopping for?</h2>
            </div>
            <span className="gemini-tag"><span>✦</span> Gemini AI</span>
          </div>

          <form onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="shopping-query">
              Describe the product you want
            </label>
            <div className="prompt-box">
              <span className="prompt-icon">✳</span>
              <textarea
                id="shopping-query"
                rows={2}
                maxLength={2000}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: Find noise-cancelling headphones under ₹6,000…"
              />
              <button className="search-button" type="submit" disabled={searching}>
                {searching ? "Searching…" : "Find my best buy"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>

          <div className="prompt-suggestions">
            <span>Try asking</span>
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuery(prompt)}
                className="suggestion-chip"
              >
                {prompt}
              </button>
            ))}
          </div>
          <p className="privacy-note">
            Your request is interpreted by AI. Prices, stock and merchant offers
            are taken from catalogue responses and rechecked before checkout.
          </p>
        </div>
      </section>

      {error && (
        <div className="message-banner error-banner" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      {searching && (
        <section className="loading-state" aria-live="polite">
          <div className="loading-spinner" />
          <h3>Your shopping agent is at work</h3>
          <p>Understanding your request and checking live catalogue offers…</p>
        </section>
      )}

      {searchComplete && !searching && (
        <section className="results-section" id="results">
          <div className="results-heading">
            <div>
              <p className="eyebrow">YOUR MATCHES</p>
              <h2>Here’s what we found<span>.</span></h2>
              <p className="results-subtitle">
                {recommendations.length
                  ? `${recommendations.length} catalogue-backed ${recommendations.length === 1 ? "recommendation" : "recommendations"} for your request`
                  : "No matching live offers were returned for this request."}
              </p>
            </div>
            <span className="result-count">{recommendations.length} results</span>
          </div>

          {notice && (
            <div className="message-banner notice-banner">
              <span>i</span>
              <p>{notice}</p>
            </div>
          )}

          {intent && (
            <div className="intent-strip">
              <div><span>SEARCH</span><strong>{intent.searchQuery}</strong></div>
              {intent.category && <div><span>CATEGORY</span><strong>{intent.category}</strong></div>}
              {intent.maxBudget !== null && intent.maxBudget !== undefined && (
                <div><span>BUDGET</span><strong>{formatPrice(intent.maxBudget, intent.budgetCurrency)}</strong></div>
              )}
              <div><span>IN STOCK</span><strong>{intent.inStockOnly ? "Requested" : "Not required"}</strong></div>
              <div><span>FEATURES</span><strong>{intent.requiredFeatures?.length || 0} detected</strong></div>
            </div>
          )}

          {recommendations.length > 0 ? (
            <div className="product-grid">
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
            <div className="empty-state">
              <span>⌕</span>
              <h3>No catalogue matches yet</h3>
              <p>Try a broader product name or remove a strict budget or feature.</p>
            </div>
          )}
        </section>
      )}

      {!searchComplete && !searching && (
        <section className="value-section" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">FROM INTENT TO CHECKOUT</p>
            <h2>A smarter way to shop.</h2>
          </div>
          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon">✳</div>
              <h3>Describe your need</h3>
              <p>Tell the AI agent your budget, must-have features and preferences in natural language.</p>
            </article>
            <article className="step-card">
              <span className="step-number">02</span>
              <div className="step-icon">⌕</div>
              <h3>Compare real offers</h3>
              <p>Gemini structures your intent while Channel3 supplies catalogue products and merchant offers.</p>
            </article>
            <article className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon">↗</div>
              <h3>Approve with PayPal</h3>
              <p>The backend revalidates the selected offer and creates a PayPal Sandbox order for your approval.</p>
            </article>
          </div>
        </section>
      )}

      <footer className="footer">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark">q</span>
          <span>quick<span className="brand-accent">own</span></span>
        </Link>
        <p>AI-assisted discovery. Transparent offers. PayPal Sandbox checkout.</p>
        <span className="footer-sandbox">DEMO ENVIRONMENT · NO LIVE PAYMENTS</span>
      </footer>
    </main>
  );
}
