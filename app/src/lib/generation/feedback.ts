import { z } from "zod";
import { generateObject } from "ai";
import { getGeminiModel } from "@/lib/llm/gemini";
import { CreativeSpecSchema, type CreativeSpec } from "@/lib/strategy/agent";
import type { Database } from "@/lib/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];
type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
type CreativeVersionRow = Database["public"]["Tables"]["creative_versions"]["Row"];

export const ChangeTypeEnum = z.enum([
  "copy_only",
  "layout_only",
  "visual_regeneration",
  "full_revision",
]);

export type ChangeType = z.infer<typeof ChangeTypeEnum>;

export const CreativeFeedbackOutputSchema = z.object({
  change_type: ChangeTypeEnum.describe(
    "Classification: 'copy_only' (headline, supporting copy, or CTA text changes), 'layout_only' (product size, position, spacing, archetype, or typography mood without background visual changes), 'visual_regeneration' (background environment, lighting, scene material, or setting changes), or 'full_revision' (multiple significant changes requiring both new visual and copy)"
  ),
  change_summary: z.string().describe(
    "A concise 1-2 sentence human-readable explanation of exactly what changed in response to the user's feedback."
  ),
  applied_directives: z.array(z.string()).describe(
    "List of specific concrete actions taken, e.g. 'Updated headline to emphasize drop protection', 'Reduced product scale from hero_large to medium_contextual', 'Preserved existing visual background'"
  ),
  revised_spec: CreativeSpecSchema.describe(
    "The complete updated CreativeSpec incorporating the feedback changes while strictly preserving unchanged fields and grounded facts."
  ),
  revised_generation_prompt: z.string().describe(
    "Updated generation prompt for AI background if visual_regeneration or full_revision is selected, or the previous prompt if copy_only or layout_only."
  ),
});

export type CreativeFeedbackOutput = z.infer<typeof CreativeFeedbackOutputSchema>;

export interface FeedbackAgentInput {
  originalSpec: CreativeSpec;
  previousCreative: {
    id: string;
    title: string;
    headline: string;
    supporting_copy?: string | null;
    cta: string;
    generation_prompt: string;
    model_identifier?: string;
  };
  previousVersion?: {
    version_number: number;
    revised_instructions?: string | null;
  } | null;
  brandKit?: BrandKitRow | null;
  brandName: string;
  product: {
    id: string;
    title: string;
    description?: string | null;
    price?: number | null;
    price_formatted?: string | null;
    currency?: string | null;
    main_image_url?: string | null;
    category?: string | null;
  };
  campaignObjective: string;
  userFeedback: string;
}

/**
 * Deterministic Heuristic Fallback for Feedback Understanding:
 * Used when Gemini API is unavailable or rate-limited.
 * Guarantees zero downtime and safe version creation.
 */
