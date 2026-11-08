"use client";

import React from "react";
import { ArrowRight, Trash2 } from "lucide-react";

export interface SavedBrandItem {
  id: string;
  name: string;
  website_url: string;
  product_count?: number;
  campaign_count?: number;
  creative_count?: number;
}

export interface WelcomeBrandCardsProps {
  savedBrands: SavedBrandItem[];
  onSelectBrand: (brandId: string) => void;
  onDeleteBrand: (brandId: string, e: React.MouseEvent) => void;
}

export function WelcomeBrandCards({
  savedBrands,
  onSelectBrand,
  onDeleteBrand,
}: WelcomeBrandCardsProps) {
  if (savedBrands.length === 0) {
    return (
      <div className="pt-2 text-xs text-slate-400 dark:text-neutral-500">
        No saved brands yet. Enter your storefront URL below to begin.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4 space-y-2.5 text-left">
      <div className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider px-1">
        Saved Brands
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {savedBrands.map((brand) => (
          <div
            key={brand.id}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-neutral-700 transition-all"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                {brand.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-mono">
                {brand.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                {brand.product_count ? ` • ${brand.product_count} SKUs` : ""}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={() => onSelectBrand(brand.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Resume</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => onDeleteBrand(brand.id, e)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Delete brand"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
