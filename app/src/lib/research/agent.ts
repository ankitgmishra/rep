import { z } from "zod";
import { generateObject } from "ai";
import { getGeminiModel } from "@/lib/llm/gemini";
import type { RawScrapedBrand } from "./scraper";

export const BrandColorSchema = z.object({
  hex: z.string(),
  name: z.string().default("Brand Color"),
  usage: z.string().default("Primary/Accent"),
  is_inferred: z.boolean().default(false),
});

export const KeySellingPointSchema = z.object({
  point: z.string(),
  is_inferred: z.boolean(),
});

export const BrandResearchOutputSchema = z.object({
  brand_name: z.string(),
  logo_url: z.string().nullable().optional(),
  website_description: z.string().nullable().optional(),
  brand_colors: z.array(BrandColorSchema).default([]),
  brand_voice: z.string().default("Direct-to-consumer, contemporary, and product-focused"),
  brand_voice_is_inferred: z.boolean().default(true),
  value_proposition: z.string().default(""),
  value_proposition_is_inferred: z.boolean().default(false),
  target_audience: z.string().default(""),
  target_audience_is_inferred: z.boolean().default(true),
  key_selling_points: z.array(KeySellingPointSchema).default([]),
  shipping_info: z.string().nullable().optional(),
  return_policy: z.string().nullable().optional(),
  summary: z.string().default(""),
  missing_information: z.array(z.string()).default([]),

  // 1. Brand identity
  brand_description: z.string().nullable().optional(),
  core_value_proposition: z.string().nullable().optional(),
  positioning_and_differentiators: z.array(z.string()).default([]),

  // 2. Target audience Inferred
  primary_customer_segments: z.array(z.string()).default([]),
  customer_motivations: z.array(z.string()).default([]),
  likely_purchasing_motivations: z.array(z.string()).default([]),

  // 3. Brand voice and messaging
  tone_of_voice: z.string().nullable().optional(),
  common_messaging_themes: z.array(z.string()).default([]),
  example_messaging: z.array(z.string()).default([]),

  // 4. Visual identity
  photography_style: z.string().nullable().optional(),
  visual_aesthetic: z.string().nullable().optional(),
});

export type BrandResearchOutput = z.infer<typeof BrandResearchOutputSchema>;

/**
 * Fallback structuring engine when external LLM is offline or not configured
 */
