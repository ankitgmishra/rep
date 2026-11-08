"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { formatDisplayDate } from "@/lib/utils";
import {
  approveCreativeVersion,
  rejectCreativeVersion,
  setActiveCreativeVersion,
  type CreativeDetailWithVersions,
  type CreativeVersionWithUrl,
} from "@/lib/actions/creatives";

interface Props {
  creative: CreativeDetailWithVersions;
}

export function CreativeDetailWorkspace({ creative }: Props) {
  const router = useRouter();

  // Selected version being inspected
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    creative.activeVersion?.id || creative.versions[0]?.id || ""
  );

  // Compare mode toggle
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareVersionId, setCompareVersionId] = useState<string>(
    creative.versions.length > 1 ? creative.versions[creative.versions.length - 1].id : ""
  );

  // Feedback & Regeneration state
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenerationStep, setRegenerationStep] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingCreative, setIsDeletingCreative] = useState<boolean>(false);

  const handleDeleteCreative = async () => {
    setIsDeletingCreative(true);
    try {
      const res = await fetch(`/api/creatives/${creative.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        router.push("/creatives");
      } else {
        setActionError(data.error || "Failed to delete creative.");
      }
    } catch {
      setActionError("Error deleting creative.");
    } finally {
      setIsDeletingCreative(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Current active version object
  const currentVersion: CreativeVersionWithUrl | undefined =
    creative.versions.find((v) => v.id === selectedVersionId) ||
    creative.activeVersion ||
    creative.versions[0];

  const compareVersion: CreativeVersionWithUrl | undefined = creative.versions.find(
    (v) => v.id === compareVersionId
  );

  const displayUrl = currentVersion?.freshSignedUrl || creative.freshSignedUrl || creative.asset_url;
  const compareUrl = compareVersion?.freshSignedUrl || compareVersion?.asset_url;

  const product = creative.product;
  const campaign = creative.campaign;
  const brand = creative.brand;

  const versionApproval = currentVersion?.approval_status || "pending";
  const isCurrentActive = creative.active_version_id === currentVersion?.id;

  const sampleFeedbackPills = [
    "Change the headline to focus on drop protection.",
    "Make the product smaller.",
    "Use a premium marble background.",
    "Change the CTA to Shop Now.",
    "Make the overall design more editorial.",
  ];

  // 1. Approve version handler
  const handleApprove = async () => {
    if (!currentVersion) return;
    setIsApproving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await approveCreativeVersion(creative.id, currentVersion.id);
      if (!res.success) {
        setActionError(res.error || "Failed to approve version.");
      } else {
        setActionSuccess(`Version ${currentVersion.version_number} approved as active advertisement.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  };

  // 2. Reject version handler
  const handleReject = async () => {
    if (!currentVersion) return;
    setIsRejecting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await rejectCreativeVersion(
        creative.id,
        currentVersion.id,
        feedbackText.trim() || undefined
      );
      if (!res.success) {
        setActionError(res.error || "Failed to reject version.");
      } else {
        setActionSuccess(`Version ${currentVersion.version_number} marked as rejected.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setIsRejecting(false);
    }
  };

  // 3. Set as active version handler
  const handleSetActive = async (vId: string) => {
    try {
      await setActiveCreativeVersion(creative.id, vId);
      setSelectedVersionId(vId);
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to set active version.");
    }
  };

  // 4. Feedback-driven regeneration handler
  const handleRegenerate = async (feedbackToSubmit: string) => {
    const text = feedbackToSubmit.trim();
    if (!text) {
      setActionError("Please enter natural-language feedback directives before regenerating.");
      return;
    }

    setIsRegenerating(true);
    setActionError(null);
    setActionSuccess(null);
    setRegenerationStep("Analyzing feedback and formulating revised creative directions...");

    const steps = [
      "Analyzing feedback and formulating revised creative directions...",
      "Classifying change type and adjusting composition...",
      "Generating refreshed high-resolution 9:16 portrait visual...",
      "Verifying layout, contrast, and typography...",
      "Saving new version to creative library...",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setRegenerationStep(steps[stepIdx]);
      }
    }, 1800);

    try {
      const res = await fetch(`/api/creatives/${creative.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: currentVersion?.id,
          feedbackText: text,
        }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.error || "Regeneration failed.");
        return;
      }

      setFeedbackText("");
      const summaryText = data.changeSummary ? ` [${data.changeType?.toUpperCase()}]: ${data.changeSummary}` : "";
      setActionSuccess(`Version ${data.version.version_number} generated successfully.${summaryText}`);
      setSelectedVersionId(data.version.id);
      router.refresh();
    } catch (err: unknown) {
      clearInterval(interval);
      setActionError(err instanceof Error ? err.message : "Regeneration request failed.");
    } finally {
      setIsRegenerating(false);
      setRegenerationStep("");
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/creatives"
            className="hover:text-slate-900 font-medium transition-colors"
          >
            ← All Creatives
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-md">
            {creative.title}
          </span>
          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-semibold">
            v{currentVersion?.version_number || 1}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {displayUrl && (
            <a
              href={displayUrl}
              download={`${creative.title.replace(/\s+/g, "_")}_v${currentVersion?.version_number || 1}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 font-medium text-xs transition-colors shadow-xs"
            >
              Download PNG ↓
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-3.5 py-1.5 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Delete this creative"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <Link
            href={`/campaigns/${creative.campaign_id}`}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 font-medium text-xs transition-colors shadow-xs"
          >
            Campaign Studio →
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 flex items-center justify-between">
          <span>[ SUCCESS ]: {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 font-bold ml-2">
            [x]
          </button>
        </div>
      )}

      {actionError && (
        <div className="border border-red-300 bg-red-50 p-3 text-red-900 flex items-center justify-between">
          <span>[ ERROR ]: {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-700 font-bold ml-2">
            [x]
          </button>
        </div>
      )}

      {/* Version Selector Bar */}
      <div className="border border-neutral-300 bg-neutral-50/70 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 uppercase font-bold">VERSION HISTORY:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {creative.versions.map((ver) => {
              const isSelected = ver.id === selectedVersionId;
              const isActive = ver.id === creative.active_version_id;
              const isApp = ver.approval_status === "approved";
              const isRej = ver.approval_status === "rejected";

              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`px-3 py-1 text-xs border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white font-bold"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  <span>v{ver.version_number}</span>
                  {isActive && (
                    <span className="text-[8px] uppercase tracking-wider bg-white/20 text-white px-1 py-0.2 rounded-none font-normal">
                      ACTIVE
                    </span>
                  )}
                  {isApp && (
                    <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                  )}
                  {isRej && (
                    <span className="text-[8px] text-red-400 font-bold">✗</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {creative.versions.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsComparing(!isComparing)}
              className={`border px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${
                isComparing
                  ? "border-neutral-950 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950"
              }`}
            >
              {isComparing ? "[ CLOSE COMPARISON ]" : "[ COMPARE VERSIONS ]"}
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Preview on Left, Inspection & Feedback on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Portrait Visual Canvas Preview */}
        <div className={`${isComparing ? "lg:col-span-7" : "lg:col-span-5"} space-y-4`}>
          {isComparing && compareVersion ? (
            /* Side-by-side comparison */
            <div className="grid grid-cols-2 gap-4">
              {/* Baseline Compare Version */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] border-b border-neutral-200 pb-1">
                  <span className="font-bold text-neutral-600">
                    VERSION {compareVersion.version_number}
                  </span>
                  <select
                    value={compareVersionId}
                    onChange={(e) => setCompareVersionId(e.target.value)}
                    className="border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px]"
                  >
                    {creative.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} ({v.approval_status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative aspect-[9/16] bg-neutral-900 border border-neutral-300 shadow-sm overflow-hidden">
                  {compareUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={compareUrl}
                      alt={`Version ${compareVersion.version_number}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      Loading v{compareVersion.version_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Selected Version */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] border-b border-neutral-200 pb-1">
                  <span className="font-bold text-neutral-950">
                    VERSION {currentVersion?.version_number} (CURRENT)
                  </span>
                  <span className="border border-neutral-950 bg-neutral-950 text-white px-1.5 py-0.2 text-[8px] uppercase">
                    {versionApproval}
                  </span>
                </div>
                <div className="relative aspect-[9/16] bg-neutral-900 border-2 border-neutral-950 shadow-md overflow-hidden">
                  {displayUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={displayUrl}
                      alt={`Version ${currentVersion?.version_number}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      Loading v{currentVersion?.version_number}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single Large Portrait Canvas */
            <div className="border border-neutral-300 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] border-b border-neutral-200 pb-2">
                <span className="font-bold uppercase tracking-wider text-neutral-900">
                  9:16 PORTRAIT CANVAS (1080 × 1920 PX)
                </span>
                <div className="flex items-center gap-2">
                  <span className="border border-neutral-200 bg-neutral-100 text-neutral-800 px-1.5 py-0.5 text-[9px] font-bold">
                    VERSION {currentVersion?.version_number}
                  </span>
                  <span
                    className={`border px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                      versionApproval === "approved"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : versionApproval === "rejected"
                        ? "border-red-600 bg-red-50 text-red-800"
                        : "border-amber-600 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {versionApproval}
                  </span>
                </div>
              </div>

              <div className="relative w-full aspect-[9/16] bg-neutral-900 border border-neutral-400 overflow-hidden shadow-md">
                {displayUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayUrl}
                    alt={creative.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 p-6 text-center">
                    Processing Creative Asset...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                <span>FORMAT: 1080x1920 PNG</span>
                <span>AUTHENTIC STOREFRONT FOREGROUND</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Version Details, Actions & Feedback Studio */}
        <div className={`${isComparing ? "lg:col-span-5" : "lg:col-span-7"} space-y-6`}>
          {/* 1. Version Governance & Approval Checkpoint */}
          <div className="border border-neutral-300 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-neutral-400">
                  VERSION GOVERNANCE • STAGE 08
                </div>
                <h2 className="font-serif-title text-lg font-bold text-neutral-950 mt-0.5">
                  Version {currentVersion?.version_number} Review & Approval
                </h2>
              </div>

              <span
                className={`border px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                  versionApproval === "approved"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : versionApproval === "rejected"
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-amber-600 bg-amber-50 text-amber-800"
                }`}
              >
                STATUS: {versionApproval}
              </span>
            </div>

            <p className="text-neutral-600 text-xs leading-relaxed">
              Approval is strictly isolated to Version {currentVersion?.version_number}. Approving this
              version marks it as active for deployment without altering prior or subsequent iterations.
            </p>

            {/* Approval Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {versionApproval !== "approved" ? (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2 uppercase tracking-wider text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isApproving ? "Recording Approval..." : `Approve Version ${currentVersion?.version_number} & Continue`}
                </button>
              ) : (
                <div className="border border-emerald-600 bg-emerald-50 text-emerald-900 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <span>✓ Version {currentVersion?.version_number} Approved</span>
                </div>
              )}

              {versionApproval !== "rejected" && (
                <button
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="border border-red-300 hover:border-red-700 bg-white text-red-700 px-4 py-2 uppercase tracking-wider text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isRejecting ? "Rejecting..." : "Reject Version"}
                </button>
              )}

              {!isCurrentActive && currentVersion && (
                <button
                  onClick={() => handleSetActive(currentVersion.id)}
                  className="border border-neutral-300 hover:border-neutral-950 bg-white text-neutral-800 px-3 py-2 uppercase tracking-wider text-xs transition-colors"
                >
                  Set as Active Creative
                </button>
              )}
            </div>
          </div>

          {/* 2. Natural-Language Feedback & Regeneration Studio */}
          <div className="border border-neutral-300 bg-white p-5 space-y-4 shadow-sm">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-[9px] uppercase tracking-widest text-neutral-400">
                AI ITERATION ENGINE • NATURAL-LANGUAGE DIRECTIVES
              </div>
              <h2 className="font-serif-title text-lg font-bold text-neutral-950 mt-0.5">
                Feedback & New Version Synthesis
              </h2>
              <p className="text-neutral-500 text-xs mt-1">
                Provide natural-language instructions to revise background atmosphere, lighting, product scale, or copy.
                Directives will refine the generation parameters and synthesize a new version.
              </p>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">
                RECOMMENDED DIRECTIVES:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sampleFeedbackPills.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setFeedbackText(pill)}
                    className="border border-neutral-300 hover:border-neutral-950 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 px-2.5 py-1 text-[11px] transition-colors"
                  >
                    + &ldquo;{pill}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Natural-Language Feedback Input */}
            <div className="space-y-2">
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="E.g., Make the background more premium with Italian marble, warm diffused lighting, and make the headline punchier..."
                className="w-full border border-neutral-300 bg-white p-3 text-xs focus:outline-none focus:border-neutral-950 font-mono resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">
                  Preserves original catalog product fidelity. Creates separate Version v{(creative.versions[0]?.version_number || 1) + 1}.
                </span>

                <button
                  type="button"
                  onClick={() => handleRegenerate(feedbackText)}
                  disabled={isRegenerating || !feedbackText.trim()}
                  className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2 uppercase tracking-wider text-xs font-bold transition-colors disabled:opacity-40"
                >
                  {isRegenerating ? "Synthesizing New Version..." : `Generate Version v${(creative.versions[0]?.version_number || 1) + 1} &rarr;`}
                </button>
              </div>
            </div>

            {/* Regeneration Progress Bar */}
            {isRegenerating && (
              <div className="border border-neutral-950 bg-neutral-50 p-4 space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-900 uppercase">
                    [ SYNTHESIZING NEW CREATIVE VERSION ]
                  </span>
                  <span className="text-neutral-500 font-mono">PHASE ACTIVE</span>
                </div>
                <p className="text-neutral-700 text-xs font-mono">{regenerationStep}</p>
              </div>
            )}
          </div>

          {/* 3. Creative Provenance & Associated Assets */}
          <div className="border border-neutral-300 bg-white p-5 space-y-3 shadow-sm">
            <div className="text-[9px] uppercase tracking-widest text-neutral-400 border-b border-neutral-200 pb-2">
              CREATIVE METADATA & STOREFRONT PROVENANCE
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">BRAND</span>
                <span className="font-bold text-neutral-950">{brand?.name || "Verified Storefront"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">PRODUCT</span>
                <span className="font-bold text-neutral-950">{product?.title || "Product"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">CAMPAIGN</span>
                <span className="font-bold text-neutral-950">{campaign?.name || "Campaign"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">GENERATION MODEL</span>
                <code className="text-neutral-900 bg-neutral-100 px-1 py-0.5 text-[10px]">
                  {creative.model_identifier}
                </code>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-3 space-y-1 text-xs">
              <span className="text-neutral-400 block text-[10px] uppercase">ACTIVE GENERATION PROMPT</span>
              <p className="text-neutral-700 font-mono text-[11px] bg-neutral-50 p-2.5 border border-neutral-200 leading-relaxed">
                {currentVersion?.generation_prompt || creative.generation_prompt}
              </p>
            </div>

            {currentVersion?.revised_instructions && (
              <div className="border-t border-neutral-200 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                    DIRECTIVES APPLIED FOR THIS VERSION
                  </span>
                  {Boolean((currentVersion.metadata as Record<string, unknown>)?.change_type) && (
                    <span className="border border-neutral-900 bg-neutral-900 text-white px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold">
                      {String((currentVersion.metadata as Record<string, unknown>).change_type).replace("_", " ")}
                    </span>
                  )}
                </div>
                <p className="text-neutral-800 font-mono text-[11px] bg-amber-50/50 p-2 border border-amber-200">
                  &ldquo;{currentVersion.revised_instructions}&rdquo;
                </p>
                {Boolean((currentVersion.metadata as Record<string, unknown>)?.change_summary) && (
                  <p className="text-neutral-600 font-mono text-[10px] bg-neutral-50 p-2 border border-neutral-200">
                    <strong className="text-neutral-900">Change Summary:</strong> {String((currentVersion.metadata as Record<string, unknown>).change_summary)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. Feedback History Archive */}
          {creative.feedbackList.length > 0 && (
            <div className="border border-neutral-300 bg-white p-5 space-y-3 shadow-sm">
              <div className="text-[9px] uppercase tracking-widest text-neutral-400 border-b border-neutral-200 pb-2">
                HISTORICAL FEEDBACK LOG ({creative.feedbackList.length})
              </div>

              <div className="space-y-2">
                {creative.feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    className="border border-neutral-200 bg-neutral-50/70 p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="uppercase font-bold text-neutral-600">
                        [{fb.category || "GENERAL"}]
                      </span>
                      <span>
                        {formatDisplayDate(fb.created_at)}
                      </span>
                    </div>
                    <p className="text-neutral-900 font-mono text-[11px]">&ldquo;{fb.feedback_text}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCreative}
        isLoading={isDeletingCreative}
        title="Delete Ad Creative?"
        description="This will permanently delete this 9:16 portrait creative and all of its version history from your workspace."
        itemName={creative.title}
      />
    </div>
  );
}

