"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  ExternalLink,
  Sparkles,
  Users,
  Mic,
  Palette,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BrandKitData, ProductData } from "../AgentChatWorkspace";

export interface BrandCodexCardProps {
  brandKit: BrandKitData;
  products?: ProductData[];
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  onConfirmAndDevelopConcepts: (productId?: string) => void;
  isProcessing: boolean;
}

type PillarTab = "identity" | "audience" | "voice" | "visual" | "all";

export function BrandCodexCard({
  brandKit,
  products = [],
  selectedProductId,
  onSelectProduct,
  onConfirmAndDevelopConcepts,
  isProcessing,
}: BrandCodexCardProps) {
  const [activeTab, setActiveTab] = useState<PillarTab>("all");
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const brandName = brandKit.brand_name || "Brand";
  const logoUrl = brandKit.logo_url;
  const headerSubtitle =
    brandKit.core_value_proposition ||
    brandKit.value_proposition ||
    brandKit.brand_description ||
    brandKit.website_description;

  const brandDesc = brandKit.brand_description || brandKit.website_description;
  const coreVal = brandKit.core_value_proposition || brandKit.value_proposition;
  const diffs = brandKit.positioning_and_differentiators?.filter(Boolean) || [];

  const segments = (
    brandKit.primary_customer_segments?.length
      ? brandKit.primary_customer_segments
      : brandKit.target_audience
      ? [brandKit.target_audience]
      : []
  ).filter(Boolean);
  const custMotivations = brandKit.customer_motivations?.filter(Boolean) || [];
  const purchMotivations = brandKit.likely_purchasing_motivations?.filter(Boolean) || [];

  const tone = brandKit.tone_of_voice || brandKit.brand_voice;
  const themes = brandKit.common_messaging_themes?.filter(Boolean) || [];
  const examples = brandKit.example_messaging?.filter(Boolean) || [];

  const colors = brandKit.brand_colors?.filter((c) => Boolean(c.hex)) || [];
  const photoStyle = brandKit.photography_style;
  const aesthetic = brandKit.visual_aesthetic;

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const displayedProducts = showAllProducts ? products : products.slice(0, 6);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-5 sm:p-6 shadow-sm space-y-6">
      {/* 1. Header: Brand Logo, Name, Quick Palette & Full Dossier Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          {logoUrl ? (
            <div className="h-12 w-12 relative rounded-xl border border-slate-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800 p-1 shrink-0 shadow-2xs">
              <Image src={logoUrl} alt="Logo" fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-slate-950 dark:text-white truncate">
                {brandName} Brand Profile
              </h3>
              <Badge variant="success" className="text-[10px] shrink-0 font-medium">
                Catalog Verified
              </Badge>
            </div>
            {headerSubtitle && (
              <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5 line-clamp-1 max-w-2xl">
                {headerSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Color dots preview & Read More / Full Dossier button */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 flex-wrap">
          {colors.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Palette:</span>
              {colors.slice(0, 5).map((col, idx) => (
                <span
                  key={idx}
                  className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: col.hex }}
                  title={`${col.hex} (click to copy)`}
                  onClick={() => handleCopyHex(col.hex)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDossierModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-700 transition-all cursor-pointer shadow-2xs"
            title="Open comprehensive brand dossier in modal"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-neutral-300" />
            <span>Read Full Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. Horizontal Navigation Tabs for the 4 Pillars */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-neutral-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === "all"
              ? "bg-white dark:bg-neutral-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>All 4 Pillars</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === "identity"
              ? "bg-white dark:bg-neutral-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>1. Brand Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audience")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === "audience"
              ? "bg-white dark:bg-neutral-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-500" />
          <span>2. Target Audience (Inferred)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("voice")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === "voice"
              ? "bg-white dark:bg-neutral-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-violet-500" />
          <span>3. Voice & Messaging</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("visual")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === "visual"
              ? "bg-white dark:bg-neutral-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-500" />
          <span>4. Visual Palette</span>
        </button>
      </div>

      {/* 3. Pillar Content View */}
      <div className="space-y-4">
        {/* VIEW A: ALL 4 PILLARS IN RESPONSIVE GRID */}
        {activeTab === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Identity */}
            <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>1. Brand Identity</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("identity")}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Expand →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {brandDesc && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px]">
                      Description
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 leading-relaxed text-xs mt-0.5 line-clamp-3">
                      {brandDesc}
                    </p>
                  </div>
                )}
                {coreVal && (
                  <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                    <span className="font-semibold text-blue-700 dark:text-blue-300 block text-[10.5px]">
                      Core Value Proposition
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 leading-relaxed text-xs mt-0.5">
                      {coreVal}
                    </p>
                  </div>
                )}
                {diffs.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px] mb-1">
                      Key Differentiators ({diffs.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {diffs.slice(0, 3).map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px]"
                        >
                          {d}
                        </span>
                      ))}
                      {diffs.length > 3 && (
                        <span
                          onClick={() => setActiveTab("identity")}
                          className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 text-[11px] cursor-pointer hover:bg-slate-300"
                        >
                          +{diffs.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Target Audience */}
            <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>2. Target Audience (Inferred)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("audience")}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Expand →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {segments.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px] mb-1">
                      Target Customer Segments
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {segments.slice(0, 4).map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                      {segments.length > 4 && (
                        <span
                          onClick={() => setActiveTab("audience")}
                          className="px-2 py-1 rounded-full bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[10.5px] cursor-pointer hover:bg-slate-300 font-semibold"
                        >
                          +{segments.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {custMotivations.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px] mb-1">
                      Customer Motivations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {custMotivations.slice(0, 3).map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px]"
                        >
                          {m}
                        </span>
                      ))}
                      {custMotivations.length > 3 && (
                        <span
                          onClick={() => setActiveTab("audience")}
                          className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 text-[11px] cursor-pointer"
                        >
                          +{custMotivations.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Voice & Messaging */}
            <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span>3. Brand Voice & Messaging</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("voice")}
                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Expand →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {tone && (
                  <div className="p-2.5 rounded-lg bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
                    <span className="font-semibold text-violet-700 dark:text-violet-300 block text-[10.5px]">
                      Tone of Voice
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 font-medium text-xs mt-0.5">
                      {tone}
                    </p>
                  </div>
                )}

                {themes.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px] mb-1">
                      Core Messaging Themes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {themes.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Visual Identity */}
            <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>4. Visual Identity</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Expand →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {colors.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px] mb-1.5">
                      Brand Palette (Click to Copy Hex)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((col, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCopyHex(col.hex)}
                          className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-[11px] cursor-pointer transition-all shadow-2xs active:scale-95"
                          title="Click to copy hex"
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span className="font-mono text-slate-800 dark:text-neutral-200">
                            {col.hex}
                          </span>
                          {copiedHex === col.hex ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {photoStyle && (
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-[11px]">
                      Photography Style
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 leading-relaxed text-xs mt-0.5 line-clamp-2">
                      {photoStyle}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: PILLAR 1 EXPANDED (Brand Identity) */}
        {activeTab === "identity" && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>1. Complete Brand Identity</span>
            </div>

            <div className="space-y-4">
              {brandDesc && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Storefront Description
                  </span>
                  <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
                    {brandDesc}
                  </p>
                </div>
              )}

              {coreVal && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                    Core Value Proposition
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white font-medium leading-relaxed">
                    {coreVal}
                  </p>
                </div>
              )}

              {diffs.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Positioning & Market Differentiators
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {diffs.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 text-xs text-slate-800 dark:text-neutral-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW C: PILLAR 2 EXPANDED (Target Audience Inferred) */}
        {activeTab === "audience" && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>2. Inferred Target Audience & Buyer Personas</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                Strategic Inferences
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Customer Segments */}
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Customer Segments
                </span>
                <div className="space-y-1.5">
                  {segments.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 font-medium"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Customer Motivations */}
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                  Customer Motivations
                </span>
                <div className="space-y-1.5">
                  {custMotivations.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-200 font-medium"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: Purchasing Drivers */}
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider block">
                  Purchasing Drivers
                </span>
                <div className="space-y-1.5">
                  {purchMotivations.map((pm, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800 text-xs text-violet-950 dark:text-violet-200 font-medium"
                    >
                      {pm}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW D: PILLAR 3 EXPANDED (Voice & Messaging) */}
        {activeTab === "voice" && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span>3. Brand Voice & Messaging Architecture</span>
            </div>

            <div className="space-y-4">
              {tone && (
                <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800">
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider block mb-1">
                    Editorial Tone of Voice
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white font-medium leading-relaxed">
                    {tone}
                  </p>
                </div>
              )}

              {themes.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Core Messaging Themes
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {themes.map((t, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {examples.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Authentic Storefront Copy Quotes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 text-xs text-slate-700 dark:text-neutral-300 italic leading-relaxed"
                      >
                        “{ex}”
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW E: PILLAR 4 EXPANDED (Visual Identity) */}
        {activeTab === "visual" && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 p-5 space-y-5">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>4. Complete Visual Palette & Aesthetic</span>
            </div>

            {/* Colors */}
            {colors.length > 0 && (
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Verified Storefront Color Swatches (Click to Copy)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {colors.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCopyHex(col.hex)}
                      className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-500 transition-all cursor-pointer group active:scale-95 shadow-2xs"
                    >
                      <div
                        className="h-10 w-full rounded-lg border border-black/15 shadow-inner mb-2"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {col.hex}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition-colors mt-0.5">
                        {copiedHex === col.hex ? "✓ Copied" : "Copy Hex"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photoStyle && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Photography Style
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
                    {photoStyle}
                  </p>
                </div>
              )}

              {aesthetic && (
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Visual Aesthetic
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
                    {aesthetic}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Discovered Products SKU Grid (Spreads comfortably on wide screens) */}
      <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Discovered Catalog Products ({products.length})
            </span>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Select an authentic SKU to condition portrait ad generation:
            </p>
          </div>

          {products.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:text-slate-950 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 cursor-pointer transition-colors"
            >
              <span>{showAllProducts ? "Show Top 6" : `Show All (${products.length})`}</span>
              {showAllProducts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Responsive Grid that spreads widely on large monitors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayedProducts.map((prod) => {
            const isSelected = selectedProductId === prod.id;
            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod.id)}
                className={`cursor-pointer rounded-xl border p-2.5 transition-all flex flex-col justify-between group ${
                  isSelected
                    ? "border-slate-950 dark:border-white bg-slate-50 dark:bg-neutral-800/90 ring-2 ring-slate-950 dark:ring-white shadow-sm"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-400 dark:hover:border-neutral-600 shadow-2xs"
                }`}
              >
                <div className="aspect-square w-full relative rounded-lg overflow-hidden bg-slate-100 dark:bg-neutral-800 mb-2">
                  {prod.main_image_url ? (
                    <Image
                      src={prod.main_image_url}
                      alt={prod.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                      No image
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-full p-1 shadow-md">
                      <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-950 dark:text-white line-clamp-2 leading-tight">
                    {prod.title}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {prod.price_formatted || (prod.price ? `$${prod.price}` : "Authentic SKU")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Bottom Action Checkpoint */}
      <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-neutral-400 text-center sm:text-left">
          {selectedProductId ? "Product selected. Proceed to concept formulation." : "Click a product above to select."}
        </span>
        <Button
          onClick={() => onConfirmAndDevelopConcepts(selectedProductId || undefined)}
          disabled={isProcessing}
          className="w-full sm:w-auto bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 font-bold text-xs sm:text-sm gap-2 px-6 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all active:scale-[0.98]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>Confirm & Develop Concepts</span>
        </Button>
      </div>

      {/* 6. POPUP MODAL: Comprehensive Brand Intelligence Dossier */}
      {isDossierModalOpen && (
        <div
          onClick={() => setIsDossierModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-neutral-800"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="h-10 w-10 relative rounded-xl border border-slate-200 dark:border-neutral-700 overflow-hidden bg-white p-1">
                    <Image src={logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-950 dark:text-white">
                    {brandName} — Complete Brand Intelligence Dossier
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Comprehensive research findings and strategic brand directives
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDossierModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Mission / Value Prop */}
              {coreVal && (
                <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                    Core Value Proposition
                  </span>
                  <p className="text-base text-slate-950 dark:text-white font-medium leading-relaxed">
                    {coreVal}
                  </p>
                </div>
              )}

              {/* Description */}
              {brandDesc && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Brand Description
                  </span>
                  <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
                    {brandDesc}
                  </p>
                </div>
              )}

              {/* Differentiators */}
              {diffs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Positioning & Key Differentiators
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {diffs.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-xs text-slate-800 dark:text-neutral-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audience Segments & Motivations */}
              {(segments.length > 0 || custMotivations.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Target Audience Inferences & Personas
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {segments.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-2">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                          Customer Segments
                        </span>
                        <div className="space-y-1.5">
                          {segments.map((s, i) => (
                            <div key={i} className="text-xs text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {custMotivations.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-2">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">
                          Customer Motivations
                        </span>
                        <div className="space-y-1.5">
                          {custMotivations.map((m, i) => (
                            <div key={i} className="text-xs text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Color Palette */}
              {colors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Verified Color Palette
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {colors.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleCopyHex(c.hex)}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex flex-col items-center cursor-pointer hover:border-slate-400 transition-colors shadow-2xs"
                      >
                        <div className="h-8 w-full rounded-md border border-black/10 mb-1.5" style={{ backgroundColor: c.hex }} />
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{c.hex}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{copiedHex === c.hex ? "✓ Copied" : "Copy"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsDossierModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
