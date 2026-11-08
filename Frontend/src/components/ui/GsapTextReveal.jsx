"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useMemo,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Safely register GSAP ScrollTrigger in browser
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Extract plain text recursively for accessibility
function extractText(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(" ");
  if (isValidElement(node) && node.props && node.props.children) {
    return extractText(node.props.children);
  }
  return "";
}

// Recursively split children into masked words
function splitChildren(children, wordClassName = "") {
  return Children.map(children, (child, idx) => {
    if (typeof child === "string" || typeof child === "number") {
      const text = String(child);
      const words = text.split(/\s+/).filter(Boolean);

      return words.map((word, wIdx) => (
        <span
          key={`${idx}-${wIdx}`}
          className="inline-block overflow-hidden mr-[0.26em] py-0.5 align-baseline"
        >
          <span
            className={`gsap-reveal-word inline-block will-change-transform ${wordClassName}`}
          >
            {word}
          </span>
        </span>
      ));
    }

    if (isValidElement(child)) {
      if (child.type === "br") {
        return <br key={idx} />;
      }

      if (child.props && child.props.children) {
        return cloneElement(child, {
          key: idx,
          children: splitChildren(
            child.props.children,
            child.props.className ? `${wordClassName} ${child.props.className}` : wordClassName
          ),
        });
      }

      return child;
    }

    return child;
  });
}

/**
 * GsapTextReveal
 * Smooth word-by-word reveal animation powered by GSAP & ScrollTrigger.
 */
export default function GsapTextReveal({
  as: Component = "div",
  children,
  className = "",
  wordClassName = "",
  delay = 0,
  stagger = 0.04,
  duration = 0.8,
  ease = "power4.out",
  y = "125%",
  rotate = false,
  scrollTrigger = true,
  start = "top 85%",
  once = true,
  ...props
}) {
  const containerRef = useRef(null);

  const plainText = useMemo(() => extractText(children), [children]);
  const splitContent = useMemo(
    () => splitChildren(children, wordClassName),
    [children, wordClassName]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const words = containerRef.current.querySelectorAll(".gsap-reveal-word");
      if (!words.length) return;

      if (prefersReduced) {
        gsap.set(words, { opacity: 1, y: 0, rotateZ: 0 });
        return;
      }

      const stConfig = scrollTrigger
        ? {
            trigger: containerRef.current,
            start:
              typeof scrollTrigger === "string"
                ? scrollTrigger
                : scrollTrigger.start || start,
            once,
            ...(typeof scrollTrigger === "object" ? scrollTrigger : {}),
          }
        : undefined;

      const tl = gsap.timeline({
        delay,
        scrollTrigger: stConfig,
      });

      tl.from(words, {
        y,
        opacity: 0,
        rotateZ: rotate ? 2.5 : 0,
        duration,
        stagger,
        ease,
      });
    }, containerRef);

    return () => ctx.revert();
  }, [delay, duration, ease, once, rotate, scrollTrigger, stagger, start, y]);

  return (
    <Component
      ref={containerRef}
      className={className}
      aria-label={plainText || undefined}
      {...props}
    >
      <span
        className="inline-block"
        aria-hidden={plainText ? "true" : undefined}
      >
        {splitContent}
      </span>
    </Component>
  );
}

