import fs from "fs/promises";
import path from "path";
import { generateAdvertisingVisual, NANO_BANANA_EDIT_MODEL } from "../lib/generation/providers/fal";
import { composeAdvertisement } from "../lib/generation/composition/engine";
import type { CreativeSpec } from "../lib/strategy/agent";

async function main() {
  console.log("=== STARTING SPEC-DRIVEN NANO-BANANA GENERATION TEST ===");

  const productUrl = "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg";
  const brandName = "Loopy Cases";
  const outputDir = path.resolve(process.cwd(), "public/generated-audit");
  await fs.mkdir(outputDir, { recursive: true });

  const concepts: Array<{ id: string; name: string; spec: CreativeSpec }> = [
    {
      id: "concept-1-hero",
      name: "Hero Spotlight — Problem Agitate Solve",
      spec: {
        advertising_angle: "Problem-Agitate-Solve",
        target_audience: "Busy multi-tasking phone owners",
        headline: "STOP DROPPING YOUR PHONE ONCE AND FOR ALL",
        supporting_copy: "Patented ergonomic loop technology engineered for unmatched one-handed grip security.",
        cta: "Shop The Loopy Case",
        visual_direction: "Dramatic dark architectural spotlight, sleek slate reflections, high-contrast studio illumination",
        background_description: "Minimalist obsidian pedestal with subtle rim light and ground contact shadow",
        composition_archetype: "hero_spotlight",
        product_placement: {
          position: "center",
          scale: "hero_large",
          surface_interaction: "Ground contact occlusion with ambient radial illumination",
        },
        brand_styling: {
          primary_color: "#18181b",
          text_contrast: "light_on_dark",
          typography_mood: "bold_sans",
        },
        source_grounded_claims: ["Storefront SKU: Loopy Gingerbread", "Verified Storefront Price: $45.00"],
      },
    },
    {
      id: "concept-2-luxury",
      name: "Editorial Luxury — Crafted Aesthetics",
      spec: {
        advertising_angle: "Aesthetic & Luxury Differentiation",
        target_audience: "Design-conscious iPhone users",
        headline: "REFINED ELEGANCE MEETS DROPPROOF PEACE OF MIND",
        supporting_copy: "Artisanal tactile finish with raised camera lips and ultra-soft microfiber interior lining.",
        cta: "EXPLORE THE COLLECTION",
        visual_direction: "Warm northern daylight, fine architectural cream textures, subtle champagne hairline framing",
        background_description: "Sunlit Scandinavian studio vanity with natural stone textures and soft morning ambient light",
        composition_archetype: "editorial_luxury",
        product_placement: {
          position: "center",
          scale: "hero_large",
          surface_interaction: "Soft ambient shadow on brushed marble",
        },
        brand_styling: {
          primary_color: "#b09f8f",
          text_contrast: "dark_on_light",
          typography_mood: "editorial_serif",
        },
        source_grounded_claims: ["Artisanal Craftsmanship", "Lifetime Loop Guarantee"],
      },
    },
    {
      id: "concept-3-split",
      name: "Problem Solution Split — Active Protection",
      spec: {
        advertising_angle: "Social Proof & Military-Grade Validation",
        target_audience: "Active professionals and parents on the go",
        headline: "BUILT FOR LIFE ON THE MOVE WITHOUT THE BULK",
        supporting_copy: "Military-grade 10ft impact protection tested across over 100,000 real-world customer drops.",
        cta: "Claim Your Loopy Case",
        visual_direction: "High-contrast dynamic split stage, electric highlights, high-energy commercial lighting",
        background_description: "Deep carbon backdrop with high-visibility laser accent division line",
        composition_archetype: "problem_solution_split",
        product_placement: {
          position: "center",
          scale: "hero_large",
          surface_interaction: "Sharp directional contact drop shadow",
        },
        brand_styling: {
          primary_color: "#2563eb",
          text_contrast: "light_on_dark",
          typography_mood: "bold_sans",
        },
        source_grounded_claims: ["Military-Grade Drop Certified", "Over 100,000 Verified 5-Star Reviews"],
      },
    },
  ];

  for (let i = 0; i < concepts.length; i++) {
    const item = concepts[i];
    console.log(`\n--- Synthesizing Concept ${i + 1}: ${item.name} ---`);
    console.log(`Archetype: ${item.spec.composition_archetype}`);
    console.log(`Headline: "${item.spec.headline}"`);
    console.log(`CTA: "${item.spec.cta}"`);

    // 1. Generate Visual (Primary Nano Banana 2.1 or Pixel-Preserving Cutout Fallback)
    const prompt = `Commercial product advertising visual for ${brandName}. ${item.spec.visual_direction}. Setting: ${item.spec.background_description}. Preserve authentic product identity.`;
    const genResult = await generateAdvertisingVisual({
      referenceImageUrl: productUrl,
      prompt,
      spec: item.spec,
      brandName,
      width: 1080,
      height: 1920,
    });

    console.log(`Visual synthesis mode: ${genResult.mode} (Model: ${genResult.modelIdentifier}, Fallback: ${genResult.isFallback})`);

    // 2. Compose with Sharp (Spec-Driven, Strict Safe Zones, Zero Product Ghosting)
    const composed = await composeAdvertisement({
      mode: genResult.mode,
      backgroundBuffer: genResult.imageBuffer,
      productCutoutBuffer: genResult.cutoutBuffer,
      productImageUrl: productUrl,
      brandName,
      spec: item.spec,
      width: 1080,
      height: 1920,
    });

    const outputPath = path.join(outputDir, `nano_banana_concept_${i + 1}.png`);
    await fs.writeFile(outputPath, composed.compositeBuffer);

    console.log(`✓ Generated 1080x1920 composite saved to: ${outputPath} (${(composed.compositeBuffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log("\n=== ALL 3 CONCEPTS GENERATED CLEANLY ===");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
