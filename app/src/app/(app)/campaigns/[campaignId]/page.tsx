import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/actions/campaigns";
import { getCampaignCreatives } from "@/lib/actions/creatives";
import { CampaignWorkspaceView } from "@/components/app/campaigns/CampaignWorkspaceView";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { campaignId } = await params;
  const res = await getCampaignById(campaignId);

  return {
    title: res?.campaign ? `${res.campaign.name} — Ploy` : "Campaign Details — Ploy",
    description: "Formulate AI advertising strategies, review distinct concepts, and approve ad creative directives.",
  };
}

export default async function CampaignDetailsPage({ params }: Props) {
  const { campaignId } = await params;
  const data = await getCampaignById(campaignId);

  if (!data || !data.campaign) {
    notFound();
  }

  const { campaign, brand, brandKit, products, concepts } = data;
  const creatives = await getCampaignCreatives(campaignId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <Link
          href="/campaigns"
          className="text-neutral-500 hover:text-black underline underline-offset-4"
        >
          [ RETURN TO CAMPAIGNS ]
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-700 truncate max-w-[200px] sm:max-w-md">
          {campaign.name}
        </span>
      </div>

      <CampaignWorkspaceView
        campaign={campaign}
        brand={brand}
        brandKit={brandKit}
        products={products}
        initialConcepts={concepts || []}
        initialCreatives={creatives || []}
      />
    </div>
  );
}
