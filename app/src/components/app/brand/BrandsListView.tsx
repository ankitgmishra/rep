"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ExternalLink,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Trash2,
  Store,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { formatFullDate } from "@/lib/utils";

export interface BrandCardData {
  id: string;
  name: string;
  website_url: string;
  industry: string | null;
  research_status: string;
  approval_status: string;
  created_at: string;
}

interface BrandsListViewProps {
  initialBrands: BrandCardData[];
}

export function BrandsListView({ initialBrands }: BrandsListViewProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandCardData[]>(initialBrands);
  const [deleteTarget, setDeleteTarget] = useState<BrandCardData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setIsDeleting(true);
    setErrorMsg(null);

    // Optimistically remove immediately
    setBrands((prev) => prev.filter((b) => b.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/brands/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBrands(initialBrands);
        setErrorMsg(data.error || "Failed to delete store");
      } else {
        router.refresh();
      }
    } catch {
      setBrands(initialBrands);
      setErrorMsg("Error deleting store");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasBrands = brands.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-serif-title text-3xl sm:text-4xl font-normal tracking-tight text-slate-950">
            Connected Stores
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Storefront profiles, colors, typography, and catalog photos analyzed for ads.
          </p>
        </div>
        <Link
          href="/brands/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-xs font-medium transition-colors self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Store</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Stores Grid or Empty State */}
      {!hasBrands ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 bg-white">
          <Store className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 mt-3">No stores connected yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Enter your store URL to automatically pull your brand logo, colors, and authentic product photography.
          </p>
          <div className="mt-6">
            <Link
              href="/brands/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Your First Store</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((b) => {
            const domain = b.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
            const isApproved = b.approval_status === "approved";

            return (
              <div
                key={b.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between hover:border-slate-400 hover:shadow-xs transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
                    <span className="font-semibold text-slate-500 truncate max-w-[150px]">
                      {domain}
                    </span>
                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-bold border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Review
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(b)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete store"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h2 className="mt-3 text-lg font-extrabold text-slate-900 truncate">
                    {b.name}
                  </h2>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Industry:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[150px]">
                        {b.industry || "Ecommerce"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Added on:</span>
                      <span className="text-slate-700">
                        {formatFullDate(b.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <a
                    href={b.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900"
                  >
                    <span>Store Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard?brandId=${b.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Launch AI Ads Agent</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
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
        title="Delete Connected Store?"
        description="This will permanently delete this store profile along with all imported catalog items, campaign angles, and generated ad creatives."
        itemName={deleteTarget?.name}
      />
    </div>
  );
}
