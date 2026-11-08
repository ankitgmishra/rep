"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type CampaignObjective =
  | "Increase conversions"
  | "Product promotion"
  | "Product launch"
  | "Brand awareness";

export interface CreateCampaignInput {
  brandId: string;
  name: string;
  objective: CampaignObjective;
  additionalInstructions?: string;
  selectedProductIds: string[];
}

export interface CreateCampaignResult {
  success: boolean;
  campaignId?: string;
  error?: string;
}

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
export type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type CampaignConceptRow = Database["public"]["Tables"]["campaign_concepts"]["Row"];

export interface CampaignWithBrand extends CampaignRow {
  brand?: {
    id: string;
    name: string;
    website_url: string;
    approval_status: string;
  } | null;
}

export interface ApprovedBrandWithKit {
  id: string;
  name: string;
  website_url: string;
  industry: string | null;
  approval_status: string;
  approved_at: string | null;
  brandKit?: BrandKitRow | null;
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<CreateCampaignResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized: Please sign in." };
  }

  // 1. Verify brand exists, belongs to user, AND IS APPROVED
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name, approval_status")
    .eq("id", input.brandId)
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return { success: false, error: "Brand not found or access denied." };
  }

  if (brand.approval_status !== "approved") {
    return {
      success: false,
      error: "Brand has not been approved. You must review and approve the brand before creating a campaign.",
    };
  }

  // 2. Validate campaign name
  const name = (input.name || "").trim();
  if (!name) {
    return { success: false, error: "Campaign name is required." };
  }

  // 3. Validate objective
  const validObjectives: CampaignObjective[] = [
    "Increase conversions",
    "Product promotion",
    "Product launch",
    "Brand awareness",
  ];
  if (!validObjectives.includes(input.objective)) {
    return { success: false, error: "Please select a valid advertising objective." };
  }

  // 4. Validate selected products
  if (!input.selectedProductIds || input.selectedProductIds.length === 0) {
    return {
      success: false,
      error: "At least one product must be selected for the campaign.",
    };
  }

  // Verify all product IDs belong to this brand and user
  const { data: verifiedProducts, error: prodError } = await supabase
    .from("products")
    .select("id")
    .eq("brand_id", input.brandId)
    .eq("user_id", user.id)
    .in("id", input.selectedProductIds);

  if (prodError || !verifiedProducts || verifiedProducts.length === 0) {
    return {
      success: false,
      error: "Selected products could not be verified for this brand.",
    };
  }

  const verifiedProductIds = verifiedProducts.map((p) => p.id);

  try {
    // 5. Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        brand_id: input.brandId,
        user_id: user.id,
        name,
        objective: input.objective,
        additional_instructions: input.additionalInstructions?.trim() || null,
        status: "draft",
        selected_product_ids: verifiedProductIds,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      console.error("[CREATE CAMPAIGN ERROR]:", campaignError);
      return { success: false, error: campaignError?.message || "Failed to create campaign record." };
    }

    // 6. Insert campaign_products join records
    const joinRows = verifiedProductIds.map((productId) => ({
      campaign_id: campaign.id,
      product_id: productId,
      user_id: user.id,
    }));

    const { error: joinError } = await supabase
      .from("campaign_products")
      .insert(joinRows);

    if (joinError) {
      console.warn("[CAMPAIGN PRODUCTS JOIN WARNING]:", joinError);
    }

    return {
      success: true,
      campaignId: campaign.id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected campaign creation error";
    return { success: false, error: msg };
  }
}

export async function getUserCampaigns(): Promise<CampaignWithBrand[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !campaigns) {
    console.error("[GET USER CAMPAIGNS ERROR]:", error);
    return [];
  }

  if (campaigns.length === 0) return [];

  const brandIds = Array.from(new Set(campaigns.map((c) => c.brand_id)));
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, website_url, approval_status")
    .in("id", brandIds);

  const brandMap = new Map((brands || []).map((b) => [b.id, b]));

  return campaigns.map((c) => ({
    ...c,
    brand: brandMap.get(c.brand_id) || null,
  }));
}

export async function getBrandForCampaign(brandId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return null;
  }

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return {
    brand,
    brandKit: brandKit || null,
    products: products || [],
  };
}

