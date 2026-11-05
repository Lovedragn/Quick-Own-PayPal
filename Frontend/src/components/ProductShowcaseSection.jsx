"use client";

import { useState, useRef, useEffect } from "react";
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

// Shopping Evolution: Quick-Own Shopping vs Manual Shopping benchmark
const SHOPPING_EVOLUTION_DATA = [
  {
    stage: "Today",
    quickOwn: 1.5,
    manual: 4.5,
    quickOwnTime: "1.2s",
    manualTime: "18.5m",
  },
  {
    stage: "Price Portal Search",
    quickOwn: 10,
    manual: 7,
    quickOwnTime: "1.2s",
    manualTime: "4.8m",
  },
  {
    stage: "Browser Extensions",
    quickOwn: 14,
    manual: 6,
    quickOwnTime: "1.2s",
    manualTime: "2.0m",
  },
  {
    stage: "Quick-Own Agent",
    quickOwn: 32,
    manual: 4,
    quickOwnTime: "1.2s",
    manualTime: "18.5m",
  },
];

const evolutionChartConfig = {
  quickOwn: {
    label: "Quick-Own Shopping",
    color: "#0070BA",
  },
  manual: {
    label: "Manual Shopping",
    color: "#EF4444",
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
  const [chartKey, setChartKey] = useState(0);
  const chartSectionRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const target = chartSectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setChartKey((prev) => prev + 1);
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section
      id="product-features"
      className="relative w-full bg-white border-b border-zinc-200 pt-8 sm:pt-10"
      aria-label="Product Features and Benchmarks"
    >
      {/* Section: Savings & Speed Benchmark Line Chart - Merged with side vertical borders, razor sharp */}
      <div
        id="savings-speed"
        ref={chartSectionRef}
        className="w-full scroll-mt-20"
      >
        <div className="w-full bg-white border-y border-zinc-200 border-x-0 rounded-none shadow-none overflow-hidden">
          <div className="p-6 sm:p-8 pb-6 border-b border-zinc-200">
            <div className="max-w-3xl">
              <h3 className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]">
                Speed & Savings Rate
              </h3>
              <p className="mt-3 text-base sm:text-lg text-zinc-600 leading-relaxed">
                Quick-Own autonomous agent vs. manual multi-tab shopping across
                catalog depth and checkout.
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
            <div className="w-full h-[380px] sm:h-[420px]">
              <ChartContainer
                config={evolutionChartConfig}
                className="h-[380px] sm:h-[420px] w-full"
              >
                <LineChart
                  key={chartKey}
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
                    interval={0}
                    tick={{ fill: "#475569", fontSize: 13, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748B", fontSize: 13 }}
                    unit="%"
                    domain={[0, 35]}
                    ticks={[0, 7, 14, 21, 28, 35]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const isQuickOwn =
                            name === "quickOwn" ||
                            name === "Quick-Own Shopping";
                          const color = isQuickOwn ? "#0070BA" : "#EF4444";
                          const label = isQuickOwn
                            ? "Quick-Own Shopping"
                            : "Manual Shopping";
                          const time = isQuickOwn
                            ? item?.payload?.quickOwnTime
                            : item?.payload?.manualTime;

                          return (
                            <div className="flex items-center justify-between gap-6 py-1 w-full min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-medium text-zinc-800 text-xs">
                                  {label}
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className="font-bold text-sm block"
                                  style={{ color }}
                                >
                                  {value}% saved
                                </span>
                                {time && (
                                  <span className="text-[11px] text-zinc-400 font-mono block">
                                    {time} avg
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  {/* Quick-Own Shopping - Blue Line */}
                  <Line
                    type="monotone"
                    dataKey="quickOwn"
                    stroke="#0070BA"
                    strokeWidth={3.5}
                    dot={{
                      r: 5,
                      fill: "#0070BA",
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                    }}
                    activeDot={{ r: 7, fill: "#0070BA" }}
                    name="Quick-Own Shopping"
                    isAnimationActive={true}
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                  {/* Manual Shopping - Red Curved Line */}
                  <Line
                    type="monotone"
                    dataKey="manual"
                    stroke="#EF4444"
                    strokeWidth={3.5}
                    dot={{
                      r: 5,
                      fill: "#EF4444",
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                    }}
                    activeDot={{ r: 7, fill: "#EF4444" }}
                    name="Manual Shopping"
                    isAnimationActive={true}
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
