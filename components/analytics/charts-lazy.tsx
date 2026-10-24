"use client";

import dynamic from "next/dynamic";

// The charting library is the largest single dependency. Loading it after the
// page shell keeps Analytics (and every other page) quick to appear on a phone.
// (next/dynamic needs its options written inline, as an object literal.)
function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-surface-sunken" aria-hidden />;
}

export const ScoreTrendChart = dynamic(() => import("./charts").then((m) => m.ScoreTrendChart), { ssr: false, loading: ChartSkeleton });
export const AreaPerformanceChart = dynamic(() => import("./charts").then((m) => m.AreaPerformanceChart), { ssr: false, loading: ChartSkeleton });
export const FindingsBySeverityChart = dynamic(() => import("./charts").then((m) => m.FindingsBySeverityChart), { ssr: false, loading: ChartSkeleton });
export const CorrectiveActionAgingChart = dynamic(() => import("./charts").then((m) => m.CorrectiveActionAgingChart), { ssr: false, loading: ChartSkeleton });
