"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  History,
  Maximize2,
  Download,
  ThumbsUp,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Sparkles,
  Columns2,
  Square,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdCreativeRecord } from "../AgentChatWorkspace";

export interface CreativeInspectionCardProps {
  creative: AdCreativeRecord;
  allCreatives?: AdCreativeRecord[];
  onSelectCreative?: (creative: AdCreativeRecord) => void;
  initialVersionNumber?: number;
  onApproveCreative: (creativeId: string, versionNum: number) => void;
  onIterateCreative: (feedback: string, creativeId?: string) => void;
  onOpenCompareModal: () => void;
  onOpenPreviewModal: (url: string) => void;
  isProcessing: boolean;
}

export function CreativeInspectionCard({
  creative,
  allCreatives,
  onSelectCreative,
  initialVersionNumber,
  onApproveCreative,
  onIterateCreative,
  onOpenCompareModal,
  onOpenPreviewModal,
  isProcessing,
}: CreativeInspectionCardProps) {
  const versions = creative.versions || [];
  const latestVersionNum = versions.length > 0 ? versions[versions.length - 1].version_number : 1;

  // Preserve the specific version for this chat card if initialVersionNumber was passed
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(
    initialVersionNumber || latestVersionNum
  );
  const [viewMode, setViewMode] = useState<"single" | "split">("single");
  const [inlineFeedback, setInlineFeedback] = useState("");

  const currentVersion =
    versions.find((v) => v.version_number === selectedVersionNum) ||
    versions[versions.length - 1];

  const displayImageUrl = currentVersion?.asset_url || creative.asset_url;
  const currentReview =
    ((currentVersion?.metadata as Record<string, unknown>)?.review as AdCreativeRecord["review"]) ||
    creative.review;

  const isVersionApproved = currentVersion?.approval_status === "approved";

  const handleRevise = () => {
    if (!inlineFeedback.trim()) return;
    onIterateCreative(inlineFeedback.trim(), creative.id);
    setInlineFeedback("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-5 sm:p-6 shadow-sm space-y-6">
      {/* 0. Multi-Concept Switcher (shown when multiple concepts exist) */}
      {allCreatives && allCreatives.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-100 dark:border-neutral-800">
          <span className="text-xs font-bold text-slate-500 dark:text-neutral-400 shrink-0">
            Generated Ads ({allCreatives.length}):
          </span>
          {allCreatives.map((c, idx) => {
            const isCurrent = c.id === creative.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCreative?.(c)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300"
                }`}
              >
                <span>Concept {idx + 1}</span>
                {c.headline && (
                  <span className="opacity-70 text-[10px] font-normal truncate max-w-[130px]">
                    &ldquo;{c.headline}&rdquo;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 1. Header with Title & Overall Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-slate-950 dark:text-white">
              {creative.title}
            </h3>
            {isVersionApproved ? (
              <Badge variant="success" className="text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>v{selectedVersionNum} Approved</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                v{selectedVersionNum} In Review
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Direct Creative Synthesis • 9:16 Portrait Ad
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Badge variant="success" className="text-[10px]">
            9:16 Portrait
          </Badge>

          {/* Quick Single vs Side-by-Side View Toggle */}
          {versions.length > 1 && (
            <div className="flex items-center bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-slate-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "single"
                    ? "bg-white dark:bg-neutral-900 text-slate-950 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white"
                }`}
                title="Single View"
              >
                <Square className="w-3 h-3" />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "split"
                    ? "bg-white dark:bg-neutral-900 text-slate-950 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white"
                }`}
                title="Side-by-Side Comparison"
              >
                <Columns2 className="w-3 h-3" />
                <span>Side-by-Side</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Prominent Version Navigation Bar with Compare Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-3.5 bg-slate-50 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
            Version:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {versions.length > 0 ? (
              versions.map((ver) => {
                const isSelected = ver.version_number === selectedVersionNum;
                const isApproved = ver.approval_status === "approved";
                const isLatest = ver.version_number === versions[versions.length - 1].version_number;

                return (
                  <button
                    key={ver.version_number}
                    onClick={() => {
                      setSelectedVersionNum(ver.version_number);
                      setViewMode("single");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs ring-2 ring-slate-950/20 dark:ring-white/20"
                        : "bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700"
                    }`}
                  >
                    <span>v{ver.version_number}</span>
                    {ver.version_number === 1 && !isLatest && (
                      <span className="text-[9px] opacity-75 font-normal">Initial</span>
                    )}
                    {isLatest && (
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500 text-white font-extrabold">
                        Latest
                      </span>
                    )}
                    {isApproved && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <span className="px-3 py-1 rounded-lg bg-slate-950 text-white text-xs font-bold">
                v1 (Initial)
              </span>
            )}
          </div>
        </div>

        {/* High-Visibility Compare Action Button */}
        {versions.length > 1 && (
          <button
            type="button"
            onClick={onOpenCompareModal}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ml-auto"
          >
            <History className="w-3.5 h-3.5" />
            <span>Compare v1 vs v{versions.length}</span>
            <span className="bg-emerald-800/80 text-[10px] px-1.5 py-0.5 rounded font-mono">
              Fullscreen
            </span>
          </button>
        )}
      </div>

      {/* 3A. SPLIT / SIDE-BY-SIDE VIEW (Direct comparison within card) */}
      {viewMode === "split" && versions.length > 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {versions.map((ver) => {
              const isApproved = ver.approval_status === "approved";
              return (
                <div
                  key={ver.version_number}
                  className="rounded-xl border border-slate-200 dark:border-neutral-800 p-4 bg-slate-50/50 dark:bg-neutral-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Version {ver.version_number} {ver.version_number === 1 ? "(Initial)" : "(Revision)"}
                    </span>
                    <Badge
                      variant={isApproved ? "success" : "outline"}
                      className="text-[10px]"
                    >
                      {isApproved ? "Approved" : "In Review"}
                    </Badge>
                  </div>

                  <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden border border-slate-300 dark:border-neutral-700 bg-slate-950 group">
                    <Image
                      src={ver.asset_url}
                      alt={`Version ${ver.version_number}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => onOpenPreviewModal(ver.asset_url)}
                      className="absolute bottom-2 right-2 p-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer shadow-md"
                      title="Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {ver.revised_instructions && (
                    <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] text-slate-700 dark:text-neutral-300">
                      <span className="font-semibold block text-[10px] text-slate-500 dark:text-neutral-400">
                        Feedback Applied:
                      </span>
                      &ldquo;{ver.revised_instructions}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={ver.asset_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`ad_${creative.id}_v${ver.version_number}.png`}
                      className="flex-1 text-center py-2 px-3 rounded-lg bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-800 dark:text-white transition-colors"
                    >
                      Download
                    </a>
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => creative.id && onApproveCreative(creative.id, ver.version_number)}
                        disabled={isProcessing}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Approve v{ver.version_number}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3B. SINGLE VIEW (Focused centerpiece) */
        <div className="space-y-6">
          {/* Applied Feedback Notice on Current Version */}
          {currentVersion?.revised_instructions && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  v{selectedVersionNum} Iteration Directive:{" "}
                </span>
                <span className="italic">&ldquo;{currentVersion.revised_instructions}&rdquo;</span>
              </div>
            </div>
          )}

          {/* Generated 9:16 Portrait Ad Card */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative aspect-[9/16] w-full max-w-[340px] sm:max-w-[380px] rounded-2xl overflow-hidden border border-slate-300 dark:border-neutral-700 shadow-xl bg-slate-950 group">
              <Image
                src={displayImageUrl}
                alt={`${creative.title} - Version ${selectedVersionNum}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={() => displayImageUrl && onOpenPreviewModal(displayImageUrl)}
                className="absolute bottom-3 right-3 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer shadow-md"
                title="Zoom Preview"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Actions Below Centerpiece */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <a
              href={displayImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`ad_${creative.id}_v${selectedVersionNum}.png`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Download 9:16 PNG (v{selectedVersionNum})</span>
            </a>

            <div className="flex items-center gap-2">
              {isVersionApproved ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-bold shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Version {selectedVersionNum} Approved</span>
                </div>
              ) : (
                <Button
                  onClick={() => creative.id && onApproveCreative(creative.id, selectedVersionNum)}
                  disabled={isProcessing}
                  variant="outline"
                  className="text-xs sm:text-sm font-bold px-4 py-2.5 gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-xs rounded-xl"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Approve Version {selectedVersionNum}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Visual Quality & Legibility Inspection */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Visual Quality & Legibility Inspection (v{selectedVersionNum})
                </span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                Fidelity: {Math.round((currentReview?.product_fidelity_score || 0.95) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-xs">
                  Headline in visual:
                </span>
                <span className="font-serif-title font-bold text-slate-950 dark:text-white text-sm sm:text-base block leading-snug">
                  &ldquo;{currentReview?.headline_detected || creative.headline}&rdquo;
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-500 dark:text-neutral-400 block text-xs">
                  Call to Action button:
                </span>
                <span className="font-mono font-bold text-slate-950 dark:text-white text-xs sm:text-sm bg-slate-100 dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 px-3 py-1 rounded-lg inline-block">
                  [{currentReview?.cta_detected || creative.cta}]
                </span>
              </div>
            </div>

            {currentReview?.product_fidelity_notes && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-neutral-700 leading-relaxed shadow-2xs">
                {currentReview.product_fidelity_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4. Natural-Language Revision Box */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <span className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-500" />
            <span>Iterate & Refine Creative:</span>
          </span>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
            Provide natural-language instructions to adjust atmosphere, lighting, product scale, or copy. Each iteration produces a new version while preserving authentic product packaging.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={inlineFeedback}
            onChange={(e) => setInlineFeedback(e.target.value)}
            disabled={isProcessing}
            placeholder="e.g. different angle and sporty background, add rain droplets..."
            className="text-sm sm:text-base bg-white dark:bg-neutral-800 text-slate-900 dark:text-white h-12 sm:h-14 px-4 rounded-xl border-slate-300 dark:border-neutral-700 focus:border-slate-500 shadow-2xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && inlineFeedback.trim() && !isProcessing) {
                handleRevise();
              }
            }}
          />
          <Button
            onClick={handleRevise}
            disabled={!inlineFeedback.trim() || isProcessing}
            className="bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-sm sm:text-base font-bold px-6 h-12 sm:h-14 rounded-xl shrink-0 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
          >
            {isProcessing ? "Generating Revision..." : "Revise Ad"}
          </Button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 dark:text-neutral-400 mr-1">
            Quick suggestions:
          </span>
          {[
            "Different angle and sporty vibe",
            "Punchier, shorter headline",
            "Luxury pedestal with soft shadows",
            "Dark high-contrast background",
            "Golden hour rim lighting",
            "Bolder CTA button contrast",
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => setInlineFeedback(tag)}
              disabled={isProcessing}
              className="text-xs sm:text-sm font-medium bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
