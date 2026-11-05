"use client";

import Image from "next/image";
import { ShoppingCart, X, Trash2 } from "lucide-react";

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

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  totalAmount,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  isCheckingOut,
  onOpenDetail,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={onClose}
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
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            aria-label="Close cart"
            title="Close cart"
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
                className="border border-slate-200 rounded-none flex items-stretch gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden pr-3 min-h-[72px]"
              >
                {/* Product Image taking full height */}
                <div
                  className={`relative w-20 self-stretch bg-white flex-shrink-0 flex items-center justify-center overflow-hidden ${
                    item.recommendation && onOpenDetail ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (item.recommendation && onOpenDetail) {
                      onOpenDetail(item.recommendation, 0);
                      onClose();
                    }
                  }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName || "Product"}
                      fill
                      unoptimized
                      className="object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src && target.src.includes("/cleaned/v1/")) {
                          target.src = target.src.replace("/cleaned/v1/", "/");
                        } else {
                          target.style.display = "none";
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 font-cal text-xl">
                      Q
                    </div>
                  )}
                </div>

                <div
                  className={`flex-1 min-w-0 py-2.5 self-center ${
                    item.recommendation && onOpenDetail ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (item.recommendation && onOpenDetail) {
                      onOpenDetail(item.recommendation, 0);
                      onClose();
                    }
                  }}
                >
                  <p className="text-[11px] text-slate-500 font-cal truncate">
                    {item.brand || item.merchant}
                  </p>
                  <h4 className="text-xs font-bold font-cal text-slate-900 truncate">
                    {item.productName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center border border-slate-200 bg-white text-xs font-cal">
                      <button
                        type="button"
                        className="px-2 py-0.5 hover:bg-slate-100 text-slate-700 transition-colors font-bold disabled:opacity-30"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          onUpdateQuantity &&
                          onUpdateQuantity(item.productId, item.offerUrl, item.quantity - 1)
                        }
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2 text-slate-900 font-bold min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-0.5 hover:bg-slate-100 text-slate-700 transition-colors font-bold disabled:opacity-30"
                        disabled={item.quantity >= 10}
                        onClick={() =>
                          onUpdateQuantity &&
                          onUpdateQuantity(item.productId, item.offerUrl, item.quantity + 1)
                        }
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-bold text-[#0070BA] font-cal">
                      {formatPrice((Number(item.price) || 0) * item.quantity, item.currency)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.productId, item.offerUrl)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0 self-center"
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
                {formatPrice(totalAmount, cart[0]?.currency || "USD")}
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              disabled={isCheckingOut}
              className="font-cal w-full py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.92-7.15 5.92H10.19c-.43 0-.79.31-.86.73l-.97 5.17a.64.64 0 0 1-.63.52H4.6c-.4 0-.7-.36-.63-.75L6.94 3.71A1.1 1.1 0 0 1 8.02 2.8h6.42c2.73 0 4.67.62 5.627 2.188z" />
              </svg>
              <span>{isCheckingOut ? "Locking Order…" : "Pay Cart with PayPal"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
