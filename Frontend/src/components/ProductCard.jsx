"use client";

import Image from "next/image";
import { useMemo } from "react";
import { ExternalLink, Sparkles, Check, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
              offer.productUrl === recommendation.selectedOffer?.productUrl
          )
        );
  const selected = offers[safeIndex];

  return (
    <Card className="shadcn-card">
      {/* Shadcn Card Header */}
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[11px] font-bold">
              #{recommendation.rank} Match
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {offers.length > 0 ? `${offers.length} Offers` : "Verified Store"}
            </Badge>
          </div>
          <Badge variant="stock" className="text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F7A2E]" />
            {product.inStock ? "In Stock" : "Limited Stock"}
          </Badge>
        </div>

        {/* Product Image */}
        <div className="relative w-full h-48 bg-[#F7FBF4] border border-[var(--line)] rounded-xl overflow-hidden flex items-center justify-center mt-1">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name || "Recommended product"}
              fill
              unoptimized
              className="object-contain p-3 transition-transform duration-300 hover:scale-105"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="text-3xl font-cal text-[var(--ink-2)] font-bold">
              Q
            </div>
          )}
        </div>

        {/* Title and Category */}
        <div className="mt-1">
          <p className="eyebrow text-xs mb-1">
            {product.brand || product.category || "AI Recommendation"}
          </p>
          <CardTitle className="font-cal line-clamp-2">
            {product.name}
          </CardTitle>
        </div>
      </CardHeader>

      {/* Shadcn Card Content */}
      <CardContent>
        {/* Match Explanation Callout */}
        {recommendation.explanation && (
          <div className="shadcn-callout">
            <Sparkles className="w-4 h-4 text-[var(--accent-display)] flex-shrink-0 mt-0.5" />
            <span className="text-xs sm:text-[13px] leading-relaxed">
              {recommendation.explanation}
            </span>
          </div>
        )}

        {/* Matched Feature Badges */}
        {recommendation.matchedFeatures?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recommendation.matchedFeatures.map((feature) => (
              <Badge
                key={feature}
                variant="secondary"
                className="text-[11px] font-normal"
              >
                <Check className="w-3 h-3 text-[var(--accent-text)]" />
                <span>{feature}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Merchant Offers Selector */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-2)] mb-2 font-semibold">
            <span>Available Merchant Offers ({offers.length}):</span>
            <span className="text-[var(--accent-text)]">Server Verified</span>
          </div>

          {offers.length > 0 ? (
            <fieldset
              role="radiogroup"
              aria-label="Merchant offers"
              className="shadcn-offer-list border-none p-0 m-0"
            >
              <legend className="sr-only">Choose a merchant offer</legend>
              {offers.map((offer, idx) => {
                const isSelected = idx === safeIndex;
                const offerId = `offer-${product.productId}-${idx}`;
                return (
                  <label
                    key={offerId}
                    htmlFor={offerId}
                    className={`shadcn-offer-item ${
                      isSelected ? "is-selected" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        id={offerId}
                        name={`offer-radio-${product.productId}`}
                        checked={isSelected}
                        onChange={() => onSelectOffer(product.productId, idx)}
                        className="accent-[#0070BA] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-[var(--ink)]">
                          {offer.merchant}
                        </span>
                        <span className="text-[11px] text-[var(--ink-2)] font-mono">
                          {offer.availability || "In stock"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--primary)] font-mono">
                        {formatPrice(offer.price, offer.currency)}
                      </span>
                      {offer.productUrl && (
                        <a
                          href={offer.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Inspect retailer page"
                          className="text-[var(--ink-2)] hover:text-[var(--ink)] p-1 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <p className="text-xs text-[var(--ink-2)] italic">
              No eligible merchant offers found.
            </p>
          )}
        </div>
      </CardContent>

      {/* Shadcn Card Footer */}
      <CardFooter>
        {selected && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--ink-2)] font-medium">
                Quantity:
              </span>
              <div className="shadcn-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    onQuantityChange(
                      product.productId,
                      Math.max(1, quantity - 1)
                    )
                  }
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    onQuantityChange(
                      product.productId,
                      Math.min(10, quantity + 1)
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="paypal"
              size="lg"
              className="w-full"
              onClick={() => onCheckout(recommendation, selected, quantity)}
              disabled={checkingOut || !selected}
            >
              <svg className="paypal-svg" viewBox="0 0 24 24">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
              </svg>
              <span>
                {checkingOut
                  ? "Locking Order…"
                  : `Checkout ${formatPrice(
                      selected.price * quantity,
                      selected.currency
                    )}`}
              </span>
            </Button>

            <p className="text-[11px] font-mono text-center text-[var(--ink-2)] mt-1">
              Sandbox checkout &bull; Server re-verifies live offer
            </p>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