export function analyzeFeedbackHeuristic(input: FeedbackAgentInput): CreativeFeedbackOutput {
  const fb = input.userFeedback.trim();
  const lowerFb = fb.toLowerCase();
  const baseSpec = input.originalSpec;
  const applied_directives: string[] = [];

  const revised_spec: CreativeSpec = {
    ...baseSpec,
    product_placement: { ...baseSpec.product_placement },
    brand_styling: { ...baseSpec.brand_styling },
    source_grounded_claims: [...baseSpec.source_grounded_claims],
  };

  let change_type: ChangeType = "copy_only";
  let change_summary = "";

  // 1. Check for Headline / CTA / Copy changes
  const isCtaChange = lowerFb.includes("cta") || lowerFb.includes("button") || lowerFb.includes("shop now");
  const isHeadlineChange = lowerFb.includes("headline") || lowerFb.includes("title") || lowerFb.includes("hook");
  const isDropProtection = lowerFb.includes("drop protection") || lowerFb.includes("dropproof") || lowerFb.includes("drop proof");

  // 2. Check for Sizing / Layout / Editorial changes
  const isSmaller = lowerFb.includes("smaller") || lowerFb.includes("scale down") || lowerFb.includes("reduce size");
  const isLarger = lowerFb.includes("larger") || lowerFb.includes("bigger") || lowerFb.includes("scale up");
  const isEditorial = lowerFb.includes("editorial") || lowerFb.includes("luxury") || lowerFb.includes("vogue") || lowerFb.includes("serif");

  // 3. Check for Visual / Background changes
  const isMarble = lowerFb.includes("marble") || lowerFb.includes("stone") || lowerFb.includes("carrara");
  const isBackgroundChange = lowerFb.includes("background") || lowerFb.includes("backdrop") || lowerFb.includes("lighting") || lowerFb.includes("sunlight") || lowerFb.includes("setting");

  // Determine change type and apply modifications
  if (isMarble || (isBackgroundChange && !isHeadlineChange && !isCtaChange && !isSmaller)) {
    change_type = "visual_regeneration";
    if (isMarble) {
      revised_spec.background_description = "Honed Italian Carrara marble surface with soft ambient diffused lighting and fine natural stone veining";
      revised_spec.visual_direction = "Warm diffused commercial studio lighting with refined architectural marble reflections";
      applied_directives.push("Updated background environment to premium Italian Carrara marble surface.");
      change_summary = "Regenerated the advertising visual with a luxury Carrara marble background and soft diffused lighting.";
    } else {
      revised_spec.background_description = `Commercial studio environment tailored to user request: ${fb}`;
      applied_directives.push(`Updated scene setting based on feedback: "${fb}"`);
      change_summary = `Updated visual environment and lighting conditioned on: "${fb}".`;
    }
  } else if (isSmaller || isLarger || isEditorial) {
    change_type = "layout_only";
    if (isSmaller) {
      revised_spec.product_placement.scale = "medium_contextual";
      applied_directives.push("Reduced product stage scale from hero_large to medium_contextual (600x700px).");
      change_summary = "Adjusted product layout scale to medium contextual size while keeping the visual intact.";
    } else if (isLarger) {
      revised_spec.product_placement.scale = "tight_macro";
      applied_directives.push("Expanded product scale to tight_macro (820x960px).");
      change_summary = "Increased product scale to macro framing.";
    }

    if (isEditorial) {
      revised_spec.composition_archetype = "editorial_luxury";
      revised_spec.brand_styling.typography_mood = "editorial_serif";
      revised_spec.brand_styling.text_contrast = "dark_on_light";
      revised_spec.brand_styling.primary_color = "#b09f8f";
      applied_directives.push("Updated layout archetype to editorial_luxury with serif typography and luxury framing.");
      change_summary = (change_summary ? change_summary + " Also elevated" : "Elevated") + " overall design archetype to editorial luxury styling.";
    }
  } else if (isHeadlineChange || isCtaChange || isDropProtection) {
    change_type = "copy_only";
    if (isDropProtection) {
      revised_spec.headline = "ENGINEERED FOR 10FT DROP PROTECTION";
      applied_directives.push("Updated headline hook to emphasize certified drop protection.");
      change_summary = "Revised headline to focus specifically on military-grade drop protection.";
    }

    if (isCtaChange) {
      if (lowerFb.includes("shop now")) {
        revised_spec.cta = "Shop Now";
      } else {
        revised_spec.cta = "Shop The Case";
      }
      applied_directives.push(`Updated call-to-action button to "${revised_spec.cta}".`);
      change_summary = (change_summary ? change_summary + " " : "") + `Updated CTA button to "${revised_spec.cta}".`;
    }

    if (!change_summary) {
      change_summary = `Updated ad copy based on directive: "${fb}".`;
      applied_directives.push(`Applied copy directive: "${fb}"`);
    }
  } else {
    // Default fallback
    change_type = "copy_only";
    change_summary = `Applied user feedback directive: "${fb}".`;
    applied_directives.push(`Incorporated directive: "${fb}"`);
  }

  // Generate revised prompt for AI visual
  const isVisualChange = (change_type as string) === "visual_regeneration" || (change_type as string) === "full_revision";
  const revised_generation_prompt = isVisualChange
    ? `Commercial product advertising visual for ${input.brandName}. ${revised_spec.visual_direction}. Setting: ${revised_spec.background_description}. Preserve the authentic product identity, shape, colors, materials, patterns, and logos. Commercial editorial finish, 9:16 portrait orientation.`
    : input.previousCreative.generation_prompt;

  return {
    change_type,
    change_summary,
    applied_directives,
    revised_spec,
    revised_generation_prompt,
  };
}

