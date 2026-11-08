import React from "react";
import { getUserCampaigns, getUserApprovedBrands } from "@/lib/actions/campaigns";
import { CampaignsListView } from "@/components/app/campaigns/CampaignsListView";

export const metadata = {
  title: "Ad Campaigns — Ploy",
  description: "Organize ad sets, direct-response angles, and creative variations.",
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await getUserCampaigns();
  const approvedBrands = await getUserApprovedBrands();

  return (
    <CampaignsListView
      initialCampaigns={campaigns}
      approvedBrands={approvedBrands}
    />
  );
}
