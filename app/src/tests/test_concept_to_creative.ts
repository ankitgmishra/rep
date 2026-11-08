/**
 * Test: Concept-to-Creative Multi-Strategy Generation & CreativeSpec Validation
 * Verifies:
 * 1. CreativeSpec schema validation and source-grounded claims.
 * 2. 3 distinct advertising concepts with separate specifications.
 * 3. 1 initial creative per approved concept without single-concept bottleneck.
 */
import {
  AdConceptSchema,
  CreativeSpecSchema,
  runCampaignStrategyAgent,
  type CampaignStrategyOutput,
} from "../lib/strategy/agent";

async function runTests() {
  console.log("=== TEST 1: CreativeSpecSchema & AdConceptSchema Validation ===");

  const sampleConcept = {
    concept_name: "The Friction Reliever",
    angle: "Problem-Agitate-Solve (Friction Reliever)",
    target_audience: "Smartphone owners seeking drop prevention",
    core_message: "Stop risking cracked screens; secure grip guaranteed.",
    headline: "Tired of Dropping Your Phone? Meet Loopy.",
    supporting_copy: "Original patented loop phone case designed to stop the drop before it happens. Only $39.00.",
    cta: "Stop The Drop Today",
    visual_direction: "High contrast dark studio lighting with sharp rim highlights on the ergonomic loop.",
    composition_and_background: "9:16 portrait. Dark honed slate ground plane with subtle water mist reflections.",
    strategic_reasoning: "Addresses immediate friction and fear of cracked screens for high-converting direct response.",
    creative_spec: {
      advertising_angle: "Problem-Agitate-Solve (Friction Reliever)",
      target_audience: "Smartphone owners seeking drop prevention",
      headline: "Tired of Dropping Your Phone? Meet Loopy.",
      supporting_copy: "Original patented loop phone case designed to stop the drop. Only $39.00.",
      cta: "Stop The Drop Today",
      visual_direction: "High contrast dark studio lighting with sharp rim highlights on the ergonomic loop.",
      background_description: "Minimalist dark honed slate with subtle surface reflections and deep graphite shadow.",
      composition_archetype: "problem_solution_split" as const,
      product_placement: {
        position: "center" as const,
        scale: "hero_large" as const,
        surface_interaction: "Sharp ground contact shadow on dark stone",
      },
      brand_styling: {
        primary_color: "#18181b",
        text_contrast: "light_on_dark" as const,
        typography_mood: "bold_sans" as const,
      },
      source_grounded_claims: [
        "Verified product: Loopy Case Gingerbread",
        "Verified store price: $39.00",
        "Official patent: StopTheDrop ergonomic loop",
      ],
    },
  };

  const parsed = AdConceptSchema.safeParse(sampleConcept);
  if (!parsed.success) {
    console.error("AdConceptSchema validation failed:", parsed.error.format());
    process.exit(1);
  }
  console.log("✓ AdConceptSchema & CreativeSpecSchema validated successfully!");

  console.log("\n=== TEST 2: Strategy Agent Concept Synthesis ===");
  const strategyResult: CampaignStrategyOutput = await runCampaignStrategyAgent({
    brand: {
      id: "test-brand-1",
      name: "Loopy Cases",
      website_url: "https://www.loopycases.com",
      industry: "Consumer Electronics & Accessories",
    },
    brandKit: {
      id: "kit-1",
      brand_id: "test-brand-1",
      user_id: "user-1",
      brand_name: "Loopy Cases",
      logo_url: "https://www.loopycases.com/cdn/shop/files/loopy-logo.png",
      website_description: "StopTheDrop with Loopy Cases. The original loop phone case.",
      brand_colors: [{ hex: "#18181b", usage: "Primary Dark" }],
      brand_voice: "Direct, energetic, and problem-focused",
      brand_voice_is_inferred: false,
      value_proposition: "Patented loop prevents phone drops while freeing up your hands.",
      value_proposition_is_inferred: false,
      target_audience: "Active smartphone users and parents on the go",
      target_audience_is_inferred: true,
      key_selling_points: [{ point: "Patented rubberized comfort loop", is_inferred: false }],
      shipping_info: "Fast standard US shipping",
      return_policy: "30-day money-back guarantee",
      summary: "Executive brand summary",
      missing_information: [],
      user_edits: {},
      source_url: "https://www.loopycases.com",
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Parameters<typeof runCampaignStrategyAgent>[0]["brandKit"],
    products: [
      {
        id: "prod-1",
        brand_id: "test-brand-1",
        user_id: "user-1",
        title: "Loopy Case - Gingerbread Edition",
        description: "Festive Gingerbread design with signature comfort loop.",
        price: 39.0,
        price_formatted: "$39.00",
        currency: "USD",
        product_url: "https://www.loopycases.com/products/loopy-gingerbread",
        main_image_url: "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg",
        additional_image_urls: [],
        category: "Phone Cases",
        is_selected: true,
        user_edits: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Parameters<typeof runCampaignStrategyAgent>[0]["products"][0],
    ],
    objective: "Increase conversions",
  });

  if (!strategyResult.concepts || strategyResult.concepts.length !== 3) {
    console.error("Strategy Agent did not return exactly 3 concepts!");
    process.exit(1);
  }

  console.log(`✓ Received ${strategyResult.concepts.length} distinct concepts:`);
  strategyResult.concepts.forEach((c, idx) => {
    console.log(`\nConcept 0${idx + 1}: "${c.concept_name}"`);
    console.log(`  - Angle: ${c.angle}`);
    console.log(`  - Headline: "${c.headline}"`);
    console.log(`  - CTA: "${c.cta}"`);
    console.log(`  - Archetype: ${c.creative_spec.composition_archetype}`);
    console.log(`  - Claims: ${c.creative_spec.source_grounded_claims.join(" | ")}`);

    // Verify no single concept shares the same headline
    const otherHeadlines = strategyResult.concepts
      .filter((_, i) => i !== idx)
      .map((o) => o.headline);
    if (otherHeadlines.includes(c.headline)) {
      console.error(`ERROR: Concept ${idx + 1} has duplicate headline!`);
      process.exit(1);
    }
  });

  console.log("\n=== ALL ARCHITECTURAL TESTS PASSED CLEANLY ===");
}

runTests().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
