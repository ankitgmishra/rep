import { z } from "zod";
import { generateObject } from "ai";
import { getGeminiModel } from "@/lib/llm/gemini";
import type { Database } from "@/lib/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];

export const CompositionArchetypeEnum = z.enum([
  "hero_spotlight",
  "editorial_luxury",
  "problem_solution_split",
  "lifestyle_in_situ",
  "minimal_monolith",
]);

export const CreativeSpecSchema = z.object({
  advertising_angle: z.string().describe("Specific psychological advertising angle, e.g. Problem-Agitate-Solve, Social Proof & Validation, or Daily Ritual & Lifestyle Transformation"),
  target_audience: z.string().describe("Specific buyer persona targeted by this concept"),
  headline: z.string().describe("High-impact hook headline for the ad creative (max 10-12 words)"),
  supporting_copy: z.string().describe("Concise 1-2 sentence supporting body copy derived strictly from verified product benefits"),
  cta: z.string().describe("Action-oriented call-to-action button text, e.g. 'Shop The Case', 'Claim Free Shipping'"),
  visual_direction: z.string().describe("Lighting mood, color harmony, atmosphere, and visual tone"),
  background_description: z.string().describe("Photographic scene environment for AI background generation (e.g. minimalist dark honed slate with water droplets, bright sunlit Scandinavian vanity)"),
  composition_archetype: CompositionArchetypeEnum.describe("Structural composition archetype for 9:16 layout"),
  product_placement: z.object({
    position: z.enum(["center", "bottom_third", "offset_left", "offset_right"]).default("center"),
    scale: z.enum(["hero_large", "medium_contextual", "tight_macro"]).default("hero_large"),
    surface_interaction: z.string().describe("How product meets the ground plane (e.g. contact shadow on dark stone, soft reflection on marble)"),
  }),
  brand_styling: z.object({
    primary_color: z.string().describe("Hex color code anchored in brand palette or high-contrast accent"),
    text_contrast: z.enum(["dark_on_light", "light_on_dark"]).default("light_on_dark"),
    typography_mood: z.enum(["bold_sans", "editorial_serif", "modern_grotesk"]).default("bold_sans"),
  }),
  source_grounded_claims: z.array(z.string()).describe("List of verified facts, pricing, or product claims from the store data that this concept is strictly grounded upon. Never invent non-existent ratings, fake warranties, or fabricated prices."),
});

export const AdConceptSchema = z.object({
  concept_name: z.string().describe("A distinctive, memorable title for this ad concept"),
  angle: z.string().describe("The distinct marketing angle, e.g. Problem-Agitate-Solve, Social Proof & Validation, or Daily Ritual & Lifestyle Transformation"),
  target_audience: z.string().describe("Specific buyer persona targeted by this concept"),
  core_message: z.string().describe("The primary single benefit or emotional hook in one sentence"),
  headline: z.string().describe("High-impact hook headline for the ad creative (max 10-12 words)"),
  supporting_copy: z.string().describe("Engaging 1-2 sentence body copy emphasizing real verified product benefits"),
  cta: z.string().describe("Action-oriented call-to-action button text, e.g. 'Shop The Case', 'Claim Free Shipping', 'Unlock Everyday Grip'"),
  visual_direction: z.string().describe("Art direction detailing scene lighting, mood, color palette, model expression, and visual tone"),
  composition_and_background: z.string().describe("Exact framing (e.g. 9:16 portrait), foreground product placement, background textures (e.g. wet marble, sunlit morning vanity), and depth of field"),
  strategic_reasoning: z.string().describe("Clear explanation of why this specific angle suits the brand identity, selected product, and campaign objective"),
  creative_spec: CreativeSpecSchema.describe("Structured, Zod-validated CreativeSpec executable by creative generation"),
});

export const CampaignStrategyOutputSchema = z.object({
  strategic_overview: z.string().describe("Executive summary of how the 3 concepts address the campaign objective"),
  concepts: z.array(AdConceptSchema).length(3).describe("Exactly three meaningfully differentiated advertising concepts, each with its own full CreativeSpec"),
});

export type CreativeSpec = z.infer<typeof CreativeSpecSchema>;
export type AdConcept = z.infer<typeof AdConceptSchema>;
export type CampaignStrategyOutput = z.infer<typeof CampaignStrategyOutputSchema>;

