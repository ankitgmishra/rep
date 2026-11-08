"use server";

import { createClient } from "@/lib/supabase/server";
import { getSignedCreativeUrl } from "@/lib/storage/creatives";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

export type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
export type CreativeVersionRow = Database["public"]["Tables"]["creative_versions"]["Row"];
export type CreativeFeedbackRow = Database["public"]["Tables"]["creative_feedback"]["Row"];

export interface CreativeVersionWithUrl extends CreativeVersionRow {
  freshSignedUrl?: string | null;
  feedback?: CreativeFeedbackRow | null;
}

export interface CreativeWithSignedUrl extends CreativeRow {
  freshSignedUrl?: string | null;
  product?: {
    id: string;
    title: string;
    main_image_url: string | null;
    price: number | null;
    currency: string | null;
  } | null;
  campaign?: {
    id: string;
    name: string;
    objective: string;
    brand_id?: string;
  } | null;
  brand?: {
    id: string;
    name: string;
    website_url?: string;
  } | null;
  activeVersionApprovalStatus?: "pending" | "approved" | "rejected";
}

export interface CreativeDetailWithVersions extends CreativeWithSignedUrl {
  versions: CreativeVersionWithUrl[];
  feedbackList: CreativeFeedbackRow[];
  activeVersion: CreativeVersionWithUrl | null;
}

/**
 * Fetches all creatives for the authenticated user with fresh signed URLs and brand/campaign details
 */
export async function getUserCreatives(): Promise<CreativeWithSignedUrl[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: creatives, error } = await supabase
    .from("creatives")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !creatives) {
    console.error("[GET USER CREATIVES ERROR]:", error);
    return [];
  }

  // Hydrate with products, campaigns, and brands
  const productIds = Array.from(new Set(creatives.map((c) => c.product_id)));
  const campaignIds = Array.from(new Set(creatives.map((c) => c.campaign_id)));

  const { data: products } = await supabase
    .from("products")
    .select("id, title, main_image_url, price, currency")
    .in("id", productIds);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, objective, brand_id")
    .in("id", campaignIds);

  const brandIds = Array.from(
    new Set((campaigns || []).map((c) => c.brand_id).filter(Boolean))
  );

  const { data: brands } = brandIds.length > 0
    ? await supabase.from("brands").select("id, name, website_url").in("id", brandIds)
    : { data: [] };

  // Fetch active versions to determine version approval status
  const creativeIds = creatives.map((c) => c.id);
  const { data: activeVersions } = await supabase
    .from("creative_versions")
    .select("id, creative_id, version_number, approval_status")
    .in("creative_id", creativeIds);

  const prodMap = new Map((products || []).map((p) => [p.id, p]));
  const campMap = new Map((campaigns || []).map((c) => [c.id, c]));
  const brandMap = new Map((brands || []).map((b) => [b.id, b]));
  const versionApprovalMap = new Map(
    (activeVersions || []).map((v) => [`${v.creative_id}`, v.approval_status])
  );

  const hydrated = await Promise.all(
    creatives.map(async (c) => {
      let freshSignedUrl: string | null = null;
      if (c.storage_path) {
        freshSignedUrl = await getSignedCreativeUrl(c.storage_path, 86400);
      }
      const camp = campMap.get(c.campaign_id) || null;
      const brand = camp?.brand_id ? brandMap.get(camp.brand_id) || null : null;

      return {
        ...c,
        freshSignedUrl: freshSignedUrl || c.asset_url,
        product: prodMap.get(c.product_id) || null,
        campaign: camp,
        brand,
        activeVersionApprovalStatus: versionApprovalMap.get(c.id) || "pending",
      };
    })
  );

  return hydrated;
}

/**
 * Fetches all creatives for a specific campaign with fresh signed URLs
 */
export async function getCampaignCreatives(
  campaignId: string
): Promise<CreativeWithSignedUrl[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: creatives, error } = await supabase
    .from("creatives")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("variation_index", { ascending: true });

  if (error || !creatives) {
    return [];
  }

  const hydrated = await Promise.all(
    creatives.map(async (c) => {
      let freshSignedUrl: string | null = null;
      if (c.storage_path) {
        freshSignedUrl = await getSignedCreativeUrl(c.storage_path, 86400);
      }
      return {
        ...c,
        freshSignedUrl: freshSignedUrl || c.asset_url,
      };
    })
  );

  return hydrated;
}

/**
 * Fetches a single creative by ID with all versions, feedback, brand, and campaign context
 */
