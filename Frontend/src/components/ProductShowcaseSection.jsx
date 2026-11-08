"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

// Register GSAP ScrollTrigger plugin safely in browser
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Shopping Evolution: Quick-Own Shopping vs Manual Shopping benchmark
const SHOWCASE_TITLE = "Speed & Savings Rate";
const SHOWCASE_DESCRIPTION =
  "Quick-Own autonomous agent vs. manual multi-tab shopping across catalog depth and checkout.";

const SHOPPING_EVOLUTION_DATA = [
  {
    stage: "Today",
    quickOwn: 1.5,
    manual: 4.5,
    quickOwnTime: "1.7s",
    manualTime: "18.5m",
  },
  {
    stage: "Price Portal Search",
    quickOwn: 10,
    manual: 7,
    quickOwnTime: "1.7s",
    manualTime: "4.8m",
  },
  {
    stage: "Browser Extensions",
    quickOwn: 14,
    manual: 6,
    quickOwnTime: "1.7s",
    manualTime: "2.0m",
  },
  {
    stage: "Future",
    quickOwn: 32,
    manual: 4,
    quickOwnTime: "1.7s",
    manualTime: "18.5m",
  },
];

const QUICK_OWN_COLOR = "#0091FF"; // Bright electric blue
const MANUAL_COLOR = "#FF4D4D"; // Bright vivid coral red

const evolutionChartConfig = {
  quickOwn: {
    label: "Quick-Own Shopping",
    color: QUICK_OWN_COLOR,
  },
  manual: {
    label: "Manual Shopping",
    color: MANUAL_COLOR,
  },
};

