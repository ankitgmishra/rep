"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidUrl, normalizeStoreUrl, extractBrandNameFromUrl } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

export interface CreateBrandInput {
  websiteUrl: string;
  name?: string;
  industry?: string;
}

export interface BrandResult {
  success: boolean;
  error?: string;
  brandId?: string;
}

export async function createBrand(
  input: CreateBrandInput
): Promise<BrandResult> {
  const supabase = await createClient();

  // 1. Verify authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Authentication required to register a brand.",
    };
  }

  // 2. Validate website URL
  const rawUrl = (input.websiteUrl || "").trim();
  if (!rawUrl) {
    return {
      success: false,
      error: "Store website URL is required.",
    };
  }

  if (!isValidUrl(rawUrl)) {
    return {
      success: false,
      error: "Please enter a valid storefront URL (e.g. luminarybotanicals.com).",
    };
  }

  const normalizedUrl = normalizeStoreUrl(rawUrl);
  const rawName = (input.name || "").trim();
  const brandName = rawName || extractBrandNameFromUrl(normalizedUrl);
  const industry = (input.industry || "").trim() || null;

  try {
    const { data: brand, error: insertError } = await supabase
      .from("brands")
      .insert({
        user_id: user.id,
        name: brandName,
        website_url: normalizedUrl,
        industry: industry,
        research_status: "pending_research",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[BRAND SUBMISSION ERROR]:", insertError);
      return {
        success: false,
        error: "Failed to create brand record. Please try again.",
      };
    }

    return {
      success: true,
      brandId: brand.id,
    };
  } catch (err: unknown) {
    console.error("[BRAND SUBMISSION UNEXPECTED ERROR]:", err);
    return {
      success: false,
      error: "An unexpected error occurred while saving brand.",
    };
  }
}

export async function getUserBrands() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET USER BRANDS ERROR]:", error);
    return [];
  }

  return data || [];
}

export async function getBrandById(brandId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("[GET BRAND BY ID ERROR]:", error);
    return null;
  }

  return data;
}

export interface UpdateBrandKitInput {
  brandId: string;
  brandName?: string;
  websiteDescription?: string;
  brandVoice?: string;
  valueProposition?: string;
  targetAudience?: string;
  brandColors?: Array<{ hex: string; name?: string; usage?: string; is_inferred?: boolean }>;
  keySellingPoints?: Array<{ point: string; is_inferred: boolean }>;
  shippingInfo?: string;
  returnPolicy?: string;
  userEdits: Record<string, unknown>;
}

/**
 * Persist user edits to Brand Kit while preserving original source data in user_edits
 */
export async function updateBrandKit(input: UpdateBrandKitInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch existing brand kit to merge user_edits
    const { data: existingKit, error: fetchError } = await supabase
      .from("brand_kits")
      .select("id, user_edits")
      .eq("brand_id", input.brandId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingKit) {
      return { success: false, error: "Brand kit not found" };
    }

    const mergedUserEdits = {
      ...((existingKit.user_edits as Record<string, unknown>) || {}),
      ...input.userEdits,
      last_edited_at: new Date().toISOString(),
    };

    // 2. Update brand kit row
    const updatePayload: Database["public"]["Tables"]["brand_kits"]["Update"] = {
      user_edits: mergedUserEdits,
    };

    if (input.brandName !== undefined) updatePayload.brand_name = input.brandName;
    if (input.websiteDescription !== undefined) updatePayload.website_description = input.websiteDescription;
    if (input.brandVoice !== undefined) updatePayload.brand_voice = input.brandVoice;
    if (input.valueProposition !== undefined) updatePayload.value_proposition = input.valueProposition;
    if (input.targetAudience !== undefined) updatePayload.target_audience = input.targetAudience;
    if (input.brandColors !== undefined) updatePayload.brand_colors = input.brandColors;
    if (input.keySellingPoints !== undefined) updatePayload.key_selling_points = input.keySellingPoints;
    if (input.shippingInfo !== undefined) updatePayload.shipping_info = input.shippingInfo;
    if (input.returnPolicy !== undefined) updatePayload.return_policy = input.returnPolicy;

    const { error: updateError } = await supabase
      .from("brand_kits")
      .update(updatePayload)
      .eq("id", existingKit.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[UPDATE BRAND KIT ERROR]:", updateError);
      return { success: false, error: updateError.message };
    }

    // Also update brand name in brands table if provided
    if (input.brandName) {
      await supabase
        .from("brands")
        .update({ name: input.brandName })
        .eq("id", input.brandId)
        .eq("user_id", user.id);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update brand kit.";
    return { success: false, error: msg };
  }
}

