"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getPersistedStoreUrl } from "@/lib/store-url";
import { isValidUrl } from "@/lib/utils";
import { submitOnboarding } from "@/lib/actions/onboarding";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

const INDUSTRY_OPTIONS = [
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

const TARGET_MARKET_OPTIONS = [
  "North America (US & Canada)",
  "United Kingdom",
  "European Union",
  "Australia & New Zealand",
  "Asia-Pacific",
  "Latin America",
  "Global / Worldwide",
];

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();

  // Multi-step navigation: 1: Welcome -> 2: Business Info -> 3: Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [businessName, setBusinessName] = useState(
    () => profile?.business_name || ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(() => {
    return (
      profile?.website_url ||
      searchParams.get("storeUrl") ||
      getPersistedStoreUrl() ||
      ""
    );
  });
  const [industry, setIndustry] = useState(
    () => profile?.industry || INDUSTRY_OPTIONS[0]
  );
  const [targetMarket, setTargetMarket] = useState(
    () => profile?.target_market || TARGET_MARKET_OPTIONS[0]
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!businessName.trim() || businessName.trim().length < 2) {
      newErrors.businessName = "Business name must be at least 2 characters.";
    }

    if (!websiteUrl.trim()) {
      newErrors.websiteUrl = "Storefront website URL is required.";
    } else if (!isValidUrl(websiteUrl.trim())) {
      newErrors.websiteUrl =
        "Please enter a valid website address (e.g., allbirds.com or https://store.com).";
    }

    if (!industry) {
      newErrors.industry = "Please select an industry category.";
    }

    if (!targetMarket) {
      newErrors.targetMarket = "Please select your primary target market.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (validateForm()) {
      setCurrentStep(3);
    }
  };

  const handleFinalSubmit = async () => {
    setServerError(null);

    if (!validateForm()) {
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitOnboarding({
        businessName: businessName.trim(),
        websiteUrl: websiteUrl.trim(),
        industry,
        targetMarket,
      });

      if (!result.success) {
        setServerError(result.error || "Failed to complete onboarding.");
        setIsSubmitting(false);
        return;
      }

      await refreshProfile();
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("Onboarding submission error:", err);
      setServerError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Step Indicator Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="font-serif-title text-2xl font-bold text-slate-950">
              Welcome to Ploy
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Set up your storefront profile to initialize automated catalog research.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full self-start sm:self-auto">
            Step {currentStep} of 3
          </div>
        </div>

        {/* Step progress pills */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-medium">
          <div
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              currentStep === 1
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            1. Overview
          </div>
          <div
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              currentStep === 2
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            2. Store Details
          </div>
          <div
            className={`py-2 px-3 rounded-lg text-center transition-all ${
              currentStep === 3
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            3. Confirmation
          </div>
        </div>
      </div>

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
          {serverError}
        </div>
      )}

      {/* STEP 1: WELCOME SCREEN & WORKFLOW EXPLANATION */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-slate-950">
              How the creative studio works
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Ploy eliminates manual photoshoots with an autonomous four-stage pipeline.
              Provide your public store URL, and our systems handle catalog discovery,
              angle research, and creative generation automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {[
              {
                num: "1",
                title: "Research your brand",
                desc: "Crawlers inspect your storefront catalog, public reviews, and visual assets without manual data entry.",
              },
              {
                num: "2",
                title: "Review brand & products",
                desc: "Inspect transparent packshots, extracted color palettes, fonts, and customer selling claims.",
              },
              {
                num: "3",
                title: "Generate advertising creatives",
                desc: "Direct-response engines render multi-angle static and video concepts across 9:16 portrait ratios.",
              },
              {
                num: "4",
                title: "Review, iterate, and approve",
                desc: "Refine hooks, tweak lighting via natural language, and approve winning variants for deployment.",
              },
            ].map((st) => (
              <div
                key={st.num}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-2"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-200/60 pb-2">
                  <span className="font-semibold text-slate-700">Stage {st.num}</span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">Automated</span>
                </div>
                <h3 className="text-base font-semibold text-slate-950">
                  {st.title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-6 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep(2)}
              className="rounded-lg px-6"
            >
              <span>Continue to Store Details</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: BUSINESS INFORMATION FORM */}
      {currentStep === 2 && (
        <form onSubmit={handleProceedToReview} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-slate-950">
              Store & Market Information
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Enter your brand name and store URL. Our crawlers will automatically index
              your product catalog and brand assets.
            </p>
          </div>

          <div className="space-y-5">
            <Input
              label="Business / Store Name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Luminary Botanicals"
              helperText="The public brand name associated with your advertising campaigns."
              error={errors.businessName}
            />

            <Input
              label="Ecommerce Website URL"
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="e.g. allbirds.com or https://store.com"
              helperText="Your public storefront address. Public product sitemaps and images will be indexed."
              error={errors.websiteUrl}
            />

            {/* Industry Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Industry Category
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-colors"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.industry && (
                <p className="text-xs text-red-600 font-medium">{errors.industry}</p>
              )}
            </div>

            {/* Target Market Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Primary Target Market
              </label>
              <select
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-colors"
              >
                {TARGET_MARKET_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.targetMarket && (
                <p className="text-xs text-red-600 font-medium">{errors.targetMarket}</p>
              )}
              <p className="text-xs text-slate-500">
                Calibrates regional direct-response copy nuances, tone, and currency references.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(1)}
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="rounded-lg px-6"
            >
              <span>Review Details</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: FINAL CONFIRMATION SCREEN */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-slate-950">
              Confirm Store Details
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Verify your information before launching your workspace. You can edit any parameter
              now or adjust it later in Settings.
            </p>
          </div>

          {/* Details Table */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200/80">
              <span className="text-slate-500">Account Email:</span>
              <span className="text-slate-900 font-medium">{user?.email || "Account member"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200/80">
              <span className="text-slate-500">Store / Brand Name:</span>
              <span className="text-slate-900 font-medium">{businessName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200/80">
              <span className="text-slate-500">Storefront URL:</span>
              <span className="text-slate-900 font-medium">{websiteUrl}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200/80">
              <span className="text-slate-500">Industry:</span>
              <span className="text-slate-900 font-medium">{industry}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2">
              <span className="text-slate-500">Target Market:</span>
              <span className="text-slate-900 font-medium">{targetMarket}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(2)}
              disabled={isSubmitting}
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Edit Details</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleFinalSubmit}
              className="rounded-lg px-8"
            >
              <span>Confirm & Enter Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading onboarding...</div>}>
      <OnboardingWizard />
    </Suspense>
  );
}
