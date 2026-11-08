"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCampaign,
  type CampaignObjective,
  type ApprovedBrandWithKit,
} from "@/lib/actions/campaigns";
import { formatFullDate } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];

interface CampaignCreateFormProps {
  initialBrand: BrandRow;
  brandKit: BrandKitRow | null;
  products: ProductRow[];
  allApprovedBrands?: ApprovedBrandWithKit[];
}

const OBJECTIVES: Array<{
  value: CampaignObjective;
  title: string;
  description: string;
  funnelStage: string;
}> = [
  {
    value: "Increase conversions",
    title: "Increase Conversions",
    description:
      "Drive direct purchase conversions, cart additions, and return on ad spend (ROAS).",
    funnelStage: "BOTTOM FUNNEL • PURCHASE",
  },
  {
    value: "Product promotion",
    title: "Product Promotion",
    description:
      "Spotlight seasonal offers, bundle pricing, and hero bestseller catalog inventory.",
    funnelStage: "MID FUNNEL • CONSIDERATION",
  },
  {
    value: "Product launch",
    title: "Product Launch",
    description:
      "Introduce newly formulated items or seasonal collections with novelty hooks.",
    funnelStage: "FULL FUNNEL • MOMENTUM",
  },
  {
    value: "Brand awareness",
    title: "Brand Awareness",
    description:
      "Establish market presence, proprietary ethos, and brand equity across broad audiences.",
    funnelStage: "TOP FUNNEL • REACH",
  },
];