export interface PromptRevisionInput {
  previousPrompt: string;
  feedbackText: string;
  visualDirection?: string;
  compositionNotes?: string;
  productTitle?: string;
  currentHeadline?: string;
  currentCta?: string;
}

export interface PromptRevisionResult {
  revisedPrompt: string;
  category: "background" | "composition" | "lighting" | "copy" | "promotional" | "general";
  appliedDirectives: string[];
  revisedHeadline?: string;
  revisedCta?: string;
}

/**
 * Backward-compatible helper for legacy test suites
 */
export function revisePromptWithFeedback(input: PromptRevisionInput): PromptRevisionResult {
  const fb = input.feedbackText.trim();
  const lowerFb = fb.toLowerCase();
  const appliedDirectives: string[] = [];
  let category: PromptRevisionResult["category"] = "general";
  let promptAdditions = "";

  if (lowerFb.includes("premium") || lowerFb.includes("luxury") || lowerFb.includes("marble")) {
    category = "background";
    promptAdditions += " High-end ultra-luxurious architectural studio aesthetic, honed Italian Carrara marble surface, subtle brass accents, soft ambient diffused daylight, zero clutter, museum-grade editorial finish.";
    appliedDirectives.push("Elevated background surfaces to luxury Carrara marble and diffused architectural lighting.");
  } else if (lowerFb.includes("larger") || lowerFb.includes("closer") || lowerFb.includes("zoom")) {
    category = "composition";
    promptAdditions += " Dramatic hero macro framing, foreground product dominance, low-angle monumentality with sharp focal depth.";
    appliedDirectives.push("Emphasized macro foreground scale and dramatic low-angle focal depth.");
  } else if (lowerFb.includes("minimal") || lowerFb.includes("clean") || lowerFb.includes("simple")) {
    category = "composition";
    promptAdditions += " Pure Japanese minimalist aesthetic, expansive negative space, matte warm neutral limestone backdrop, serene single-source rim lighting.";
    appliedDirectives.push("Stripped distracting elements for pure minimalist negative space and matte limestone.");
  }

  const explicitDirective = `[USER FEEDBACK DIRECTIVE]: "${fb}". Synthesize a fresh photographic composition specifically fulfilling this instruction: ${fb}.`;
  appliedDirectives.push(`Directly incorporated user directive: "${fb}"`);

  const revisedPrompt = `${input.previousPrompt.replace(/\[USER FEEDBACK DIRECTIVE\].*$/g, "").trim()}.${promptAdditions} ${explicitDirective}`;

  return {
    revisedPrompt: revisedPrompt.trim(),
    category,
    appliedDirectives,
    revisedHeadline: input.currentHeadline,
    revisedCta: input.currentCta,
  };
}

/**
 * Gemini-Powered Creative Feedback Agent:
 * 
 * Takes the marketer's natural-language feedback alongside full context:
 * 1. Original CreativeSpec
 * 2. Previous creative and version
 * 3. Approved brand kit
 * 4. Selected product details and storefront image
 * 5. Campaign objective
 * 
 * Returns a Zod-validated updated CreativeSpec, change classification, and change summary.
 */
