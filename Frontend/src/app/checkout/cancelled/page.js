"use client";

import Link from "next/link";
import Image from "next/image";
import GsapTextReveal from "@/components/ui/GsapTextReveal";

export default function CheckoutCancelledPage() {
  return (
    <main className="return-shell">
      <section className="return-card">
        <Link className="brand" href="/">
          <span className="brand-mark p-1.5">
            <Image
              src="/icon.svg"
              alt="QuickOwn"
              width={20}
              height={20}
              className="w-full h-full object-contain"
            />
          </span>
          <span>quick<span className="brand-accent">own</span></span>
        </Link>
        <div className="return-icon">↩</div>
        <GsapTextReveal
          as="h1"
          scrollTrigger={false}
          delay={0.1}
          stagger={0.06}
          duration={0.75}
          rotate={true}
        >
          Checkout cancelled
        </GsapTextReveal>
        <GsapTextReveal
          as="p"
          scrollTrigger={false}
          delay={0.25}
          stagger={0.02}
          duration={0.6}
          y="100%"
        >
          You returned from PayPal without approving this order. Quick-Own did not request a capture.
        </GsapTextReveal>
        <div className="return-meta">
          <div><span>Payment status</span><strong>Not captured</strong></div>
          <div><span>Next step</span><strong>You can continue shopping</strong></div>
        </div>
        <Link className="return-link" href="/">Return to shopping <span>→</span></Link>
      </section>
    </main>
  );
}
