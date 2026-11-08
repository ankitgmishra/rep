import { createClient } from "@/lib/supabase/server";
import { isSafePublicUrl } from "./security";
import { scrapeStorefront } from "./scraper";
import { runBrandResearchAgent, type BrandResearchOutput } from "./agent";

export interface ResearchProgressEvent {
  step: "inspecting" | "identity" | "discovering_products" | "extracting_products" | "organizing" | "persisting" | "completed" | "failed";
  message: string;
  data?: Record<string, unknown>;
}

export interface OrchestrationResult {
  success: boolean;
  brandKitId?: string;
  productCount: number;
  status: "completed" | "partial" | "failed";
  error?: string;
  brandKit?: BrandResearchOutput;
}

/**
 * Execute the end-to-end brand research pipeline with real progress telemetry
 */
export async function executeBrandResearch(
  brandId: string,
  onProgress?: (event: ResearchProgressEvent) => void | Promise<void>
): Promise<OrchestrationResult> {
  const supabase = await createClient();

  // 1. Verify user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Authenticated session required.");
  }

  // 2. Query target brand record with RLS
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    throw new Error("Brand not found or not owned by authenticated user.");
  }

  // Helper to notify progress
  const notify = async (
    step: ResearchProgressEvent["step"],
    message: string,
    data?: Record<string, unknown>
  ) => {
    if (onProgress) {
      await onProgress({ step, message, data });
    }
  };

  try {
    // Stage 1: Inspecting Storefront URL
    await notify("inspecting", `Inspecting storefront domain ${brand.website_url}...`);

    const safety = isSafePublicUrl(brand.website_url);
    if (!safety.safe || !safety.normalizedUrl) {
      throw new Error(`Security Exception: ${safety.error || "Disallowed or private URL."}`);
    }

    // Set brand status to researching
    await supabase
      .from("brands")
      .update({ research_status: "researching", updated_at: new Date().toISOString() })
      .eq("id", brand.id);

    // Stage 2 & 3: Identifying brand identity & Discovering products
    await notify("identity", "Scraping storefront brand identity with Firecrawl Brand Extractor...");
    await notify("discovering_products", "Extracting brand colors, typography, logos, and catalog content...");

    const scraped = await scrapeStorefront(safety.normalizedUrl);

    // Stage 4: Extracting product details
    const productCount = scraped.products.length;
    await notify(
      "extracting_products",
      `Extracted ${productCount} real product ${productCount === 1 ? "SKU" : "SKUs"} with authentic photography.`,
      { productCount, isShopify: scraped.is_shopify }
    );

    // Stage 5: Organizing Research with Strategy Agent
    await notify("organizing", "Structuring brand intelligence, separating verified facts from AI inferences...");
    const structuredKit = await runBrandResearchAgent(scraped);

    // Stage 6: Persisting Research Results in Database
    await notify("persisting", "Saving brand profile and product catalog...");

    const extractionStatus = productCount > 0 ? "completed" : "partial";

    // 6a. Delete prior brand kit if re-running
    await supabase.from("brand_kits").delete().eq("brand_id", brand.id);

    // 6b. Insert new brand_kit record
    const { data: insertedKit, error: kitError } = await supabase
      .from("brand_kits")
      .insert({
        brand_id: brand.id,
        user_id: user.id,
        brand_name: structuredKit.brand_name || brand.name,
        logo_url: structuredKit.logo_url,
        website_description: structuredKit.website_description,
        brand_colors: structuredKit.brand_colors,
        brand_voice: structuredKit.brand_voice,
        brand_voice_is_inferred: structuredKit.brand_voice_is_inferred,
        value_proposition: structuredKit.value_proposition,
        value_proposition_is_inferred: structuredKit.value_proposition_is_inferred,
        target_audience: structuredKit.target_audience,
        target_audience_is_inferred: structuredKit.target_audience_is_inferred,
        key_selling_points: structuredKit.key_selling_points,
        shipping_info: structuredKit.shipping_info,
        return_policy: structuredKit.return_policy,
        summary: structuredKit.summary,
        missing_information: structuredKit.missing_information,
        source_url: brand.website_url,
        extraction_status: extractionStatus,
        raw_extracted_data: {
          headings: scraped.raw_headings,
          is_shopify: scraped.is_shopify,
          sources_checked: scraped.source_urls_checked,
          brand_description: structuredKit.brand_description,
          core_value_proposition: structuredKit.core_value_proposition,
          positioning_and_differentiators: structuredKit.positioning_and_differentiators,
          primary_customer_segments: structuredKit.primary_customer_segments,
          customer_motivations: structuredKit.customer_motivations,
          likely_purchasing_motivations: structuredKit.likely_purchasing_motivations,
          tone_of_voice: structuredKit.tone_of_voice,
          common_messaging_themes: structuredKit.common_messaging_themes,
          example_messaging: structuredKit.example_messaging,
          photography_style: structuredKit.photography_style,
          visual_aesthetic: structuredKit.visual_aesthetic,
        },
      })
      .select("id")
      .single();

    if (kitError) {
      console.error("[ORCHESTRATOR ERROR] Brand kit insert failed:", kitError);
      throw new Error(`Database error saving brand kit: ${kitError.message}`);
    }

    // 6c. Persist Products
    if (scraped.products.length > 0) {
      // Clear existing products for this brand before inserting freshly discovered ones
      await supabase.from("products").delete().eq("brand_id", brand.id);

      const productInserts = scraped.products.map((p) => ({
        brand_id: brand.id,
        user_id: user.id,
        title: p.title,
        description: p.description,
        price: p.price,
        price_formatted: p.price_formatted,
        currency: p.currency,
        product_url: p.product_url,
        main_image_url: p.main_image_url,
        additional_image_urls: p.additional_image_urls,
        category: p.category,
        is_inferred: false,
        source_url: p.source_url,
        extraction_status: "extracted",
      }));

      const { error: prodError } = await supabase.from("products").insert(productInserts);
      if (prodError) {
        console.error("[ORCHESTRATOR ERROR] Products batch insert error:", prodError);
      }
    }

    // 6d. Update Brand record status
    await supabase
      .from("brands")
      .update({
        name: structuredKit.brand_name || brand.name,
        research_status: extractionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", brand.id);

    await notify("completed", `Research successfully finalized. ${productCount} products saved.`, {
      brandKitId: insertedKit.id,
      productCount,
    });

    return {
      success: true,
      brandKitId: insertedKit.id,
      productCount,
      status: extractionStatus,
      brandKit: structuredKit,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected research error occurred";
    console.error("[ORCHESTRATOR FAILURE]:", err);

    await notify("failed", `Research failed: ${errorMsg}`);

    // Update brand status to failed
    await supabase
      .from("brands")
      .update({ research_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", brand.id);

    return {
      success: false,
      productCount: 0,
      status: "failed",
      error: errorMsg,
    };
  }
}
