import sharp from "sharp";
import { uploadCreativeAsset } from "@/lib/storage/creatives";
import {
  generateAdvertisingVisual,
  NANO_BANANA_EDIT_MODEL,
} from "../../providers/fal";
import type { VisualPlan, ProductProfile } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface VisualGenerationStageInput {
  visualPlan: VisualPlan;
  productProfile: ProductProfile;
  productImageUrl: string;
  userId: string;
  campaignId: string;
  creativeId: string;
  supabaseClient?: SupabaseClient;
  customProductBuffer?: Buffer;
}

export interface VisualGenerationStageResult {
  success: boolean;
  rawVisualBuffer: Buffer;
  rawVisualStoragePath: string;
  rawVisualSignedUrl?: string;
  mode: "nano_banana_edit" | "pixel_preserving_fallback" | "reference_edit" | "composite_cutout";
  fidelityScore: number;
  modelIdentifier: string;
  generationPrompt: string;
  error?: string;
}

/**
 * Stage 3: Visual Generation — fal.ai (google/nano-banana-2.1/edit)
 * Strictly powered by fal.ai.
 * Zero code-based image generation fallbacks.
 *
 * If product fidelity check triggers pixel preservation, background is generated via
 * fal.ai google/nano-banana-2.1 and cutout via fal.ai Bria RMBG.
 *
 * If fal.ai fails at any point, throws immediately with the exact error.
 */
export async function runVisualGeneration(
  input: VisualGenerationStageInput
): Promise<VisualGenerationStageResult> {
  const {
    visualPlan,
    productProfile,
    productImageUrl,
    userId,
    campaignId,
    creativeId,
    supabaseClient,
  } = input;

  const apiKey = process.env.FAL_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("placeholder")) {
    throw new Error("FAL_KEY is not configured. fal.ai is required for visual generation.");
  }

  console.log(`[STAGE 3] Dispatching visual generation to fal.ai for ${productProfile.product_name}...`);

  // Delegate strictly to fal.ai provider
  const falResult = await generateAdvertisingVisual({
    referenceImageUrl: productImageUrl,
    prompt: visualPlan.visual_generation_prompt,
    spec: {
      advertising_angle: visualPlan.advertising_angle,
      target_audience: visualPlan.target_audience_appeal,
      headline: "Visual Background",
      supporting_copy: "",
      cta: "Shop Now",
      visual_direction: visualPlan.visual_generation_prompt,
      background_description: visualPlan.scene_environment,
      composition_archetype: "hero_spotlight",
      product_placement: {
        position: visualPlan.product_staging.placement_zone === "lower_center" ? "bottom_third" : "center",
        scale: "hero_large",
        surface_interaction: "Contact shadow",
      },
      brand_styling: {
        primary_color: visualPlan.color_harmony.backdrop_tones[0] || "#18181b",
        text_contrast: "light_on_dark",
        typography_mood: "bold_sans",
      },
      source_grounded_claims: [],
    },
    brandName: productProfile.branding_elements.brand_markers[0] || "Brand",
    width: 1080,
    height: 1920,
  });

  if (!falResult.imageBuffer) {
    throw new Error(falResult.error || "fal.ai did not return an image buffer.");
  }

  let finalBuffer = falResult.imageBuffer;

  // In composite_cutout mode, composite the fal.ai generated cutout over the fal.ai generated background with Sharp
  if (falResult.mode === "composite_cutout" && falResult.cutoutBuffer) {
    console.log(`[STAGE 3] Compositing fal.ai cutout onto fal.ai generated background...`);
    const canvasBg = await sharp(falResult.imageBuffer)
      .resize(1080, 1920, { fit: "cover", position: "center" })
      .toBuffer();

    const cutoutResized = await sharp(falResult.cutoutBuffer)
      .resize(600, 880, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    const cutoutMeta = await sharp(cutoutResized).metadata();
    const cWidth = cutoutMeta.width || 600;
    const cHeight = cutoutMeta.height || 880;

    const left = Math.round((1080 - cWidth) / 2);
    let top = Math.round((1920 - cHeight) / 2);
    if (visualPlan.product_staging.placement_zone === "lower_center") {
      top = Math.round(1920 * 0.45);
    } else if (visualPlan.product_staging.placement_zone === "upper_center") {
      top = Math.round(1920 * 0.22);
    }

    const shadowSvg = `
      <svg width="${cWidth + 120}" height="140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.65"/>
            <stop offset="60%" stop-color="#000000" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.0"/>
          </radialGradient>
        </defs>
        <ellipse cx="${(cWidth + 120) / 2}" cy="70" rx="${cWidth * 0.45}" ry="35" fill="url(#shadowGrad)"/>
      </svg>
    `;
    const shadowBuffer = Buffer.from(shadowSvg);
    const shadowTop = top + cHeight - 65;
    const shadowLeft = left - 60;

    finalBuffer = await sharp(canvasBg)
      .composite([
        { input: shadowBuffer, top: Math.max(0, shadowTop), left: Math.max(0, shadowLeft) },
        { input: cutoutResized, top, left },
      ])
      .png()
      .toBuffer();
  } else {
    // Ensure 1080x1920 dimensions
    finalBuffer = await sharp(finalBuffer)
      .resize(1080, 1920, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
  }

  // Save intermediate visual to Supabase Storage
  const uploadRes = await uploadCreativeAsset(
    {
      userId,
      campaignId,
      creativeId,
      buffer: finalBuffer,
      mimeType: "image/png",
      filename: `raw_visual_${Date.now()}.png`,
    },
    supabaseClient
  );

  return {
    success: true,
    rawVisualBuffer: finalBuffer,
    rawVisualStoragePath: uploadRes.storagePath || `${userId}/${campaignId}/${creativeId}_raw.png`,
    rawVisualSignedUrl: uploadRes.signedUrl,
    mode: falResult.mode,
    fidelityScore: falResult.fidelityScore,
    modelIdentifier: falResult.modelIdentifier || NANO_BANANA_EDIT_MODEL,
    generationPrompt: visualPlan.visual_generation_prompt,
  };
}
