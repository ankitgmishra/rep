import { generateObject } from "ai";
import { getGeminiModel } from "@/lib/llm/gemini";
import { DesignSpecSchema, type DesignSpec, type VisualPlan, type ProductProfile } from "../types";

export interface ArtDirectionInput {
  rawVisualBuffer: Buffer;
  visualPlan: VisualPlan;
  productProfile: ProductProfile;
  brandKit?: {
    brand_name?: string;
    primary_color?: string | null;
    secondary_color?: string | null;
    font_family?: string | null;
    personality_traits?: string[] | null;
  } | null;
  concept: {
    id: string;
    concept_name: string;
    headline: string;
    supporting_copy?: string | null;
    cta?: string | null;
  };
  verifiedClaims: string[];
}

/**
 * Stage 4: Art Direction — Gemini Vision
 * Analyzes the actual generated advertising photograph to make expert art direction decisions.
 * Adapts typography, layout, text position, CTA button placement, colors, and contrast overlays
 * dynamically to the actual composition of the photo, rather than using a rigid static template.
 * Strictly uses verified product claims.
 */
export async function runArtDirection(
  input: ArtDirectionInput
): Promise<DesignSpec> {
  const {
    rawVisualBuffer,
    visualPlan,
    productProfile,
    brandKit,
    concept,
    verifiedClaims,
  } = input;

  const brandName = brandKit?.brand_name || "Storefront Brand";
  const primaryBrandColor = brandKit?.primary_color || "#18181b";
  const fontFamily = brandKit?.font_family || "Plus Jakarta Sans, Inter, sans-serif";

  const promptText = `You are an elite commercial advertising Art Director.
Look at this actual generated 9:16 advertising photograph. Your job is to design the typography, graphic accents, CTA button, and readability overlays tailored specifically to this image.

CANVAS DIMENSIONS: 1080px wide × 1920px tall (9:16 mobile portrait).

PRODUCT UNDERSTANDING:
- Product: ${productProfile.product_name}
- Distinctive Features: ${productProfile.distinctive_features.join("; ")}
- Verified Claims: ${verifiedClaims.join("; ")}

CAMPAIGN CONCEPT:
- Concept Name: ${concept.concept_name}
- Concept Headline Idea: "${concept.headline}"
- Concept Supporting Copy Idea: "${concept.supporting_copy || ""}"
- Desired CTA: "${concept.cta || "Shop Now"}"

VISUAL STAGING CONTEXT:
- Headline Safe Zone Planned: ${visualPlan.negative_space_plan.headline_safe_zone}
- Product Placement: ${visualPlan.product_staging.placement_zone}

ART DIRECTION INSTRUCTIONS:
1. INSPECT THE ATTACHED PHOTOGRAPH:
   - Identify where the product is physically positioned.
   - NEVER place headlines, text blocks, or CTA buttons over the product or its distinctive loop/details.
   - If the product sits in the lower half, position the headline and supporting copy in the upper negative space (y: 160-380).
   - If the product sits in the upper half or center, place the headline in the clean upper or lower third with adequate breathing room.
2. DYNAMIC CONTRAST & READABILITY:
   - Check the luminosity of the background behind your planned text.
   - If the backdrop is dark/moody, use crisp high-contrast white text (#FFFFFF or #F8FAFC) with soft text shadows.
   - If the backdrop has variable lighting, specify a subtle gradient scrim in 'overlays' (e.g. scrim_top or scrim_bottom with 0.45 start opacity) to guarantee effortless mobile readability.
3. TYPOGRAPHY & VISUAL HIERARCHY:
   - Headline: Large, bold, punchy (font size 54-82px), maximum width 920px. Keep it to 2-3 lines max.
   - Supporting copy: Subordinate (font size 24-32px), clean line height.
   - CTA Button: Prominent, high-conversion mobile pill (height: 76-88px, width: 340-420px, radius: 40px), positioned in safe thumb zone or directly below copy.
4. BADGES:
   - Create 1 tasteful badge (e.g., "PATENTED DROP PROTECTION" or "VERIFIED PRICE: $42.99").
   - DO NOT fabricate fake star ratings or reviews if not in verified claims.
5. NO TEMPLATE RESTRICTIONS:
   - Compute actual pixel coordinates (x, y) that fit THIS specific photo.`;

  try {
    const model = getGeminiModel();

    const { object } = await generateObject({
      model,
      schema: DesignSpecSchema,
      system: "You are a master advertising Art Director. Return a structured, Zod-validated DesignSpec with precise layout instructions adapted to the actual photograph. Use only verified claims.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image",
              image: rawVisualBuffer,
            },
          ],
        },
      ],
    });

    return object;
  } catch (err) {
    console.warn("[STAGE 4: ART DIRECTION] Gemini Art Director encountered an error, falling back to dynamic adaptive spec:", err);

    // Fallback adaptive design spec based on visual plan safe zone
    const isTopSafe = visualPlan.negative_space_plan.headline_safe_zone === "top_third";

    return {
      layout_archetype_name: "adaptive_dynamic_editorial",
      canvas: { width: 1080, height: 1920 },
      headline: {
        text: concept.headline,
        font_family: fontFamily,
        font_size: 64,
        font_weight: "800",
        color: "#FFFFFF",
        text_align: "center",
        x: 540,
        y: isTopSafe ? 240 : 1380,
        max_width: 880,
        line_height_multiplier: 1.15,
        letter_spacing: -0.5,
        text_shadow: {
          color: "rgba(0, 0, 0, 0.65)",
          blur: 12,
          offset_y: 4,
        },
      },
      supporting_copy: concept.supporting_copy
        ? {
            text: concept.supporting_copy,
            font_family: fontFamily,
            font_size: 26,
            font_weight: "500",
            color: "#E2E8F0",
            text_align: "center",
            x: 540,
            y: isTopSafe ? 380 : 1520,
            max_width: 820,
            line_height_multiplier: 1.3,
          }
        : undefined,
      cta_button: {
        text: concept.cta || "Shop Now",
        x: 350,
        y: isTopSafe ? 1720 : 1660,
        width: 380,
        height: 84,
        background_color: "#FFFFFF",
        text_color: "#09090B",
        font_size: 24,
        font_weight: "800",
        border_radius: 42,
        icon: "arrow_right",
      },
      badges: verifiedClaims.length > 0
        ? [
            {
              text: verifiedClaims[0].toUpperCase(),
              x: 540,
              y: isTopSafe ? 140 : 1300,
              padding_x: 20,
              padding_y: 8,
              background_color: "rgba(0, 0, 0, 0.6)",
              text_color: "#F8FAFC",
              border_radius: 20,
              font_size: 16,
              font_weight: "700",
            },
          ]
        : [],
      brand_bar: {
        brand_name: brandName,
        x: 60,
        y: 85,
        color: "#FFFFFF",
        font_size: 22,
        font_weight: "800",
        show_logo: false,
      },
      overlays: [
        {
          type: isTopSafe ? "scrim_top" : "scrim_bottom",
          direction: isTopSafe ? "to_bottom" : "to_top",
          y: isTopSafe ? 0 : 1200,
          height: 720,
          start_opacity: 0.55,
          end_opacity: 0.0,
          color: "#000000",
        },
      ],
      source_grounded_claims: verifiedClaims,
    };
  }
}
