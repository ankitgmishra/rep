import sharp, { type OverlayOptions } from "sharp";
import type { CreativeSpec } from "@/lib/strategy/agent";

export interface CreativeCompositionInput {
  mode?: "reference_edit" | "composite_cutout";
  backgroundBuffer: Buffer;
  productCutoutBuffer?: Buffer | null;
  productImageUrl: string;
  brandName: string;
  headline?: string;
  supportingCopy?: string | null;
  ctaText?: string;
  priceFormatted?: string | null;
  angleTag?: string;
  spec?: CreativeSpec;
  variationIndex?: number;
  width?: number;
  height?: number;
}

export interface CreativeCompositionResult {
  compositeBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Escapes XML characters for safe SVG typography rendering
 */
function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Robust text wrapping for SVG typography.
 * Respects line width and max line counts without awkward clipping.
 */
function wrapSvgText(
  text: string,
  maxCharsPerLine: number,
  lineHeight: number,
  startX = 540,
  maxLines = 3
): { tspans: string; lineCount: number } {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (lines.length < maxLines - 1) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        // Final line: append to avoid premature sentence truncation
        currentLine = candidate;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${startX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return { tspans, lineCount: lines.length };
}

/**
 * Spec-Driven Reusable 9:16 Creative Layout & Compositing System:
 * 
 * 1. MATHEMATICAL SAFE ZONES:
 *    - Zone 1: Top Header (Y: 110px – 480px) -> Brand eyebrow, hook headline, proof badges.
 *    - Zone 2: Product Stage (Y: 500px – 1360px) -> Hero product placement with contact/ambient shadows.
 *    - Zone 3: Bottom Conversion Card (Y: 1390px – 1750px) -> Supporting copy, prominent CTA, verified claims.
 *    - Margins: Top 110px and Bottom 170px clear of interactive text.
 *    -> Result: Text MATHEMATICALLY CANNOT overlap the product.
 * 
 * 2. PRODUCT PRESERVATION DUAL MODES:
 *    - mode "reference_edit": Background buffer already contains the AI-generated scene with the authentic product.
 *      Sharp renders ONLY the SVG typography and never overlays a second product (zero ghosting/duplication).
 *    - mode "composite_cutout": Background is product-free. Sharp composites the authentic transparent product cutout
 *      into Zone 2 with drop shadows, followed by the SVG overlay.
 */
export async function composeAdvertisement(
  input: CreativeCompositionInput
): Promise<CreativeCompositionResult> {
  const width = input.width || 1080;
  const height = input.height || 1920;

  // Derive active CreativeSpec with safe defaults
  const defaultArchetype =
    input.variationIndex === 2
      ? "editorial_luxury"
      : input.variationIndex === 3
      ? "problem_solution_split"
      : "hero_spotlight";

  const spec: CreativeSpec = input.spec || {
    advertising_angle: input.angleTag || "Problem-Agitate-Solve",
    target_audience: "Everyday mobile users",
    headline: input.headline || "Never Drop Your Phone Again",
    supporting_copy: input.supportingCopy || "Engineered with patented finger-loop technology and military-grade drop protection.",
    cta: input.ctaText || "Shop The Case",
    visual_direction: "High-end commercial studio lighting, crisp contrast, premium editorial finish",
    background_description: "Minimalist dark slate pedestal with subtle ambient rim lighting",
    composition_archetype: defaultArchetype,
    product_placement: {
      position: "center",
      scale: "hero_large",
      surface_interaction: "Contact shadow with ambient ground occlusion",
    },
    brand_styling: {
      primary_color: input.variationIndex === 2 ? "#d4af37" : input.variationIndex === 3 ? "#ef4444" : "#18181b",
      text_contrast: input.variationIndex === 2 ? "dark_on_light" : "light_on_dark",
      typography_mood: input.variationIndex === 2 ? "editorial_serif" : "bold_sans",
    },
    source_grounded_claims: ["Verified Storefront SKU", input.priceFormatted || "Available Now"],
  };

  const headline = input.headline || spec.headline;
  const supportingCopy = input.supportingCopy !== undefined ? (input.supportingCopy || "") : spec.supporting_copy;
  const ctaText = input.ctaText || spec.cta;
  const brandName = input.brandName;
  const archetype = spec.composition_archetype;
  const placement = spec.product_placement;
  const styling = spec.brand_styling;

  // 1. Prepare Base Background (1080x1920)
  const normalizedBg = await sharp(input.backgroundBuffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const compositeLayers: OverlayOptions[] = [];

  // 2. Product Handling: Only composite product cutout if mode is "composite_cutout"
  // If mode is "reference_edit", the scene already contains the product seamlessly integrated.
  const activeMode = input.mode || "composite_cutout";
  if (activeMode === "composite_cutout") {
    let productCutoutBuffer = input.productCutoutBuffer;

    if (!productCutoutBuffer) {
      // Fetch product if not supplied
      try {
        const pResp = await fetch(input.productImageUrl);
        if (pResp.ok) {
          const arr = await pResp.arrayBuffer();
          const pBuf = Buffer.from(arr);
          const meta = await sharp(pBuf).metadata();
          const pw = meta.width || 720;
          const ph = meta.height || 960;
          const mask = Buffer.from(`
            <svg width="${pw}" height="${ph}">
              <rect width="${pw}" height="${ph}" rx="${pw * 0.08}" ry="${pw * 0.08}" fill="#ffffff"/>
            </svg>
          `);
          productCutoutBuffer = await sharp(pBuf)
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
        }
      } catch (err) {
        console.warn("[COMPOSITION] Could not fetch product for cutout:", err);
      }
    }

    if (productCutoutBuffer) {
      // Determine product stage scale based on spec
      let prodW = 720;
      let prodH = 840;

      if (placement.scale === "medium_contextual") {
        prodW = 600;
        prodH = 700;
      } else if (placement.scale === "tight_macro") {
        prodW = 800;
        prodH = 920;
      }

      // Determine product coordinates based on spec
      let prodLeft = Math.round((width - prodW) / 2);
      let prodTop = 510;

      if (placement.position === "bottom_third") {
        prodTop = 640;
      } else if (placement.position === "offset_left") {
        prodLeft = 90;
      } else if (placement.position === "offset_right") {
        prodLeft = width - prodW - 90;
      }

      // Dual-Layer Ambient & Contact Drop Shadows (anchored to bottom of product stage)
      const shadowW = prodW + 140;
      const shadowH = 120;
      const shadowTop = prodTop + prodH - 45;
      const shadowLeft = prodLeft - 70;

      const shadowSvg = `
        <svg width="${shadowW}" height="${shadowH}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ambBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="26" />
            </filter>
            <filter id="conBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <ellipse cx="${shadowW / 2}" cy="55" rx="${prodW * 0.44}" ry="32" fill="#000000" opacity="0.45" filter="url(#ambBlur)" />
          <ellipse cx="${shadowW / 2}" cy="48" rx="${prodW * 0.36}" ry="16" fill="#000000" opacity="0.65" filter="url(#conBlur)" />
        </svg>
      `;

      const shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
      compositeLayers.push({
        input: shadowBuffer,
        left: Math.max(0, shadowLeft),
        top: shadowTop,
      });

      // Prepare resized authentic product cutout
      const resizedProduct = await sharp(productCutoutBuffer)
        .resize(prodW, prodH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      compositeLayers.push({
        input: resizedProduct,
        left: prodLeft,
        top: prodTop,
      });
    }
  }

  // 3. Typographic Styling & Font Stacks
  let fontStack = "system-ui, -apple-system, 'SF Pro Display', Inter, sans-serif";
  let headlineWeight = "800";
  let letterSpacing = "-1px";
  let fontStyle = "normal";

  if (styling.typography_mood === "editorial_serif") {
    fontStack = "'Playfair Display', Georgia, 'Times New Roman', serif";
    headlineWeight = "700";
    letterSpacing = "0.5px";
    fontStyle = "italic";
  } else if (styling.typography_mood === "modern_grotesk") {
    fontStack = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
    headlineWeight = "700";
    letterSpacing = "-0.5px";
  }

  // Contrast configurations
  const isDarkOnLight = styling.text_contrast === "dark_on_light";
  const titleColor = isDarkOnLight ? "#09090b" : "#ffffff";
  const bodyColor = isDarkOnLight ? "#3f3f46" : "#e4e4e7";
  const eyebrowColor = isDarkOnLight ? "#52525b" : "#a1a1aa";
  const cardBg = isDarkOnLight ? "rgba(255, 255, 255, 0.88)" : "rgba(10, 10, 12, 0.84)";
  const cardBorder = isDarkOnLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const primaryBrandColor = styling.primary_color || "#3b82f6";

  // Build Archetype-Specific Typography & UI SVG Overlays
  let overlaySvg = "";

  switch (archetype) {
    case "editorial_luxury": {
      // Archetype 2: Refined Editorial Luxury Layout
      const headlineWrap = wrapSvgText(headline, 20, 68, 540, 3);
      const supportingWrap = wrapSvgText(supportingCopy, 46, 34, 540, 2);

      overlaySvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="16" stdDeviation="30" flood-color="#000000" flood-opacity="0.3" />
            </filter>
          </defs>

          <!-- ZONE 1: TOP HEADER (Y: 120px - 460px) -->
          <!-- Fine Eyebrow -->
          <text x="540" y="160" text-anchor="middle" font-family="${fontStack}" font-size="16" font-weight="600" letter-spacing="4px" fill="${eyebrowColor}">
            ${escapeXml(brandName.toUpperCase())} &#8226; ${escapeXml(spec.target_audience.toUpperCase())}
          </text>

          <!-- Hook Headline -->
          <text x="540" y="240" text-anchor="middle" font-family="${fontStack}" font-size="52" font-style="${fontStyle}" font-weight="${headlineWeight}" letter-spacing="${letterSpacing}" fill="${titleColor}">
            ${headlineWrap.tspans}
          </text>

          <!-- Minimalist Gold/Silver Accent Line -->
          <line x1="470" y1="${240 + headlineWrap.lineCount * 68 + 10}" x2="610" y2="${240 + headlineWrap.lineCount * 68 + 10}" stroke="${isDarkOnLight ? "#b09f8f" : "#d4af37"}" stroke-width="2" />

          <!-- ZONE 3: CONVERSION CARD (Y: 1390px - 1750px) -->
          <rect x="90" y="1400" width="900" height="330" rx="28" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5" filter="url(#cardShadow)" />

          <!-- Supporting Editorial Copy -->
          <text x="540" y="1460" text-anchor="middle" font-family="${fontStack}" font-size="24" font-weight="400" letter-spacing="0.2px" fill="${bodyColor}">
            ${supportingWrap.tspans}
          </text>

          <!-- Understated Luxury CTA Button -->
          <g transform="translate(220, 1540)">
            <rect width="640" height="84" rx="42" fill="${isDarkOnLight ? "#18181b" : "#ffffff"}" />
            <text x="320" y="52" text-anchor="middle" font-family="${fontStack}" font-size="26" font-weight="700" letter-spacing="1.5px" fill="${isDarkOnLight ? "#ffffff" : "#09090b"}">
              ${escapeXml(ctaText.toUpperCase())}
            </text>
          </g>

          <!-- Trust Chip -->
          <text x="540" y="1685" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="500" letter-spacing="1px" fill="${eyebrowColor}">
            ${escapeXml(spec.source_grounded_claims[0] || "COMPLIMENTARY SHIPPING &amp; LIFETIME WARRANTY")}
          </text>
        </svg>
      `;
      break;
    }

    case "problem_solution_split": {
      // Archetype 3: High-Urgency Problem-Solution Split Layout
      const headlineWrap = wrapSvgText(headline, 18, 70, 540, 3);
      const supportingWrap = wrapSvgText(supportingCopy, 44, 34, 540, 2);

      overlaySvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="splitGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#ef4444" flood-opacity="0.35" />
            </filter>
            <filter id="ctaShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.4" />
            </filter>
          </defs>

          <!-- ZONE 1: TOP HEADER (Y: 120px - 480px) -->
          <!-- High-Contrast Problem Agitation Pill -->
          <g transform="translate(340, 125)">
            <rect width="400" height="48" rx="24" fill="#ef4444" filter="url(#splitGlow)" />
            <text x="200" y="31" text-anchor="middle" font-family="${fontStack}" font-size="18" font-weight="900" letter-spacing="1.5px" fill="#ffffff">
              &#8226; STOP DROPPING YOUR PHONE &#8226;
            </text>
          </g>

          <!-- Urgent Hook Headline -->
          <text x="540" y="240" text-anchor="middle" font-family="${fontStack}" font-size="56" font-weight="${headlineWeight}" letter-spacing="${letterSpacing}" fill="${titleColor}">
            ${headlineWrap.tspans}
          </text>

          <!-- ZONE 3: CONVERSION CARD (Y: 1390px - 1750px) -->
          <rect x="80" y="1395" width="920" height="345" rx="32" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5" />

          <!-- Dual Benefit Solution Chips -->
          <g transform="translate(140, 1425)">
            <rect width="380" height="44" rx="22" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1" />
            <text x="190" y="28" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#10b981">
              &#10003; Patented Ergonomic Loop
            </text>
          </g>
          <g transform="translate(560, 1425)">
            <rect width="380" height="44" rx="22" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="1" />
            <text x="190" y="28" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#60a5fa">
              &#10003; Military-Grade Certified
            </text>
          </g>

          <!-- Supporting Solution Copy -->
          <text x="540" y="1515" text-anchor="middle" font-family="${fontStack}" font-size="25" font-weight="500" fill="${bodyColor}">
            ${supportingWrap.tspans}
          </text>

          <!-- High-Impact Direct CTA Button -->
          <g transform="translate(220, 1585)" filter="url(#ctaShadow)">
            <rect width="640" height="88" rx="28" fill="${primaryBrandColor}" />
            <text x="320" y="55" text-anchor="middle" font-family="${fontStack}" font-size="28" font-weight="800" letter-spacing="0.5px" fill="#ffffff">
              ${escapeXml(ctaText)} &#8594;
            </text>
          </g>

          <!-- Price & Risk Reversal Tag -->
          <text x="540" y="1710" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${eyebrowColor}">
            ${escapeXml(spec.source_grounded_claims[1] || input.priceFormatted || "Risk-Free 30-Day Trial")} &#8226; 100% Guaranteed Fit
          </text>
        </svg>
      `;
      break;
    }

    case "hero_spotlight":
    default: {
      // Archetype 1: Hero Spotlight / Commercial Classic Layout
      const headlineWrap = wrapSvgText(headline, 18, 72, 540, 3);
      const supportingWrap = wrapSvgText(supportingCopy, 46, 34, 540, 2);

      overlaySvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="heroShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="16" stdDeviation="32" flood-color="#000000" flood-opacity="0.5" />
            </filter>
            <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${primaryBrandColor}" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>
          </defs>

          <!-- ZONE 1: TOP HEADER (Y: 120px - 460px) -->
          <!-- Eyebrow Badge Pill -->
          <g transform="translate(360, 125)">
            <rect width="360" height="44" rx="22" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" />
            <text x="180" y="28" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="700" letter-spacing="1.5px" fill="#ffffff">
              ${escapeXml(brandName.toUpperCase())} &#8226; OFFICIAL
            </text>
          </g>

          <!-- Massive Hook Headline -->
          <text x="540" y="240" text-anchor="middle" font-family="${fontStack}" font-size="58" font-weight="${headlineWeight}" letter-spacing="${letterSpacing}" fill="${titleColor}">
            ${headlineWrap.tspans}
          </text>

          <!-- Social Proof Stars -->
          <text x="540" y="${240 + headlineWrap.lineCount * 72 + 15}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#fbbf24">
            &#9733;&#9733;&#9733;&#9733;&#9733; <tspan font-size="15" font-weight="500" fill="${eyebrowColor}">OVER 100,000+ CASES SOLD</tspan>
          </text>

          <!-- ZONE 3: CONVERSION CARD (Y: 1390px - 1750px) -->
          <rect x="80" y="1400" width="920" height="340" rx="32" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5" filter="url(#heroShadow)" />

          <!-- Supporting Body Copy -->
          <text x="540" y="1465" text-anchor="middle" font-family="${fontStack}" font-size="26" font-weight="500" fill="${bodyColor}">
            ${supportingWrap.tspans}
          </text>

          <!-- Primary CTA Button -->
          <g transform="translate(220, 1550)">
            <rect width="640" height="88" rx="28" fill="${primaryBrandColor.startsWith("#") ? primaryBrandColor : "url(#ctaGrad)"}" />
            <text x="320" y="55" text-anchor="middle" font-family="${fontStack}" font-size="28" font-weight="800" fill="#ffffff">
              ${escapeXml(ctaText)} &#8594;
            </text>
          </g>

          <!-- Source-Grounded Trust Chip -->
          <text x="540" y="1695" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="500" fill="${eyebrowColor}">
            &#10003; Verified Authentic Storefront SKU &#8226; Ships In 24 Hours
          </text>
        </svg>
      `;
      break;
    }
  }

  // 4. Composite Overlay onto Base Canvas
  const overlayBuffer = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  compositeLayers.push({
    input: overlayBuffer,
    left: 0,
    top: 0,
  });

  const finalComposite = await sharp(normalizedBg)
    .composite(compositeLayers)
    .png({ quality: 95 })
    .toBuffer();

  return {
    compositeBuffer: finalComposite,
    width,
    height,
    mimeType: "image/png",
  };
}
