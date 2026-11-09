"use client";

import Link from "next/link";
import Image from "next/image";
import GsapTextReveal from "@/components/ui/GsapTextReveal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStoredOrders,
  saveStoredOrders,
  getStoredPendingCheckout,
  saveStoredPendingCheckout,
  saveStoredCart,
} from "@/lib/storage";
import { useAuth } from "@/lib/useAuth";
import { supabase, saveRemoteOrder, saveRemoteCart } from "@/lib/supabase";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState("loading");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [pendingRemoteOrder, setPendingRemoteOrder] = useState(null);
  const { user } = useAuth();
  const orderIdRef = useRef("");
  const started = useRef(false);

  useEffect(() => {
    if (!user?.id || !pendingRemoteOrder) return;
    void saveRemoteOrder(pendingRemoteOrder, user.id);
  }, [user?.id, pendingRemoteOrder]);

  const capture = useCallback(async (id) => {
    if (!id) {
      setStatus("error");
      setMessage(
        "PayPal did not return an order token. Please contact the demo operator.",
      );
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const url =
        API_BASE +
        "/api/checkout/orders/" +
        encodeURIComponent(id) +
        "/capture";
      const response = await fetch(url, { method: "POST" });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }
      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Capture failed (HTTP " + response.status + ")",
        );
      }
      setResult(data);
      setStatus("success");

      // Save to Ordered Products in local storage
      const pending = getStoredPendingCheckout();
      const existingOrders = getStoredOrders();
      const isAlreadyRecorded = existingOrders.some(
        (o) => o.orderId === data.orderId || o.captureId === data.captureId,
      );

      let orderToPersist =
        existingOrders.find(
          (order) =>
            order.orderId === data.orderId ||
            order.captureId === data.captureId,
        ) || null;

      if (!isAlreadyRecorded) {
        const newOrder = {
          orderId: data.orderId || id,
          captureId: data.captureId || "",
          status: data.status || "COMPLETED",
          currency: data.currency || (pending ? pending.currency : "USD"),
          total: data.total || (pending ? pending.total : "0.00"),
          date: new Date().toISOString(),
          items: (
            pending?.items || [
              {
                name: `Order ${data.orderId || id}`,
                quantity: 1,
                price: data.total,
                currency: data.currency || "USD",
              },
            ]
          ).map((item) => {
            const productName =
              item.name ||
              item.productName ||
              item.product?.name ||
              (item.productId
                ? `Product #${item.productId}`
                : "Unnamed product");
            return {
              ...item,
              name: productName,
              productName,
            };
          }),
        };
        saveStoredOrders([newOrder, ...existingOrders]);

        // Save order to Supabase
        if (supabase) {
          void supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              void saveRemoteOrder(user.id, newOrder);
            }
          });
        }
      }

      // If checkout originated from Cart, empty cart
      if (pending?.source === "cart") {
        saveStoredCart([]);
        if (supabase) {
          void supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              void saveRemoteCart(user.id, []);
            }
          });
        }
      }
      saveStoredPendingCheckout(null);
    } catch (error) {
      setMessage(error.message || "We could not confirm the PayPal capture.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    orderIdRef.current = token || "";
    if (!started.current) {
      started.current = true;
      void capture(token);
    }
  }, [capture]);

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
          <span>
            quick<span className="brand-accent">own</span>
          </span>
        </Link>
        <div className="return-icon">
          {status === "success" ? "✓" : status === "error" ? "!" : "↻"}
        </div>
        {status === "loading" && (
          <>
            <GsapTextReveal
              as="h1"
              scrollTrigger={false}
              delay={0.1}
              stagger={0.06}
              duration={0.75}
              rotate={true}
            >
              Confirming your payment
            </GsapTextReveal>
            <GsapTextReveal
              as="p"
              scrollTrigger={false}
              delay={0.25}
              stagger={0.02}
              duration={0.6}
              y="100%"
            >
              PayPal returned your order. Quick-Own is verifying approval and
              asking PayPal to complete the Sandbox capture.
            </GsapTextReveal>
          </>
        )}
        {status === "success" && (
          <>
            <GsapTextReveal
              as="h1"
              scrollTrigger={false}
              delay={0.1}
              stagger={0.06}
              duration={0.75}
              rotate={true}
            >
              Payment captured
            </GsapTextReveal>
            <GsapTextReveal
              as="p"
              scrollTrigger={false}
              delay={0.25}
              stagger={0.02}
              duration={0.6}
              y="100%"
            >
              Your PayPal Sandbox payment was captured successfully. This
              confirms a payment to the Quick-Own Sandbox merchant; it does not
              place an order with the external retailer.
            </GsapTextReveal>
            <div className="return-meta">
              <div>
                <span>Payment status</span>
                <strong>{result.status}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>
                  {result.total} {result.currency}
                </strong>
              </div>
              <div>
                <span>PayPal order</span>
                <strong>{result.orderId}</strong>
              </div>
              <div>
                <span>Capture ID</span>
                <strong>{result.captureId}</strong>
              </div>
            </div>
            <Link className="return-link" href="/">
              Back to shopping <span>→</span>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <GsapTextReveal
              as="h1"
              scrollTrigger={false}
              delay={0.1}
              stagger={0.06}
              duration={0.75}
              rotate={true}
            >
              We could not confirm capture
            </GsapTextReveal>
            <p className="return-error">{message}</p>
            <GsapTextReveal
              as="p"
              scrollTrigger={false}
              delay={0.25}
              stagger={0.02}
              duration={0.6}
              y="100%"
            >
              Your order has not been marked as completed by this page. You can
              safely retry; the backend reconciles an already-completed PayPal
              capture.
            </GsapTextReveal>
            <button
              className="return-link"
              onClick={() => capture(orderIdRef.current)}
            >
              Retry verification <span>↻</span>
            </button>
            <div>
              <Link className="return-link" href="/">
                Back to Quick-Own
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