export async function getCreativeById(
  creativeId: string
): Promise<CreativeDetailWithVersions | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: creative, error } = await supabase
    .from("creatives")
    .select("*")
    .eq("id", creativeId)
    .eq("user_id", user.id)
    .single();

  if (error || !creative) {
    return null;
  }

  // 1. Fetch all versions for this creative
  const { data: rawVersions } = await supabase
    .from("creative_versions")
    .select("*")
    .eq("creative_id", creativeId)
    .eq("user_id", user.id)
    .order("version_number", { ascending: false });

  // 2. Fetch feedback list for this creative
  const { data: feedbackList } = await supabase
    .from("creative_feedback")
    .select("*")
    .eq("creative_id", creativeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const feedbackMap = new Map((feedbackList || []).map((f) => [f.id, f]));

  // 3. Resolve signed URLs for each version
  const versions: CreativeVersionWithUrl[] = await Promise.all(
    (rawVersions || []).map(async (v) => {
      let freshUrl: string | null = null;
      if (v.storage_path) {
        freshUrl = await getSignedCreativeUrl(v.storage_path, 86400);
      }
      return {
        ...v,
        freshSignedUrl: freshUrl || v.asset_url,
        feedback: v.feedback_id ? feedbackMap.get(v.feedback_id) || null : null,
      };
    })
  );

  // 4. Determine active version
  let activeVersion: CreativeVersionWithUrl | null = null;
  if (creative.active_version_id) {
    activeVersion = versions.find((v) => v.id === creative.active_version_id) || null;
  }
  if (!activeVersion && versions.length > 0) {
    activeVersion = versions[0];
  }

  // 5. Fetch product, campaign, and brand
  const { data: product } = await supabase
    .from("products")
    .select("id, title, main_image_url, price, currency")
    .eq("id", creative.product_id)
    .single();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, objective, brand_id")
    .eq("id", creative.campaign_id)
    .single();

  let brand: { id: string; name: string; website_url: string } | null = null;
  if (campaign?.brand_id) {
    const { data: b } = await supabase
      .from("brands")
      .select("id, name, website_url")
      .eq("id", campaign.brand_id)
      .single();
    brand = b || null;
  }

  const displayStoragePath = activeVersion?.storage_path || creative.storage_path;
  let freshSignedUrl: string | null = null;
  if (displayStoragePath) {
    freshSignedUrl = await getSignedCreativeUrl(displayStoragePath, 86400);
  }

  return {
    ...creative,
    freshSignedUrl: freshSignedUrl || activeVersion?.asset_url || creative.asset_url,
    product: product || null,
    campaign: campaign || null,
    brand,
    versions,
    feedbackList: feedbackList || [],
    activeVersion,
  };
}

/**
 * Approves a specific version of a creative (Step 8 Version Lifecycle)
 * Enforces version-specific approval status: approving an older version does not approve newer ones.
 */
export async function approveCreativeVersion(
  creativeId: string,
  versionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  // 1. Update version approval status to 'approved'
  const { error: vError } = await supabase
    .from("creative_versions")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      rejected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", versionId)
    .eq("creative_id", creativeId)
    .eq("user_id", user.id);

  if (vError) {
    return { success: false, error: vError.message };
  }

  // 2. Set this approved version as the active version on the parent creative
  const { data: targetVersion } = await supabase
    .from("creative_versions")
    .select("storage_path, asset_url, version_number")
    .eq("id", versionId)
    .single();

  if (targetVersion) {
    await supabase
      .from("creatives")
      .update({
        active_version_id: versionId,
        storage_path: targetVersion.storage_path,
        asset_url: targetVersion.asset_url,
        current_version: targetVersion.version_number,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creativeId)
      .eq("user_id", user.id);
  }

  revalidatePath(`/creatives/${creativeId}`);
  revalidatePath("/creatives");
  return { success: true };
}

/**
 * Rejects a specific version of a creative with optional feedback note
 */
export async function rejectCreativeVersion(
  creativeId: string,
  versionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { error: vError } = await supabase
    .from("creative_versions")
    .update({
      approval_status: "rejected",
      rejected_at: new Date().toISOString(),
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", versionId)
    .eq("creative_id", creativeId)
    .eq("user_id", user.id);

  if (vError) {
    return { success: false, error: vError.message };
  }

  if (reason && reason.trim()) {
    await supabase.from("creative_feedback").insert({
      creative_id: creativeId,
      version_id: versionId,
      user_id: user.id,
      feedback_text: `Rejection Note: ${reason.trim()}`,
      category: "general",
      status: "pending",
    });
  }

  revalidatePath(`/creatives/${creativeId}`);
  revalidatePath("/creatives");
  return { success: true };
}

/**
 * Sets the active/viewed version for a creative
 */
export async function setActiveCreativeVersion(
  creativeId: string,
  versionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { data: targetVersion, error: vError } = await supabase
    .from("creative_versions")
    .select("storage_path, asset_url, version_number")
    .eq("id", versionId)
    .eq("creative_id", creativeId)
    .eq("user_id", user.id)
    .single();

  if (vError || !targetVersion) {
    return { success: false, error: "Target version not found" };
  }

  await supabase
    .from("creatives")
    .update({
      active_version_id: versionId,
      storage_path: targetVersion.storage_path,
      asset_url: targetVersion.asset_url,
      current_version: targetVersion.version_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creativeId)
    .eq("user_id", user.id);

  revalidatePath(`/creatives/${creativeId}`);
  revalidatePath("/creatives");
  return { success: true };
}

/**
 * Records user feedback for a creative and target version
 */
export async function submitCreativeFeedback(
  creativeId: string,
  versionId: string | null,
  feedbackText: string,
  category = "general"
): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };
  if (!feedbackText.trim()) return { success: false, error: "Feedback text is required" };

  const { data, error } = await supabase
    .from("creative_feedback")
    .insert({
      creative_id: creativeId,
      version_id: versionId,
      user_id: user.id,
      feedback_text: feedbackText.trim(),
      category,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/creatives/${creativeId}`);
  return { success: true, feedbackId: data.id };
}

/**
 * Permanently deletes an ad creative and its stored image assets
 */
export async function deleteCreative(creativeId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // 1. Retrieve creative to locate storage path
    const { data: creative } = await supabase
      .from("creatives")
      .select("storage_path")
      .eq("id", creativeId)
      .eq("user_id", user.id)
      .single();

    if (creative?.storage_path) {
      try {
        await supabase.storage.from("ad-creatives").remove([creative.storage_path]);
      } catch (storageErr) {
        console.warn("[DELETE CREATIVE STORAGE WARNING]:", storageErr);
      }
    }

    // 2. Delete database record (cascades to versions, feedback, jobs)
    const { error } = await supabase
      .from("creatives")
      .delete()
      .eq("id", creativeId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE CREATIVE ERROR]:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/creatives");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete creative";
    return { success: false, error: msg };
  }
}


