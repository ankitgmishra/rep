"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateCampaignConcept,
  approveCampaignConcept,
  toggleConceptApproval,
  approveAllConcepts,
  selectCampaignConcept,
  type CampaignRow,
  type ProductRow,
  type BrandKitRow,
  type CampaignConceptRow,
} from "@/lib/actions/campaigns";
import { ConceptEditModal } from "./ConceptEditModal";
import { CreativeGenerationStudio } from "@/components/app/creatives/CreativeGenerationStudio";
import type { CreativeWithSignedUrl } from "@/lib/actions/creatives";
import { formatFullDate } from "@/lib/utils";

interface CampaignWorkspaceViewProps {
  campaign: CampaignRow;
  brand: {
    id: string;
    name: string;
    website_url: string;
    industry: string | null;
    approval_status: string;
  } | null;
  brandKit: BrandKitRow | null;
  products: ProductRow[];
  initialConcepts: CampaignConceptRow[];
  initialCreatives?: CreativeWithSignedUrl[];
}

const GENERATION_PHASES = [
  "Retrieving verified brand kit and allocated product catalog...",
  "Synthesizing Angle 1: Problem-Agitate-Solve (Friction Reliever)...",
  "Synthesizing Angle 2: Social Proof & Clinical Ingredient Validation...",
  "Synthesizing Angle 3: Daily Ritual & Lifestyle Transformation...",
  "Validating structured output with Zod schema and persisting concepts...",
];

