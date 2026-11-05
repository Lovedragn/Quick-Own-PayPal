"use client";

import Link from "next/link";
import { Heart, ShoppingCart, PackageCheck } from "lucide-react";

export default function HeaderNav({
  likedCount = 0,
  cartCount = 0,
  ordersCount = 0,
  onOpenLikes,
  onOpenCart,
  onOpenOrders,
}) {
  return (
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
          <a
            href="#how-it-works"
            className="hover:text-[#17270C] transition-colors"
          >
            How it works
          </a>
          <a
            href="#architecture"
            className="hover:text-[#17270C] transition-colors"
          >
            Architecture
          </a>
          <a href="#stats" className="hover:text-[#17270C] transition-colors">
            Guarantees
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wishlist / Liked Products Indicator */}
          <button
            type="button"
            onClick={onOpenLikes}
            className="relative p-2 rounded-full hover:bg-[#E8F4E2] text-[#4A5A3F] hover:text-[#17270C] transition-colors cursor-pointer"
            title="Liked Products"
            aria-label="View liked products"
          >
            <Heart
              className={`w-5 h-5 ${likedCount > 0 ? "fill-rose-500 text-rose-500" : ""}`}
            />
            {likedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-cal text-[10px] flex items-center justify-center font-bold">
                {likedCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative p-2 rounded-full hover:bg-[#E8F4E2] text-[#4A5A3F] hover:text-[#17270C] transition-colors cursor-pointer"
            title="View Cart"
            aria-label="View shopping cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0070BA] text-white font-cal text-[10px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>

          {/* Ordered Products Button */}
          <button
            type="button"
            onClick={onOpenOrders}
            className="relative p-2 rounded-full hover:bg-[#E8F4E2] text-[#4A5A3F] hover:text-[#17270C] transition-colors cursor-pointer"
            title="Ordered Products"
            aria-label="View ordered products"
          >
            <PackageCheck className="w-5 h-5" />
            {ordersCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#3F7A2E] text-white font-cal text-[10px] flex items-center justify-center font-bold">
                {ordersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

