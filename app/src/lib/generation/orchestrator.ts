import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCampaignById } from "@/lib/actions/campaigns";
import { analyzeCreativeFeedback } from "./feedback";
import {
  generateCompleteAdvertisementViaFal,
  NANO_BANANA_EDIT_MODEL,
  type GeminiAdReview,
} from "./providers/fal";
import { uploadCreativeAsset } from "@/lib/storage/creatives";
import {
  executeSequentialPipeline,
  enqueueSequentialCreativeJobs,
  processJobSequentialCompletion,
} from "./pipeline/orchestrator";
import type { Database } from "@/lib/supabase/types";

type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
type CreativeVersionRow = Database["public"]["Tables"]["creative_versions"]["Row"];

export interface RunCreativeGenerationInput {
  campaignId: string;
  conceptIds?: string[];
  conceptId?: string;
  productId?: string;
  userId: string;
}

export interface RunCreativeGenerationResult {
  success: boolean;
  creatives?: CreativeRow[];
  error?: string;
}

export interface RegenerateVersionInput {
  creativeId: string;
  versionId?: string;
  feedbackText: string;
  userId: string;
}

export interface RegenerateVersionResult {
  success: boolean;
  version?: CreativeVersionRow;
  changeSummary?: string;
  changeType?: "copy_only" | "layout_only" | "visual_regeneration" | "full_revision";
  appliedDirectives?: string[];
  review?: GeminiAdReview;
  error?: string;
}

/**
 * Sequential Pipeline Orchestration Entry Points:
 * Completely replaces the obsolete single-stage and template-based generator.
 */

export async function runCreativeGenerationPipeline(
  input: RunCreativeGenerationInput,
  customClient?: SupabaseClient
): Promise<RunCreativeGenerationResult> {
  const supabase = customClient || (await createClient());

  // Locate target concept
  let conceptIds = input.conceptIds;
  if (!conceptIds || conceptIds.length === 0) {
    if (input.conceptId) {
      conceptIds = [input.conceptId];
    } else {
      const campaignData = await getCampaignById(input.campaignId, supabase);
      const concepts = campaignData?.concepts || [];
      const approved = concepts.filter((c) => c.is_approved);
      conceptIds = (approved.length > 0 ? approved : concepts).map((c) => c.id);
    }
  }

  if (!conceptIds || conceptIds.length === 0) {
    return { success: false, error: "No campaign concepts available to generate." };
  }

  const createdCreatives: CreativeRow[] = [];

  for (const conceptId of conceptIds) {
    const res = await executeSequentialPipeline(
      {
        campaignId: input.campaignId,
        conceptId,
        productId: input.productId || "",
        userId: input.userId,
      },
      supabase
    );

    if (res.success && res.creativeId) {
      const { data: cr } = await supabase
        .from("creatives")
        .select("*")
        .eq("id", res.creativeId)
        .single();
      if (cr) createdCreatives.push(cr);
    }
  }

  return {
    success: createdCreatives.length > 0,
    creatives: createdCreatives,
    error: createdCreatives.length === 0 ? "Failed to produce advertising creatives." : undefined,
  };
}

/**
 * Intelligent Feedback-Driven Version Regeneration:
 * Uses Gemini Creative Feedback Agent to classify change request:
 * - copy_only / layout_only: Skips fal.ai entirely. Re-runs Art Direction & Sharp AI Rendering on existing raw visual.
 * - visual_regeneration / full_revision: Re-runs Visual Generation with revised VisualPlan, then Art Direction & Rendering.
 * - Quality Assurance verifies all iterations.
 */
