"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import type { CampaignWithBrand, ApprovedBrandWithKit } from "@/lib/actions/campaigns";
import { formatFullDate } from "@/lib/utils";

interface CampaignsListViewProps {
  initialCampaigns: CampaignWithBrand[];
  approvedBrands: ApprovedBrandWithKit[];
}

export function CampaignsListView({
  initialCampaigns,
  approvedBrands,
}: CampaignsListViewProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignWithBrand[]>(initialCampaigns);
  const [deleteTarget, setDeleteTarget] = useState<CampaignWithBrand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasCampaigns = campaigns.length > 0;
  const hasApprovedBrands = approvedBrands.length > 0;

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setIsDeleting(true);
    setErrorMsg(null);

    // Optimistically remove immediately
    setCampaigns((prev) => prev.filter((c) => c.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/campaigns/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCampaigns(initialCampaigns);
        setErrorMsg(data.error || "Failed to delete campaign");
      } else {
        router.refresh();
      }
    } catch {
      setCampaigns(initialCampaigns);
      setErrorMsg("Error deleting campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-serif-title text-3xl sm:text-4xl font-normal tracking-tight text-slate-950">
            Ad Campaigns
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Groupings of product ads matching target audiences, direct-response hooks, and creative sets.
          </p>
        </div>

        <div>
          {hasApprovedBrands ? (
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Link>
          ) : (
            <Link
              href="/brands"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-800 px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs"
            >
              <span>Review Stores First</span>
            </Link>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Campaigns Grid or Empty State */}
      {!hasCampaigns ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 bg-white">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 mt-3">No campaigns created yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {hasApprovedBrands
              ? "You have verified store foundations ready. Start a campaign to select products and generate 3 converting advertising angles."
              : "Campaigns require a connected store. Review and approve your store catalog to start creating campaigns."}
          </p>
          <div className="mt-6">
            <Link
              href={hasApprovedBrands ? "/campaigns/new" : "/brands"}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{hasApprovedBrands ? "Start First Campaign" : "Connect Store"}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((c) => {
            const productCount = Array.isArray(c.selected_product_ids)
              ? c.selected_product_ids.length
              : 0;
            const brandName = c.brand?.name || "Connected Store";
            const isApproved = !!c.approved_concept_id;

            return (
              <div
                key={c.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between hover:border-slate-400 hover:shadow-xs transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
                    <span className="font-semibold text-slate-500 truncate max-w-[150px]">
                      {brandName}
                    </span>
                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Angle Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-bold border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Draft
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h2 className="mt-3 text-lg font-extrabold text-slate-900 truncate">
                    {c.name}
                  </h2>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Objective:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[150px]">
                        {c.objective}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Products:</span>
                      <span className="text-slate-700">
                        {productCount} {productCount === 1 ? "product" : "products"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Created:</span>
                      <span className="text-slate-700">
                        {formatFullDate(c.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    {isApproved ? "Strategy Set" : "Needs Review"}
                  </span>

                  <Link
                    href={`/dashboard?campaignId=${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open in AI Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Campaign?"
        description="This will permanently delete this advertising campaign and all of its associated creative variations."
        itemName={deleteTarget?.name}
      />
    </div>
  );
}
