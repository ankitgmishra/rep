"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BrandEditModal } from "@/components/app/brand/BrandEditModal";
import { ProductEditModal } from "@/components/app/brand/ProductEditModal";
import {
  toggleProductSelection,
  toggleSelectAllProducts,
  approveBrand,
} from "@/lib/actions/brands";
import { formatFullDate } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type BrandKit = Database["public"]["Tables"]["brand_kits"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

interface ColorItem {
  hex: string;
  name?: string;
  usage?: string;
  is_inferred?: boolean;
}

interface SellingPointItem {
  point: string;
  is_inferred: boolean;
}

interface BrandCodexViewProps {
  brand: Brand;
  initialBrandKit: BrandKit | null;
  initialProducts: Product[];
}

export function BrandCodexView({
  brand,
  initialBrandKit,
  initialProducts,
}: BrandCodexViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoStartedRef = useRef(false);

  const [brandData, setBrandData] = useState<Brand>(brand);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(initialBrandKit);
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Research execution state
  const [isResearching, setIsResearching] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [progressLogs, setProgressLogs] = useState<Array<{ step: string; message: string; timestamp: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing state
  const [isBrandEditOpen, setIsBrandEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Approval state
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(
    brand.approval_status === "approved" ? "Brand has been verified and approved." : null
  );

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Trigger autonomous research stream via SSE
  const startResearch = useCallback(async () => {
    setIsResearching(true);
    setErrorMessage(null);
    setCurrentStep("inspecting");
    setProgressLogs([
      {
        step: "inspecting",
        message: `Connecting to ${brand.website_url}...`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const response = await fetch(`/api/brands/${brand.id}/research`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Research request failed: HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No readable event stream received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(trimmed.slice(6));
              setCurrentStep(eventData.step);
              setProgressLogs((prev) => [
                ...prev,
                {
                  step: eventData.step,
                  message: eventData.message,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);

              if (eventData.step === "failed") {
                setErrorMessage(eventData.message);
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }

      // Refetch updated data from server
      const refreshRes = await fetch(`/api/brands/${brand.id}/research`);
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        if (json.brand) setBrandData(json.brand);
        if (json.brandKit) setBrandKit(json.brandKit);
        if (json.products) setProducts(json.products);
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Research execution failed.";
      setErrorMessage(msg);
      setCurrentStep("failed");
    } finally {
      setIsResearching(false);
    }
  }, [brand.id, brand.website_url, router]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLogs]);

  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    const shouldAutoStart =
      searchParams.get("autoStart") === "true" ||
      (brand.research_status === "pending_research" && !initialBrandKit);

    if (shouldAutoStart) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        startResearch();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [brand.research_status, initialBrandKit, searchParams, startResearch]);

  // Handle single product selection toggle
  const handleToggleProduct = async (productId: string, currentSelected: boolean) => {
    const nextState = !currentSelected;
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_selected: nextState } : p))
    );

    const res = await toggleProductSelection(productId, nextState);
    if (!res.success) {
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_selected: currentSelected } : p))
      );
    }
  };

  // Handle select all / deselect all
  const handleToggleAllProducts = async (selectAll: boolean) => {
    // Optimistic update
    setProducts((prev) => prev.map((p) => ({ ...p, is_selected: selectAll })));

    const res = await toggleSelectAllProducts(brandData.id, selectAll);
    if (!res.success) {
      router.refresh();
    }
  };

  // Handle Human Approval Checkpoint
  const handleApproveBrand = async () => {
    setApprovalError(null);
    setApprovalSuccess(null);

    const selectedCount = products.filter((p) => p.is_selected).length;
    if (selectedCount === 0) {
      setApprovalError("At least one product must be selected for advertising before approving this brand.");
      return;
    }

    setIsApproving(true);

    try {
      const result = await approveBrand(brandData.id);

      if (!result.success) {
        setApprovalError(result.error || "Approval failed.");
        setIsApproving(false);
        return;
      }

      setBrandData((prev) => ({
        ...prev,
        approval_status: "approved",
        approved_at: result.approvedAt || new Date().toISOString(),
      }));

      if (brandKit) {
        setBrandKit((prev) =>
          prev
            ? {
                ...prev,
                approval_status: "approved",
                approved_at: result.approvedAt || new Date().toISOString(),
              }
            : null
        );
      }

      setApprovalSuccess("Brand verified and approved! You may now proceed to Campaign Creation.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval request failed.";
      setApprovalError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  const domain = brandData.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Parse color items safely
  const colors: ColorItem[] = Array.isArray(brandKit?.brand_colors)
    ? (brandKit.brand_colors as unknown as ColorItem[])
    : [];

  // Parse key selling points safely
  const sellingPoints: SellingPointItem[] = Array.isArray(brandKit?.key_selling_points)
    ? (brandKit.key_selling_points as unknown as SellingPointItem[])
    : [];

  // Parse missing information
  const missingInfo: string[] = Array.isArray(brandKit?.missing_information)
    ? (brandKit.missing_information as unknown as string[])
    : [];

  // User edits map
  const userEdits = (brandKit?.user_edits as Record<string, unknown>) || {};

  const hasResearch = brandKit !== null;
  const isPending = brandData.research_status === "pending_research" && !hasResearch;
  const isFailed = brandData.research_status === "failed" && !hasResearch;
  const selectedProducts = products.filter((p) => p.is_selected);
  const isApproved = brandData.approval_status === "approved";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/brands"
            className="hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
          >
            ← Brands
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-md">
            {brandData.name}
          </span>
        </div>

        {isApproved && (
          <Link
            href={`/campaigns/new?brandId=${brandData.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 font-medium text-xs shadow-sm transition-colors self-start sm:self-auto"
          >
            Create Campaign with this Brand →
          </Link>
        )}
      </div>

      {/* Brand Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            {brandKit?.logo_url ? (
              <div className="h-16 w-16 rounded-lg border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandKit.logo_url}
                  alt={`${brandData.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg bg-slate-900 text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-xs">
                {brandData.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {brandKit?.brand_name || brandData.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    isApproved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isApproved ? "✓ Approved" : "● Needs Review"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                <span>Storefront:</span>
                <a
                  href={brandData.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  {domain}
                  <span className="text-[10px]">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Edit Brand Kit Action */}
            {hasResearch && (
              <button
                type="button"
                onClick={() => setIsBrandEditOpen(true)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
              >
                Edit Brand Info
              </button>
            )}

            {/* Re-run Research */}
            <button
              type="button"
              disabled={isResearching}
              onClick={startResearch}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {isResearching ? "Analyzing Store..." : hasResearch ? "Re-crawl Store" : "Analyze Storefront"}
            </button>
          </div>
        </div>

        {/* Brand Meta Highlights */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs text-slate-500 font-medium">Status</div>
            <div className={`mt-1 font-semibold text-sm ${isApproved ? "text-emerald-700" : "text-amber-700"}`}>
              {isApproved ? "Approved" : "Awaiting Review"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {isApproved && brandData.approved_at
                ? formatFullDate(brandData.approved_at)
                : "Step 1 of 3"}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs text-slate-500 font-medium">Active for Ads</div>
            <div className="mt-1 font-semibold text-slate-900 text-sm">
              {selectedProducts.length} of {products.length} Products
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {selectedProducts.length > 0 ? "Ready to generate" : "Select at least 1"}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs text-slate-500 font-medium">Brand Palette</div>
            <div className="mt-1 font-semibold text-slate-900 text-sm">{colors.length} Colors Extracted</div>
            <div className="text-xs text-slate-400 mt-0.5">Used for ad typography</div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs text-slate-500 font-medium">Industry</div>
            <div className="mt-1 font-semibold text-slate-900 text-sm truncate">{brandData.industry || "Ecommerce"}</div>
            <div className="text-xs text-slate-400 mt-0.5">Direct to Consumer</div>
          </div>
        </div>
      </div>

      {/* REAL-TIME RESEARCH PROGRESS STREAMING PANEL */}
      {isResearching && (
        <div className="rounded-xl border border-slate-900 bg-slate-900 text-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>AI Research Agent Active</span>
            </div>
            <span className="text-xs text-slate-400">
              Stage: <strong className="text-white">{currentStep}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { id: "inspecting", label: "1. Inspect Store" },
              { id: "identity", label: "2. Brand Identity" },
              { id: "discovering_products", label: "3. Catalog Discovery" },
              { id: "extracting_products", label: "4. Product Photos" },
              { id: "organizing", label: "5. Formulate Kit" },
            ].map((st) => {
              const isPast =
                (st.id === "inspecting" && currentStep !== "inspecting") ||
                (st.id === "identity" && !["inspecting", "identity"].includes(currentStep)) ||
                (st.id === "discovering_products" && !["inspecting", "identity", "discovering_products"].includes(currentStep)) ||
                (st.id === "extracting_products" && ["organizing", "persisting", "completed"].includes(currentStep));
              const isCurrent = currentStep === st.id;

              return (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-lg text-center font-medium ${
                    isCurrent
                      ? "bg-emerald-950/80 border border-emerald-500 text-emerald-300"
                      : isPast
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-800/40 text-slate-500"
                  }`}
                >
                  {st.label}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-black/50 p-4 max-h-48 overflow-y-auto text-xs space-y-1.5 font-mono text-slate-300">
            {progressLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-500 text-[11px]">[{log.timestamp}]</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ERROR MESSAGE DISPLAY */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-2 text-xs text-red-900">
          <div className="font-semibold text-sm">Research Error</div>
          <p>{errorMessage}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={startResearch}
              className="px-3 py-1.5 rounded-md border border-red-300 bg-white font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      )}

      {/* INITIAL PENDING RESEARCH STATE */}
      {isPending && !isResearching && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-4 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-indigo-600">
            Storefront Analysis
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Ready to Analyze {brandData.name}
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
            Click below to research <strong className="text-slate-900">{brandData.website_url}</strong>. We will extract real product photos, colors, value propositions, and direct-response angles.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={startResearch}
              className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              Start Store Analysis →
            </button>
          </div>
        </div>
      )}

      {/* INITIAL FAILED STATE */}
      {isFailed && !isResearching && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center space-y-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-red-600">
            Extraction Incomplete
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Could Not Extract Store Data
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
            The crawler was unable to reach the store. Verify the domain URL and try again.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={startResearch}
              className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
            >
              Retry Now →
            </button>
          </div>
        </div>
      )}

      {/* EXTRACTED BRAND INTELLIGENCE REVIEW PROFILE */}
      {hasResearch && (
        <div className="space-y-6">
          {/* Executive Research Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Storefront Overview
              </span>
              <button
                type="button"
                onClick={() => setIsBrandEditOpen(true)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Edit Summary
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {brandKit.summary}
            </p>
            {brandKit.website_description && (
              <div className="border-l-3 border-indigo-500 pl-4 py-1 text-xs text-slate-600 italic">
                &ldquo;{brandKit.website_description}&rdquo;
                <div className="mt-1 flex items-center gap-2 not-italic text-[11px] text-slate-400">
                  <span>Storefront meta description</span>
                  <span>•</span>
                  <a
                    href={brandKit.source_url || brandData.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 underline hover:text-slate-900"
                  >
                    View Source
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Section: Brand Identity & Guidelines */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Brand Strategy
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Identity & Positioning
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI-extracted direct-response positioning used to guide headline and copy generation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBrandEditOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors self-start sm:self-auto"
              >
                Edit Strategy
              </button>
            </div>

            {/* Grid of Attributes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Value Proposition */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">VALUE PROPOSITION</span>
                  {userEdits.value_proposition ? (
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-medium text-[10px]">
                      Customized
                    </span>
                  ) : brandKit.value_proposition_is_inferred ? (
                    <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-medium text-[10px]">
                      AI Inferred
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium text-[10px]">
                      From Storefront
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  {brandKit.value_proposition}
                </div>
              </div>

              {/* Editorial Brand Voice */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">BRAND VOICE</span>
                  {userEdits.brand_voice ? (
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-medium text-[10px]">
                      Customized
                    </span>
                  ) : brandKit.brand_voice_is_inferred ? (
                    <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-medium text-[10px]">
                      AI Inferred
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium text-[10px]">
                      From Storefront
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  {brandKit.brand_voice}
                </div>
              </div>

              {/* Target Audience Profile */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TARGET AUDIENCE</span>
                  {userEdits.target_audience ? (
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-medium text-[10px]">
                      Customized
                    </span>
                  ) : brandKit.target_audience_is_inferred ? (
                    <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-medium text-[10px]">
                      AI Inferred
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium text-[10px]">
                      From Storefront
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  {brandKit.target_audience}
                </div>
              </div>

              {/* Policies: Shipping & Returns */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">STORE GUARANTEES</span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium text-[10px]">
                    Extracted
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium mr-1.5">Shipping:</span>
                    <span className="font-semibold text-slate-900">
                      {brandKit.shipping_info ? brandKit.shipping_info.slice(0, 140) : "Standard shipping confirmed at checkout"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium mr-1.5">Returns:</span>
                    <span className="font-semibold text-slate-900">
                      {brandKit.return_policy ? brandKit.return_policy.slice(0, 140) : "Standard return policy applies"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Selling Points Checklist */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Key Selling Angles ({sellingPoints.length})
                </span>
                <span className="text-xs text-slate-400">
                  Used in ad headlines & benefit bullet cards
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sellingPoints.map((sp, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-100 bg-white p-3 flex items-start justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="font-bold text-slate-400 text-xs">0{idx + 1}.</span>
                      <span className="text-xs text-slate-800 leading-snug">{sp.point}</span>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        sp.is_inferred
                          ? "border-purple-200 bg-purple-50 text-purple-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {sp.is_inferred ? "AI" : "Verified"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Brand Colors */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Extracted Color Palette
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {colors.map((c, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2 shadow-xs">
                    <div
                      className="h-10 w-full rounded-md border border-slate-200/80 shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{c.hex}</div>
                      <div className="text-[10px] text-slate-500 truncate">{c.usage || "Accent"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Product Catalog Gallery & Selection for Campaigns */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Store Products
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Select Products to Advertise ({products.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose which products to include in ad generation. Authentic product packshots are preserved.
                </p>
              </div>

              {/* Product Selection Controls */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium text-xs">
                  {selectedProducts.length} of {products.length} Selected
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleAllProducts(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllProducts(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-slate-500 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {products.length === 0 ? (
              <EmptyState
                title="No Products Discovered"
                description="The crawler could not find product items on this store."
                actionText="Re-crawl Store"
                onActionClick={startResearch}
                badge="CATALOG EMPTY"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p) => {
                  const isSelected = !!p.is_selected;
                  const hasEdits = !!(p.user_edits && Object.keys(p.user_edits as object).length > 0);

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border bg-white flex flex-col justify-between overflow-hidden transition-all ${
                        isSelected
                          ? "border-slate-900 ring-2 ring-slate-900 shadow-md"
                          : "border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Real Product Image (Never replaced with generated image) */}
                      <div className="relative aspect-square w-full bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center p-4">
                        {p.main_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.main_image_url}
                            alt={p.title}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-xs text-slate-400">No Image Available</div>
                        )}

                        {/* Top Badges Overlay */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white/95 text-slate-600 border-slate-200"
                            }`}
                          >
                            {isSelected ? "✓ Included in Ads" : "Not Selected"}
                          </span>

                          {hasEdits && (
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                              Edited
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 uppercase text-[10px] font-semibold truncate max-w-[140px]">
                              {p.category || "General"}
                            </span>
                            <span className="font-bold text-slate-900">
                              {p.price_formatted || (p.price ? `$${Number(p.price).toFixed(2)}` : "Price unlisted")}
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                            {p.title}
                          </h3>

                          {p.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>
                          )}
                        </div>

                        {/* Actions: Select Toggle & Edit SKU */}
                        <div className="border-t border-slate-100 pt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleProduct(p.id, isSelected)}
                              className={`w-full py-2 rounded-lg font-medium text-xs text-center transition-colors shadow-xs ${
                                isSelected
                                  ? "bg-slate-900 text-white hover:bg-slate-800"
                                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {isSelected ? "✓ Selected for Ads" : "+ Include in Ads"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0 transition-colors"
                            >
                              Edit
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>Original store photo</span>
                            <a
                              href={p.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              View on Store ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HUMAN APPROVAL CHECKPOINT BLOCK */}
          <div
            id="approval-checkpoint"
            className={`rounded-xl border p-6 space-y-4 shadow-sm transition-colors ${
              isApproved
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-slate-300 bg-slate-50/70"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <span className="font-bold text-slate-900 text-sm">
                Human Review & Approval
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  isApproved
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                    : "border-amber-200 bg-amber-100 text-amber-800"
                }`}
              >
                {isApproved ? "✓ Approved" : "Awaiting Review"}
              </span>
            </div>

            {/* Checklist of Pre-Approval Requirements */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {isApproved
                  ? `Brand Approved for Advertising`
                  : `Review and Approve Brand to Generate Ads`}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {isApproved
                  ? `This brand kit and its selected products have been reviewed. You can now generate high-converting 9:16 ads.`
                  : `Please check the extracted store details and make sure at least one product is selected before proceeding.`}
              </p>
            </div>

            {/* Live Requirements Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">01. Brand Name</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span className="font-semibold text-slate-900 truncate">
                    {brandKit.brand_name || brandData.name}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">02. Value Proposition</span>
                <div className="flex items-center gap-2">
                  {brandKit.value_proposition ? (
                    <>
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span className="font-semibold text-slate-900 truncate">Confirmed</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-500 font-bold">✕</span>
                      <span className="text-red-600 font-semibold">Missing</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">03. Selected Products</span>
                <div className="flex items-center gap-2">
                  {selectedProducts.length >= 1 ? (
                    <>
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProducts.length} Product(s) Selected
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-500 font-bold">✕</span>
                      <span className="text-red-600 font-semibold">Select at least 1</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Error or Success Feedback */}
            {approvalError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {approvalError}
              </div>
            )}

            {approvalSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {approvalSuccess}
              </div>
            )}

            {/* Checkpoint Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
              {isApproved ? (
                <>
                  <Link
                    href={`/campaigns/new?brandId=${brandData.id}`}
                    className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 font-medium text-xs transition-colors shadow-sm"
                  >
                    Proceed to Create Campaign →
                  </Link>
                  <button
                    type="button"
                    onClick={handleApproveBrand}
                    disabled={isApproving}
                    className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 font-medium text-xs text-slate-700 transition-colors shadow-xs"
                  >
                    Re-verify Approval
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleApproveBrand}
                  disabled={isApproving || selectedProducts.length === 0}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  {isApproving ? "Approving..." : "Approve Brand & Continue →"}
                </button>
              )}

              <Link
                href="/brands"
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors shadow-xs"
              >
                ← Back to Brands
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {brandKit && (
        <BrandEditModal
          brandId={brandData.id}
          brandKit={brandKit}
          isOpen={isBrandEditOpen}
          onClose={() => setIsBrandEditOpen(false)}
          onSaved={(updatedKit) => {
            setBrandKit(updatedKit);
            setBrandData((prev) => ({ ...prev, name: updatedKit.brand_name }));
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(updatedProduct) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
