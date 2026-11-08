import React from "react";
import { createClient } from "@/lib/supabase/server";
import { BrandsListView, BrandCardData } from "@/components/app/brand/BrandsListView";

export const metadata = {
  title: "Connected Stores — Ploy",
  description: "Manage connected ecommerce storefronts and brand identity assets.",
};

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let brands: BrandCardData[] = [];

  if (user?.id) {
    const { data } = await supabase
      .from("brands")
      .select("id, name, website_url, industry, research_status, approval_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      brands = data.map((b) => ({
        id: b.id,
        name: b.name,
        website_url: b.website_url,
        industry: b.industry,
        research_status: b.research_status,
        approval_status: b.approval_status || "pending",
        created_at: b.created_at,
      }));
    }
  }

  return <BrandsListView initialBrands={brands} />;
}
