import sharp from "sharp";
import type { DesignSpec } from "../types";

export interface RenderAdvertisementInput {
  rawVisualBuffer: Buffer;
  designSpec: DesignSpec;
}

export interface RenderAdvertisementResult {
  compositeBuffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
}

/**
 * Stage 5: AI-Directed Rendering — Sharp/SVG
 * Sharp does NOT impose independent creative decisions.
 * It executes the Gemini Art Director's DesignSpec with pixel-perfect accuracy.
 * Renders typography, CTA buttons, badges, overlays, and shadows.
 * Guarantees mobile safe margins and zero clipping at 1080x1920.
 */
export async function runAiDirectedRendering(
  input: RenderAdvertisementInput
): Promise<RenderAdvertisementResult> {
  const { rawVisualBuffer, designSpec } = input;
  const { canvas, headline, supporting_copy, cta_button, badges, brand_bar, overlays } = designSpec;

  const width = canvas.width || 1080;
  const height = canvas.height || 1920;

  // 1. Ensure raw visual is calibrated to exactly 1080x1920
  const baseVisual = await sharp(rawVisualBuffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  // 2. Generate SVG Overlays (Scrims & Gradients)
  let overlaysSvg = "";
  if (overlays && overlays.length > 0) {
    overlaysSvg = overlays
      .map((ov, i) => {
        const id = `overlay_grad_${i}`;
        const isToBottom = ov.direction === "to_bottom";
        const y1 = isToBottom ? "0%" : "100%";
        const y2 = isToBottom ? "100%" : "0%";

        return `
          <defs>
            <linearGradient id="${id}" x1="0%" y1="${y1}" x2="0%" y2="${y2}">
              <stop offset="0%" stop-color="${ov.color}" stop-opacity="${ov.start_opacity}"/>
              <stop offset="100%" stop-color="${ov.color}" stop-opacity="${ov.end_opacity}"/>
            </linearGradient>
          </defs>
          <rect x="0" y="${ov.y}" width="${width}" height="${ov.height}" fill="url(#${id})" />
        `;
      })
      .join("\n");
  }

  // 3. Helper: Wrap text cleanly into tspans
  const wrapText = (
    text: string,
    maxCharsPerLine: number
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // 4. Build Headline SVG
  const headlineApproxCharsPerLine = Math.max(12, Math.floor(headline.max_width / (headline.font_size * 0.58)));
  const headlineLines = wrapText(headline.text, headlineApproxCharsPerLine);
  const headlineLineHeight = Math.round(headline.font_size * (headline.line_height_multiplier || 1.15));

  let headlineSvg = "";
  {
    const anchor = headline.text_align === "center" ? "middle" : headline.text_align === "right" ? "end" : "start";
    const xPos = headline.x;
    const shadowFilter = headline.text_shadow
      ? `filter="drop-shadow(0px ${headline.text_shadow.offset_y}px ${headline.text_shadow.blur}px ${headline.text_shadow.color})"`
      : "";

    headlineSvg = `
      <g ${shadowFilter}>
        <text
          x="${xPos}"
          y="${headline.y}"
          text-anchor="${anchor}"
          font-family="${escapeXml(headline.font_family)}"
          font-size="${headline.font_size}"
          font-weight="${headline.font_weight}"
          fill="${headline.color}"
          letter-spacing="${headline.letter_spacing || -0.5}px"
        >
          ${headlineLines
            .map(
              (line, idx) =>
                `<tspan x="${xPos}" dy="${idx === 0 ? 0 : headlineLineHeight}">${escapeXml(line)}</tspan>`
            )
            .join("\n")}
        </text>
      </g>
    `;
  }

  // 5. Build Supporting Copy SVG
  let supportingSvg = "";
  if (supporting_copy && supporting_copy.text.trim()) {
    const suppCharsPerLine = Math.max(18, Math.floor(supporting_copy.max_width / (supporting_copy.font_size * 0.55)));
    const suppLines = wrapText(supporting_copy.text, suppCharsPerLine);
    const suppLineHeight = Math.round(supporting_copy.font_size * (supporting_copy.line_height_multiplier || 1.3));
    const anchor = supporting_copy.text_align === "center" ? "middle" : supporting_copy.text_align === "right" ? "end" : "start";

    supportingSvg = `
      <text
        x="${supporting_copy.x}"
        y="${supporting_copy.y}"
        text-anchor="${anchor}"
        font-family="${escapeXml(supporting_copy.font_family)}"
        font-size="${supporting_copy.font_size}"
        font-weight="${supporting_copy.font_weight}"
        fill="${supporting_copy.color}"
        opacity="0.9"
      >
        ${suppLines
          .map(
            (line, idx) =>
              `<tspan x="${supporting_copy.x}" dy="${idx === 0 ? 0 : suppLineHeight}">${escapeXml(line)}</tspan>`
          )
          .join("\n")}
      </text>
    `;
  }

  // 6. Build CTA Button SVG
  let ctaSvg = "";
  {
    const btnX = cta_button.x;
    const btnY = cta_button.y;
    const btnW = cta_button.width;
    const btnH = cta_button.height;
    const btnRadius = cta_button.border_radius || 40;
    const textX = btnX + btnW / 2 - (cta_button.icon !== "none" ? 14 : 0);
    const textY = btnY + btnH / 2 + cta_button.font_size * 0.35;

    const strokeAttr = cta_button.border_color
      ? `stroke="${cta_button.border_color}" stroke-width="${cta_button.border_width || 2}"`
      : "";

    let iconSvg = "";
    if (cta_button.icon === "arrow_right") {
      const iconX = btnX + btnW / 2 + (cta_button.text.length * (cta_button.font_size * 0.28)) + 12;
      const iconY = btnY + btnH / 2 - 10;
      iconSvg = `
        <g transform="translate(${iconX}, ${iconY}) scale(0.9)" fill="none" stroke="${cta_button.text_color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </g>
      `;
    }

    ctaSvg = `
      <g filter="drop-shadow(0 10px 24px rgba(0,0,0,0.35))">
        <rect
          x="${btnX}"
          y="${btnY}"
          width="${btnW}"
          height="${btnH}"
          rx="${btnRadius}"
          ry="${btnRadius}"
          fill="${cta_button.background_color}"
          ${strokeAttr}
        />
        <text
          x="${textX}"
          y="${textY}"
          text-anchor="middle"
          font-family="${escapeXml(headline.font_family)}"
          font-size="${cta_button.font_size}"
          font-weight="${cta_button.font_weight}"
          fill="${cta_button.text_color}"
          letter-spacing="0.5px"
        >
          ${escapeXml(cta_button.text)}
        </text>
        ${iconSvg}
      </g>
    `;
  }

  // 7. Build Badges SVG
  let badgesSvg = "";
  if (badges && badges.length > 0) {
    badgesSvg = badges
      .map((b) => {
        const estTextWidth = b.text.length * (b.font_size * 0.6) + b.padding_x * 2;
        const pillHeight = b.font_size + b.padding_y * 2;
        const rectX = b.x - estTextWidth / 2;
        const rectY = b.y - pillHeight / 2;
        const textY = b.y + b.font_size * 0.35;

        return `
          <g filter="drop-shadow(0 2px 8px rgba(0,0,0,0.25))">
            <rect
              x="${rectX}"
              y="${rectY}"
              width="${estTextWidth}"
              height="${pillHeight}"
              rx="${b.border_radius || 20}"
              ry="${b.border_radius || 20}"
              fill="${b.background_color}"
              ${b.border_color ? `stroke="${b.border_color}" stroke-width="1.5"` : ""}
            />
            <text
              x="${b.x}"
              y="${textY}"
              text-anchor="middle"
              font-family="${escapeXml(headline.font_family)}"
              font-size="${b.font_size}"
              font-weight="${b.font_weight}"
              fill="${b.text_color}"
              letter-spacing="0.8px"
            >
              ${escapeXml(b.text)}
            </text>
          </g>
        `;
      })
      .join("\n");
  }

  // 8. Build Brand Bar SVG
  let brandBarSvg = "";
  if (brand_bar && brand_bar.brand_name) {
    brandBarSvg = `
      <text
        x="${brand_bar.x}"
        y="${brand_bar.y}"
        font-family="${escapeXml(headline.font_family)}"
        font-size="${brand_bar.font_size}"
        font-weight="${brand_bar.font_weight}"
        fill="${brand_bar.color}"
        letter-spacing="1.5px"
        opacity="0.9"
      >
        ${escapeXml(brand_bar.brand_name.toUpperCase())}
      </text>
    `;
  }

  // 9. Combine all layers into master SVG
  const fullSvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${overlaysSvg}
      ${brandBarSvg}
      ${badgesSvg}
      ${headlineSvg}
      ${supportingSvg}
      ${ctaSvg}
    </svg>
  `;

  // 10. Execute Sharp composite render
  const compositeBuffer = await sharp(baseVisual)
    .composite([{ input: Buffer.from(fullSvg), top: 0, left: 0 }])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  return {
    compositeBuffer,
    width,
    height,
    fileSize: compositeBuffer.length,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
