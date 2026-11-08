"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

/**
 * SmoothScroll provider powered by Lenis and synchronized with GSAP ScrollTrigger ticker.
 */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    // Respect user motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      autoRaf: false,
      anchors: true,
    });

    lenisRef.current = lenis;
    if (typeof window !== "undefined") {
      window.lenis = lenis;
    }

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis smoothly through GSAP ticker for unified frame timing
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined" && window.lenis === lenis) {
        window.lenis = null;
      }
    };
  }, []);

  // Reset scroll and refresh ScrollTrigger on route change
  useEffect(() => {
    if (lenisRef.current) {
      // If no anchor hash, scroll to top on page transition
      if (!window.location.hash) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    }
  }, [pathname]);

  return <>{children}</>;
}