export interface UpdateProductInput {
  productId: string;
  title?: string;
  description?: string;
  price?: number;
  priceFormatted?: string;
  category?: string;
  isSelected?: boolean;
  userEdits?: Record<string, unknown>;
}

/**
 * Persist product corrections and selection state
 */
export async function updateProduct(input: UpdateProductInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("id, user_edits")
      .eq("id", input.productId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingProduct) {
      return { success: false, error: "Product not found" };
    }

    const mergedUserEdits = {
      ...((existingProduct.user_edits as Record<string, unknown>) || {}),
      ...(input.userEdits || {}),
      last_edited_at: new Date().toISOString(),
    };

    const updatePayload: Database["public"]["Tables"]["products"]["Update"] = {
      user_edits: mergedUserEdits,
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.price !== undefined) updatePayload.price = input.price;
    if (input.priceFormatted !== undefined) updatePayload.price_formatted = input.priceFormatted;
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.isSelected !== undefined) updatePayload.is_selected = input.isSelected;

    const { error: updateError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", input.productId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[UPDATE PRODUCT ERROR]:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update product.";
    return { success: false, error: msg };
  }
}

/**
 * Toggle product selection for advertising
 */
export async function toggleProductSelection(
  productId: string,
  isSelected: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("products")
    .update({ is_selected: isSelected })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[TOGGLE PRODUCT SELECTION ERROR]:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Select or deselect all products for a brand
 */
export async function toggleSelectAllProducts(
  brandId: string,
  isSelected: boolean
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("products")
    .update({ is_selected: isSelected })
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("[SELECT ALL PRODUCTS ERROR]:", error);
    return { success: false, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export interface ApproveBrandResult {
  success: boolean;
  error?: string;
  approvedAt?: string;
  selectedCount?: number;
}

/**
 * Human Approval Checkpoint:
 * - Requires at least one selected product
 * - Validates essential brand information exists
 * - Persists approval status and timestamp
 */
export async function approveBrand(brandId: string): Promise<ApproveBrandResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: Session expired." };
  }

  // 1. Verify brand exists and belongs to user
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name, research_status, approval_status")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return { success: false, error: "Brand not found or access denied." };
  }

  // 2. Verify brand kit exists
  const { data: brandKit, error: kitError } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .single();

  if (kitError || !brandKit) {
    return {
      success: false,
      error: "Brand research kit is missing. Please run brand research first.",
    };
  }

  // 3. Ensure essential brand information is present
  if (!brandKit.brand_name?.trim()) {
    return {
      success: false,
      error: "Brand name is required for approval. Please enter a valid name.",
    };
  }

  if (!brandKit.value_proposition?.trim()) {
    return {
      success: false,
      error: "Value proposition is missing. Please provide or confirm the core value proposition.",
    };
  }

  // 4. Require at least one selected product
  const { data: selectedProducts, error: prodError } = await supabase
    .from("products")
    .select("id")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .eq("is_selected", true);

  if (prodError) {
    return { success: false, error: "Failed to verify selected products." };
  }

  if (!selectedProducts || selectedProducts.length === 0) {
    return {
      success: false,
      error: "At least one product must be selected for advertising before approving the brand.",
    };
  }

  const now = new Date().toISOString();

  // 5. Update brand approval state in brands table
  const { error: updateBrandError } = await supabase
    .from("brands")
    .update({
      approval_status: "approved",
      approved_at: now,
    })
    .eq("id", brandId)
    .eq("user_id", user.id);

  if (updateBrandError) {
    console.error("[APPROVE BRAND ERROR - BRANDS]:", updateBrandError);
    return { success: false, error: updateBrandError.message };
  }

  // 6. Update brand_kits approval status
  await supabase
    .from("brand_kits")
    .update({
      approval_status: "approved",
      approved_at: now,
    })
    .eq("id", brandKit.id)
    .eq("user_id", user.id);

  return {
    success: true,
    approvedAt: now,
    selectedCount: selectedProducts.length,
  };
}

/**
 * Permanently deletes a brand and all associated products, campaigns, concepts, and creatives
 */
export async function deleteBrand(brandId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to delete store." };
  }

  try {
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", brandId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE BRAND ERROR]:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/brands");
    revalidatePath("/campaigns");
    revalidatePath("/creatives");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete store";
    return { success: false, error: msg };
  }
}