export async function regenerateCreativeVersion(
  input: RegenerateVersionInput,
  customClient?: SupabaseClient
): Promise<RegenerateVersionResult> {
  const supabase = customClient || (await createClient());

  // 1. Fetch creative record
  const { data: creative, error: crErr } = await supabase
    .from("creatives")
    .select("*")
    .eq("id", input.creativeId)
    .eq("user_id", input.userId)
    .single();

  if (crErr || !creative) {
    return { success: false, error: "Creative not found or access denied." };
  }

  // Fetch product and campaign explicitly
  let { data: productRow } = await supabase
    .from("products")
    .select("*")
    .eq("id", creative.product_id)
    .maybeSingle();

  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", creative.campaign_id)
    .maybeSingle();

  // 2. Fetch campaign and brand data
  const campaignData = await getCampaignById(creative.campaign_id, supabase);
  const brandKit = campaignData?.brandKit;
  const brandName = brandKit?.brand_name || campaignData?.brand?.name || "Brand";

  if (!productRow || !productRow.main_image_url) {
    if (campaignData?.products && campaignData.products.length > 0) {
      productRow = (campaignData.products.find((p) => p.main_image_url) || productRow) as typeof productRow;
    }
  }

  if (!productRow || !productRow.main_image_url) {
    return { success: false, error: "Product reference image is missing for ad iteration." };
  }

  // 3. Fetch latest version
  const { data: versions } = await supabase
    .from("creative_versions")
    .select("*")
    .eq("creative_id", creative.id)
    .order("version_number", { ascending: false });

  const latestVersion = versions?.[0];
  const nextVersionNumber = (latestVersion?.version_number || 1) + 1;

  // 4. Analyze feedback with Gemini Feedback Agent
  const feedbackResult = await analyzeCreativeFeedback({
    originalSpec: (creative.generation_metadata as Record<string, unknown>)?.visual_plan as never || {
      advertising_angle: "Performance",
      target_audience: "Shoppers",
      headline: creative.headline,
      supporting_copy: creative.supporting_copy || "",
      cta: creative.cta,
      visual_direction: "Commercial studio",
      background_description: "Studio pedestal",
      composition_archetype: "hero_spotlight",
      product_placement: { position: "center", scale: "hero_large", surface_interaction: "Shadow" },
      brand_styling: { primary_color: "#18181b", text_contrast: "light_on_dark", typography_mood: "bold_sans" },
      source_grounded_claims: ["Storefront SKU"],
    },
    previousCreative: {
      id: creative.id,
      title: creative.title,
      headline: creative.headline,
      supporting_copy: creative.supporting_copy,
      cta: creative.cta,
      generation_prompt: creative.generation_prompt,
      model_identifier: creative.model_identifier,
    },
    previousVersion: latestVersion
      ? {
          version_number: latestVersion.version_number,
          revised_instructions: latestVersion.revised_instructions,
        }
      : null,
    brandKit,
    brandName,
    product: {
      id: productRow.id,
      title: productRow.title,
      description: productRow.description || null,
      price: productRow.price || null,
      price_formatted: productRow.price_formatted || null,
      currency: productRow.currency || "$",
      main_image_url: productRow.main_image_url,
      category: productRow.category || null,
    },
    campaignObjective: campaignRow?.objective || "E-commerce conversions",
    userFeedback: input.feedbackText,
  });

  // 5. Record feedback in creative_feedback table
  await supabase
    .from("creative_feedback")
    .insert({
      creative_id: creative.id,
      version_id: latestVersion?.id || null,
      user_id: input.userId,
      feedback_text: input.feedbackText,
      category: feedbackResult.change_type,
      status: "applied",
    });

  // 6. Direct fal.ai generation with feedback directives
  console.log(`[AGENT API] Synthesizing revised ad v${nextVersionNumber} on fal.ai with directives:`, feedbackResult.applied_directives);

  const revisedHeadline = feedbackResult.revised_spec?.headline && feedbackResult.revised_spec.headline !== creative.headline
    ? feedbackResult.revised_spec.headline
    : creative.headline;

  const revisedCta = feedbackResult.revised_spec?.cta && feedbackResult.revised_spec.cta !== creative.cta
    ? feedbackResult.revised_spec.cta
    : creative.cta;

  const revisedSupporting = feedbackResult.revised_spec?.supporting_copy !== undefined
    ? feedbackResult.revised_spec.supporting_copy
    : creative.supporting_copy;

  const directives = feedbackResult.applied_directives && feedbackResult.applied_directives.length > 0
    ? feedbackResult.applied_directives
    : [input.feedbackText];

  const adResult = await generateCompleteAdvertisementViaFal({
    brandName,
    productTitle: productRow.title,
    referenceImageUrl: productRow.main_image_url,
    headline: revisedHeadline,
    supportingCopy: revisedSupporting,
    cta: revisedCta,
    angle: feedbackResult.revised_spec?.advertising_angle || creative.title || "Performance",
    visualDirection: feedbackResult.revised_spec?.visual_direction || input.feedbackText,
    brandColors: (brandKit?.brand_colors as Array<{ hex: string; usage: string }>) || [],
    feedbackDirectives: directives,
  });

  if (!adResult.success || !adResult.imageBuffer) {
    return {
      success: false,
      error: adResult.error || "fal.ai advertisement iteration failed.",
    };
  }

  // 7. Upload revised asset to Supabase Storage
  const upload = await uploadCreativeAsset(
    {
      userId: input.userId,
      campaignId: creative.campaign_id,
      creativeId: creative.id,
      buffer: adResult.imageBuffer,
      mimeType: "image/png",
      filename: `v${nextVersionNumber}_${Date.now()}.png`,
    },
    supabase
  );

  const signedUrl = upload.signedUrl || "";
  const storagePath = upload.storagePath || "";

  // 8. Insert new version record
  const metadata = {
    pipeline_version: "3.0-pure-fal-ad",
    model_identifier: NANO_BANANA_EDIT_MODEL,
    generation_prompt: adResult.generationPrompt,
    review: adResult.review,
    feedback: input.feedbackText,
    directives,
    change_type: feedbackResult.change_type,
    change_summary: feedbackResult.change_summary,
  };

  const { data: newVersion, error: vErr } = await supabase
    .from("creative_versions")
    .insert({
      creative_id: creative.id,
      user_id: input.userId,
      version_number: nextVersionNumber,
      storage_path: storagePath,
      asset_url: signedUrl,
      generation_prompt: adResult.generationPrompt,
      revised_instructions: input.feedbackText,
      status: "succeeded",
      approval_status: "pending",
      width: 1080,
      height: 1920,
      file_size: adResult.imageBuffer.length,
      metadata,
    })
    .select("*")
    .single();

  if (vErr || !newVersion) {
    console.error("[ORCHESTRATOR VERSION INSERT ERROR]:", vErr);
  }

  // 9. Update creative record with latest iteration
  await supabase
    .from("creatives")
    .update({
      status: "succeeded",
      storage_path: storagePath,
      asset_url: signedUrl,
      headline: revisedHeadline,
      supporting_copy: revisedSupporting,
      cta: revisedCta,
      file_size: adResult.imageBuffer.length,
      generation_metadata: metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creative.id);

  return {
    success: true,
    version: newVersion || latestVersion || undefined,
    changeSummary: feedbackResult.change_summary,
    changeType: feedbackResult.change_type,
    appliedDirectives: feedbackResult.applied_directives,
    review: adResult.review,
  };
}

export {
  executeSequentialPipeline,
  enqueueSequentialCreativeJobs,
  processJobSequentialCompletion,
};
