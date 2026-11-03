import Link from "next/link";

export default function CheckoutCancelledPage() {
  return (
    <main className="return-shell">
      <section className="return-card">
        <Link className="brand" href="/"><span className="brand-mark">q</span><span>quick<span className="brand-accent">own</span></span></Link>
        <div className="return-icon">↩</div>
        <h1>Checkout cancelled</h1>
        <p>You returned from PayPal without approving this order. Quick-Own did not request a capture.</p>
        <div className="return-meta">
          <div><span>Payment status</span><strong>Not captured</strong></div>
          <div><span>Next step</span><strong>You can continue shopping</strong></div>
        </div>
        <Link className="return-link" href="/">Return to shopping <span>→</span></Link>
      </section>
    </main>
  );
}