"use client";

import {
  Brain,
  Database,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Server,
  Layers,
  CheckCircle2,
  Lock,
  Code2,
  Workflow,
  Search,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    step: "01",
    id: "intent",
    title: "Buyer Natural Language Intent",
    shortTitle: "1. Buyer Intent",
    badge: "Next.js 16 Client",
    badgeColor: "bg-zinc-100 text-zinc-900 border-zinc-200",
    icon: Search,
    summary:
      "Buyer enters plain conversational query or budget preference into the console.",
    description:
      "The client interface captures unstructured shopping queries (e.g. 'ergonomic mechanical keyboard with silent switches under $150') and relays them with full context to the Spring Boot orchestration endpoint.",
    telemetry: "Instant reactive feedback · Sub-10ms form dispatch",
    details: [
      "Natural language input processing with debounced search query state",
      "Local storage-backed cart, wishlist, and active orders preservation",
      "Seamless responsive UI built with Tailwind CSS & Cal Sans typography",
    ],
  },
  {
    step: "02",
    id: "gemini",
    title: "Gemini AI Semantic Parsing",
    shortTitle: "2. Gemini AI",
    badge: "Google Gemini 2.5 & Spring AI",
    badgeColor: "bg-emerald-50 text-emerald-900 border-emerald-200",
    icon: Brain,
    summary:
      "Spring AI guides Gemini to interpret buyer intent, extracting product category, budget constraints, and feature attributes.",
    description:
      "Gemini transforms fuzzy user prompts into high-precision structured JSON requirements. It enforces strict budget boundaries, extracts brand filters, and scores candidate product relevance before querying the catalog.",
    telemetry: "Structured JSON schema · Prompt injection guardrails",
    details: [
      "Spring AI framework integration with Google Gemini Flash model",
      "Strict parameter extraction: max budget, currency, category, and preferred specs",
      "Context-aware shopping intent classification without hallucinated stock",
    ],
  },
  {
    step: "03",
    id: "channel3",
    title: "Channel3 Live Product Catalog",
    shortTitle: "3. Channel3 API",
    badge: "Universal Retail Catalog",
    badgeColor: "bg-zinc-100 text-zinc-900 border-zinc-200",
    icon: ShoppingBag,
    summary:
      "Real-time catalog search across 100M+ real retail products with multi-merchant offer comparison.",
    description:
      "Channel3 SDK queries real-time merchant feeds across major retailers. It returns verified product titles, images, specifications, and live offers with direct merchant links and pricing.",
    telemetry: "100M+ retail items · Multi-merchant price aggregation",
    details: [
      "Live price and in-stock inventory synchronization across multiple sellers",
      "Transparent merchant offer lists with direct product URLs",
      "Dynamic variant swatches (colorways, storage tiers, configurations)",
    ],
  },
  {
    step: "04",
    id: "elastic",
    title: "Elasticsearch Hybrid Retrieval",
    shortTitle: "4. Elastic Search",
    badge: "Sub-50ms Hybrid Engine",
    badgeColor: "bg-emerald-50 text-emerald-900 border-emerald-200",
    icon: Database,
    summary:
      "Dense vector embeddings combined with BM25 text index for lightning-fast semantic retrieval and ranking.",
    description:
      "Elasticsearch indexes product metadata and semantic embeddings. Hybrid vector search surfaces exact matches alongside contextually relevant alternatives within 50 milliseconds.",
    telemetry: "Sub-50ms latency · BM25 + Dense vector hybrid search",
    details: [
      "Semantic similarity scoring using vector search embeddings",
      "High-throughput caching for rapid re-queries and merchant offer ranking",
      "Resilient fallback indexing when external provider APIs experience spikes",
    ],
  },
  {
    step: "05",
    id: "paypal",
    title: "PayPal Orders v2 Checkout",
    shortTitle: "5. PayPal Sandbox",
    badge: "PayPal Orders v2 REST API",
    badgeColor: "bg-sky-50 text-[#0070BA] border-sky-200",
    icon: ShieldCheck,
    summary:
      "Server-side price verification and cryptographic idempotency for secure, tamper-proof sandbox checkout.",
    description:
      "When the buyer selects an offer, Spring Boot revalidates the exact merchant price server-side, generates a unique Idempotency-Key, and calls PayPal Orders v2 Sandbox. The buyer approves safely with zero live funds risked.",
    telemetry: "Cryptographic Idempotency · 100% Server-side Price Lock",
    details: [
      "Server-side price verification prevents client-side tampering",
      "Idempotency-Key header guarantees no duplicate transactions",
      "PayPal Sandbox OAuth token handling and automated order capture upon return",
    ],
  },
];

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
      className="w-full bg-white border-b border-zinc-200 py-10 sm:py-14"
      aria-label="System Architecture"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-sm font-mono font-medium mb-4">
            <Workflow className="w-4 h-4 text-[#16A34A]" />
            <span>Engineering Architecture</span>
          </div>
          <h2 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]">
            End-to-End Autonomous Shopping Pipeline
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
            How Quick-Own connects natural language intent reasoning, live
            multi-merchant catalog indexing, and tamper-proof PayPal Sandbox
            checkout.
          </p>
        </div>

        {/* Visual Pipeline Flow Diagram */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 sm:p-8 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-[#16A34A]" />
            <h4 className="font-cal font-bold text-sm text-zinc-900 uppercase tracking-wider">
              Synchronous Execution & Request Flow
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm text-zinc-400">
                        {step.step}
                      </span>
                      <Icon className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <h5 className="font-cal font-bold text-sm text-zinc-900 leading-snug">
                      {step.title.split(" ")[0]} {step.title.split(" ")[1]}
                    </h5>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-sm font-mono text-zinc-500">
                      {step.badge.split(" ")[0]}
                    </span>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 hidden sm:block -mr-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3-Column Architecture Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ARCHITECTURE_LAYERS.map((layer, idx) => {
            const Icon = layer.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-300 transition-colors"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[#16A34A] mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-cal font-bold text-lg text-zinc-900">
                    {layer.title}
                  </h3>
                  <p className="text-sm font-mono text-zinc-500 mb-4">
                    {layer.subtitle}
                  </p>
                  <ul className="space-y-2 text-sm text-zinc-600">
                    {layer.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#16A34A] font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 text-sm font-mono text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Architecture Spec</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
