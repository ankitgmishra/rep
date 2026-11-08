import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserApprovedBrands,
  getBrandForCampaign,
} from "@/lib/actions/campaigns";
import { CampaignCreateForm } from "@/components/app/campaigns/CampaignCreateForm";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "New Campaign — Ploy",
  description: "Formulate advertising campaigns from approved brand intelligence.",
};

interface Props {
  searchParams: Promise<{ brandId?: string }>;
}

export default async function NewCampaignPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { brandId } = await searchParams;
  const approvedBrands = await getUserApprovedBrands();

  // If specific brand requested, fetch it
  let activeBrandId = brandId;

  if (!activeBrandId && approvedBrands.length > 0) {
    activeBrandId = approvedBrands[0].id;
  }

  // If no approved brands exist at all
  if (!activeBrandId && approvedBrands.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 font-mono text-xs">
          <Link
            href="/campaigns"
            className="text-neutral-500 hover:text-black underline underline-offset-4"
          >
            [ RETURN TO CAMPAIGNS ]
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-700">NEW CAMPAIGN</span>
        </div>

        <div className="border border-neutral-300 bg-white p-6 sm:p-8">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
            GOVERNANCE PROTOCOL • STEP 5
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-neutral-950 mt-1">
            Initialize Advertising Campaign
          </h1>
          <p className="font-mono text-xs text-neutral-500 mt-1">
            Synthesize direct-response angles, ad variants, and target placements.
          </p>
        </div>

        <EmptyState
          title="No Approved Brands Available"
          description="Campaign creation requires a verified brand foundation. Step 5 enforces that you must review extracted brand identity attributes, select advertising products, and complete the human approval checkpoint before creating campaigns."
          actionText="Review Connected Brands"
          actionHref="/brands"
          badge="APPROVAL REQUIRED"
        />
      </div>
    );
  }

  // Load target brand data
  const brandData = await getBrandForCampaign(activeBrandId!);

  if (!brandData || !brandData.brand) {
    return (
      <div className="space-y-6">
        <div className="border border-red-300 bg-red-50 p-6 font-mono text-xs text-red-800">
          <div className="font-bold uppercase tracking-wider">
            [ ERROR ]: Brand Entity Not Found
          </div>
          <p className="mt-1">
            The requested brand identifier does not exist or you do not have permission to access it.
          </p>
          <div className="mt-4">
            <Link
              href="/brands"
              className="border border-red-800 bg-red-800 text-white px-3 py-1 text-[11px] uppercase tracking-wider"
            >
              Return to Brands &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Brand must be approved
  if (brandData.brand.approval_status !== "approved") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 font-mono text-xs">
          <Link
            href="/campaigns"
            className="text-neutral-500 hover:text-black underline underline-offset-4"
          >
            [ RETURN TO CAMPAIGNS ]
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-700">APPROVAL REQUIRED</span>
        </div>

        {/* Human Approval Checkpoint Guard Notice */}
        <div className="border-2 border-amber-600 bg-amber-50/50 p-6 sm:p-8 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="border border-amber-700 bg-amber-700 text-white px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold">
              [ CHECKPOINT ACTIVE ]
            </span>
            <span className="text-amber-900 font-bold uppercase tracking-wider text-[11px]">
              Human Approval Required Before Campaign Creation
            </span>
          </div>

          <h2 className="font-serif-title text-2xl font-bold text-neutral-950 mt-3 font-sans">
            {brandData.brand.name} is Awaiting Human Approval
          </h2>

          <p className="text-neutral-700 mt-2 text-xs leading-relaxed max-w-3xl">
            Per Step 5 governance architecture, automated ad campaigns cannot be instantiated until an authorized brand marketer has audited the extracted brand intelligence, validated product catalog photography, and executed the explicit <strong>Approve Brand & Continue</strong> action.
          </p>

          <div className="mt-6 pt-4 border-t border-amber-200/80 flex flex-wrap items-center gap-4">
            <Link
              href={`/brands/${brandData.brand.id}#approval-checkpoint`}
              className="border border-neutral-950 bg-neutral-950 text-white px-5 py-2 uppercase tracking-wider text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              Review & Approve Brand &rarr;
            </Link>
            <Link
              href="/campaigns"
              className="border border-neutral-300 bg-white text-neutral-700 px-4 py-2 uppercase tracking-wider text-xs hover:border-neutral-950 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <Link
          href="/campaigns"
          className="text-neutral-500 hover:text-black underline underline-offset-4"
        >
          [ RETURN TO CAMPAIGNS ]
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-700">NEW CAMPAIGN</span>
      </div>

      <div className="border border-neutral-300 bg-white p-6 sm:p-8">
        <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
          CAMPAIGN INITIALIZATION • STEP 5
        </div>
        <h1 className="font-serif-title text-2xl font-bold text-neutral-950 mt-1">
          Create Advertising Campaign
        </h1>
        <p className="font-mono text-xs text-neutral-500 mt-1">
          Select target products, choose an objective, and supply strategic directives.
        </p>
      </div>

      <CampaignCreateForm
        initialBrand={brandData.brand}
        brandKit={brandData.brandKit}
        products={brandData.products}
        allApprovedBrands={approvedBrands}
      />
    </div>
  );
}

