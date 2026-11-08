import { analyzeCreativeFeedback, type FeedbackAgentInput } from "../lib/generation/feedback";
import type { CreativeSpec } from "../lib/strategy/agent";

async function runFeedbackAgentTests() {
  console.log("=== STARTING GEMINI CREATIVE FEEDBACK AGENT TESTS ===\n");

  const baseSpec: CreativeSpec = {
    advertising_angle: "Problem-Agitate-Solve",
    target_audience: "Everyday iPhone users",
    headline: "NEVER DROP YOUR PHONE AGAIN",
    supporting_copy: "Patented loop design provides unmatched one-handed grip security.",
    cta: "Shop The Case",
    visual_direction: "Dramatic dark architectural spotlight, sleek slate reflections",
    background_description: "Minimalist obsidian pedestal with subtle rim light",
    composition_archetype: "hero_spotlight",
    product_placement: {
      position: "center",
      scale: "hero_large",
      surface_interaction: "Contact shadow with ambient ground occlusion",
    },
    brand_styling: {
      primary_color: "#18181b",
      text_contrast: "light_on_dark",
      typography_mood: "bold_sans",
    },
    source_grounded_claims: [
      "Verified Product: Loopy Case - Gingerbread Edition",
      "Verified Price: $45.00",
    ],
  };

  const testCases: Array<{
    name: string;
    feedback: string;
    expectedChangeType: string;
    validate: (res: Awaited<ReturnType<typeof analyzeCreativeFeedback>>) => void;
  }> = [
    {
      name: 'Test 1: "Change the headline to focus on drop protection."',
      feedback: "Change the headline to focus on drop protection.",
      expectedChangeType: "copy_only",
      validate: (res) => {
        if (res.change_type !== "copy_only") {
          throw new Error(`Expected change_type 'copy_only', got '${res.change_type}'`);
        }
        const lowerH = res.revised_spec.headline.toLowerCase();
        if (!lowerH.includes("drop") && !lowerH.includes("protect")) {
          throw new Error(`Headline does not reflect drop protection: "${res.revised_spec.headline}"`);
        }
        if (res.revised_spec.background_description !== baseSpec.background_description) {
          throw new Error("Background description should NOT change for copy_only feedback");
        }
        if (res.revised_spec.product_placement.scale !== baseSpec.product_placement.scale) {
          throw new Error("Product placement should NOT change for copy_only feedback");
        }
      },
    },
    {
      name: 'Test 2: "Make the product smaller."',
      feedback: "Make the product smaller.",
      expectedChangeType: "layout_only",
      validate: (res) => {
        if (res.change_type !== "layout_only") {
          throw new Error(`Expected change_type 'layout_only', got '${res.change_type}'`);
        }
        if (res.revised_spec.product_placement.scale !== "medium_contextual") {
          throw new Error(`Expected scale 'medium_contextual', got '${res.revised_spec.product_placement.scale}'`);
        }
        if (res.revised_spec.background_description !== baseSpec.background_description) {
          throw new Error("Background description should NOT change for layout_only feedback");
        }
      },
    },
    {
      name: 'Test 3: "Use a premium marble background."',
      feedback: "Use a premium marble background.",
      expectedChangeType: "visual_regeneration",
      validate: (res) => {
        if (res.change_type !== "visual_regeneration") {
          throw new Error(`Expected change_type 'visual_regeneration', got '${res.change_type}'`);
        }
        const lowerBg = res.revised_spec.background_description.toLowerCase();
        if (!lowerBg.includes("marble")) {
          throw new Error(`Background description does not mention marble: "${res.revised_spec.background_description}"`);
        }
        if (!res.revised_generation_prompt.toLowerCase().includes("marble")) {
          throw new Error("Generation prompt should be updated with marble directives");
        }
      },
    },
    {
      name: 'Test 4: "Change the CTA to Shop Now."',
      feedback: "Change the CTA to Shop Now.",
      expectedChangeType: "copy_only",
      validate: (res) => {
        if (res.change_type !== "copy_only") {
          throw new Error(`Expected change_type 'copy_only', got '${res.change_type}'`);
        }
        if (!res.revised_spec.cta.toLowerCase().includes("shop now")) {
          throw new Error(`Expected CTA 'Shop Now', got '${res.revised_spec.cta}'`);
        }
        if (res.revised_spec.background_description !== baseSpec.background_description) {
          throw new Error("Background description should NOT change for copy_only feedback");
        }
      },
    },
    {
      name: 'Test 5: "Make the overall design more editorial."',
      feedback: "Make the overall design more editorial.",
      expectedChangeType: "layout_only",
      validate: (res) => {
        if (res.change_type !== "layout_only" && res.change_type !== "full_revision") {
          throw new Error(`Expected 'layout_only' or 'full_revision', got '${res.change_type}'`);
        }
        if (res.revised_spec.composition_archetype !== "editorial_luxury") {
          throw new Error(`Expected archetype 'editorial_luxury', got '${res.revised_spec.composition_archetype}'`);
        }
        if (res.revised_spec.brand_styling.typography_mood !== "editorial_serif") {
          throw new Error(`Expected typography_mood 'editorial_serif', got '${res.revised_spec.brand_styling.typography_mood}'`);
        }
      },
    },
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`--- Running: ${tc.name} ---`);
    const input: FeedbackAgentInput = {
      originalSpec: baseSpec,
      previousCreative: {
        id: "cr-test-01",
        title: "Loopy Gingerbread — Creative 01",
        headline: baseSpec.headline,
        supporting_copy: baseSpec.supporting_copy,
        cta: baseSpec.cta,
        generation_prompt: "Commercial product advertising background for Loopy Cases. Minimalist dark slate pedestal.",
        model_identifier: "google/nano-banana-2.1/edit",
      },
      previousVersion: {
        version_number: 1,
        revised_instructions: null,
      },
      brandName: "Loopy Cases",
      product: {
        id: "prod-01",
        title: "Loopy Case - Gingerbread Edition",
        description: "Original patented loop case preventing smartphone drops.",
        price: 45.0,
        currency: "USD",
        main_image_url: "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg",
        category: "Phone Cases",
      },
      campaignObjective: "Drive online holiday sales and highlight drop prevention.",
      userFeedback: tc.feedback,
    };

    const result = await analyzeCreativeFeedback(input);
    console.log(`✓ Change Type: "${result.change_type}"`);
    console.log(`✓ Summary: "${result.change_summary}"`);
    console.log(`✓ Applied Directives:`, result.applied_directives);

    tc.validate(result);
    console.log(`✓ Test Passed!\n`);
    passedCount++;
  }

  console.log(`=== ALL ${passedCount}/${testCases.length} FEEDBACK AGENT TESTS PASSED SUCCESSFULLY! ===`);
}

runFeedbackAgentTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
