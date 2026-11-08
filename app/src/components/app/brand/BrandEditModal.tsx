"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateBrandKit } from "@/lib/actions/brands";
import type { Database, Json } from "@/lib/supabase/types";

type BrandKit = Database["public"]["Tables"]["brand_kits"]["Row"];

interface BrandEditModalProps {
  brandId: string;
  brandKit: BrandKit;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedKit: BrandKit) => void;
}

export function BrandEditModal({
  brandId,
  brandKit,
  isOpen,
  onClose,
  onSaved,
}: BrandEditModalProps) {
  const [brandName, setBrandName] = useState(brandKit.brand_name || "");
  const [valueProposition, setValueProposition] = useState(brandKit.value_proposition || "");
  const [brandVoice, setBrandVoice] = useState(brandKit.brand_voice || "");
  const [targetAudience, setTargetAudience] = useState(brandKit.target_audience || "");
  const [websiteDescription, setWebsiteDescription] = useState(brandKit.website_description || "");
  const [shippingInfo, setShippingInfo] = useState(brandKit.shipping_info || "");
  const [returnPolicy, setReturnPolicy] = useState(brandKit.return_policy || "");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage("Brand name is required.");
      return;
    }

    if (!valueProposition.trim()) {
      setErrorMessage("Value proposition is required.");
      return;
    }

    setIsLoading(true);

    try {
      // Record user edits object preserving prior values
      const existingUserEdits = (brandKit.user_edits as Record<string, unknown>) || {};
      const newUserEdits: Record<string, unknown> = {
        ...existingUserEdits,
        brand_name: {
          original: brandKit.brand_name,
          updated: brandName.trim(),
          edited_at: new Date().toISOString(),
        },
        value_proposition: {
          original: brandKit.value_proposition,
          updated: valueProposition.trim(),
          edited_at: new Date().toISOString(),
        },
        brand_voice: {
          original: brandKit.brand_voice,
          updated: brandVoice.trim(),
          edited_at: new Date().toISOString(),
        },
        target_audience: {
          original: brandKit.target_audience,
          updated: targetAudience.trim(),
          edited_at: new Date().toISOString(),
        },
        website_description: {
          original: brandKit.website_description,
          updated: websiteDescription.trim(),
          edited_at: new Date().toISOString(),
        },
        shipping_info: {
          original: brandKit.shipping_info,
          updated: shippingInfo.trim(),
          edited_at: new Date().toISOString(),
        },
        return_policy: {
          original: brandKit.return_policy,
          updated: returnPolicy.trim(),
          edited_at: new Date().toISOString(),
        },
      };

      const result = await updateBrandKit({
        brandId,
        brandName: brandName.trim(),
        valueProposition: valueProposition.trim(),
        brandVoice: brandVoice.trim(),
        targetAudience: targetAudience.trim(),
        websiteDescription: websiteDescription.trim(),
        shippingInfo: shippingInfo.trim(),
        returnPolicy: returnPolicy.trim(),
        userEdits: newUserEdits,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update brand attributes.");
        setIsLoading(false);
        return;
      }

      onSaved({
        ...brandKit,
        brand_name: brandName.trim(),
        value_proposition: valueProposition.trim(),
        brand_voice: brandVoice.trim(),
        target_audience: targetAudience.trim(),
        website_description: websiteDescription.trim(),
        shipping_info: shippingInfo.trim(),
        return_policy: returnPolicy.trim(),
        user_edits: newUserEdits as unknown as Json,
        updated_at: new Date().toISOString(),
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error saving edits.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
      <div className="relative w-full max-w-2xl border-2 border-neutral-950 bg-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-neutral-400">
              HUMAN CORRECTIONS • BRAND IDENTITY
            </div>
            <h2 className="font-serif-title text-xl font-bold text-neutral-950 mt-1">
              Edit Brand Guidelines & Attributes
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-950 font-bold px-2 py-1 border border-neutral-200"
          >
            [ ESC / CLOSE ]
          </button>
        </div>

        {errorMessage && (
          <div className="border border-red-300 bg-red-50 p-3 text-red-900">
            [ ERROR ]: {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Brand Name"
            type="text"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            helperText="Canonical brand identifier displayed on advertisements."
          />

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              Value Proposition
            </label>
            <textarea
              required
              rows={2}
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
              placeholder="Core commercial promise..."
            />
            <span className="text-[10px] text-neutral-500 block">
              The primary benefit and reason customers choose your products over alternatives.
            </span>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              Editorial Brand Voice & Tone
            </label>
            <textarea
              rows={2}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
              placeholder="e.g. Confident, clinical, holistic, serene..."
            />
            <span className="text-[10px] text-neutral-500 block">
              Guides the copy generator when formulating hooks, headlines, and callouts.
            </span>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              Target Audience Profile
            </label>
            <textarea
              rows={2}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
              placeholder="e.g. Women 25-45 seeking clinical botanical skincare..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              Website Description / Tagline
            </label>
            <textarea
              rows={2}
              value={websiteDescription}
              onChange={(e) => setWebsiteDescription(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
              placeholder="Official storefront description..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                Shipping Policy Notice
              </label>
              <textarea
                rows={2}
                value={shippingInfo}
                onChange={(e) => setShippingInfo(e.target.value)}
                className="w-full border border-neutral-300 p-2 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
                placeholder="e.g. Free shipping on orders over $50..."
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                Return Policy Notice
              </label>
              <textarea
                rows={2}
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                className="w-full border border-neutral-300 p-2 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
                placeholder="e.g. 30-day money-back guarantee..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              * Original website data is archived. Edits will be marked as [ USER EDITED ].
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
              >
                Save Brand Corrections
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