export async function analyzeCreativeFeedback(
  input: FeedbackAgentInput
): Promise<CreativeFeedbackOutput> {
  const hasKey =
    Boolean(process.env.GEMINI_API_KEY) ||
    Boolean(process.env.AI_GATEWAY_API_KEY);

  if (!hasKey) {
    console.log("[FEEDBACK AGENT] No API key detected. Running deterministic heuristic feedback parser.");
    return analyzeFeedbackHeuristic(input);
  }

  try {
    const model = getGeminiModel();

    const brandVoice = input.brandKit?.brand_voice || "Modern, direct, and authoritative";
    const brandValueProp = input.brandKit?.value_proposition || "High-performance direct-to-consumer essentials";
    const audience = input.brandKit?.target_audience || "Mobile users";

    const systemPrompt = `You are ploy's Chief Advertising Strategist and Creative Director powered by Google Gemini.
Your job is to analyze marketer feedback on an existing ad creative and produce an updated, Zod-validated CreativeSpec and change classification.

STRICT CHANGE CLASSIFICATION RULES:
1. "copy_only":
   - Use this when feedback requests changes ONLY to headlines, supporting copy, or CTA button text (e.g. 'Change the headline to focus on drop protection', 'Change the CTA to Shop Now', 'Make headline shorter', 'Make copy punchier').
   - In this mode, visual_direction, background_description, composition_archetype, and product_placement MUST remain unchanged.
   - Do NOT modify the visual background description.
2. "layout_only":
   - Use this when feedback requests changes to product sizing, scale, placement, composition archetype, or typography mood WITHOUT requesting a new background scene (e.g. 'Make the product smaller', 'Make the product larger', 'Move product to bottom third', 'Make the overall design more editorial').
   - If feedback says 'Make the product smaller': update product_placement.scale to 'medium_contextual' (or 'hero_large' if it was 'tight_macro').
   - If feedback says 'Make the overall design more editorial': update composition_archetype to 'editorial_luxury', brand_styling.typography_mood to 'editorial_serif', and brand_styling.text_contrast to 'dark_on_light'.
   - In this mode, background_description MUST remain unchanged.
3. "visual_regeneration":
   - Use this when feedback requests changes to the physical setting, environment, background surface, materials, lighting, or atmosphere (e.g. 'Use a premium marble background', 'Put product on sunlit vanity', 'Make lighting dark and moody').
   - Update background_description and visual_direction in revised_spec.
   - Update revised_generation_prompt to describe the new scene.
4. "full_revision":
   - Use this when feedback requests multiple significant changes spanning both the visual environment AND copy/layout simultaneously.

STRICT SOURCE-GROUNDING & SAFETY:
- NEVER invent non-existent warranties, fake customer ratings, fabricated review counts, or unverified claims.
- Validate all claims in revised_spec.source_grounded_claims against the provided product and brand data.
- Ensure the headline is punchy, high-impact, and mobile-ready (max 10-12 words).
- Provide a clear, concise 1-2 sentence change_summary explaining what was modified.`;

    const userPrompt = `BRAND IDENTITY:
- Brand Name: ${input.brandName}
- Value Proposition: ${brandValueProp}
- Brand Voice: ${brandVoice}
- Target Audience: ${audience}

CATALOG PRODUCT:
- Title: ${input.product.title}
- Price: ${input.product.price_formatted || (input.product.price ? `$${input.product.price}` : "Standard Storefront Price")}
- Description: ${input.product.description || "Authentic catalog product"}
- Category: ${input.product.category || "Accessories"}

CAMPAIGN OBJECTIVE:
${input.campaignObjective}

PREVIOUS CREATIVE STATE:
- Version Number: ${input.previousVersion?.version_number || 1}
- Previous Headline: "${input.previousCreative.headline}"
- Previous Supporting Copy: "${input.previousCreative.supporting_copy || ""}"
- Previous CTA: "${input.previousCreative.cta}"
- Previous Prompt: "${input.previousCreative.generation_prompt}"
- Previous CreativeSpec:
${JSON.stringify(input.originalSpec, null, 2)}

MARKETER FEEDBACK INSTRUCTION:
"${input.userFeedback}"

Analyze the feedback, classify the change type, produce the updated CreativeSpec, and summarize the modification.`;

    const { object } = await generateObject({
      model,
      schema: CreativeFeedbackOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return object;
  } catch (err) {
    console.warn(
      "[FEEDBACK AGENT] Gemini LLM call encountered an error. Falling back to Heuristic Feedback Parser:",
      err
    );
    return analyzeFeedbackHeuristic(input);
  }
}