export default function ProductShowcaseSection() {
  const [isChartInView, setIsChartInView] = useState(false);
  const chartSectionRef = useRef(null);

  useEffect(() => {
    // GSAP Context ensures reliable cleanup on React remounts
    const ctx = gsap.context(() => {
      // 1. ScrollTrigger to mount and animate chart once when it enters viewport
      ScrollTrigger.create({
        trigger: ".chart-box",
        start: "top 85%",
        once: true,
        onEnter: () => {
          setIsChartInView(true);
        },
      });

      // 2. Text Reveal Animation for Section Header Title & Contents
      const textRevealTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".showcase-header",
          start: "top 85%",
          once: true,
        },
      });

      textRevealTl
        .from(".showcase-title-word", {
          y: "130%",
          opacity: 0,
          rotateZ: 3,
          duration: 0.85,
          stagger: 0.08,
          ease: "power4.out",
        })
        .from(
          ".showcase-content-word",
          {
            y: "120%",
            opacity: 0,
            duration: 0.55,
            stagger: 0.02,
            ease: "power3.out",
          },
          "-=0.55",
        );

      // 3. Animate 4 Metric Tiles with smooth stagger and counting at 30% into viewport
      gsap.from(".metric-tile", {
        scrollTrigger: {
          trigger: ".metrics-strip",
          start: "top 70%", // Triggers when 30% into viewport from bottom
          once: true,
        },
        y: 24,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
      });

      const counters = {
        savings: 10.6,
        searchTime: 15.9,
        catalog: 70,
        security: 60,
      };

      const savingsEl = chartSectionRef.current?.querySelector(".stat-savings");
      const searchTimeEl =
        chartSectionRef.current?.querySelector(".stat-search-time");
      const catalogEl = chartSectionRef.current?.querySelector(".stat-catalog");
      const securityEl =
        chartSectionRef.current?.querySelector(".stat-security");

      const statsTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: ".metrics-strip",
          start: "top 90%", // Triggers when 30% into viewport from bottom
          once: true,
        },
      });

      statsTimeline.to(
        counters,
        {
          savings: 24.0,
          duration: 2.2,
          ease: "circ.out",
          onUpdate: () => {
            if (savingsEl)
              savingsEl.textContent = `${counters.savings.toFixed(1)}%`;
          },
        },
        0.1,
      );

      // Countdown in descending order: 15.9s -> 1.7s with ease-out
      statsTimeline.to(
        counters,
        {
          searchTime: 1.7,
          duration: 2.2,
          ease: "circ.out",
          onUpdate: () => {
            if (searchTimeEl)
              searchTimeEl.textContent = `${counters.searchTime.toFixed(1)}s`;
          },
        },
        0.1,
      );

      statsTimeline.to(
        counters,
        {
          catalog: 100,
          duration: 2.4,
          ease: "circ.out",
          onUpdate: () => {
            if (catalogEl)
              catalogEl.textContent = `${Math.round(counters.catalog)}M+`;
          },
        },
        0.1,
      );

      statsTimeline.to(
        counters,
        {
          security: 100,
          duration: 2.2,
          ease: "circ.out",
          onUpdate: () => {
            if (securityEl)
              securityEl.textContent = `${Math.round(counters.security)}%`;
          },
        },
        0.1,
      );

      // 4. Animate the Chart Container box
      gsap.from(".chart-box", {
        scrollTrigger: {
          trigger: ".chart-box",
          start: "top 85%",
          once: true,
        },
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: "circ.out",
      });
    }, chartSectionRef);

    return () => ctx.revert();
  }, []);

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
          {/* Header */}
          <div className="p-6 sm:p-8 pb-6 border-b border-zinc-200">
            <div className="showcase-header max-w-3xl">
              <h3
                className="font-cal font-bold text-3xl sm:text-4xl text-zinc-950 tracking-tight leading-[1.15]"
                aria-label={SHOWCASE_TITLE}
              >
                <span aria-hidden="true" className="inline-block">
                  {SHOWCASE_TITLE.split(" ").map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-block overflow-hidden mr-[0.28em] py-0.5 align-bottom"
                    >
                      <span className="showcase-title-word inline-block will-change-transform">
                        {word}
                      </span>
                    </span>
                  ))}
                </span>
              </h3>
              <p
                className="mt-3 text-base sm:text-lg text-zinc-600 leading-relaxed"
                aria-label={SHOWCASE_DESCRIPTION}
              >
                <span aria-hidden="true" className="inline-block">
                  {SHOWCASE_DESCRIPTION.split(" ").map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-block overflow-hidden mr-[0.25em] align-baseline"
                    >
                      <span className="showcase-content-word inline-block will-change-transform">
                        {word}
                      </span>
                    </span>
                  ))}
                </span>
              </p>
            </div>
          </div>

          {/* Metric Highlights Strip - Merged edge-to-edge with side lines, razor sharp table layout */}
          <div className="metrics-strip w-full grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 border-x-0 divide-x divide-y sm:divide-y-0 divide-zinc-200 rounded-none bg-white">
            <div className="metric-tile p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Average Savings
              </span>
              <span className="stat-savings font-cal font-bold text-2xl sm:text-5xl text-[#10b981] block mt-1 tabular-nums">
                10.6%
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                $72.60 saved per item
              </span>
            </div>
            <div className="metric-tile p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Agent Search Time
              </span>
              <span className="stat-search-time font-cal font-bold text-2xl sm:text-5xl text-[#111827] block mt-1 tabular-nums">
                15.9s
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Down from 18.5 minutes
              </span>
            </div>
            <div className="metric-tile p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Catalog Volume
              </span>
              <span className="stat-catalog font-cal font-bold text-2xl sm:text-5xl text-[#111827] block mt-1 tabular-nums">
                70M+
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Live products indexed
              </span>
            </div>
            <div className="metric-tile p-5 sm:p-6 rounded-none bg-white hover:bg-zinc-50/50 transition-colors">
              <span className="text-sm font-mono text-zinc-500 uppercase tracking-wider block">
                Checkout Security
              </span>
              <span className="stat-security font-cal font-bold text-2xl sm:text-5xl text-[#6366f1] block mt-1 tabular-nums">
                60%
              </span>
              <span className="text-sm text-zinc-600 block mt-0.5">
                Cryptographic price lock
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Shadcn Line Chart Container */}
            <div className="chart-box w-full h-[380px] sm:h-[420px]">
              {isChartInView && (
                <ChartContainer
                  config={evolutionChartConfig}
                  className="h-[380px] sm:h-[420px] w-full"
                >
                  <LineChart
                    data={SHOPPING_EVOLUTION_DATA}
                    margin={{ top: 20, right: 24, left: 24, bottom: 10 }}
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
                    padding={{ left: 24, right: 24 }}
                  />
                  <YAxis hide={true} domain={[0, 35]} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const isQuickOwn =
                            name === "quickOwn" ||
                            name === "Quick-Own Shopping";
                          const color = isQuickOwn
                            ? QUICK_OWN_COLOR
                            : MANUAL_COLOR;
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
                  {/* Quick-Own Shopping - Bright Blue Line */}
                  <Line
                    type="monotone"
                    dataKey="quickOwn"
                    stroke={QUICK_OWN_COLOR}
                    strokeWidth={9}
                    name="Quick-Own Shopping"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={2500}
                    animationEasing="ease-out"
                  />
                  {/* Manual Shopping - Bright Red Line */}
                  <Line
                    type="monotone"
                    dataKey="manual"
                    stroke={MANUAL_COLOR}
                    strokeWidth={9}
                    name="Manual Shopping"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={3000}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ChartContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