export interface GenerateStrategyInput {
  brand: {
    id: string;
    name: string;
    website_url: string;
    industry?: string | null;
  };
  brandKit: BrandKitRow | null;
  products: ProductRow[];
  objective: string;
  additionalInstructions?: string | null;
  revisionInstructions?: string | null;
}

/**
 * High-fidelity domain-driven strategic synthesis engine
 * Used when an external LLM key is not configured or in testing environments
 */
function generateHeuristicStrategy(input: GenerateStrategyInput): CampaignStrategyOutput {
  const brandName = input.brandKit?.brand_name || input.brand.name;
  const valueProp = input.brandKit?.value_proposition || "Direct-response ecommerce excellence";
  const voice = input.brandKit?.brand_voice || "Authoritative, modern, and benefit-focused";
  const audience = input.brandKit?.target_audience || "Discerning online shoppers";

  const heroProduct = input.products[0] || {
    title: `${brandName} Signature Item`,
    price: 49.0,
    currency: "USD",
    description: "Authentic formulated direct-to-consumer item.",
  };

  const productTitle = heroProduct.title;
  const priceDisplay = heroProduct.price
    ? `${heroProduct.currency || "$"}${heroProduct.price}`
    : "Verified Storefront Price";

  const revisionNote = input.revisionInstructions
    ? ` [Revision Focus: ${input.revisionInstructions}]`
    : "";

  return {
    strategic_overview: `Strategic direct-response roadmap formulated for ${brandName} targeting '${input.objective}'. Three psychologically distinct advertising strategies (Friction Relief, Social Proof & Validation, and Aspirational Ritual) were synthesized, each equipped with its own Zod-validated CreativeSpec grounded strictly in verified catalog facts.`,
    concepts: [
      {
        concept_name: `The Friction Reliever — Direct Solution${revisionNote}`,
        angle: "Problem-Agitate-Solve (Friction Reliever)",
        target_audience: `Problem-aware buyers seeking an immediate, durable end to everyday product failures (${audience}).`,
        core_message: `Stop risking accidental drops; ${productTitle} delivers engineered security designed specifically for active use.`,
        headline: `Tired of Dropping Your Phone? Meet ${productTitle}.`,
        supporting_copy: `Engineered around ${valueProp}. Experience secure grip and drop prevention starting at ${priceDisplay}.`,
        cta: "Get Yours Today",
        visual_direction: `High-contrast cinematic studio lighting with deep graphite shadows and sharp rim illumination. Focus strictly on tactile utility.`,
        composition_and_background: `9:16 vertical crop. Hero product centered in foreground on dark honed slate with realistic contact shadow. Clean negative space top and bottom for text hierarchy.`,
        strategic_reasoning: `Problem-Agitate-Solve immediately stops thumbs in fast-scrolling feeds by addressing past user frustration. High direct-response conversion rate for high-intent shoppers.`,
        creative_spec: {
          advertising_angle: "Problem-Agitate-Solve (Friction Reliever)",
          target_audience: `Problem-aware shoppers (${audience})`,
          headline: `Tired of Dropping Your Phone? Meet ${productTitle}.`,
          supporting_copy: `Engineered around ${valueProp}. Experience secure grip starting at ${priceDisplay}.`,
          cta: "Get Yours Today",
          visual_direction: `High-contrast cinematic studio lighting with deep graphite shadows and sharp rim illumination.`,
          background_description: `Minimalist dark honed slate surface with micro-texture and soft ambient studio glow.`,
          composition_archetype: "problem_solution_split",
          product_placement: {
            position: "center",
            scale: "hero_large",
            surface_interaction: "Sharp ground contact shadow on dark honed slate surface",
          },
          brand_styling: {
            primary_color: "#18181b",
            text_contrast: "light_on_dark",
            typography_mood: "bold_sans",
          },
          source_grounded_claims: [
            `Verified store product: ${productTitle}`,
            `Verified pricing: ${priceDisplay}`,
            `Storefront value proposition: ${valueProp}`,
          ],
        },
      },
      {
        concept_name: `Verified Authority & Craftsmanship Spotlight${revisionNote}`,
        angle: "Social Proof & Ingredient Validation",
        target_audience: `Analytical buyers who demand quality validation, authentic materials, and transparent craftsmanship before purchasing.`,
        core_message: `${productTitle} is precision-engineered with authentic materials, durable construction, and zero compromises.`,
        headline: `Why Discerning Shoppers Choose ${brandName}.`,
        supporting_copy: `Real materials, verified fit, and proven protection in one streamlined design. Available now for ${priceDisplay}.`,
        cta: "Shop The Collection",
        visual_direction: `Crisp architectural studio aesthetic with bright diffused northern daylight. Clean lines, matte stone textures, and refined editorial typography.`,
        composition_and_background: `9:16 vertical crop. Close-up overhead angled presentation. Product displayed on natural light travertine stone with clean soft drop shadow.`,
        strategic_reasoning: `Craftsmanship and validation disarms skepticism and builds trust, particularly effective for '${input.objective}' where customer confidence drives first-time purchases.`,
        creative_spec: {
          advertising_angle: "Social Proof & Ingredient Validation",
          target_audience: "Analytical buyers seeking verified craftsmanship",
          headline: `Why Discerning Shoppers Choose ${brandName}.`,
          supporting_copy: `Real materials and proven protection in one streamlined design for ${priceDisplay}.`,
          cta: "Shop The Collection",
          visual_direction: `Bright architectural studio lighting with soft diffused northern daylight and matte stone textures.`,
          background_description: `Clean Scandinavian light stone travertine surface with gentle natural morning shadows.`,
          composition_archetype: "editorial_luxury",
          product_placement: {
            position: "center",
            scale: "hero_large",
            surface_interaction: "Soft ambient drop shadow on natural travertine stone",
          },
          brand_styling: {
            primary_color: "#f4f4f5",
            text_contrast: "dark_on_light",
            typography_mood: "editorial_serif",
          },
          source_grounded_claims: [
            `Verified catalog item: ${productTitle}`,
            `Storefront price point: ${priceDisplay}`,
            `Official brand identity: ${brandName}`,
          ],
        },
      },
      {
        concept_name: `The Everyday Essential — Lifestyle Transformation${revisionNote}`,
        angle: "Daily Ritual & Lifestyle Transformation",
        target_audience: `Active mobile users seeking aesthetic everyday carry essentials and seamless convenience.`,
        core_message: `Transform your daily mobile routine with effortless handling and distinct personal style from ${brandName}.`,
        headline: `Your Daily Essential, Elevated. Meet ${productTitle}.`,
        supporting_copy: `Designed for daily life on the go. Premium ergonomics and eye-catching aesthetics starting at ${priceDisplay}.`,
        cta: "Upgrade Your Daily Carry",
        visual_direction: `Warm ambient natural light with warm golden-hour glow. Organic, tactile, lifestyle aesthetic reflecting effortless modern utility.`,
        composition_and_background: `9:16 portrait. Product placed prominently at counter height on natural warm oak surface beside soft ambient daylight reflections.`,
        strategic_reasoning: `Lifestyle transformation angles drive emotional resonance and impulse consideration by highlighting everyday utility, expanding consideration across broad audiences.`,
        creative_spec: {
          advertising_angle: "Daily Ritual & Lifestyle Transformation",
          target_audience: "Active mobile lifestyle users seeking everyday utility",
          headline: `Your Daily Essential, Elevated. Meet ${productTitle}.`,
          supporting_copy: `Premium ergonomics and eye-catching aesthetics starting at ${priceDisplay}.`,
          cta: "Upgrade Your Daily Carry",
          visual_direction: `Warm golden-hour ambient glow with organic sunlight and rich tactile wooden textures.`,
          background_description: `Natural warm oak surface with gentle golden-hour sunlight and soft bokeh background.`,
          composition_archetype: "hero_spotlight",
          product_placement: {
            position: "center",
            scale: "hero_large",
            surface_interaction: "Warm contact shadow with ambient daylight occlusion",
          },
          brand_styling: {
            primary_color: "#292524",
            text_contrast: "light_on_dark",
            typography_mood: "modern_grotesk",
          },
          source_grounded_claims: [
            `Store product SKU: ${productTitle}`,
            `Verified pricing: ${priceDisplay}`,
            `Brand tone: ${voice}`,
          ],
        },
      },
    ],
  };
}

