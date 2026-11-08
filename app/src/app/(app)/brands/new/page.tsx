"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { isValidUrl } from "@/lib/utils";
import { createBrand } from "@/lib/actions/brands";

const INDUSTRY_OPTIONS = [
  "-- Select Industry (Optional) --",
  "Beauty & Skincare",
  "Fashion & Apparel",
  "Health & Wellness",
  "Home, Kitchen & Living",
  "Consumer Electronics & Tech",
  "Food, Beverage & Snacks",
  "Jewelry & Accessories",
  "Sports & Outdoors",
  "Pets & Supplies",
  "Other Ecommerce",
];

export default function NewBrandPage() {
  const router = useRouter();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUrlError(null);

    const trimmedUrl = websiteUrl.trim();
    if (!trimmedUrl) {
      setUrlError("Store website URL is required.");
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setUrlError("Please enter a valid storefront URL (e.g. luminarybotanicals.com).");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedIndustry = industry === INDUSTRY_OPTIONS[0] ? "" : industry;

      const res = await createBrand({
        websiteUrl: trimmedUrl,
        name: businessName.trim() || undefined,
        industry: selectedIndustry || undefined,
      });

      if (!res.success || !res.brandId) {
        setError(res.error || "Failed to register brand. Please check your connection.");
        setIsSubmitting(false);
        return;
      }

      // Redirect to the conversational AI Ads workspace with the new brand
      router.push(`/dashboard?brandId=${res.brandId}`);
      router.refresh();
    } catch (err: unknown) {
      console.error("Brand submission error:", err);
      setError("An unexpected error occurred while creating brand.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <Link
          href="/brands"
          className="text-neutral-500 hover:text-neutral-950 underline underline-offset-4"
        >
          [ RETURN TO BRANDS ]
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-700">NEW BRAND SUBMISSION</span>
      </div>

      <div className="border border-neutral-300 bg-white p-6 sm:p-8 space-y-6">
        <div className="border-b border-neutral-200 pb-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
            STOREFRONT TAXONOMY INGESTION
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-neutral-950 mt-1">
            Connect New Storefront Brand
          </h1>
          <p className="mt-1 text-xs text-neutral-600 font-light leading-relaxed">
            Register your ecommerce storefront. In Step 4, our autonomous research agent will
            crawl your product catalog, extract brand colors and fonts, and discover high-intent
            direct-response angles.
          </p>
        </div>

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 font-mono text-xs text-red-800">
            <span className="font-bold">[ ERROR ]</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Store Website URL *"
            type="text"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              if (urlError) setUrlError(null);
            }}
            placeholder="e.g. luminarybotanicals.com"
            helperText="Required. Public sitemaps and product schemas will be indexed."
            error={urlError || undefined}
            required
          />

          <Input
            label="Business Name (Optional)"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Luminary Botanicals"
            helperText="Optional. If left blank, the brand name will be derived from the website domain."
          />

          <div className="space-y-1">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-neutral-600 font-medium">
              Industry (Optional)
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-none border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none font-mono"
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="font-mono text-[11px] text-neutral-500">
              Helps calibrate category-specific hook generation and competitor benchmarks.
            </p>
          </div>

          <div className="border border-neutral-200 bg-neutral-50/70 p-4 font-mono text-xs text-neutral-600">
            <div className="font-bold text-neutral-900 mb-1">[ RESEARCH PROTOCOL ]</div>
            <div>
              Initial status will be set to <code className="font-bold text-neutral-900">pending_research</code>.
              Your brand record is securely associated with your authenticated account via Row Level Security (RLS).
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 flex items-center justify-between">
            <Link
              href="/brands"
              className="border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="font-mono text-xs uppercase tracking-widest px-6"
            >
              Create Brand & Queue Research &rarr;
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
