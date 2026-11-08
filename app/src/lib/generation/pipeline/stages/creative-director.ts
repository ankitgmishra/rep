import { generateObject } from "ai";
import { getGeminiModel } from "@/lib/llm/gemini";
import { VisualPlanSchema, type VisualPlan, type ProductProfile } from "../types";

export interface CreativeDirectorInput {
  productProfile: ProductProfile;
  brandKit?: {
    brand_name?: string;
    primary_color?: string | null;
    secondary_color?: string | null;
    font_family?: string | null;
    personality_traits?: string[] | null;
    color_palette?: Array<{ hex: string; role?: string }> | null;
  } | null;
  campaignObjective: string;
  concept: {
    id: string;
    concept_name: string;
    angle?: string | null;
    headline: string;
    supporting_copy?: string | null;
    cta?: string | null;
    visual_direction?: string | null;
    target_audience?: string | null;
  };
}

/**
 * Stage 2: Creative Director — Gemini
 * Synthesizes a dedicated VisualPlan for this specific advertising concept.
 * Plans scene, environment, lighting, product placement, camera angle, contextual props,
 * and negative space for advertising typography.
 * Ensures genuine creative diversity between concepts.
 */
export async function runCreativeDirector(
  input: CreativeDirectorInput
): Promise<VisualPlan> {
  const { productProfile, brandKit, campaignObjective, concept } = input;

  const brandName = brandKit?.brand_name || "Verified Storefront Brand";
  const primaryColor = brandKit?.primary_color || "#18181b";
  const personality = (brandKit?.personality_traits || ["Modern", "Premium", "Reliable"]).join(", ");

  const promptText = `You are an elite commercial advertising Creative Director.
Develop a bespoke, photorealistic VisualPlan to advertise this product for the approved creative concept below.

PRODUCT PROFILE:
- Product Name: ${productProfile.product_name}
- Category: ${productProfile.product_category}
- Silhouette & Form: ${productProfile.physical_form.shape_and_silhouette}
- Structural Features: ${productProfile.physical_form.key_structural_elements.join("; ")}
- Materials & Finish: ${productProfile.physical_form.materials.join(", ")} (${productProfile.physical_form.finish})
- Color Palette: ${productProfile.color_profile.dominant_colors.join(", ")}
- Distinctive Features: ${productProfile.distinctive_features.join("; ")}
- Preservation Rules: ${productProfile.preservation_rules.join("; ")}

BRAND IDENTITY:
- Brand Name: ${brandName}
- Primary Brand Color: ${primaryColor}
- Brand Personality: ${personality}
- Campaign Objective: ${campaignObjective}

APPROVED CONCEPT:
- Concept Name: ${concept.concept_name}
- Strategic Angle: ${concept.angle || "Problem-Solution & Performance"}
- Headline Idea: "${concept.headline}"
- Target Audience: ${concept.target_audience || "Modern online consumers"}
- Core Narrative: ${concept.visual_direction || "Elevate product utility and design"}

CREATIVE DIRECTIVES:
1. DESIGN A UNIQUE SCENE:
   Create a tailored commercial setting for this concept. DO NOT repeat a generic plain backdrop.
   E.g., if the angle is Daily Ritual / On-the-Go, set in a chic minimalist coffee shop or sunlit city loft with linen textures. If Clinical / Protection, set on an architectural stone pedestal with directional studio key light.
2. PRODUCT PLACEMENT & STAGING:
   Position the authentic product heroically. Choose an intentional 9:16 vertical placement (center, lower_center, upper_center, or floating_isometric).
3. PLAN NEGATIVE SPACE:
   Designate a clean, low-contrast safe zone (e.g. top_third or bottom_third) where the headline and CTA can be laid out without touching or occluding the product.
4. NANO-BANANA PROMPT SPECIFICATION:
   Write a rich, photorealistic positive prompt for google/nano-banana-2.1/edit.
   - Describe the scene environment, lighting, materials, and depth of field.
   - Strictly instruct to PRESERVE the reference product's shape, colors, patterns, and distinctive loops/features exactly.
   - CRITICAL: NO TEXT, NO HEADLINES, NO CALLOUTS, NO LOGOS, NO WATERMARKS in the generated image. Text will be laid out in Stage 4/5.`;

  try {
    const model = getGeminiModel();
    const { object } = await generateObject({
      model,
      schema: VisualPlanSchema,
      system: "You are an award-winning advertising Creative Director. Deliver a structured, Zod-validated VisualPlan that directs an authentic, high-impact commercial photograph tailored to this specific concept.",
      prompt: promptText,
    });

    return object;
  } catch (err) {
    console.warn("[STAGE 2: CREATIVE DIRECTOR] Error running Gemini Creative Director, synthesizing deterministic plan:", err);

    // Fallback deterministic VisualPlan
    const isEditorial = concept.concept_name.toLowerCase().includes("lifestyle") || concept.concept_name.toLowerCase().includes("ritual");
    const isClinical = concept.concept_name.toLowerCase().includes("proof") || concept.concept_name.toLowerCase().includes("protect");

    return {
      concept_id: concept.id,
      advertising_angle: concept.angle || concept.concept_name,
      target_audience_appeal: concept.target_audience || "Discerning digital shoppers seeking premium everyday protection.",
      scene_environment: isEditorial
        ? "Sunlit Scandinavian interior, natural travertine pedestal, soft morning golden hour ambient lighting, warm neutral shadows."
        : isClinical
        ? "High-end minimalist architectural studio, cool slate podium, crisp directional softbox studio key light, subtle specular highlights."
        : "Contemporary urban desktop surface, matte stone slab, balanced commercial rim lighting, polished aesthetic.",
      product_staging: {
        placement_zone: isEditorial ? "lower_center" : "center",
        scale_relative_to_frame: "Hero product occupying approximately 45% of vertical frame height in central focal plane.",
        camera_angle_and_perspective: "Slight 35-degree top-down commercial perspective showcasing loop, edges, and slim profile.",
        lighting_style: "Commercial softbox key light casting delicate grounded contact occlusion shadow.",
      },
      negative_space_plan: {
        headline_safe_zone: isEditorial ? "top_third" : "bottom_third",
        background_complexity_in_text_zone: "Smooth, low-frequency atmospheric gradient providing seamless high-contrast typography legibility.",
      },
      supporting_props: isEditorial
        ? ["Minimalist ceramic espresso cup in soft blur background", "Organic linen cloth texture"]
        : ["Clean architectural geometric stone blocks positioned in distant soft focus"],
      color_harmony: {
        backdrop_tones: [primaryColor, "#09090b", "#27272a"],
        lighting_tint: isEditorial ? "Warm Daylight 5200K" : "Studio Neutral 5600K",
        overall_mood: isEditorial ? "Minimalist Luxury Lifestyle" : "High-Performance Engineered",
      },
      visual_generation_prompt: `Commercial advertising photograph for ${brandName} featuring authentic ${productProfile.product_name}. ${isEditorial ? "Sunlit warm interior on travertine surface" : "Architectural studio pedestal with soft directional key lighting"}. Preserve the authentic product identity, shape, colors, patterns, and distinctive features exactly as shown in reference. Clean negative space at ${isEditorial ? "top" : "bottom"} of frame. Commercial editorial finish, 9:16 portrait composition, high resolution. Strictly no text, no letters, no watermark.`,
      negative_prompt: "text, letters, words, watermark, logos, blurry product, mutated loop, deformed shape, extra fingers, cartoon render",
      product_preservation_directives: `Preserve the authentic ${productProfile.product_name} silhouette, materials, and exact loop structure from the reference photograph. Do not alter colors or distort form factor.`,
    };
  }
}
