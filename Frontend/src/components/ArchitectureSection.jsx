"use client";

import {
  Server,
  Layers,
  Lock,
} from "lucide-react";
import GsapTextReveal from "@/components/ui/GsapTextReveal";

const ARCHITECTURE_LAYERS = [
  {
    title: "Client & Presentation",
    subtitle: "Responsive Next.js 16 UI",
    icon: Layers,
    items: [
      "Next.js App Router with React 19 Client Components",
      "Tailwind CSS custom styling with Cal Sans typography",
      "Persistent state via local storage (cart, likes, orders)",
      "Instant feedback drawer modals and variant inspectors",
    ],
  },
  {
    title: "Core Backend & AI",
    subtitle: "Spring Boot 4 & Spring AI",
    icon: Server,
    items: [
      "Java 21 / Spring Boot modular REST architecture",
      "Google Gemini 2.5 Flash for natural language reasoning",
      "Server-side budget, currency, and stock validation rules",
      "Centralized error handling and structured API responses",
    ],
  },
  {
    title: "Financial Security",
    subtitle: "PayPal v2 Integration",
    icon: Lock,
    items: [
      "Strict UUID-based transaction Idempotency keys",
      "Server-side catalog revalidation before PayPal order creation",
      "OAuth 2.0 client credential authentication with PayPal Sandbox",
      "Tamper-proof order capture flow with audit trail persistence",
    ],
  },
];

export default function ArchitectureSection() {
  return (
    <section
      id="architecture"
      className="w-full bg-white pt-10 sm:pt-14 pb-0"
      aria-label="System Architecture"
    >
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10">
        <div className="max-w-3xl">
          <GsapTextReveal
            as="h2"
            className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]"
            start="top 85%"
            stagger={0.05}
            duration={0.8}
            rotate={true}
          >
            End-to-End Autonomous Shopping Pipeline
          </GsapTextReveal>
          <GsapTextReveal
            as="p"
            className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed"
            start="top 85%"
            delay={0.15}
            stagger={0.015}
            duration={0.6}
            y="100%"
          >
            How Quick-Own connects natural language intent reasoning, live
            multi-merchant catalog indexing, and tamper-proof PayPal Sandbox
            checkout.
          </GsapTextReveal>
        </div>
      </div>

      {/* 3-Column Architecture Pillar Cards - Merged edge-to-edge with side lines */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 border-y border-zinc-200 border-x-0 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white rounded-none shadow-none">
        {ARCHITECTURE_LAYERS.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div
              key={idx}
              className="p-6 sm:p-8 bg-white hover:bg-zinc-50/50 transition-colors flex flex-col justify-between rounded-none"
            >
              <div>
                <div className="w-10 h-10 rounded bg-zinc-100 flex items-center justify-center text-[#16A34A] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <GsapTextReveal
                  as="h3"
                  className="font-cal font-bold text-xl text-zinc-900 leading-snug"
                  start="top 90%"
                  delay={idx * 0.1}
                  stagger={0.04}
                  duration={0.7}
                  rotate={true}
                >
                  {layer.title}
                </GsapTextReveal>
                <GsapTextReveal
                  as="p"
                  className="text-sm font-mono text-zinc-500 mb-5 mt-1"
                  start="top 90%"
                  delay={idx * 0.1 + 0.1}
                  stagger={0.02}
                  duration={0.5}
                  y="100%"
                >
                  {layer.subtitle}
                </GsapTextReveal>
                <ul className="space-y-2.5 text-sm text-zinc-600">
                  {layer.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#16A34A] font-bold">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
