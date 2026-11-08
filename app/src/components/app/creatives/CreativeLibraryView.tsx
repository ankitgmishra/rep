"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CreativeWithSignedUrl } from "@/lib/actions/creatives";
import type { CampaignWithBrand } from "@/lib/actions/campaigns";
import type { Database } from "@/lib/supabase/types";
import {
  Search,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  Layers,
  Trash2,
  Store,
  Sparkles,
  Download,
  FolderKanban,
  Check,
  ExternalLink,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { formatDisplayDate } from "@/lib/utils";

type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

interface Props {
  initialCreatives: CreativeWithSignedUrl[];
  initialBrands?: BrandRow[];
  initialCampaigns?: CampaignWithBrand[];
}

export function CreativeLibraryView({
  initialCreatives,
  initialBrands = [],
  initialCampaigns = [],
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"creatives" | "brands" | "campaigns">("creatives");

  // Creatives state
  const [creativesList, setCreativesList] = useState<CreativeWithSignedUrl[]>(initialCreatives);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Brands state
  const [brandsList, setBrandsList] = useState<BrandRow[]>(initialBrands);
  const [deleteBrandTarget, setDeleteBrandTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);

  useEffect(() => {
    setCreativesList(initialCreatives);
  }, [initialCreatives]);

  useEffect(() => {
    setBrandsList(initialBrands);
  }, [initialBrands]);

  const handleDeleteBrand = async () => {
    if (!deleteBrandTarget) return;
    const targetId = deleteBrandTarget.id;
    setIsDeletingBrand(true);
    setBrandsList((prev) => prev.filter((b) => b.id !== targetId));
    setDeleteBrandTarget(null);

    try {
      const res = await fetch(`/api/brands/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        setBrandsList(initialBrands);
      } else {
        router.refresh();
      }
    } catch {
      setBrandsList(initialBrands);
    } finally {
      setIsDeletingBrand(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setIsDeleting(true);

    // Optimistic removal: visually removed immediately
    setCreativesList((prev) => prev.filter((c) => c.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/creatives/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreativesList(initialCreatives);
      } else {
        router.refresh();
      }
    } catch {
      setCreativesList(initialCreatives);
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract unique brands and campaigns for creative filters
  const filterBrands = useMemo(() => {
    const map = new Map<string, string>();
    creativesList.forEach((c) => {
      if (c.brand?.name) {
        map.set(c.brand.name, c.brand.name);
      }
    });
    return Array.from(map.values()).sort();
  }, [creativesList]);

  const filterCampaigns = useMemo(() => {
    const map = new Map<string, string>();
    creativesList.forEach((c) => {
      if (c.campaign?.name) {
        map.set(c.campaign.name, c.campaign.name);
      }
    });
    return Array.from(map.values()).sort();
  }, [creativesList]);

  // Filter creatives
  const filteredCreatives = useMemo(() => {
    return creativesList.filter((c) => {
      if (selectedBrand !== "all" && c.brand?.name !== selectedBrand) {
        return false;
      }
      if (selectedCampaign !== "all" && c.campaign?.name !== selectedCampaign) {
        return false;
      }
      if (selectedStatus !== "all") {
        const approval = c.activeVersionApprovalStatus || "pending";
        if (selectedStatus === "approved" && approval !== "approved") return false;
        if (selectedStatus === "rejected" && approval !== "rejected") return false;
        if (selectedStatus === "pending" && approval !== "pending") return false;
        if (selectedStatus === "processing" && c.status !== "processing") return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const headlineMatch = c.headline.toLowerCase().includes(query);
        const productMatch = c.product?.title.toLowerCase().includes(query) || false;
        const brandMatch = c.brand?.name.toLowerCase().includes(query) || false;
        if (!headlineMatch && !productMatch && !brandMatch) return false;
      }
      return true;
    });
  }, [creativesList, selectedBrand, selectedCampaign, selectedStatus, searchQuery]);

  const hasFiltersActive =
    selectedBrand !== "all" ||
    selectedCampaign !== "all" ||
    selectedStatus !== "all" ||
    Boolean(searchQuery.trim());

  return (
    <div className="space-y-6 text-slate-900 dark:text-neutral-100 p-6 sm:p-8 max-w-7xl mx-auto transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Saved Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            All your synthesized 9:16 portrait ads, brand research assets, and campaign strategies in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 px-4 py-2 text-xs font-semibold transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>New Ad in Chat</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("creatives")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            activeTab === "creatives"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800/60"
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Saved Ads</span>
          <span className="text-[10px] rounded-full px-1.5 py-0.2 bg-white/20 dark:bg-black/20">
            {creativesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("brands")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            activeTab === "brands"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800/60"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Saved Stores & Pipeline</span>
          <span className="text-[10px] rounded-full px-1.5 py-0.2 bg-white/20 dark:bg-black/20">
            {brandsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            activeTab === "campaigns"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Saved Campaigns</span>
          <span className="text-[10px] rounded-full px-1.5 py-0.2 bg-white/20 dark:bg-black/20">
            {initialCampaigns.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SAVED ADS */}
      {activeTab === "creatives" && (
        <div className="space-y-6">
          {/* Filter Controls Bar */}
          {initialCreatives.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search headlines or products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 w-48 sm:w-60 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-all"
                  />
                </div>

                {/* Brand Filter */}
                {filterBrands.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">Brand:</span>
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/70 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Brands ({filterBrands.length})</option>
                      {filterBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Campaign Filter */}
                {filterCampaigns.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">Campaign:</span>
                    <select
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/70 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Campaigns ({filterCampaigns.length})</option>
                      {filterCampaigns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/70 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>

              {hasFiltersActive && (
                <button
                  onClick={() => {
                    setSelectedBrand("all");
                    setSelectedCampaign("all");
                    setSelectedStatus("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white font-medium cursor-pointer ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          )}

          {/* Creatives Grid */}
          {initialCreatives.length === 0 ? (
            <EmptyState
              title="No Saved Creatives Yet"
              description="Ads generated in chat are automatically saved here with version history, visual checks, and feedback."
              actionText="Generate Ads in Chat"
              actionHref="/dashboard"
            />
          ) : filteredCreatives.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-12 text-center space-y-3">
              <p className="text-slate-900 dark:text-white font-semibold text-base">
                No creatives match your filter criteria
              </p>
              <p className="text-slate-500 dark:text-neutral-400 text-xs max-w-sm mx-auto">
                Try resetting your search query or selecting a different brand or campaign.
              </p>
              <button
                onClick={() => {
                  setSelectedBrand("all");
                  setSelectedCampaign("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreatives.map((cr) => {
                const displayUrl = cr.freshSignedUrl || cr.asset_url;
                const campaignTitle = cr.campaign?.name || "Campaign";
                const brandTitle = cr.brand?.name || "Connected Store";
                const productTitle = cr.product?.title || "Product";
                const approval = cr.activeVersionApprovalStatus || "pending";
                const versionNum = cr.current_version || 1;

                return (
                  <div
                    key={cr.id}
                    className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all group shadow-2xs"
                  >
                    <div className="space-y-3">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-neutral-800 pb-2.5">
                        <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate max-w-[130px]">
                          {brandTitle}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-neutral-300">
                            v{versionNum}
                          </span>
                          <span className="rounded bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-1.5 py-0.5 text-[10px] font-bold">
                            9:16
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTarget({ id: cr.id, title: cr.title });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete ad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 9:16 Portrait Canvas Preview */}
                      <Link
                        href={`/creatives/${cr.id}`}
                        className="group/img relative block w-full aspect-[9/16] rounded-xl bg-slate-950 overflow-hidden shadow-inner cursor-pointer"
                      >
                        {displayUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={displayUrl}
                            alt={cr.title}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 p-4 text-center">
                            <span className="text-xs font-medium">Processing Ad</span>
                          </div>
                        )}

                        {/* Hover Inspect Pill */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-4">
                          <span className="rounded-xl bg-white/95 text-slate-950 px-3.5 py-1.5 text-xs font-bold shadow-md">
                            Inspect & Iterate
                          </span>
                        </div>

                        {/* Approval Badge Overlay */}
                        <div className="absolute bottom-2.5 left-2.5">
                          {approval === "approved" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/90 text-emerald-300 px-2 py-0.5 text-[11px] font-semibold shadow-sm border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
                            </span>
                          )}
                          {approval === "rejected" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-950/90 text-red-300 px-2 py-0.5 text-[11px] font-semibold shadow-sm border border-red-800">
                              <X className="w-3 h-3 text-red-400" /> Rejected
                            </span>
                          )}
                          {approval === "pending" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-950/80 text-amber-300 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              <Clock className="w-3 h-3 text-amber-400" /> Needs Review
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Headline & Context */}
                      <div className="space-y-1 pt-1">
                        <p className="font-serif-title font-semibold text-sm text-slate-950 dark:text-white line-clamp-2 leading-snug">
                          &ldquo;{cr.headline}&rdquo;
                        </p>
                        <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                          <span className="text-slate-400 dark:text-neutral-500">Product: </span>
                          {productTitle}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                          <span className="text-slate-400 dark:text-neutral-500">Campaign: </span>
                          {campaignTitle}
                        </div>
                      </div>
                    </div>

                    {/* Footer Metadata & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-neutral-500 text-[11px]">
                        {formatDisplayDate(cr.created_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {cr.campaign_id && (
                          <Link
                            href={`/dashboard?campaignId=${cr.campaign_id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-900 dark:text-white px-2.5 py-1 text-xs font-semibold transition-colors"
                            title="Resume in Chat"
                          >
                            <span>Resume</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        {displayUrl && (
                          <a
                            href={displayUrl}
                            download={`${cr.title || "ad"}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Download 9:16 PNG"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED STORES & BRAND PIPELINE */}
      {activeTab === "brands" && (
        <div className="space-y-4">
          {brandsList.length === 0 ? (
            <EmptyState
              title="No Stores Researched Yet"
              description="Enter any ecommerce store URL in the chat workspace to automatically extract brand DNA, logos, colors, and authentic SKUs."
              actionText="Research Store in Chat"
              actionHref="/dashboard"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandsList.map((b) => {
                let hostname = b.website_url;
                try {
                  hostname = new URL(b.website_url).hostname.replace(/^www\./, "");
                } catch {
                  hostname = b.website_url;
                }

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-sm shrink-0">
                            {b.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-950 dark:text-white">
                              {b.name}
                            </h3>
                            <a
                              href={b.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-500 dark:text-neutral-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                            >
                              <span>{hostname}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                          <Check className="w-3 h-3" />
                          <span>Storefront Ingested</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[10px] font-mono">
                          {formatDisplayDate(b.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                        Brand Profile Active
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeleteBrandTarget({ id: b.id, name: b.name })}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete brand"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/dashboard?brandId=${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-colors"
                        >
                          <span>Resume in Chat</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED CAMPAIGNS & ANGLES */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {initialCampaigns.length === 0 ? (
            <EmptyState
              title="No Campaigns Created Yet"
              description="Direct-response campaign angles formulated by the strategy engine will appear here with selected concepts."
              actionText="Create Campaign in Chat"
              actionHref="/dashboard"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-mono">
                          {c.brand?.name || "Connected Brand"}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-slate-950 dark:text-white mt-0.5">
                          {c.name}
                        </h3>
                      </div>
                      <span className="capitalize text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                        {c.status || "active"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-neutral-400">
                      <span className="text-slate-400 dark:text-neutral-500">Objective: </span>
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {c.objective}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                      {formatDisplayDate(c.created_at)}
                    </span>
                    <Link
                      href={`/dashboard?campaignId=${c.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Resume in Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Creative Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Ad Creative?"
        description="This will permanently delete this 9:16 portrait ad creative and remove its stored files."
        itemName={deleteTarget?.title}
      />

      {/* Delete Brand Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteBrandTarget}
        onClose={() => setDeleteBrandTarget(null)}
        onConfirm={handleDeleteBrand}
        isLoading={isDeletingBrand}
        title="Delete Saved Store?"
        description="This will permanently delete this brand and remove all associated catalog SKUs, concepts, and campaign creatives."
        itemName={deleteBrandTarget?.name}
      />
    </div>
  );
}
