"use client";

export default function Footer() {
  return (
    <>
      {/* Ticker Track (Below visible viewport - revealed on scroll) */}
      <div className="ticker" aria-label="Key features">
        <div className="ticker-track">
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Multi-Store Price Comparison</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Real-Time Merchant Stock Tracking</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>PayPal Sandbox Integration</span>
          </div>
          <div className="ticker-item">
            <span className="spark">✦</span>
            <span>Sub-50ms Elastic Search Querying</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="w-full bg-[#E5F2E0] border-t border-[#D8E5D0] py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#002125] text-[#F2FBEF] flex items-center justify-center font-bold text-xs">
              q
            </div>
            <span className="font-cal font-bold text-base text-[#17270C]">
              Quick<span className="em">Own</span>
            </span>
          </div>

          <div className="text-xs font-cal text-[#4A5A3F] flex items-center gap-4">
            <span>Verified Stores</span>
            <span>&bull;</span>
            <span>Live Price Locks</span>
            <span>&bull;</span>
            <span>PayPal Sandbox</span>
          </div>

          <span className="text-xs font-cal px-3 py-1 rounded-full bg-[#E8F4E2] text-[#3F7A2E] border border-[#D8E5D0]">
            DEMO ENVIRONMENT &bull; NO LIVE CHARGES
          </span>
        </div>
      </footer>
    </>
  );
}

