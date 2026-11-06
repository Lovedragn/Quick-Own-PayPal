"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-zinc-200 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#0F172A] flex items-center justify-center p-1">
            <Image
              src="/icon.svg"
              alt="QuickOwn"
              width={16}
              height={16}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-cal font-bold text-base text-zinc-900 tracking-tight">
            Quick<span className="text-[#16A34A] font-serif italic">Own</span>
          </span>
        </div>

        <p className="text-xs font-mono text-zinc-500">
          &copy; 2026 QuickOwn. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