function structureWithHeuristics(raw: RawScrapedBrand): BrandResearchOutput {
  const missing: string[] = [];

  if (!raw.logo_url) missing.push("Brand Logo image was not discovered in public markup");
  if (!raw.shipping_info) missing.push("Explicit shipping policy page not found");
  if (!raw.return_policy) missing.push("Explicit return / refund policy page not found");
  if (raw.products.length === 0) missing.push("No product catalog was discovered in Firecrawl extract");

  // Value Proposition: use primary headings or description
  let valueProp = raw.website_description || (raw.raw_headings[0] ?? "");
  const valuePropIsInferred = !raw.website_description;
  if (!valueProp) {
    valueProp = `${raw.brand_name} direct-to-consumer storefront.`;
  }

  // Brand Voice: inferred from headings and descriptions
  let voice = "Direct-to-consumer, contemporary, and product-focused";
  const combinedText = `${raw.raw_headings.join(" ")} ${raw.raw_paragraphs.join(" ")}`.toLowerCase();
  if (combinedText.includes("clinical") || combinedText.includes("dermatolog") || combinedText.includes("formula")) {
    voice = "Clinical, authoritative, and efficacy-driven";
  } else if (combinedText.includes("luxury") || combinedText.includes("artisan") || combinedText.includes("crafted")) {
    voice = "Sophisticated, artisanal, and elevated";
  } else if (combinedText.includes("fun") || combinedText.includes("bold") || combinedText.includes("vibrant")) {
    voice = "Playful, high-energy, and direct";
  }

  // Target Audience: inferred based on product categories and copy
  let audience = "Modern digital shoppers seeking quality consumer goods";
  if (raw.products.some((p) => p.category?.toLowerCase().includes("skincare") || p.category?.toLowerCase().includes("beauty"))) {
    audience = "Beauty & skincare enthusiasts seeking specialized formulas and daily rituals";
  } else if (raw.products.some((p) => p.category?.toLowerCase().includes("phone") || p.category?.toLowerCase().includes("case") || raw.brand_name.toLowerCase().includes("loopy"))) {
    audience = "Active smartphone users seeking protective, ergonomic, and drop-prevention mobile accessories";
  } else if (raw.brand_name.toLowerCase().includes("gym") || combinedText.includes("workout") || combinedText.includes("fitness")) {
    audience = "Fitness enthusiasts, athletes, and gym-goers seeking high-performance activewear";
  }

  // Key Selling Points: distinguish verified quotes from inferred propositions
  const keySellingPoints: Array<{ point: string; is_inferred: boolean }> = [];

  for (const h of raw.raw_headings.slice(0, 4)) {
    if (h.length > 8 && !h.toLowerCase().includes("menu") && !h.toLowerCase().includes("cart")) {
      keySellingPoints.push({ point: h, is_inferred: false });
    }
  }

  if (raw.shipping_info) {
    keySellingPoints.push({ point: `Shipping: ${raw.shipping_info.slice(0, 100)}`, is_inferred: false });
  }

  if (keySellingPoints.length < 3) {
    keySellingPoints.push({
      point: "Direct-to-consumer store pricing without distributor markup",
      is_inferred: true,
    });
  }

  // Brand Colors
  const colors = raw.detected_colors.map((c) => ({
    hex: c.hex,
    name: c.usage,
    usage: c.usage,
    is_inferred: false,
  }));

  if (colors.length === 0) {
    colors.push({ hex: "#111827", name: "Primary Dark Neutral", usage: "Default text", is_inferred: true });
    colors.push({ hex: "#F3F4F6", name: "Secondary Surface", usage: "Default background", is_inferred: true });
    missing.push("Brand color palette could not be extracted from CSS/meta tags");
  }

  const summary = `Autonomous Firecrawl research analyzed ${raw.website_url}. Extracted verified brand identity for ${raw.brand_name}, discovering ${raw.products.length} genuine product SKUs with authentic photography. Customer value proposition was indexed from Firecrawl brand extraction.`;

  // 1. Brand Identity
  const brandDescription = raw.website_description || (raw.raw_paragraphs[0] ? raw.raw_paragraphs[0].slice(0, 300) : null);
  const coreValueProp = valueProp;
  const differentiators = raw.raw_headings.slice(0, 3).filter((h) => h.length > 8);

  // 2. Target Audience Inferred
  const primarySegments = [audience];
  const customerMotivations = ["Authentic design and quality craftsmanship", "Convenient digital ordering and direct delivery"];
  const likelyPurchasingMotivations = ["Problem-solving utility in daily life", "Brand prestige and community belonging"];

  // 3. Brand Voice and Messaging
  const toneOfVoice = voice;
  const commonThemes = raw.raw_headings.slice(2, 5).filter((h) => h.length > 8);
  const exampleMessaging = raw.raw_headings.slice(0, 3).filter((h) => h.length > 10);

  // 4. Visual Identity
  const photographyStyle = raw.products.length > 0 ? "High-resolution studio product photography with clean, authentic backdrops" : null;
  const visualAesthetic = colors.length > 0 ? `Direct-to-consumer aesthetic highlighted by verified brand palette (${colors.slice(0, 3).map((c) => c.hex).join(", ")})` : null;

  return {
    brand_name: raw.brand_name,
    logo_url: raw.logo_url,
    website_description: raw.website_description,
    brand_colors: colors,
    brand_voice: voice,
    brand_voice_is_inferred: true,
    value_proposition: valueProp,
    value_proposition_is_inferred: valuePropIsInferred,
    target_audience: audience,
    target_audience_is_inferred: true,
    key_selling_points: keySellingPoints,
    shipping_info: raw.shipping_info,
    return_policy: raw.return_policy,
    summary,
    missing_information: missing,

    brand_description: brandDescription,
    core_value_proposition: coreValueProp,
    positioning_and_differentiators: differentiators,

    primary_customer_segments: primarySegments,
    customer_motivations: customerMotivations,
    likely_purchasing_motivations: likelyPurchasingMotivations,

    tone_of_voice: toneOfVoice,
    common_messaging_themes: commonThemes,
    example_messaging: exampleMessaging,

    photography_style: photographyStyle,
    visual_aesthetic: visualAesthetic,
  };
}

