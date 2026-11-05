"use client";

import {
  Server,
  Layers,
  CheckCircle2,
  Lock,
} from "lucide-react";

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
          <h2 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]">
            End-to-End Autonomous Shopping Pipeline
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
            How Quick-Own connects natural language intent reasoning, live
            multi-merchant catalog indexing, and tamper-proof PayPal Sandbox
            checkout.
          </p>
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
                <h3 className="font-cal font-bold text-xl text-zinc-900 leading-snug">
                  {layer.title}
                </h3>
                <p className="text-sm font-mono text-zinc-500 mb-5 mt-1">
                  {layer.subtitle}
                </p>
                <ul className="space-y-2.5 text-sm text-zinc-600">
                  {layer.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#16A34A] font-bold">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-100 text-sm font-mono text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Architecture Spec</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