export async function getCampaignById(
  campaignId: string,
  customClient?: SupabaseClient
) {
  const supabase = customClient || (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (error || !campaign) {
    return null;
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, approval_status")
    .eq("id", campaign.brand_id)
    .single();

  // Fetch campaign products
  const { data: campaignProducts } = await supabase
    .from("campaign_products")
    .select("product_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  const productIds = ((campaignProducts || []) as { product_id: string }[]).map((cp) => cp.product_id);
  let products: ProductRow[] = [];

  if (productIds.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);
    products = prods || [];
  }

  // Fetch brand kit
  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", campaign.brand_id)
    .single();

  // Fetch campaign concepts
  const { data: concepts } = await supabase
    .from("campaign_concepts")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return {
    campaign,
    brand: brand || null,
    brandKit: brandKit || null,
    products,
    concepts: concepts || [],
  };
}

export async function getUserApprovedBrands(): Promise<ApprovedBrandWithKit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: brands, error } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, approval_status, approved_at")
    .eq("user_id", user.id)
    .eq("approval_status", "approved")
    .order("approved_at", { ascending: false });

  if (error || !brands) {
    console.error("[GET APPROVED BRANDS ERROR]:", error);
    return [];
  }

  if (brands.length === 0) return [];

  const brandIds = brands.map((b) => b.id);
  const { data: kits } = await supabase
    .from("brand_kits")
    .select("*")
    .in("brand_id", brandIds);

  const kitMap = new Map((kits || []).map((k) => [k.brand_id, k]));

  return brands.map((b) => ({
    ...b,
    brandKit: kitMap.get(b.id) || null,
  }));
}

export interface UpdateConceptInput {
  headline?: string;
  supporting_copy?: string;
  cta?: string;
  concept_name?: string;
}

export async function updateCampaignConcept(
  conceptId: string,
  updates: UpdateConceptInput
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Fetch current concept to merge user_edits
  const { data: existing, error: fetchError } = await supabase
    .from("campaign_concepts")
    .select("user_edits, headline, supporting_copy, cta, concept_name")
    .eq("id", conceptId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Concept not found or access denied." };
  }

  const existingEdits = (existing.user_edits as Record<string, unknown>) || {};
  const newEdits = {
    ...existingEdits,
    ...updates,
    edited_at: new Date().toISOString(),
  };

  const updatePayload: Database["public"]["Tables"]["campaign_concepts"]["Update"] = {
    user_edits: newEdits as unknown as Database["public"]["Tables"]["campaign_concepts"]["Row"]["user_edits"],
    updated_at: new Date().toISOString(),
  };

  if (updates.headline !== undefined) updatePayload.headline = updates.headline.trim();
  if (updates.supporting_copy !== undefined)
    updatePayload.supporting_copy = updates.supporting_copy.trim();
  if (updates.cta !== undefined) updatePayload.cta = updates.cta.trim();
  if (updates.concept_name !== undefined)
    updatePayload.concept_name = updates.concept_name.trim();

  const { error: updateError } = await supabase
    .from("campaign_concepts")
    .update(updatePayload)
    .eq("id", conceptId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function selectCampaignConcept(
  campaignId: string,
  conceptId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Set all concepts for this campaign to draft (except the selected one)
  await supabase
    .from("campaign_concepts")
    .update({ approval_status: "draft" })
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .neq("approval_status", "approved");

  // Set this concept to selected
  const { error } = await supabase
    .from("campaign_concepts")
    .update({ approval_status: "selected" })
    .eq("id", conceptId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleConceptApproval(
  campaignId: string,
  conceptId: string,
  shouldApprove: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const now = shouldApprove ? new Date().toISOString() : null;

  const { error: conceptError } = await supabase
    .from("campaign_concepts")
    .update({
      is_approved: shouldApprove,
      approval_status: shouldApprove ? "approved" : "draft",
      approved_at: now,
    })
    .eq("id", conceptId)
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  if (conceptError) {
    return { success: false, error: conceptError.message };
  }

  if (shouldApprove) {
    await supabase
      .from("campaigns")
      .update({
        approved_concept_id: conceptId,
        status: "active",
      })
      .eq("id", campaignId)
      .eq("user_id", user.id);
  }

  return { success: true, isApproved: shouldApprove };
}

export async function approveAllConcepts(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("campaign_concepts")
    .update({
      is_approved: true,
      approval_status: "approved",
      approved_at: now,
    })
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  return { success: true };
}

export async function approveCampaignConcept(
  campaignId: string,
  conceptId: string
) {
  return toggleConceptApproval(campaignId, conceptId, true);
}

/**
 * Permanently deletes a campaign and all associated concepts and creative jobs
 */
export async function deleteCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to delete campaign." };
  }

  try {
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE CAMPAIGN ERROR]:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/campaigns");
    revalidatePath("/creatives");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete campaign";
    return { success: false, error: msg };
  }
}