export function CampaignCreateForm({
  initialBrand,
  brandKit,
  products,
  allApprovedBrands = [],
}: CampaignCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected Brand state
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrand.id);

  // Form states
  const [name, setName] = useState<string>(
    `${initialBrand.name} — Direct Response Q${Math.floor((new Date().getMonth() + 3) / 3)}`
  );
  const [objective, setObjective] =
    useState<CampaignObjective>("Increase conversions");
  const [additionalInstructions, setAdditionalInstructions] =
    useState<string>("");

  // Product selection (default to products already marked is_selected, or all if none)
  const initialSelected = products
    .filter((p) => p.is_selected)
    .map((p) => p.id);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialSelected.length > 0 ? initialSelected : products.map((p) => p.id)
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    setSelectedProductIds(products.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelectedProductIds([]);
  };

  const handleBrandChange = (newBrandId: string) => {
    setSelectedBrandId(newBrandId);
    router.push(`/campaigns/new?brandId=${newBrandId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a campaign name.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMessage("At least one product must be selected for this campaign.");
      return;
    }

    startTransition(async () => {
      const res = await createCampaign({
        brandId: selectedBrandId,
        name: name.trim(),
        objective,
        additionalInstructions: additionalInstructions.trim() || undefined,
        selectedProductIds,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create campaign.");
      } else if (res.campaignId) {
        router.push(`/campaigns/${res.campaignId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Brand Context Notice (Read-only brand kit attributes) */}
      <div className="border border-neutral-300 bg-white p-6 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <div className="text-[10px] uppercase text-neutral-400">
              FOUNDATIONAL ARCHIVE • APPROVED ENTITY
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="font-serif-title text-xl font-bold text-neutral-950 font-sans">
                {initialBrand.name}
              </h2>
              <span className="border border-neutral-900 bg-neutral-950 text-white px-2 py-0.5 text-[9px] uppercase tracking-wider">
                [ APPROVED ]
              </span>
            </div>
            <div className="text-neutral-500 mt-1">
              Storefront: {initialBrand.website_url}
              {initialBrand.approved_at && (
                <span className="ml-2 text-neutral-400">
                  • Approved on {formatFullDate(initialBrand.approved_at)}
                </span>
              )}
            </div>
          </div>

          {allApprovedBrands.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500">Switch Brand:</span>
              <select
                value={selectedBrandId}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-neutral-950 focus:outline-none"
              >
                {allApprovedBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {brandKit && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-700 pt-2">
            <div>
              <div className="text-[10px] text-neutral-400 uppercase">
                Core Value Proposition
              </div>
              <p className="mt-1 line-clamp-2 text-neutral-800">
                {brandKit.value_proposition || "Established brand value"}
              </p>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 uppercase">
                Voice & Resonance
              </div>
              <p className="mt-1 line-clamp-2 text-neutral-800">
                {brandKit.brand_voice || "Authoritative and direct"}
              </p>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 uppercase">
                Target Audience Demographics
              </div>
              <p className="mt-1 line-clamp-2 text-neutral-800">
                {brandKit.target_audience || "E-commerce shoppers"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            Brand attributes are inherited directly from your verified Brand Kit.
          </span>
          <Link
            href={`/brands/${initialBrand.id}`}
            className="text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
          >
            [ Review Brand Profile ]
          </Link>
        </div>
      </div>

      {/* Campaign Parameters */}
      <div className="border border-neutral-300 bg-white p-6 space-y-6 font-mono text-xs">
        <div className="border-b border-neutral-200 pb-3">
          <div className="text-[10px] uppercase text-neutral-400">
            CAMPAIGN PARAMETERS
          </div>
          <h3 className="font-serif-title text-lg font-bold text-neutral-950 font-sans mt-1">
            Campaign Setup & Strategic Alignment
          </h3>
        </div>

        {/* Campaign Name */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-neutral-700 mb-1">
            Campaign Title <span className="text-neutral-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Radiance Serum — High Intent Conversions"
            className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none"
            required
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Unique internal identifier for grouping ad creative variants.
          </p>
        </div>

        {/* Objective Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] uppercase tracking-wider text-neutral-700">
              Advertising Objective <span className="text-neutral-400">*</span>
            </label>
            <span className="text-[10px] text-neutral-400 uppercase">
              SELECT ONE STRATEGY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OBJECTIVES.map((obj) => {
              const isSelected = objective === obj.value;
              return (
                <button
                  type="button"
                  key={obj.value}
                  onClick={() => setObjective(obj.value)}
                  className={`text-left p-4 border transition-colors ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] uppercase tracking-wider ${
                        isSelected ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {obj.funnelStage}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border ${
                        isSelected
                          ? "border-white bg-white text-neutral-950"
                          : "border-neutral-300 text-neutral-600"
                      }`}
                    >
                      {isSelected ? "[ SELECTED ]" : "SELECT"}
                    </span>
                  </div>
                  <div
                    className={`font-serif-title text-base font-bold font-sans mt-2 ${
                      isSelected ? "text-white" : "text-neutral-950"
                    }`}
                  >
                    {obj.title}
                  </div>
                  <p
                    className={`text-[11px] mt-1.5 leading-relaxed ${
                      isSelected ? "text-neutral-300" : "text-neutral-500"
                    }`}
                  >
                    {obj.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Additional Instructions */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-neutral-700 mb-1">
            Optional Strategic Directives
          </label>
          <textarea
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            rows={3}
            placeholder="e.g. Focus on pain point: dry skin after retinol use. Emphasize organic clinical trials and before/after testimonials."
            className="w-full border border-neutral-300 bg-white p-3 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Direct prompt guidance supplied to creative generation models when generating visual concepts.
          </p>
        </div>
      </div>

      {/* Product Selection Workspace */}
      <div className="border border-neutral-300 bg-white p-6 space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div>
            <div className="text-[10px] uppercase text-neutral-400">
              INVENTORY ALLOCATION
            </div>
            <h3 className="font-serif-title text-lg font-bold text-neutral-950 font-sans mt-1">
              Select Products for this Campaign ({selectedProductIds.length} of {products.length})
            </h3>
            <p className="text-neutral-500 text-[11px] mt-0.5">
              Only original catalog photography is utilized. AI creatives will feature these selected items.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="border border-neutral-300 hover:border-neutral-950 px-2.5 py-1 text-[10px] uppercase tracking-wider"
            >
              [ Select All ]
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="border border-neutral-300 hover:border-neutral-950 px-2.5 py-1 text-[10px] uppercase tracking-wider"
            >
              [ Deselect All ]
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-neutral-300 text-neutral-500">
            No products found for this brand. Please extract or add catalog products in the Brand Profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {products.map((p) => {
              const isSelected = selectedProductIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`border p-3 cursor-pointer flex flex-col justify-between transition-colors ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-50/50"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div>
                    {/* Original Product Photography */}
                    <div className="relative w-full aspect-square bg-neutral-100 border border-neutral-200 overflow-hidden mb-3">
                      {p.main_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.main_image_url}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px] uppercase">
                          No Catalog Image
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/95 px-1.5 py-0.5 border border-neutral-200 text-[9px] uppercase tracking-wider text-neutral-800">
                        ORIGINAL PHOTOGRAPHY
                      </div>
                      <div className="absolute top-2 right-2">
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border ${
                            isSelected
                              ? "bg-neutral-950 text-white border-neutral-950"
                              : "bg-white text-neutral-600 border-neutral-300"
                          }`}
                        >
                          {isSelected ? "[ SELECTED ]" : "[ INCLUDE ]"}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-neutral-950 text-xs line-clamp-2">
                      {p.title}
                    </h4>

                    {p.price && (
                      <div className="text-[11px] text-neutral-700 font-semibold mt-1">
                        {p.currency || "$"}{p.price}
                      </div>
                    )}

                    {p.description && (
                      <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[9px] text-neutral-400">
                    <span>
                      {p.user_edits && Object.keys(p.user_edits).length > 0
                        ? "User Modified"
                        : "Extracted"}
                    </span>
                    {p.product_url && (
                      <a
                        href={p.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-neutral-600 hover:text-neutral-950 underline underline-offset-2"
                      >
                        [ Storefront &nearr; ]
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="border border-red-500 bg-red-50 p-4 font-mono text-xs text-red-700">
          <div className="font-bold uppercase tracking-wider">[ ERROR ]:</div>
          <div className="mt-1">{errorMessage}</div>
        </div>
      )}

      {/* Submission Bar */}
      <div className="border border-neutral-300 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div>
          <div className="font-bold text-neutral-950">
            Ready to initialize campaign allocation
          </div>
          <div className="text-neutral-500 text-[11px] mt-0.5">
            {selectedProductIds.length} product{selectedProductIds.length === 1 ? "" : "s"} selected • Objective: {objective}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="border border-neutral-300 px-4 py-2 uppercase tracking-wider text-neutral-700 hover:border-neutral-950 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || selectedProductIds.length === 0}
            className="border border-neutral-950 bg-neutral-950 text-white px-6 py-2 uppercase tracking-wider font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Initializing Campaign..." : "Create Campaign &rarr;"}
          </button>
        </div>
      </div>
    </form>
  );
}
