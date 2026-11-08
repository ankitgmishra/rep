"use server";

import { createClient } from "@/lib/supabase/server";
import { executeBrandResearch } from "@/lib/research/orchestrator";

export async function triggerBrandResearchAction(brandId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized session." };
  }

  try {
    const result = await executeBrandResearch(brandId);
    return result;
  } catch (err: unknown) {
    return {
      success: false,
      productCount: 0,
      status: "failed" as const,
      error: err instanceof Error ? err.message : "Research execution failed.",
    };
  }
}

export async function getBrandResearchDetails(brandId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (!brand) return null;

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", brandId)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  return {
    brand,
    brandKit: brandKit || null,
    products: products || [],
  };
}
