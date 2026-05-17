"use client";

import { ArrowUpRight, Check } from "lucide-react";
import type { SessionMetrics, SummaryBullet } from "@/lib/feedback-summary";

interface SessionSummaryProps {
  metrics: SessionMetrics;
  strengths: SummaryBullet[];
  improvements: SummaryBullet[];
}

function BulletList({
  items,
  icon: Icon,
  iconClass,
  emptyMessage,
}: {
  items: SummaryBullet[];
  icon: typeof Check;
  iconClass: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-relaxed text-gray-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={`${item.judge ?? "panel"}-${item.text}`}
          className="flex items-start gap-3 text-sm leading-relaxed text-gray-300"
        >
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
          <span>
            {item.judge ? (
              <span className="font-medium text-gray-400">{item.judge}: </span>
            ) : null}
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SessionSummary({
  metrics,
  strengths,
  improvements,
}: SessionSummaryProps) {
  const overall = metrics.overall ?? 7;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, overall / 10));
  const offset = circumference * (1 - progress);

  const badges: { label: string; color: string }[] = [];

  if (metrics.confidence !== null) {
    badges.push({
      label: `Confidence ${metrics.confidence}/10`,
      color: "border-amber-500/50 text-amber-200 bg-amber-500/10",
    });
  }
  if (metrics.clarity !== null) {
    badges.push({
      label: `Clarity ${metrics.clarity}/10`,
      color: "border-teal-500/50 text-teal-300 bg-teal-500/10",
    });
  }
  if (metrics.structure !== null) {
    badges.push({
      label: `Structure ${metrics.structure}/10`,
      color: "border-orange-500/50 text-orange-300 bg-orange-500/10",
    });
  }
  badges.push({
    label: `Filler Words: ${metrics.fillerWordCount}`,
    color: "border-red-500/50 text-red-300 bg-red-500/10",
  });

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#16161e] p-6 sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col items-center">
          <div className="relative h-32 w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#27272a"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {overall.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">/10</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-400">Overall Score</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {badges.map(({ label, color }) => (
            <span
              key={label}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${color}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="mb-4 font-semibold text-white">Strengths</h3>
          <BulletList
            items={strengths}
            icon={Check}
            iconClass="text-green-400"
            emptyMessage="No clear strengths stood out this round — tap each judge below to hear what they noticed."
          />
        </div>
        <div>
          <h3 className="mb-4 font-semibold text-white">Improvements</h3>
          <BulletList
            items={improvements}
            icon={ArrowUpRight}
            iconClass="text-orange-400"
            emptyMessage="Listen to the panel below for tailored tips on your next take."
          />
        </div>
      </div>
    </div>
  );
}
