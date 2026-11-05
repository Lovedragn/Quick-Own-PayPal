"use client";

import { useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  Clock,
  DollarSign,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Search,
} from "lucide-react";

// Shopping Evolution: from manual browsing steps to autonomous AI agent shopping
const SHOPPING_EVOLUTION_DATA = [
  {
    stage: "Manual Tab Browsing",
    timeSeconds: 1110,
    savingsPercent: 0,
    label: "18.5m / 0% saved",
  },
  {
    stage: "Price Portal Search",
    timeSeconds: 288,
    savingsPercent: 8,
    label: "4.8m / 8% saved",
  },
  {
    stage: "Browser Extensions",
    timeSeconds: 120,
    savingsPercent: 14,
    label: "2.0m / 14% saved",
  },
  {
    stage: "Quick-Own Agent",
    timeSeconds: 1.2,
    savingsPercent: 24,
    label: "1.2s / 24% saved",
  },
];

const evolutionChartConfig = {
  timeSeconds: {
    label: "Time Spent (Seconds)",
    color: "#EF4444",
  },
  savingsPercent: {
    label: "Price Savings Rate (%)",
    color: "#/* 16 */A34A",
  },
};

const PRODUCT_CARDS = [
  {
    tag: "Gemini 2.5 Flash",
    title: "Intent Parsing",
    subtitle: "Zero filters needed",
    description:
      "Gemini extracts category, budget, and specs straight from plain English.",
    highlights: ["Natural query to JSON", "Strict budget limits"],
  },
  {
    tag: "Channel3 Graph",
    title: "Retail Graph",
    subtitle: "100M+ live products",
    description:
      "Crawls and deduplicates offers across verified stores with real-time stock.",
    highlights: ["Cross-merchant deals", "Real-time sync"],
  },
  {
    tag: "Sub-50ms Index",
    title: "Hybrid Search",
    subtitle: "Dense vector + BM25",
    description:
      "Elasticsearch pairs embeddings and keywords for sub-50ms instant ranking.",
    highlights: ["Instant retrieval", "High-accuracy matches"],
  },
  {
    tag: "PayPal Sandbox",
    title: "PayPal Orders v2",
    subtitle: "Tamper-proof checkout",
    description:
      "Server-side price verification and safe 1-click PayPal approval links.",
    highlights: ["Idempotent payments", "Zero fund risk"],
  },
];

export default function ProductShowcaseSection() {
  const [activeMetricTab, setActiveMetricTab] = useState("savings"); // "savings" | "speed"

  return (
    <section
      id="product-features"
      className="relative w-full bg-white border-b border-zinc-200 pt-8 sm:pt-10 pb-12 sm:pb-/* 16 */"
      aria-label="Product Features and Benchmarks"
    >
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-8 sm:mb-10">
          <h2 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]">
            Built for autonomous shopping. <br />
            <span className="text-[#/* 16 */A34A] font-serif italic">
              Proven to save cash and hours.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
            Quick-Own combines Channel3’s 100M+ retail graph, Elasticsearch
            hybrid indexing, and PayPal v2 checkout into a seamless autonomous
            purchasing experience.
          </p>
        </div>
      </div>

      {/* 4 Cards Grid - Merged edge-to-edge with the long side vertical borders, razor sharp */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-y border-zinc-200 border-x-0 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white rounded-none shadow-none">
        {PRODUCT_CARDS.map((card, idx) => {
          return (
            <div
              key={idx}
              className="bg-white hover:bg-zinc-50/50 transition-colors flex flex-col justify-between rounded-none"
            >
              <div className="p-6 pb-3">
                <div className="flex items-center justify-end mb-3">
                  <span className="font-cal font-semibold text-sm tracking-wider text-zinc-900 uppercase">
                    {card.tag}
                  </span>
                </div>
                <h3 className="font-cal font-bold text-xl text-zinc-900 leading-snug">
                  {card.title}
                </h3>
                <p className="text-sm text-zinc-500 font-mono mt-0.5">
                  {card.subtitle}
                </p>
              </div>

              <div className="p-6 pt-1 pb-6 flex-1 flex flex-col justify-between">
                <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                  {card.description}
                </p>
                <ul className="space-y-1.5 pt-3 border-t border-zinc-100">
                  {card.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-sm text-zinc-700"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#/* 16 */A34A] flex-shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section: Savings & Speed Benchmark Line Chart - Merged with side vertical borders, razor sharp */}
      <div id="savings-speed" className="w-full scroll-mt-20">
        <div className="w-full bg-white border-y border-zinc-200 border-x-0 rounded-none shadow-none overflow-hidden">
          <div className="p-6 sm:p-8 pb-6 border-b border-zinc-200">
            <div className="max-w-3xl">
              <h3 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]">
                Speed & Savings Rate
              </h3>
              <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
                How moving from manual multi-tab searching to autonomous agentic
                shopping slashes latency and compounds money saved.
              </p>
            </div>
          </div>

          {/* Metric Highlights Strip - Merged edge-to-edge with side lines, razor sharp table layout */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 border-x-0 divide-x divide-y sm:divide-y-0 divide-zinc-200 rounded-none bg-white">
            <div className="p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Average Savings
              </span>
              <span className="font-cal font-bold text-2xl sm:text-5xl text-[#16A34A] block mt-1">
                24.0%
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                $72.60 saved per item
              </span>
            </div>
            <div className="p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Agent Search Time
              </span>
              <span className="font-cal font-bold text-2xl sm:text-5xl text-zinc-900 block mt-1">
                1.2s
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Down from 18.5 minutes
              </span>
            </div>
            <div className="p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Catalog Volume
              </span>
              <span className="font-cal font-bold text-2xl sm:text-5xl text-zinc-900 block mt-1">
                100M+
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Live products indexed
              </span>
            </div>
            <div className="p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Checkout Security
              </span>
              <span className="font-cal font-bold text-2xl sm:text-5xl text-[#0070BA] block mt-1">
                100%
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Cryptographic price lock
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Shadcn Line Chart Container */}
            <div className="w-full h-[320px]">
              <ChartContainer
                config={evolutionChartConfig}
                className="h-[320px] w-full"
              >
                <LineChart
                  data={SHOPPING_EVOLUTION_DATA}
                  margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#475569", fontSize: 14, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#/* 16 */A34A", fontSize: 14 }}
                    unit="%"
                    domain={[0, 30]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#EF4444", fontSize: 14 }}
                    unit="s"
                    domain={[0, 1200]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === "savingsPercent") {
                            return (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-zinc-500">
                                  Savings Rate:
                                </span>
                                <span className="font-bold text-[#/* 16 */A34A]">
                                  {value}%
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-zinc-500">Latency:</span>
                              <span className="font-bold text-[#EF4444]">
                                {value}s
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="savingsPercent"
                    stroke="#/* 16 */A34A"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      fill: "#/* 16 */A34A",
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                    }}
                    activeDot={{ r: 7 }}
                    name="savingsPercent"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="timeSeconds"
                    stroke="#EF4444"
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    dot={{
                      r: 5,
                      fill: "#EF4444",
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                    }}
                    activeDot={{ r: 7 }}
                    name="timeSeconds"
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>

          <div className="p-4 px-6 sm:px-8 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600 font-mono rounded-none">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#/* 16 */A34A]" />
                Money Saved (% discount against market retail)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                Search Time (Seconds elapsed to final checkout link)
              </span>
            </div>
            <span>Manual Browser Hunting &rarr; Autonomous Agent Shopping</span>
          </div>
        </div>
      </div>
    </section>
  );
}
