import { scrapeStorefront } from "../lib/research/scraper";
import { runBrandResearchAgent } from "../lib/research/agent";
import { runCampaignStrategyAgent } from "../lib/strategy/agent";

async function main() {
  console.log("=================================================");
  console.log("CADRA ADS: TESTING FIRECRAWL + GEMINI INTEGRATION");
  console.log("=================================================\n");

  const testUrl = "https://loopycases.com";
  console.log(`[STAGE 1] Testing Firecrawl as Primary & Only Extraction Mechanism on: ${testUrl}`);
  const startTime = Date.now();
  const scraped = await scrapeStorefront(testUrl);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✓ Firecrawl Scrape Succeeded in ${duration}s`);
  console.log(`  - Brand Name: "${scraped.brand_name}"`);
  console.log(`  - Discovered Logo: ${scraped.logo_url}`);
  console.log(`  - Firecrawl Extracted Colors (${scraped.detected_colors.length}):`);
  scraped.detected_colors.forEach((c) => console.log(`      • ${c.hex} (${c.usage})`));
  console.log(`  - Real Products Discovered (${scraped.products.length}):`);
  scraped.products.slice(0, 3).forEach((p, idx) => {
    console.log(`      [#${idx + 1}] ${p.title} - ${p.price_formatted || `$${p.price}`} - Image: ${p.main_image_url?.slice(0, 60)}...`);
  });

  if (scraped.products.length === 0) {
    throw new Error("FAIL: Firecrawl failed to extract real products");
  }

  console.log("\n[STAGE 2] Testing Google Gemini via Vercel AI Gateway for Brand Analysis...");
  const brandKit = await runBrandResearchAgent(scraped);
  console.log("✓ Gemini Brand Kit Structured Successfully:");
  console.log(`  - Brand Name: ${brandKit.brand_name}`);
  console.log(`  - Value Proposition: "${brandKit.value_proposition}" (Inferred: ${brandKit.value_proposition_is_inferred})`);
  console.log(`  - Brand Voice: "${brandKit.brand_voice}" (Inferred: ${brandKit.brand_voice_is_inferred})`);
  console.log(`  - Target Audience: "${brandKit.target_audience}" (Inferred: ${brandKit.target_audience_is_inferred})`);
  console.log(`  - Key Selling Points (${brandKit.key_selling_points.length}):`);
  brandKit.key_selling_points.slice(0, 3).forEach((sp) => {
    console.log(`      • [${sp.is_inferred ? "INFERRED" : "EXTRACTED"}] ${sp.point}`);
  });

  console.log("\n[STAGE 3] Testing Google Gemini for 3 Campaign Strategy Concepts...");
  const strategy = await runCampaignStrategyAgent({
    brand: {
      id: "test-brand-id",
      name: brandKit.brand_name,
      website_url: testUrl,
      industry: "Mobile Accessories",
    },
    brandKit: {
      id: "test-kit-id",
      brand_id: "test-brand-id",
      user_id: "test-user-id",
      brand_name: brandKit.brand_name,
      logo_url: brandKit.logo_url ?? null,
      website_description: brandKit.website_description ?? null,
      brand_colors: brandKit.brand_colors as any,
      brand_voice: brandKit.brand_voice,
      brand_voice_is_inferred: brandKit.brand_voice_is_inferred,
      value_proposition: brandKit.value_proposition,
      value_proposition_is_inferred: brandKit.value_proposition_is_inferred,
      target_audience: brandKit.target_audience,
      target_audience_is_inferred: brandKit.target_audience_is_inferred,
      key_selling_points: brandKit.key_selling_points as any,
      shipping_info: brandKit.shipping_info ?? null,
      return_policy: brandKit.return_policy ?? null,
      summary: brandKit.summary,
      missing_information: brandKit.missing_information as any,
      source_url: testUrl,
      extraction_status: "completed",
      raw_extracted_data: {} as any,
      user_edits: {} as any,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    products: scraped.products.slice(0, 2).map((p, idx) => ({
      id: `prod-${idx}`,
      brand_id: "test-brand-id",
      user_id: "test-user-id",
      title: p.title,
      description: p.description,
      price: p.price,
      price_formatted: p.price_formatted,
      currency: p.currency,
      product_url: p.product_url,
      main_image_url: p.main_image_url,
      additional_image_urls: [] as any,
      category: p.category,
      is_inferred: false,
      is_selected: true,
      user_edits: {} as any,
      source_url: testUrl,
      extraction_status: "completed",
      raw_data: {} as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    objective: "Increase conversions",
  });

  console.log("✓ Gemini Strategy Agent Generated 3 Concepts:");
  console.log(`  - Strategic Overview: ${strategy.strategic_overview.slice(0, 100)}...`);
  strategy.concepts.forEach((c, idx) => {
    console.log(`\n  [Concept #${idx + 1}] ${c.concept_name}`);
    console.log(`    • Angle: ${c.angle}`);
    console.log(`    • Headline: "${c.headline}"`);
    console.log(`    • CTA: "${c.cta}"`);
    console.log(`    • Art Direction: ${c.visual_direction.slice(0, 80)}...`);
  });

  console.log("\n=================================================");
  console.log("ALL TESTS PASSED: FIRECRAWL + GEMINI FULLY VERIFIED");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
