
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingCart,
  PackageCheck,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export default function HeaderNav({
  likedCount = 0,
  cartCount = 0,
  ordersCount = 0,
  onOpenLikes,
  onOpenCart,
  onOpenOrders,
}) {
  const { user, signOut, loading } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Shopper";
  const email = user?.email || "";
  const initial = (fullName?.[0] || email?.[0] || "U").toUpperCase();
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] relative flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="inline-flex items-center group z-10" aria-label="QuickOwn Home">
          <Image
            src="/icon-black.svg"
            alt="QuickOwn"
            width={34}
            height={34}
            className="w-[34px] h-[34px] object-contain transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        {/* Navigation - Locked to exact dead center of screen */}
        <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-xs font-cal font-semibold uppercase tracking-wider text-zinc-600 z-10 pointer-events-auto">
          <Link
            href="/products"
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

        <div className="flex items-center gap-2 sm:gap-3 z-10">

          {/* Wishlist */}
          <button
            type="button"
            onClick={onOpenLikes}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title="Liked Products"
            aria-label="View liked products"
          >
            <Heart
              className={`w-5 h-5 ${
                likedCount > 0
                  ? "fill-rose-500 text-rose-500"
                  : ""
              }`}
            />

            {likedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-cal text-[10px] flex items-center justify-center font-bold">
                {likedCount}
              </span>
            )}
          </button>

          {/* Cart */}
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

          {/* Orders */}
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

          <div className="h-5 w-px bg-zinc-200 mx-1" aria-hidden="true" />

          {/* Authentication - Placed at far right corner */}
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden border border-zinc-200 hover:border-zinc-400"
                aria-label="User profile"
                aria-expanded={isProfileOpen}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 text-white font-cal font-bold text-xs flex items-center justify-center rounded-full">
                    {initial}
                  </div>
                )}
              </button>

              {/* Sharp Popover Box on Hover / Click */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="dialog"
                  aria-label="User account details"
                >
                  <div className="w-72 bg-white border border-zinc-200 border-t-2 border-t-zinc-900 shadow-xl p-4 rounded-none">
                    {/* User Card Header */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-zinc-200 shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 text-white font-cal font-bold text-sm flex items-center justify-center rounded-full">
                            {initial}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-cal font-bold text-sm text-zinc-900 truncate">
                          {fullName}
                        </h4>
                        <p
                          className="text-xs text-zinc-500 truncate font-mono mt-0.5"
                          title={email}
                        >
                          {email}
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-100 my-3" aria-hidden="true" />

                    {/* Logout Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-cal font-semibold uppercase tracking-wider text-white bg-zinc-900 hover:bg-rose-600 transition-colors rounded-none cursor-pointer shadow-2xs active:scale-[0.99]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg text-xs font-cal font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-all ml-0.5"
            >
              Login
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}