export function CampaignWorkspaceView({
  campaign,
  brand,
  brandKit,
  products,
  initialConcepts,
  initialCreatives = [],
}: CampaignWorkspaceViewProps) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<CampaignConceptRow[]>(initialConcepts);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationPhase, setGenerationPhase] = useState<string>("");
  const [revisionInstructions, setRevisionInstructions] = useState<string>("");
  const [editingConcept, setEditingConcept] = useState<CampaignConceptRow | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string>(
    concepts.find((c) => c.is_approved)?.id ||
      concepts.find((c) => c.approval_status === "selected")?.id ||
      concepts[0]?.id ||
      ""
  );
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const approvedConcepts = concepts.filter((c) => c.is_approved);
  const approvedConcept = approvedConcepts[0] || null;

  const handleGenerateConcepts = async (isRevision = false) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    // Stream generation phases to give real step-by-step agent feedback
    let phaseIdx = 0;
    setGenerationPhase(GENERATION_PHASES[0]);
    const phaseInterval = setInterval(() => {
      phaseIdx += 1;
      if (phaseIdx < GENERATION_PHASES.length) {
        setGenerationPhase(GENERATION_PHASES[phaseIdx]);
      }
    }, 1200);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisionInstructions: isRevision ? revisionInstructions.trim() : undefined,
        }),
      });

      const data = await res.json();
      clearInterval(phaseInterval);

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to generate campaign strategy.");
        return;
      }

      setConcepts(data.concepts);
      if (data.concepts.length > 0) {
        setSelectedConceptId(data.concepts[0].id);
      }
      setStatusMessage(
        isRevision
          ? "Three revised strategy concepts synthesized and persisted."
          : "Three advertising concepts synthesized successfully."
      );
      if (isRevision) {
        setRevisionInstructions("");
      }
      router.refresh();
    } catch (err: unknown) {
      clearInterval(phaseInterval);
      setErrorMessage(err instanceof Error ? err.message : "Strategy synthesis failed.");
    } finally {
      setIsGenerating(false);
      setGenerationPhase("");
    }
  };

  const handleSelectConcept = async (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setConcepts((prev) =>
      prev.map((c) => ({
        ...c,
        approval_status: c.id === conceptId ? "selected" : c.is_approved ? "approved" : "draft",
      }))
    );
    await selectCampaignConcept(campaign.id, conceptId);
  };

  const handleToggleConceptApproval = async (conceptId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setConcepts((prev) =>
      prev.map((c) =>
        c.id === conceptId
          ? {
              ...c,
              is_approved: nextStatus,
              approval_status: nextStatus ? "approved" : "draft",
              approved_at: nextStatus ? new Date().toISOString() : null,
            }
          : c
      )
    );
    await toggleConceptApproval(campaign.id, conceptId, nextStatus);
    setStatusMessage(
      nextStatus
        ? "Concept approved for multi-angle creative generation."
        : "Concept removed from generation batch."
    );
  };

  const handleApproveAllConcepts = async () => {
    setConcepts((prev) =>
      prev.map((c) => ({
        ...c,
        is_approved: true,
        approval_status: "approved",
        approved_at: new Date().toISOString(),
      }))
    );
    await approveAllConcepts(campaign.id);
    setStatusMessage("All 3 concepts approved for multi-angle creative generation.");
  };

  const handleApproveConcept = async () => {
    if (!selectedConceptId) {
      setErrorMessage("Please select a concept to approve.");
      return;
    }

    try {
      setIsApproving(true);
      setErrorMessage(null);
      const res = await approveCampaignConcept(campaign.id, selectedConceptId);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to approve concept.");
        return;
      }

      setConcepts((prev) =>
        prev.map((c) => ({
          ...c,
          is_approved: c.id === selectedConceptId ? true : c.is_approved,
          approval_status: c.id === selectedConceptId ? "approved" : c.approval_status,
          approved_at: c.id === selectedConceptId ? new Date().toISOString() : c.approved_at,
        }))
      );

      setStatusMessage("Concept approved! Creative parameters are locked for Step 7 Image Generation.");
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveConceptEdits = async (
    conceptId: string,
    updates: { headline: string; supporting_copy: string; cta: string; concept_name: string }
  ) => {
    const res = await updateCampaignConcept(conceptId, updates);
    if (!res.success) {
      throw new Error(res.error || "Failed to save edits.");
    }

    setConcepts((prev) =>
      prev.map((c) =>
        c.id === conceptId
          ? {
              ...c,
              ...updates,
              user_edits: {
                ...(c.user_edits as Record<string, unknown>),
                ...updates,
                edited_at: new Date().toISOString(),
              },
            }
          : c
      )
    );
    setStatusMessage("Refined concept copy saved and persisted.");
  };

  return (
    <div className="space-y-8 font-mono text-xs">
      {/* Campaign Executive Header */}
      <div className="border border-neutral-300 bg-white p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-neutral-400">
                CAMPAIGN WORKSPACE • STEP 6
              </span>
              <span className="border border-neutral-900 bg-neutral-950 text-white px-2 py-0.5 text-[9px] uppercase tracking-wider">
                [{approvedConcept ? "CONCEPT APPROVED" : campaign.status}]
              </span>
              <span className="border border-neutral-300 bg-neutral-100 text-neutral-800 px-2 py-0.5 text-[9px] uppercase tracking-wider">
                {campaign.objective}
              </span>
            </div>

            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-neutral-950 mt-2 font-sans">
              {campaign.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-neutral-500 mt-2">
              <span>
                Brand:{" "}
                <Link
                  href={`/brands/${campaign.brand_id}`}
                  className="font-bold text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
                >
                  {brand?.name || "Verified Brand"}
                </Link>
              </span>
              <span className="text-neutral-300">•</span>
              <span>
                Storefront:{" "}
                <a
                  href={brand?.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950"
                >
                  {brand?.website_url} &nearr;
                </a>
              </span>
              <span className="text-neutral-300">•</span>
              <span>
                Created: {formatFullDate(campaign.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {approvedConcept ? (
              <Link
                href="/creatives"
                className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2 uppercase tracking-wider font-bold transition-colors text-center"
              >
                Proceed to Creative Studio &rarr;
              </Link>
            ) : concepts.length > 0 ? (
              <button
                type="button"
                onClick={handleApproveConcept}
                disabled={isApproving || !selectedConceptId}
                className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2 uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
              >
                {isApproving ? "Approving..." : "Approve Selected Concept &rarr;"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Campaign Strategic Alignment Attributes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Advertising Objective
            </div>
            <div className="font-bold text-sm text-neutral-950 mt-1">
              {campaign.objective}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Direct-response angles and messaging align with this conversion goal.
            </p>
          </div>

          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Brand Voice Resonance
            </div>
            <div className="font-bold text-sm text-neutral-950 mt-1">
              {brandKit?.brand_voice || "Authoritative & Direct"}
            </div>
            <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1">
              {brandKit?.value_proposition || "Verified Brand Value"}
            </p>
          </div>

          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Allocated Catalog
            </div>
            <div className="font-bold text-sm text-neutral-950 mt-1">
              {products.length} Verified Product{products.length === 1 ? "" : "s"}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Original photography locked as visual subjects for ad generation.
            </p>
          </div>
        </div>

        {campaign.additional_instructions && (
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Operator Directives
            </div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs mt-1 leading-relaxed">
              &ldquo;{campaign.additional_instructions}&rdquo;
            </div>
          </div>
        )}
      </div>

      {/* Allocated Catalog Products Preview */}
      <div className="border border-neutral-300 bg-white p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <div>
            <div className="text-[10px] uppercase text-neutral-400">
              GROUNDED INVENTORY
            </div>
            <h3 className="font-serif-title text-lg font-bold text-neutral-950 font-sans mt-0.5">
              Allocated Product Photography ({products.length})
            </h3>
          </div>
          <span className="text-neutral-500 text-[11px]">
            [ ORIGINAL IMAGES PRESERVED ]
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="border border-neutral-200 p-2 bg-neutral-50/50 flex flex-col justify-between"
            >
              <div className="relative w-full aspect-square bg-neutral-100 border border-neutral-200 overflow-hidden mb-2">
                {p.main_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.main_image_url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[9px] uppercase">
                    No Image
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-white/95 px-1 py-0.2 border border-neutral-200 text-[7px] uppercase tracking-wider text-neutral-800">
                  CATALOG
                </div>
              </div>

              <h5 className="font-bold text-neutral-950 text-[11px] line-clamp-1">
                {p.title}
              </h5>
              <div className="text-[10px] text-neutral-600 mt-0.5">
                {p.price ? `${p.currency || "$"}${p.price}` : "Verified"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Synthesis Bar / Empty State */}
      {concepts.length === 0 && (
        <div className="border border-neutral-300 bg-white p-8 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">
              STAGE 6 • AI ADVERTISING STRATEGY AGENT
            </div>
            <h2 className="font-serif-title text-2xl font-bold text-neutral-950 font-sans">
              Synthesize 3 Distinct Advertising Angles
            </h2>
            <p className="text-neutral-600 text-xs leading-relaxed">
              Our strategy agent will formulate three psychologically distinct concepts (Problem-Agitate-Solve, Social Proof & Clinical Efficacy, and Daily Ritual & Transformation) grounded strictly in your verified brand kit and catalog items.
            </p>
          </div>

          {isGenerating ? (
            <div className="p-6 border border-neutral-950 bg-neutral-50 max-w-xl mx-auto space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-neutral-950 animate-pulse" />
                <span className="font-bold text-neutral-950 uppercase tracking-wider text-xs">
                  AI STRATEGY AGENT ACTIVE
                </span>
              </div>
              <div className="text-xs text-neutral-800 font-mono">
                {generationPhase}
              </div>
              <div className="w-full bg-neutral-200 h-1 overflow-hidden">
                <div className="bg-neutral-950 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => handleGenerateConcepts(false)}
                className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-3 uppercase tracking-wider text-xs font-bold transition-colors inline-block"
              >
                Synthesize 3 Strategic Concepts &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status & Error Messages */}
      {statusMessage && (
        <div className="border border-neutral-950 bg-neutral-50 p-4 text-xs text-neutral-900">
          <span className="font-bold uppercase tracking-wider">[ NOTICE ]:</span> {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="border border-red-500 bg-red-50 p-4 text-xs text-red-800">
          <span className="font-bold uppercase tracking-wider">[ ERROR ]:</span> {errorMessage}
        </div>
      )}

      {/* Active Concepts Comparison Matrix */}
      {concepts.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <div>
              <div className="text-[10px] uppercase text-neutral-400">
                CONCEPT MATRIX • THREE DISTINCT PSYCHOLOGICAL ANGLES
              </div>
              <h3 className="font-serif-title text-xl font-bold text-neutral-950 font-sans mt-0.5">
                Compare & Select Advertising Concept
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500">
                {approvedConcept ? "Concept Approved" : "1 Concept Must Be Approved"}
              </span>
            </div>
          </div>

          {/* 3 Concepts Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {concepts.map((concept, idx) => {
              const isSelected = selectedConceptId === concept.id;
              const isApproved = concept.is_approved;
              const hasUserEdits =
                concept.user_edits && Object.keys(concept.user_edits).length > 0;

              return (
                <div
                  key={concept.id}
                  onClick={() => handleSelectConcept(concept.id)}
                  className={`border p-6 bg-white flex flex-col justify-between cursor-pointer transition-all ${
                    isApproved
                      ? "border-2 border-neutral-950 ring-2 ring-neutral-950/10 shadow-lg"
                      : isSelected
                      ? "border-2 border-neutral-900 shadow-md"
                      : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header Badge */}
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                        CONCEPT 0{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasUserEdits && (
                          <span className="border border-neutral-300 text-neutral-700 bg-neutral-100 px-1.5 py-0.5 text-[8px] uppercase">
                            MODIFIED
                          </span>
                        )}
                        {isApproved ? (
                          <span className="border border-neutral-950 bg-neutral-950 text-white px-2 py-0.5 text-[9px] uppercase font-bold">
                            APPROVED
                          </span>
                        ) : isSelected ? (
                          <span className="border border-neutral-900 bg-neutral-900 text-white px-2 py-0.5 text-[9px] uppercase font-bold">
                            SELECTED
                          </span>
                        ) : (
                          <span className="border border-neutral-300 text-neutral-600 px-2 py-0.5 text-[9px] uppercase">
                            SELECT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Angle Title */}
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                        {concept.angle}
                      </div>
                      <h4 className="font-serif-title text-lg font-bold text-neutral-950 font-sans mt-1">
                        {concept.concept_name}
                      </h4>
                    </div>

                    {/* Hook Headline */}
                    <div className="p-3 bg-neutral-50 border border-neutral-200">
                      <div className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1">
                        Hook Headline
                      </div>
                      <div className="font-bold text-neutral-950 text-xs leading-snug">
                        &ldquo;{concept.headline}&rdquo;
                      </div>
                    </div>

                    {/* Supporting Body Copy & CTA */}
                    <div className="space-y-2">
                      <div>
                        <div className="text-[9px] text-neutral-400 uppercase tracking-wider">
                          Supporting Body Copy
                        </div>
                        <p className="text-[11px] text-neutral-700 mt-0.5 leading-relaxed">
                          {concept.supporting_copy}
                        </p>
                      </div>

                      <div>
                        <div className="text-[9px] text-neutral-400 uppercase tracking-wider">
                          Call To Action (CTA)
                        </div>
                        <div className="inline-block mt-1 px-2.5 py-1 bg-neutral-950 text-white text-[10px] uppercase tracking-wider font-bold">
                          {concept.cta}
                        </div>
                      </div>
                    </div>

                    {/* Target Persona & Core Message */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2 text-[10px]">
                      <div>
                        <span className="text-neutral-400 uppercase block">
                          Target Persona:
                        </span>
                        <span className="text-neutral-700 mt-0.5 block">
                          {concept.target_audience}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-400 uppercase block">
                          Core Emotional Hook:
                        </span>
                        <span className="text-neutral-800 font-semibold mt-0.5 block">
                          {concept.core_message}
                        </span>
                      </div>
                    </div>

                    {/* Visual Art Direction & 9:16 Composition */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2 text-[10px]">
                      <div>
                        <span className="text-neutral-400 uppercase block">
                          Visual Art Direction:
                        </span>
                        <p className="text-neutral-600 mt-0.5 line-clamp-3">
                          {concept.visual_direction}
                        </p>
                      </div>

                      <div>
                        <span className="text-neutral-400 uppercase block">
                          9:16 Portrait Composition:
                        </span>
                        <p className="text-neutral-600 mt-0.5 line-clamp-3">
                          {concept.composition_and_background}
                        </p>
                      </div>

                      <div>
                        <span className="text-neutral-400 uppercase block">
                          Strategic Justification:
                        </span>
                        <p className="text-neutral-600 mt-0.5 line-clamp-2 italic">
                          {concept.strategic_reasoning}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Controls */}
                  <div className="mt-6 pt-4 border-t border-neutral-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConcept(concept);
                      }}
                      className="text-neutral-600 hover:text-neutral-950 text-[11px] underline underline-offset-4"
                    >
                      [ Refine Copy ]
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleConceptApproval(concept.id, isApproved);
                      }}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold border transition-colors ${
                        isApproved
                          ? "bg-neutral-950 text-white border-neutral-950 hover:bg-neutral-800"
                          : "border-neutral-300 text-neutral-700 hover:border-neutral-950"
                      }`}
                    >
                      {isApproved ? "✓ Approved for Ads" : "+ Include in Ads"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Concept Approval Checkpoint Bar */}
          <div className="border-2 border-neutral-950 bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-neutral-950 bg-neutral-950 text-white px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                  [ STEP 6 CHECKPOINT ]
                </span>
                <span className="text-neutral-950 font-bold uppercase tracking-wider text-xs">
                  Human Concept Approval Gate ({approvedConcepts.length} of {concepts.length} Approved)
                </span>
              </div>
              <h4 className="font-serif-title text-xl font-bold text-neutral-950 font-sans mt-2">
                {approvedConcepts.length > 0
                  ? `${approvedConcepts.length} Advertising ${approvedConcepts.length === 1 ? "Strategy" : "Strategies"} Approved`
                  : "Approval Required Prior to Image Generation"}
              </h4>
              <p className="text-neutral-600 text-xs mt-1 max-w-2xl leading-relaxed">
                {approvedConcepts.length > 0
                  ? `Each approved concept is a standalone advertising strategy equipped with a Zod-validated CreativeSpec. Step 7 will generate one dedicated creative per approved strategy.`
                  : "Review the three generated strategies above. You can approve all three or selectively include specific concepts before generating ad creatives."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {approvedConcepts.length < concepts.length && (
                <button
                  type="button"
                  onClick={handleApproveAllConcepts}
                  className="border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-900 px-4 py-2.5 uppercase font-bold tracking-wider text-xs transition-colors"
                >
                  Approve All {concepts.length} &rarr;
                </button>
              )}

              {approvedConcepts.length > 0 && (
                <Link
                  href="/creatives"
                  className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-2.5 uppercase font-bold tracking-wider text-xs transition-colors text-center"
                >
                  View All Creatives &rarr;
                </Link>
              )}
            </div>
          </div>

          {/* Step 7 Creative Generation Studio (Available once at least one concept is approved) */}
          {approvedConcepts.length > 0 && products.length > 0 && (
            <CreativeGenerationStudio
              campaignId={campaign.id}
              approvedConcepts={approvedConcepts}
              approvedConcept={approvedConcepts[0]}
              selectedProduct={products[0]}
              initialCreatives={initialCreatives}
            />
          )}

          {/* Strategy Revision Panel */}
          <div className="border border-neutral-300 bg-white p-6 space-y-4">
            <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase text-neutral-400">
                  ITERATIVE STRATEGY REFINEMENT
                </div>
                <h4 className="font-serif-title text-base font-bold text-neutral-950 font-sans mt-0.5">
                  Request Revised Strategic Concepts
                </h4>
              </div>
              <span className="text-[10px] text-neutral-500">
                PROMPT INJECTION FOR AGENT
              </span>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-600 mb-1">
                Specific Revision Guidance
              </label>
              <textarea
                value={revisionInstructions}
                onChange={(e) => setRevisionInstructions(e.target.value)}
                placeholder="e.g. Focus Angle 1 more sharply on fast shipping. For Angle 3, suggest warm golden-hour lighting with Italian linen backdrop. Emphasize organic clinical trials in headline."
                rows={3}
                className="w-full border border-neutral-300 bg-white p-3 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                These directives guide the Vercel AI SDK Strategy Agent during the next iteration cycle.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleGenerateConcepts(true)}
                disabled={isGenerating}
                className="border border-neutral-950 bg-neutral-950 hover:bg-neutral-800 text-white px-5 py-2 uppercase font-bold tracking-wider text-xs transition-colors disabled:opacity-50"
              >
                {isGenerating ? "Synthesizing Revision..." : "Generate 3 Revised Concepts &rarr;"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concept Edit Modal */}
      {editingConcept && (
        <ConceptEditModal
          concept={editingConcept}
          isOpen={!!editingConcept}
          onClose={() => setEditingConcept(null)}
          onSave={handleSaveConceptEdits}
        />
      )}
    </div>
  );
}

