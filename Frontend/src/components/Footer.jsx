"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-50 border-t border-zinc-200 py-8 px-4 sm:px-6">
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
          <span className="font-cal font-bold text-base text-zinc-900">
            Quick<span className="text-[#16A34A] font-serif italic">Own</span>
          </span>
          <span className="text-sm font-mono text-zinc-400 ml-2">
            AI Autonomous Shopping Agent
          </span>
        </div>

        <div className="text-sm font-mono text-zinc-500 flex items-center gap-3">
          <span>Channel3 Catalog</span>
          <span>&bull;</span>
          <span>Elasticsearch</span>
          <span>&bull;</span>
          <span>PayPal Sandbox v2</span>
        </div>

        <span className="text-sm font-mono px-3.5 py-1 rounded-full bg-white text-zinc-600 border border-zinc-200">
          DEMO ENVIRONMENT &bull; NO REAL CHARGES
        </span>
      </div>
    </footer>
  );
}
