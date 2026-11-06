"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm p-1.5">
            <Image
              src="/icon.svg"
              alt="QuickOwn"
              width={20}
              height={20}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="font-cal font-bold text-xl tracking-tight text-zinc-900">
            Quick<span className="text-[#16A34A] font-serif italic">Own</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-xs font-cal font-semibold uppercase tracking-wider text-zinc-600">
          <Link
            href="/#product-features"
            className="hover:text-zinc-950 transition-colors"
          >
            Product
          </Link>
          <Link
            href="/#savings-speed"
            className="hover:text-zinc-950 transition-colors"
          >
            Savings & Speed
          </Link>
          <Link
            href="/#architecture"
            className="hover:text-zinc-950 transition-colors"
          >
            Architecture
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wishlist / Liked Products Indicator */}
          <button
            type="button"
            onClick={onOpenLikes}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
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
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
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
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title="Ordered Products"
            aria-label="View ordered products"
          >
            <PackageCheck className="w-5 h-5" />
            {ordersCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#16A34A] text-white font-cal text-[10px] flex items-center justify-center font-bold">
                {ordersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
