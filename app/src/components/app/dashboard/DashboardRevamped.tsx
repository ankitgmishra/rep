"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Download,
  Eye,
  ChevronRight,
  X,
  Search,
  Bot,
  LayoutDashboard,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { AgentChatWorkspace } from "@/components/agent/AgentChatWorkspace";

export interface BrandItem {
  id: string;
  name: string;
  website_url: string;
  industry: string | null;
  research_status: string;
  approval_status?: string;
  created_at: string;
}

export interface CampaignItem {
  id: string;
  name: string;
  objective: string;
  brand_id: string;
  brand_name?: string;
  status: string;
  created_at: string;
  approved_concept_id?: string | null;
}

export interface CreativeItem {
  id: string;
  title: string;
  headline?: string | null;
  supporting_copy?: string | null;
  cta?: string | null;
  asset_url: string | null;
  storage_path?: string | null;
  status: string;
  created_at: string;
  signedUrl?: string | null;
  brand_name?: string;
}

interface DashboardRevampedProps {
  userName: string;
  userEmail: string;
  initialBrands: BrandItem[];
  initialCampaigns: CampaignItem[];
  initialCreatives: CreativeItem[];
}

export function DashboardRevamped({
  userName,
  initialBrands,
  initialCampaigns,
  initialCreatives,
}: DashboardRevampedProps) {
  const router = useRouter();

  const [brands, setBrands] = useState<BrandItem[]>(initialBrands);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [creatives, setCreatives] = useState<CreativeItem[]>(initialCreatives);

  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  useEffect(() => {
    setCreatives(initialCreatives);
  }, [initialCreatives]);

  // Quick store URL input
  const [quickUrl, setQuickUrl] = useState("");
  const [viewMode, setViewMode] = useState<"agent" | "overview">("agent");

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: "brand" | "campaign" | "creative" | null;
    id: string | null;
    name: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: null,
    isLoading: false,
  });

  // Preview modal state
  const [previewCreative, setPreviewCreative] = useState<CreativeItem | null>(null);

  // Toast notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const hasBrands = brands.length > 0;
  const hasCampaigns = campaigns.length > 0;
  const hasCreatives = creatives.length > 0;

  // Handle Quick Connect
  const handleQuickConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    router.push(`/brands/new?url=${encodeURIComponent(quickUrl.trim())}`);
  };

  // Open Delete Modal
  const openDeleteModal = (
    type: "brand" | "campaign" | "creative",
    id: string,
    name: string
  ) => {
    setDeleteModalState({
      isOpen: true,
      type,
      id,
      name,
      isLoading: false,
    });
  };

  // Close Delete Modal
  const closeDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      type: null,
      id: null,
      name: null,
      isLoading: false,
    });
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    const { type, id } = deleteModalState;
    if (!type || !id) return;

    setDeleteModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      let endpoint = "";
      if (type === "brand") endpoint = `/api/brands/${id}`;
      else if (type === "campaign") endpoint = `/api/campaigns/${id}`;
      else if (type === "creative") endpoint = `/api/creatives/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || `Failed to delete ${type}`);
        setDeleteModalState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Optimistic state updates
      if (type === "brand") {
        setBrands((prev) => prev.filter((b) => b.id !== id));
        setCampaigns((prev) => prev.filter((c) => c.brand_id !== id));
        showToast("Store deleted successfully.");
      } else if (type === "campaign") {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        showToast("Campaign deleted successfully.");
      } else if (type === "creative") {
        setCreatives((prev) => prev.filter((c) => c.id !== id));
        if (previewCreative?.id === id) setPreviewCreative(null);
        showToast("Ad creative deleted successfully.");
      }

      closeDeleteModal();
      router.refresh();
    } catch {
      showToast(`Error deleting ${type}`);
      setDeleteModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={deleteModalState.isLoading}
        title={`Delete ${
          deleteModalState.type === "brand"
            ? "Store"
            : deleteModalState.type === "campaign"
            ? "Campaign"
            : "Ad Creative"
        }?`}
        description={
          deleteModalState.type === "brand"
            ? "This will remove the store and all of its indexed products, strategy concepts, and generated creatives."
            : deleteModalState.type === "campaign"
            ? "This will delete this campaign and all associated generated creative sets."
            : "This will permanently remove this 9:16 portrait ad asset."
        }
        itemName={deleteModalState.name || undefined}
      />

      {/* 9:16 Portrait Ad Preview Modal */}
      {previewCreative && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewCreative(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-xs text-slate-950 truncate max-w-[240px]">
                  {previewCreative.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCreative(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 9:16 Preview Canvas */}
            <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewCreative.signedUrl || previewCreative.asset_url || ""}
                alt={previewCreative.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white text-[10px] font-medium tracking-wide">
                9:16 Vertical Ad
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <a
                href={previewCreative.signedUrl || previewCreative.asset_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </a>

              <div className="flex items-center gap-2">
                <Link
                  href={`/creatives/${previewCreative.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 text-white hover:bg-slate-800 transition-colors"
                >
                  <span>Edit in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openDeleteModal(
                      "creative",
                      previewCreative.id,
                      previewCreative.title
                    )
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete ad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-serif-title text-2xl font-bold tracking-tight text-slate-950">
            AI Ads Workspace
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agent-first ecommerce brand research, concept strategy, and 9:16 portrait ad production.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("agent")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "agent"
                ? "bg-white text-slate-950 shadow-xs ring-1 ring-slate-950/10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Ads Agent</span>
          </button>
          <button
            onClick={() => setViewMode("overview")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "overview"
                ? "bg-white text-slate-950 shadow-xs ring-1 ring-slate-950/10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
            <span>Overview & Assets</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render Agent Chat or Overview */}
      {viewMode === "agent" ? (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
          <AgentChatWorkspace initialStoreUrl={quickUrl} />
        </div>
      ) : (
        <>
      {/* 1. Cadra Hero Ingestion Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        {/* Subtle Draft Grid Backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-draft-grid-subtle opacity-40" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-3 max-w-2xl">
            {/* Category Pill matching Cadra frontend */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ploy Autonomous Studio</span>
            </div>

            {/* Authoritative Editorial Serif Title */}
            <h1 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-slate-950 leading-[1.12]">
              Welcome back, {userName || "Marketer"}.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Turn your ecommerce storefront into high-converting 9:16 portrait ads in minutes. 
              Scan your domain or launch a targeted campaign from your indexed catalog.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-1">
            <Link
              href="/brands/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-xs font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Store</span>
            </Link>
            {hasBrands && (
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs"
              >
                <span>New Campaign</span>
              </Link>
            )}
          </div>
        </div>

        {/* Store URL Ingestion Form matching Cadra Hero */}
        <div className="relative z-10 mt-6 max-w-2xl">
          <form
            onSubmit={handleQuickConnect}
            className="flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-slate-300/80 bg-white p-1.5 shadow-xs focus-within:border-slate-950 focus-within:ring-1 focus-within:ring-slate-950/10 transition-all"
          >
            <div className="relative flex-1 w-full flex items-center pl-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="Enter store website link (e.g. loopycases.com or allbirds.com)..."
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 bg-transparent focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={!quickUrl.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium transition-all shrink-0 cursor-pointer"
            >
              <span>Scan Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 3-Step Simple Flow (Cadra Architecture Cards) */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Workflow Overview
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Step 1 */}
            <div
              className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                hasBrands
                  ? "bg-slate-50/70 border-emerald-300/70"
                  : "bg-white border-slate-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                  hasBrands
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {hasBrands ? "✓" : "1"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-950 flex items-center gap-1.5">
                  <span>1. Storefront</span>
                  {hasBrands && (
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 rounded">
                      Ready
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {hasBrands ? `${brands.length} stores indexed` : "Scan public website"}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                hasCampaigns
                  ? "bg-slate-50/70 border-emerald-300/70"
                  : "bg-white border-slate-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                  hasCampaigns
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {hasCampaigns ? "✓" : "2"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-950 flex items-center gap-1.5">
                  <span>2. Angles</span>
                  {hasCampaigns && (
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 rounded">
                      Approved
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {hasCampaigns ? `${campaigns.length} campaigns active` : "Target direct-response hooks"}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                hasCreatives
                  ? "bg-slate-50/70 border-emerald-300/70"
                  : "bg-white border-slate-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                  hasCreatives
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {hasCreatives ? "✓" : "3"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-950 flex items-center gap-1.5">
                  <span>3. 9:16 Creatives</span>
                  {hasCreatives && (
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 rounded">
                      Live
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {hasCreatives ? `${creatives.length} ads generated` : "Meta & TikTok assets"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Connected Stores Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="font-serif-title text-xl text-slate-950 font-normal">
              Connected Stores ({brands.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Online storefronts indexed for product packshots, typography, and brand identity.
            </p>
          </div>
          <Link
            href="/brands/new"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Store</span>
          </Link>
        </div>

        {!hasBrands ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Store className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-serif-title text-base text-slate-950 font-normal mt-2.5">
              No stores connected yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Connect a store link to automatically extract colors, typography, logos, and authentic product photography.
            </p>
            <div className="mt-4">
              <Link
                href="/brands/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-medium shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Store Now</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {brands.map((b) => {
              const isApproved = b.approval_status === "approved";
              const isResearching = b.research_status === "researching";
              const domain = b.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 p-4.5 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-950 truncate">
                          {b.name}
                        </div>
                        <a
                          href={b.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mt-0.5 truncate max-w-full"
                        >
                          <span>{domain}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : isResearching
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isApproved ? "Approved" : isResearching ? "Scanning" : "Ready"}
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => openDeleteModal("brand", b.id, b.name)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete store"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <Link
                      href={`/brands/${b.id}`}
                      className="font-medium text-slate-600 hover:text-slate-950 transition-colors"
                    >
                      View Details
                    </Link>

                    <Link
                      href={`/campaigns/new?brandId=${b.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-medium transition-colors"
                    >
                      <span>Create Ads</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Active Campaigns Section */}
      {hasCampaigns && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="font-serif-title text-xl text-slate-950 font-normal">
                Active Campaigns ({campaigns.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strategic advertising concepts and direct-response angles assigned to products.
              </p>
            </div>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 p-4.5 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500 truncate max-w-[160px]">
                      {c.brand_name || "Storefront"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openDeleteModal("campaign", c.id, c.name)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-950 truncate">
                    {c.name}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Objective: <span className="text-slate-700 font-medium">{c.objective}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {c.approved_concept_id ? "✓ Angle Approved" : "Angle Pending"}
                  </span>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="inline-flex items-center gap-1 font-medium text-slate-950 hover:text-slate-700 transition-colors"
                  >
                    <span>Open Campaign</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Ready-to-Run Ads Gallery (9:16 Portrait) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="font-serif-title text-xl text-slate-950 font-normal">
              Ready-to-Run Ads ({creatives.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              9:16 portrait advertising creatives composed for Meta Stories, Reels, and TikTok.
            </p>
          </div>
          <Link
            href="/creatives"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-600 transition-colors"
          >
            <span>View All ({creatives.length}) &rarr;</span>
          </Link>
        </div>

        {!hasCreatives ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-serif-title text-base text-slate-950 font-normal mt-2.5">
              No ads generated yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select an approved storefront and campaign angle to generate your first batch of 9:16 portrait ads.
            </p>
            <div className="mt-4">
              <Link
                href={hasBrands ? "/campaigns/new" : "/brands/new"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-medium shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{hasBrands ? "Create Campaign" : "Connect Store"}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
            {creatives.slice(0, 8).map((cr) => {
              const displayUrl = cr.signedUrl || cr.asset_url;

              return (
                <div
                  key={cr.id}
                  className="group rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  {/* Portrait 9:16 Image Canvas */}
                  <div
                    className="relative aspect-[9/16] bg-slate-950 overflow-hidden cursor-pointer"
                    onClick={() => setPreviewCreative(cr)}
                  >
                    {displayUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayUrl}
                        alt={cr.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium p-4 text-center">
                        Synthesizing Ad...
                      </div>
                    )}

                    {/* Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-white text-[9px] font-semibold tracking-wide">
                      9:16
                    </div>

                    {/* Quick Hover Action Bar */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCreative(cr);
                        }}
                        className="p-1 rounded bg-white/90 hover:bg-white text-slate-900 transition-colors cursor-pointer"
                        title="Preview full screen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {displayUrl && (
                          <a
                            href={displayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded bg-white/90 hover:bg-white text-slate-900 transition-colors"
                            title="Download image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal("creative", cr.id, cr.title);
                          }}
                          className="p-1 rounded bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
                          title="Delete ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Information */}
                  <div className="p-3 bg-white space-y-1">
                    <div className="font-semibold text-xs text-slate-950 truncate">
                      {cr.title}
                    </div>
                    {cr.headline && (
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        &ldquo;{cr.headline}&rdquo;
                      </div>
                    )}
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">
                        {cr.cta || "Shop Now"}
                      </span>
                      <Link
                        href={`/creatives/${cr.id}`}
                        className="text-slate-950 font-medium hover:underline"
                      >
                        Inspect &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