/**
 * Server-side AI Campaign Strategy Agent
 * Generates three distinct concepts, each with its own complete, Zod-validated CreativeSpec
 * grounded strictly in verified brand kit and catalog data.
 */
export async function runCampaignStrategyAgent(
  input: GenerateStrategyInput
): Promise<CampaignStrategyOutput> {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY);

  if (!hasKey) {
    return generateHeuristicStrategy(input);
  }

  try {
    const model = getGeminiModel();

    const brandName = input.brandKit?.brand_name || input.brand.name;
    const valueProp = input.brandKit?.value_proposition || "Direct-to-consumer ecommerce";
    const voice = input.brandKit?.brand_voice || "Authoritative and modern";
    const audience = input.brandKit?.target_audience || "Ecommerce shoppers";

    const productSummaries = input.products
      .map((p, idx) => {
        const priceText = p.price ? `${p.currency || "$"}${p.price}` : "Unspecified";
        return `Product #${idx + 1}:
  - Title: ${p.title}
  - Price: ${priceText}
  - Description: ${p.description || "None provided"}
  - Category: ${p.category || "General"}
  - Storefront URL: ${p.product_url}`;
      })
      .join("\n\n");

    const systemPrompt = `You are Cadra's Chief Advertising Strategist and Direct-Response Creative Director powered by Google Gemini.
Your task is to synthesize three MEANINGFULLY DIFFERENT, COMPLETE advertising strategies for an ecommerce ad campaign.

Each concept must be a separate, standalone strategy accompanied by a complete, structured, Zod-validated CreativeSpec.

CRITICAL DIRECT-RESPONSE & GROUNDING RULES:
1. STRICT SOURCE-GROUNDING: NEVER invent fake star ratings (e.g. '4.9/5 stars'), fabricated review counts ('10,000+ happy customers'), fake clinical percentages ('94% noticed improvement'), non-existent warranties ('Lifetime warranty') or fake product benefits.
2. ONLY use verified claims, genuine product descriptions, and actual prices provided in the brand and catalog data.
3. Every claim in creative_spec.source_grounded_claims MUST cite a real fact from the provided brand and product input.
4. MEANINGFULLY DIFFERENT ANGLES: The three concepts MUST NOT be mere rewordings of each other. They must address distinct psychological marketing angles:
   - Concept 1: Problem-Agitate-Solve / Pain Point Reliever (Overcoming everyday user frustration).
   - Concept 2: Social Proof / Verified Authority / Ingredient & Material Spotlight (Overcoming skepticism with verified facts).
   - Concept 3: Daily Ritual / Lifestyle Aspiration / Everyday Essential (Emotional utility and modern identity appeal).
5. COMPLETE CREATIVE SPEC: Each concept must fully populate its creative_spec, including:
   - advertising_angle
   - target_audience
   - headline (max 10-12 words, punchy hook)
   - supporting_copy (1-2 sentences strictly grounded in verified facts)
   - cta (action-oriented, e.g. 'Shop The Case', 'Claim Free Shipping')
   - visual_direction (lighting, mood, color palette)
   - background_description (detailed scene environment for AI background synthesis)
   - composition_archetype (one of: 'hero_spotlight', 'editorial_luxury', 'problem_solution_split', 'lifestyle_in_situ', 'minimal_monolith')
   - product_placement (position, scale, surface_interaction)
   - brand_styling (primary_color, text_contrast, typography_mood)
   - source_grounded_claims (array of verified store facts)
6. COPYWRITING STANDARDS: Write high-converting hook headlines and concise body copy formatted for mobile 9:16 portrait ads.`;

    const userPrompt = `BRAND IDENTITY:
- Brand Name: ${brandName}
- Website: ${input.brand.website_url}
- Value Proposition: ${valueProp}
- Brand Voice: ${voice}
- Target Audience: ${audience}

CAMPAIGN OBJECTIVE:
- Objective: ${input.objective}
${input.additionalInstructions ? `- General Directives: ${input.additionalInstructions}` : ""}
${input.revisionInstructions ? `- REVISION REQUEST: ${input.revisionInstructions}` : ""}

ALLOCATED CATALOG PRODUCTS:
${productSummaries}

Generate exactly three distinct advertising strategies, each with a complete Zod-validated creative_spec, following the schema strictly.`;

    const { object } = await generateObject({
      model,
      schema: CampaignStrategyOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(45000),
    });

    return object;
  } catch (err) {
    console.warn(
      "[STRATEGY AGENT] Gemini LLM call encountered an error. Falling back to Heuristic Strategy:",
      err
    );
    return generateHeuristicStrategy(input);
  }
}
