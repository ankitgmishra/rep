import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { analyzeCreativeFeedback } from "../lib/generation/feedback";
import { composeAdvertisement } from "../lib/generation/composition/engine";
import { extractProductCutout } from "../lib/generation/providers/fal";
import type { CreativeSpec } from "../lib/strategy/agent";

async function testFeedbackPipelineE2E() {
  console.log("=== STARTING FEEDBACK PIPELINE E2E RE-RENDER TEST ===");

  const productUrl = "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg";
  const brandName = "Loopy Cases";
  const outputDir = path.resolve(process.cwd(), "public/generated-audit");
  await fs.mkdir(outputDir, { recursive: true });

  const initialSpec: CreativeSpec = {
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
    source_grounded_claims: ["Storefront SKU: Loopy Gingerbread", "Verified Storefront Price: $45.00"],
  };

  // 1. Initial V1 rendering - test fixture background representing an existing fal.ai generation
  console.log("\n1. Rendering Version 1 (Hero Spotlight)...");
  const bgV1 = await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 24, g: 24, b: 27, alpha: 1 },
    },
  }).png().toBuffer();
  const cutout = await extractProductCutout(productUrl);

  const compV1 = await composeAdvertisement({
    mode: "composite_cutout",
    backgroundBuffer: bgV1,
    productCutoutBuffer: cutout,
    productImageUrl: productUrl,
    brandName,
    spec: initialSpec,
  });
  await fs.writeFile(path.join(outputDir, "feedback_v1_initial.png"), compV1.compositeBuffer);
  console.log("✓ Saved feedback_v1_initial.png");

  // 2. Feedback 1: Copy-Only ("Change the headline to focus on drop protection.")
  console.log('\n2. Applying Feedback: "Change the headline to focus on drop protection."');
  const fb1 = await analyzeCreativeFeedback({
    originalSpec: initialSpec,
    previousCreative: {
      id: "cr-01",
      title: "Loopy Creative",
      headline: initialSpec.headline,
      supporting_copy: initialSpec.supporting_copy,
      cta: initialSpec.cta,
      generation_prompt: "Commercial background prompt",
    },
    brandName,
    product: {
      id: "p-01",
      title: "Loopy Gingerbread",
      price: 45,
      main_image_url: productUrl,
    },
    campaignObjective: "Holiday Sales",
    userFeedback: "Change the headline to focus on drop protection.",
  });
  console.log(`Classified: ${fb1.change_type} — Reusing existing background visual without fal.ai!`);

  // Re-render V2 using existing bgV1
  const compV2 = await composeAdvertisement({
    mode: "composite_cutout",
    backgroundBuffer: bgV1, // Reused!
    productCutoutBuffer: cutout,
    productImageUrl: productUrl,
    brandName,
    spec: fb1.revised_spec,
  });
  await fs.writeFile(path.join(outputDir, "feedback_v2_copy_drop_protection.png"), compV2.compositeBuffer);
  console.log("✓ Saved feedback_v2_copy_drop_protection.png");

  // 3. Feedback 2: Layout-Only ("Make the product smaller.")
  console.log('\n3. Applying Feedback: "Make the product smaller."');
  const fb2 = await analyzeCreativeFeedback({
    originalSpec: fb1.revised_spec,
    previousCreative: {
      id: "cr-01",
      title: "Loopy Creative",
      headline: fb1.revised_spec.headline,
      supporting_copy: fb1.revised_spec.supporting_copy,
      cta: fb1.revised_spec.cta,
      generation_prompt: "Commercial background prompt",
    },
    brandName,
    product: {
      id: "p-01",
      title: "Loopy Gingerbread",
      price: 45,
      main_image_url: productUrl,
    },
    campaignObjective: "Holiday Sales",
    userFeedback: "Make the product smaller.",
  });
  console.log(`Classified: ${fb2.change_type} — Product scale: ${fb2.revised_spec.product_placement.scale}. Reusing existing background visual!`);

  // Re-render V3 using existing bgV1 with smaller product scale
  const compV3 = await composeAdvertisement({
    mode: "composite_cutout",
    backgroundBuffer: bgV1, // Reused!
    productCutoutBuffer: cutout,
    productImageUrl: productUrl,
    brandName,
    spec: fb2.revised_spec,
  });
  await fs.writeFile(path.join(outputDir, "feedback_v3_layout_smaller_product.png"), compV3.compositeBuffer);
  console.log("✓ Saved feedback_v3_layout_smaller_product.png");

  console.log("\n=== FEEDBACK PIPELINE E2E TEST COMPLETED CLEANLY ===");
}

testFeedbackPipelineE2E().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
