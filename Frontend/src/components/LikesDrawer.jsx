"use client";

import Image from "next/image";
import { Heart, X, Trash2 } from "lucide-react";

export default function LikesDrawer({
  isOpen,
  onClose,
  likedIds = [],
  likedProductDetails = {},
  recommendations = [],
  onToggleLike,
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
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="font-cal font-bold text-lg text-slate-900">
              Liked Products
            </h2>
            <span className="text-xs bg-rose-50 px-2 py-0.5 rounded-full font-bold text-rose-600">
              {likedIds.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            aria-label="Close liked products"
            title="Close liked products"
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
              const match =
                recommendations.find((r) => r.product?.productId === id) ||
                likedProductDetails[id] ||
                null;
              const product = match?.product || null;
              const imageUrl = product?.imageUrl;

              return (
                <div
                  key={id}
                  className="border border-slate-200 rounded-none flex items-stretch gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden pr-3 min-h-[72px]"
                >
                  {/* Product Image taking full height with no outer border box */}
                  <div
                    className={`relative w-20 self-stretch bg-white flex-shrink-0 flex items-center justify-center overflow-hidden ${
                      match && onOpenDetail ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (match && onOpenDetail) {
                        onOpenDetail(match, 0);
                        onClose();
                      }
                    }}
                  >
                    {imageUrl && typeof imageUrl === "string" && imageUrl.trim() ? (
                      <Image
                        src={imageUrl.trim()}
                        alt={product?.name || "Product"}
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
                    className={`flex-1 min-w-0 py-3 self-center ${
                      match && onOpenDetail ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (match && onOpenDetail) {
                        onOpenDetail(match, 0);
                        onClose();
                      }
                    }}
                  >
                    <p className="text-[11px] text-slate-500 font-cal truncate">
                      {product?.brand || "Saved preference"}
                    </p>
                    <h4 className="text-xs font-bold font-cal text-slate-900 truncate">
                      {product?.name || `Product #${id}`}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleLike(id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors flex-shrink-0 self-center"
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
  );
}