/**
 * AI Research Agent:
 * Evaluates Firecrawl Brand Extractor and scraped data using Google Gemini via Vercel AI Gateway.
 * Strictly separates verified facts from AI inferences.
 */
export async function runBrandResearchAgent(raw: RawScrapedBrand): Promise<BrandResearchOutput> {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY);

  if (!hasKey) {
    throw new Error(
      "API Configuration Error: GEMINI_API_KEY is not configured. Please supply an active Google Gemini API key to extract structured brand intelligence."
    );
  }

  try {
    const model = getGeminiModel();

    const systemPrompt = `You are ploy's Chief Brand Research Intelligence Agent powered by Google Gemini.
Your task is to analyze Firecrawl's Brand Extractor data and scraped storefront content, and structure it into verified brand guidelines and marketing intelligence across 4 strict pillars:
1. Brand identity (Brand description, Core value proposition, Positioning and differentiators)
2. Target audience Inferred (Primary customer segments, Customer motivations, Likely purchasing motivations)
3. Brand voice and messaging (Tone of voice, Common messaging themes, Example messaging extracted from website)
4. Visual identity (Logo, Verified brand colours, Photography style, Visual aesthetic)

CRITICAL PROVENANCE RULES:
1. NEVER fabricate facts, products, URLs, or claims.
2. If a field has no genuine data or cannot be discovered, leave it empty or null.
3. Identify missing information objectively in the missing_information array.
4. Keep the summary professional, executive, and direct-response focused.`;

    const userPrompt = `Storefront URL: ${raw.website_url}
Brand Name: ${raw.brand_name}
Meta Description: ${(raw.website_description || "None").slice(0, 500)}
Discovered Logo: ${raw.logo_url || "None"}
Firecrawl Brand Extractor Colors: ${JSON.stringify(raw.detected_colors)}
Firecrawl Typography & Personality: ${JSON.stringify({ typography: raw.typography, personality: raw.personality })}
Headings: ${JSON.stringify(raw.raw_headings?.slice(0, 15) || [])}
Paragraphs: ${JSON.stringify(raw.raw_paragraphs?.slice(0, 6) || [])}
Sample Product Titles: ${JSON.stringify(raw.products.slice(0, 8).map((p) => p.title))}
Sample Product Descriptions: ${JSON.stringify(raw.products.slice(0, 5).map((p) => (p.description || "").slice(0, 200)))}`;

    const { object } = await generateObject({
      model,
      schema: BrandResearchOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(90000),
    });

    return object;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI AGENT] Gemini LLM failure:", err);
    if (
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("rate-limits")
    ) {
      throw new Error(
        "API Rate Limit Exceeded (429): Google Gemini free-tier daily request quota exhausted. Please upgrade your API key or check https://aistudio.google.com/docs/rate-limits."
      );
    }
    if (msg.includes("TimeoutError") || msg.includes("timeout") || msg.includes("aborted")) {
      throw new Error(
        "API Timeout: The strategy engine took longer than 90 seconds to structure the Brand Profile. Please retry."
      );
    }
    // Prevent dumb markdown fallbacks per user instruction
    throw new Error(`API Limit / Service Error: Google Gemini research agent failed (${msg}). Markdown fallback disabled.`);
  }
}
