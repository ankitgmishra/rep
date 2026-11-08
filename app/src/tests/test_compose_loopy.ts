import sharp from "sharp";
import fs from "fs";
import path from "path";
import { composeAdvertisement } from "../lib/generation/composition/engine";

async function runVisualTest() {
  console.log("==========================================================");
  console.log("VISUAL AUDIT: GENERATING 3 LOOPY CASES AD CREATIVES");
  console.log("==========================================================\n");

  const outputDir = path.join(process.cwd(), "public", "generated-audit");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Real Loopy Cases Gingerbread Lane catalog image
  const loopyProductUrl = "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg?v=1793421733&width=720&format=pjpg";

  // Create 3 background backdrops with atmospheric lighting
  const backdrops = [
    // 1. Dark Studio with warm radial aura
    await sharp(Buffer.from(`
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="aura1" cx="50%" cy="48%" r="60%">
            <stop offset="0%" stop-color="#27272a" stop-opacity="0.9" />
            <stop offset="60%" stop-color="#18181b" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#09090b" stop-opacity="1" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#aura1)" />
      </svg>
    `)).png().toBuffer(),

    // 2. Warm Scandinavian daylight architectural
    await sharp(Buffer.from(`
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wall2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc" />
            <stop offset="100%" stop-color="#e2e8f0" />
          </linearGradient>
          <radialGradient id="sunlight2" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#wall2)" />
        <rect width="1080" height="1920" fill="url(#sunlight2)" />
        <circle cx="540" cy="900" r="420" fill="#ffffff" fill-opacity="0.6" />
      </svg>
    `)).png().toBuffer(),

    // 3. Deep midnight indigo with dynamic contrast
    await sharp(Buffer.from(`
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="aura3" cx="50%" cy="48%" r="65%">
            <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8" />
            <stop offset="70%" stop-color="#0f172a" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#020617" stop-opacity="1" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#aura3)" />
      </svg>
    `)).png().toBuffer(),
  ];

  const templates = [
    {
      name: "Template 1 (Performance Spotlight - Dark Studio)",
      variationIndex: 1,
      angleTag: "Drop-Proof Confidence",
      headline: "Tired of Dropping Your Phone? Stop Drops Instantly.",
      supportingCopy: "Never crack a screen again. The patented silicone loop lets you reach every corner one-handed with zero slip.",
      ctaText: "Order Now",
      priceFormatted: "$39.99",
    },
    {
      name: "Template 2 (Clean Editorial Light - Warm Daylight)",
      variationIndex: 2,
      angleTag: "Holiday Limited Release",
      headline: "Gingerbread Lane: Festive Style Meets Total Security.",
      supportingCopy: "Engineered with patented loop ergonomics and 360-degree drop protection. Sleek, pocket-friendly, and durable.",
      ctaText: "Shop Collection",
      priceFormatted: "$39.99",
    },
    {
      name: "Template 3 (Dynamic Urgency & Feature Callout)",
      variationIndex: 3,
      angleTag: "Over 70,000 Five-Star Reviews",
      headline: "The Case That Replaces Your Clumsy Grip Forever.",
      supportingCopy: "Join over 1 million smartphone users who stopped dropping their phones. Complete 360-degree shockproof protection.",
      ctaText: "Claim Your Loopy",
      priceFormatted: "$39.99",
    },
  ];

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    console.log(`[RENDERING] ${t.name}...`);
    const result = await composeAdvertisement({
      backgroundBuffer: backdrops[i],
      productImageUrl: loopyProductUrl,
      brandName: "Loopy Cases",
      headline: t.headline,
      supportingCopy: t.supportingCopy,
      ctaText: t.ctaText,
      priceFormatted: t.priceFormatted,
      angleTag: t.angleTag,
      variationIndex: t.variationIndex,
    });

    const outPath = path.join(outputDir, `loopy_creative_template_${i + 1}.png`);
    fs.writeFileSync(outPath, result.compositeBuffer);

    const meta = await sharp(result.compositeBuffer).metadata();
    console.log(`  ✓ Generated: ${outPath}`);
    console.log(`  ✓ Resolution: ${meta.width}x${meta.height} (Exact 9:16 Portrait)`);
    console.log(`  ✓ File Size: ${(result.compositeBuffer.length / 1024).toFixed(1)} KB\n`);
  }

  console.log("==========================================================");
  console.log("VISUAL AUDIT GENERATION COMPLETED FOR ALL 3 TEMPLATES");
  console.log("==========================================================");
}

runVisualTest().catch(console.error);
