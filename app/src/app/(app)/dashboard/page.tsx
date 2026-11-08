import React from "react";
import { AgentChatWorkspace } from "@/components/agent/AgentChatWorkspace";

export const metadata = {
  title: "AI Ads Manager — Ploy",
  description: "Autonomous AI ads manager for ecommerce brands. Turn store URLs into verified 9:16 portrait ads.",
};

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{
    brandId?: string;
    campaignId?: string;
    url?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <AgentChatWorkspace
        initialBrandId={resolvedParams.brandId}
        initialCampaignId={resolvedParams.campaignId}
        initialStoreUrl={resolvedParams.url}
      />
    </div>
  );
}
