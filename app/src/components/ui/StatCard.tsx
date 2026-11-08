"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  accentColor?: "indigo" | "emerald" | "amber" | "rose" | "purple";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  changeType = "neutral",
  accentColor = "indigo",
}: StatCardProps) {
  const accentStyles = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const changeStyles = {
    positive: "text-emerald-400 bg-emerald-500/10",
    negative: "text-rose-400 bg-rose-500/10",
    neutral: "text-gray-400 bg-gray-500/10",
  };

  return (
    <div className="rounded-xl border border-[#1f2430] bg-[#11131a] p-5 shadow-sm transition-all hover:border-[#2a3142]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${accentStyles[accentColor]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {change && (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${changeStyles[changeType]}`}>
            {change}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}
