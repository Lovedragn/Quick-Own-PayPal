"use client";

import Image from "next/image";
import { PackageCheck, X, ExternalLink, Calendar, ShoppingBag, CheckCircle2 } from "lucide-react";

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

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function OrdersDrawer({
  isOpen,
  onClose,
  orders = [],
  onOpenDetail,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#3F7A2E]" />
            <h2 className="font-cal font-bold text-lg text-slate-900">
              Ordered Products
            </h2>
            <span className="text-xs bg-[#E8F4E2] px-2.5 py-0.5 rounded-full font-bold text-[#3F7A2E]">
              {orders.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            aria-label="Close ordered products"
            title="Close ordered products"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {orders.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-cal">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
              <p className="text-base text-slate-600 font-bold mb-1">No orders yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Completed purchases via PayPal will appear here with full product and transaction details.
              </p>
            </div>
          ) : (
            orders.map((order, orderIdx) => (
              <div
                key={order.orderId || order.id || orderIdx}
                className="border border-[#D8E5D0] rounded-xl bg-[#FBFDFB] p-4 shadow-xs space-y-3"
              >
                {/* Order metadata header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-[#17270C]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3F7A2E]" />
                      <span>Order #{order.orderId ? order.orderId.slice(-8) : String(orderIdx + 1)}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#E8F4E2] text-[#3F7A2E] text-[10px] uppercase font-bold">
                        {order.status || "COMPLETED"}
                      </span>
                    </div>
                    {order.date && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(order.date)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total</span>
                    <span className="font-cal font-bold text-sm text-[#17270C]">
                      {order.total ? formatPrice(order.total, order.currency || "USD") : "—"}
                    </span>
                  </div>
                </div>

                {/* Products in this order */}
                <div className="space-y-2 pt-1">
                  {(order.items || []).map((item, itemIdx) => {
                    const imageUrl = item.imageUrl || item.thumbnailUrl;
                    return (
                      <div
                        key={item.productId ? `${item.productId}-${itemIdx}` : itemIdx}
                        className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-100"
                      >
                        <div className="relative w-12 h-12 shrink-0 bg-slate-50 rounded-md overflow-hidden border border-slate-200">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.name || item.productName || "Ordered Product"}
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-cal">
                              N/A
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-slate-900 truncate">
                            {item.name || item.productName || "Unnamed product"}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span>Qty: {item.quantity || 1}</span>
                            {item.merchant && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px] text-slate-600">
                                  {item.merchant}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-cal font-bold text-slate-900 block">
                            {formatPrice(
                              item.price ? Number(item.price) * (item.quantity || 1) : null,
                              item.currency || order.currency || "USD"
                            )}
                          </span>
                          {item.offerUrl && (
                            <a
                              href={item.offerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] text-[#0070BA] hover:underline mt-0.5"
                            >
                              Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Capture or PayPal transaction reference */}
                {order.captureId && (
                  <div className="pt-1 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Capture ID: {order.captureId}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            PayPal Sandbox captures simulated and tracked locally.
          </p>
        </div>
      </div>
    </div>
  );
}

