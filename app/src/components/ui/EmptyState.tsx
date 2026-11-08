"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  secondaryActionText?: string;
  secondaryActionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  badge,
  title,
  description,
  actionText,
  actionHref,
  onActionClick,
  secondaryActionText,
  secondaryActionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-xs",
        className
      )}
    >
      {badge && (
        <span className="mb-4 inline-block text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
          {badge}
        </span>
      )}
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-slate-950">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
          {actionText && actionHref && (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              {actionText}
            </Link>
          )}

          {actionText && !actionHref && onActionClick && (
            <button
              onClick={onActionClick}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              {actionText}
            </button>
          )}

          {secondaryActionText && secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50 transition-colors"
            >
              {secondaryActionText}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
