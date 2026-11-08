import React from "react";
import { getUserCreatives } from "@/lib/actions/creatives";
import { getUserBrands } from "@/lib/actions/brands";
import { getUserCampaigns } from "@/lib/actions/campaigns";
import { CreativeLibraryView } from "@/components/app/creatives/CreativeLibraryView";

export const metadata = {
  title: "Saved Library — ploy",
  description: "Unified hub for saved advertising creatives, brand assets, pipeline workflows, and direct-response campaign strategies.",
};

export const dynamic = "force-dynamic";

export default async function CreativesPage() {
  const [creatives, brands, campaigns] = await Promise.all([
    getUserCreatives(),
    getUserBrands(),
    getUserCampaigns(),
  ]);

  return (
    <CreativeLibraryView
      initialCreatives={creatives}
      initialBrands={brands}
      initialCampaigns={campaigns}
    />
  );
}
