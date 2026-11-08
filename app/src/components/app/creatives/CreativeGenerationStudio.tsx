"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";
import type { CreativeWithSignedUrl } from "@/lib/actions/creatives";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import {
  Sparkles,
  ArrowRight,
  Download,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CampaignConceptRow = Database["public"]["Tables"]["campaign_concepts"]["Row"];
type JobRow = Database["public"]["Tables"]["creative_generation_jobs"]["Row"];

interface CreativeGenerationStudioProps {
  campaignId: string;
  approvedConcepts?: CampaignConceptRow[];
  approvedConcept?: CampaignConceptRow;
  selectedProduct: ProductRow;
  initialCreatives?: CreativeWithSignedUrl[];
}

export function CreativeGenerationStudio({
  campaignId,
  approvedConcepts = [],
  approvedConcept,
  selectedProduct,
  initialCreatives = [],
}: CreativeGenerationStudioProps) {
  const router = useRouter();
  const [creatives, setCreatives] = useState<CreativeWithSignedUrl[]>(initialCreatives);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingJobIds, setRetryingJobIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Combine target concepts
  const activeConcepts =
    approvedConcepts.length > 0
      ? approvedConcepts
      : approvedConcept
      ? [approvedConcept]
      : [];

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creatives/status`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.creatives)) {
          setCreatives(data.creatives);
        }
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);

          // Check if any job is still pending / in flight
          const hasIncomplete = data.jobs.some(
            (j: JobRow) =>
              j.status === "queued" ||
              j.status === "generating" ||
              j.status === "composing"
          );

          if (!hasIncomplete && data.jobs.length > 0) {
            stopPolling();
            router.refresh();
          }
        }
      }
    } catch (err) {
      console.error("[CREATIVE STUDIO POLLING ERROR]:", err);
    }
  }, [campaignId, router, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 2500);
  }, [fetchStatus, stopPolling]);

  // On mount: check current status in Supabase & resume polling if needed
  useEffect(() => {
    let mounted = true;

    async function initialCheck() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/creatives/status`);
        if (!res.ok || !mounted) return;
        const data = await res.json();
        if (data.success && mounted) {
          if (Array.isArray(data.creatives)) setCreatives(data.creatives);
          if (Array.isArray(data.jobs)) {
            setJobs(data.jobs);
            const hasPending = data.jobs.some(
              (j: JobRow) =>
                j.status === "queued" ||
                j.status === "generating" ||
                j.status === "composing"
            );
            if (hasPending) {
              startPolling();
            }
          }
        }
      } catch (err) {
        console.error("[INITIAL STATUS CHECK ERROR]:", err);
      }
    }

    initialCheck();

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [campaignId, startPolling, stopPolling]);

  // Handle Generate / Regenerate
  const handleGenerate = async () => {
    if (activeConcepts.length === 0) {
      setErrorMessage("Please select at least one ad angle first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creatives/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptIds: activeConcepts.map((c) => c.id),
          productId: selectedProduct.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to start ad generation.");
        setIsSubmitting(false);
        return;
      }

      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
      if (data.creatives && Array.isArray(data.creatives)) {
        setCreatives(data.creatives);
      }

      startPolling();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start generation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle isolated retry of a single failed job
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobIds((prev) => ({ ...prev, [jobId]: true }));
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to retry ad.");
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, ...data.job } : j))
        );
        startPolling();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Retry request failed.");
    } finally {
      setRetryingJobIds((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  // Handle instant optimistic deletion of an ad creative
  const handleDeleteCreative = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setIsDeleting(true);

    // Optimistic removal: remove immediately from UI in 0ms
    setCreatives((prev) => prev.filter((c) => c.id !== targetId));
    setJobs((prev) => prev.filter((j) => j.creative_id !== targetId));

    try {
      const res = await fetch(`/api/creatives/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        // Re-sync if server failed
        fetchStatus();
      }
    } catch (err) {
      console.error("[DELETE CREATIVE ERROR]:", err);
      fetchStatus();
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const hasInFlightJobs = jobs.some(
    (j) => j.status === "queued" || j.status === "generating" || j.status === "composing"
  );

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Step 3: Ready-to-Run Ads</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            9:16 Portrait Ads ({activeConcepts.length} Selected Angles)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            AI creates a dedicated ad visual for each chosen angle, keeping your real product intact with professional mobile layouts.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isSubmitting || hasInFlightJobs || activeConcepts.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white px-6 py-3 text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Starting Generation...</span>
              </>
            ) : hasInFlightJobs ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Your Ads...</span>
              </>
            ) : creatives.length > 0 ? (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Make New Ads ({activeConcepts.length})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Generate {activeConcepts.length} Ads Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product & Angles Summary Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 shrink-0 overflow-hidden relative shadow-2xs">
            {selectedProduct.main_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedProduct.main_image_url}
                alt={selectedProduct.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                Product
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Product Photo
            </div>
            <div className="font-extrabold text-sm text-slate-900 truncate">
              {selectedProduct.title}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              100% real product photo preserved — never replaced with an invented product.
            </div>
          </div>
        </div>

        {/* Selected Angles Chips */}
        <div className="pt-3 border-t border-slate-200/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Angles Being Created ({activeConcepts.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {activeConcepts.map((c, i) => {
              const conceptJob = jobs.find((j) => j.concept_id === c.id);
              const status = conceptJob ? conceptJob.status : "ready";

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate max-w-[140px]">
                      {i + 1}. {c.concept_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        status === "succeeded"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : status === "failed"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : status === "generating" || status === "composing"
                          ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {status === "succeeded"
                        ? "✓ Ready"
                        : status === "generating"
                        ? "AI Working"
                        : status === "composing"
                        ? "Formatting"
                        : status === "queued"
                        ? "In Line"
                        : status === "failed"
                        ? "Failed"
                        : "Ready"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate italic">
                    &ldquo;{c.headline}&rdquo;
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global In-Flight Processing Banner */}
      {hasInFlightJobs && (
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-900 bg-slate-900 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="font-bold text-sm">
                Generating Your Ads in the Background
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Safe to leave or refresh anytime
            </span>
          </div>
          <div className="text-xs text-slate-300">
            {jobs.find((j) => j.status === "generating" || j.status === "composing" || j.status === "queued")?.progress_step ||
              "Synthesizing backgrounds and formatting mobile 9:16 layout..."}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Per-Creative Status Cards Gallery */}
      {(creatives.length > 0 || jobs.length > 0) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Ad Creatives ({activeConcepts.length} Variations)
            </span>
            <span className="text-slate-500 text-xs">
              Optimized for Instagram Stories, Reels & TikTok
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeConcepts.map((concept, idx) => {
              const matchedCreative = creatives.find((c) => c.concept_id === concept.id);
              const matchedJob = jobs.find((j) => j.concept_id === concept.id);

              const hasImage = !!(matchedCreative && (matchedCreative.freshSignedUrl || matchedCreative.asset_url));
              const isJobActive = !!(
                matchedJob &&
                (matchedJob.status === "queued" ||
                  matchedJob.status === "generating" ||
                  matchedJob.status === "composing")
              );
              const isFailed = !hasImage && (matchedJob?.status === "failed" || matchedCreative?.status === "failed");

              const status = hasImage
                ? "succeeded"
                : isJobActive
                ? (matchedJob!.status as string)
                : isFailed
                ? "failed"
                : "idle";

              const displayUrl = matchedCreative?.freshSignedUrl || matchedCreative?.asset_url;
              const isRetrying = matchedJob ? !!retryingJobIds[matchedJob.id] : false;

              return (
                <div
                  key={concept.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-4 flex flex-col justify-between hover:border-slate-400 hover:shadow-md transition-all space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900">
                        Ad 0{idx + 1}: {concept.concept_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === "succeeded"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : status === "failed"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : status === "idle"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {status === "succeeded"
                            ? "Ready"
                            : status === "idle"
                            ? "Not Generated"
                            : status.toUpperCase()}
                        </span>
                        {matchedCreative && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: matchedCreative.id,
                                title: concept.concept_name,
                              })
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete this ad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 9:16 Portrait Canvas / Preview */}
                    <div className="relative w-full aspect-[9/16] rounded-2xl bg-slate-950 overflow-hidden shadow-inner flex flex-col items-center justify-center">
                      {status === "succeeded" && displayUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={displayUrl}
                          alt={concept.concept_name}
                          className="w-full h-full object-cover"
                        />
                      ) : status === "failed" ? (
                        <div className="p-5 text-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                          <span className="text-red-400 font-bold text-xs block">
                            Generation Paused
                          </span>
                          <p className="text-[11px] text-slate-400 line-clamp-3">
                            {(matchedJob?.error_details as { error?: string })?.error ||
                              matchedCreative?.error_message ||
                              "Please tap retry below."}
                          </p>
                        </div>
                      ) : isJobActive ? (
                        <div className="p-5 text-center space-y-2.5">
                          <span className="inline-block w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          <div className="text-xs font-bold text-white">
                            {status === "generating"
                              ? "Designing with AI..."
                              : status === "composing"
                              ? "Formatting 9:16 Layout..."
                              : "Queued in Line..."}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {matchedJob?.progress_step || "Visual in progress..."}
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 text-center space-y-2">
                          <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                          <span className="text-slate-400 font-bold text-xs block">
                            Ready to Generate
                          </span>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            Tap &quot;Generate Ads&quot; above to create this ad.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="font-extrabold text-slate-900 text-xs line-clamp-1">
                        {concept.concept_name}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        &ldquo;{concept.headline}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      9:16 Mobile Ad
                    </span>

                    <div className="flex items-center gap-2">
                      {status === "succeeded" && displayUrl && (
                        <>
                          <a
                            href={displayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-slate-950 p-1"
                            title="Download high-res image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {matchedCreative && (
                            <Link
                              href={`/creatives/${matchedCreative.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                            >
                              <span>Inspect & Edit</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </>
                      )}

                      {status === "failed" && matchedJob && (
                        <button
                          type="button"
                          onClick={() => handleRetryJob(matchedJob.id)}
                          disabled={isRetrying}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isRetrying ? (
                            <span>Retrying...</span>
                          ) : (
                            <>
                              <RotateCw className="w-3 h-3" />
                              <span>Retry</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Ad Creative"
        description="Are you sure you want to delete this ad creative? This action cannot be undone."
        itemName={deleteTarget?.title}
        isLoading={isDeleting}
        onConfirm={handleDeleteCreative}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
