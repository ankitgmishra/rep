const fs = require("fs");
const path = require("path");

function createRectangle(id, x, y, width, height, strokeColor, backgroundColor, text = "") {
  return [
    {
      id,
      type: "rectangle",
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor,
      backgroundColor,
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      strokeSharpness: "round",
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: text ? [{ type: "text", id: `${id}_text` }] : [],
    },
    ...(text
      ? [
          {
            id: `${id}_text`,
            type: "text",
            x: x + 12,
            y: y + 12,
            width: width - 24,
            height: height - 24,
            angle: 0,
            strokeColor: "#09090b",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            strokeSharpness: "round",
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            text,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "left",
            verticalAlign: "top",
            containerId: id,
            originalText: text,
          },
        ]
      : []),
  ];
}

function createArrow(id, startX, startY, endX, endY, label = "") {
  const points = [[0, 0], [endX - startX, endY - startY]];
  return [
    {
      id,
      type: "arrow",
      x: startX,
      y: startY,
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
      angle: 0,
      strokeColor: "#0f172a",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      strokeSharpness: "round",
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      points,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      boundElements: label ? [{ type: "text", id: `${id}_label` }] : [],
    },
    ...(label
      ? [
          {
            id: `${id}_label`,
            type: "text",
            x: startX + (endX - startX) / 2 - 40,
            y: startY + (endY - startY) / 2 - 12,
            width: 120,
            height: 24,
            angle: 0,
            strokeColor: "#0284c7",
            backgroundColor: "#ffffff",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            strokeSharpness: "round",
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            text: label,
            fontSize: 12,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: id,
            originalText: label,
          },
        ]
      : []),
  ];
}

const elements = [
  // TITLE BANNER
  ...createRectangle(
    "banner",
    60,
    40,
    1180,
    70,
    "#09090b",
    "#0f172a",
    "CADRA AI ADS MANAGER — SYSTEM ARCHITECTURE\nNext.js App Router • Vercel AI SDK & Elements • Gemini 3.8 Flash • Firecrawl • fal.ai Nano Banana 2.1 • Supabase"
  ),

  // 1. FRONTEND WORKSPACE & CHAT UI
  ...createRectangle(
    "box_frontend",
    60,
    140,
    340,
    300,
    "#0284c7",
    "#f0f9ff",
    "1. FRONTEND: Next.js & AI Elements\n\n• Next.js 16 App Router (Turbopack, React 19)\n• Vercel AI SDK (@ai-sdk/react & ai)\n• AgentChatWorkspace (Chat as primary interface)\n• Interactive In-Stream Cards:\n  - Brand Kit & Catalog Selector Card\n  - Concept Strategy Cards\n  - 9:16 Portrait Preview & Review Card\n• Contextual Side Panel (Brand Codex & Gallery)\n• Mandatory Human Approval Checkpoint"
  ),

  // 2. RESEARCH LAYER: FIRECRAWL
  ...createRectangle(
    "box_firecrawl",
    440,
    140,
    360,
    300,
    "#ea580c",
    "#fff7ed",
    "2. WEBSITE RESEARCH: Firecrawl Extractor\n\n• Firecrawl Brand Extractor (/v1/scrape)\n  - Palette (Primary, Secondary, Accent, Background)\n  - Typography, Logo CDN, Font stacks\n• Multi-Page Discovery & Crawling:\n  - Homepage, About Us & Story pages\n  - Policies & Return/Guarantee pages\n  - Product detail & collection pages\n• Catalog Discovery: Real product images & prices\n• 100% Provenance Preservation (sources_checked)"
  ),

  // 3. REASONING & STRATEGY: GEMINI
  ...createRectangle(
    "box_gemini",
    840,
    140,
    400,
    300,
    "#7c3aed",
    "#f5f3ff",
    "3. REASONING & QA: Google Gemini 3.8 Flash\n\n• Brand Research Agent:\n  - Separates Verified Facts vs. AI Inferences\n  - Flags Missing Information (no hallucinations)\n• Campaign Strategy Agent:\n  - Generates 3 distinct concepts (PAS, Social, Ritual)\n  - Complete CreativeSpec & prompt instructions\n• Creative Feedback Agent:\n  - Analyzes natural language feedback\n  - Classifies change type (copy, layout, visual)\n• Gemini Vision QA Multi-Criteria Auditor"
  ),

  // 4. GENERATION LAYER: FAL.AI
  ...createRectangle(
    "box_fal",
    60,
    480,
    560,
    280,
    "#16a34a",
    "#f0fdf4",
    "4. COMPLETE AD SYNTHESIS: fal.ai (google/nano-banana-2.1/edit)\n\n• ONLY Image Generation Provider (Strict Compliance)\n• Input: Reference catalog product photo + Approved CreativeSpec\n• Complete Finished Ad Generation:\n  - Preserves authentic product shape, colors, materials, and logos\n  - Renders bold, readable headline at top center\n  - Renders high-contrast CTA button at bottom center\n  - Full-screen 9:16 vertical portrait composition (2K resolution)\n• NO Sharp text compositing, NO SVG overlays, NO programmatic cutouts\n• Autonomous Targeted Retry if Gemini Vision flags defects"
  ),

  // 5. STORAGE & DATABASE: SUPABASE
  ...createRectangle(
    "box_supabase",
    660,
    480,
    580,
    280,
    "#059669",
    "#ecfdf5",
    "5. DATABASE & STORAGE LAYER: Supabase\n\n• Supabase PostgreSQL Tables:\n  - brands & brand_kits (extracted facts, inferences, colors)\n  - products (catalog title, authentic CDN image, price, provenance)\n  - campaigns & campaign_concepts (3 distinct angles)\n  - creatives (status, signed URL, model metadata)\n  - creative_versions (version history: v1, v2, v3...)\n  - creative_feedback (marketer feedback directives & categories)\n• Supabase Private Storage: 'ad-creatives' bucket (24h signed URLs)\n• Guarantees persistent assets across browser reloads & sessions"
  ),

  // 6. WORKFLOW ARROWS
  ...createArrow("arr_1", 400, 260, 440, 260, "Store URL"),
  ...createArrow("arr_2", 800, 260, 840, 260, "Scraped Data"),
  ...createArrow("arr_3", 1020, 440, 950, 480, "Approved Concept"),
  ...createArrow("arr_4", 620, 620, 660, 620, "Durable Upload"),
  ...createArrow("arr_5", 660, 660, 620, 660, "Signed URL"),
  ...createArrow("arr_6", 340, 480, 260, 440, "Ad Creative & Audit"),
  ...createArrow("arr_7", 180, 440, 180, 480, "Feedback Revision"),
];

const excalidrawDoc = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: 20,
  },
  files: {},
};

const targetPath = path.resolve(process.cwd(), "../docs/architecture.excalidraw");
fs.writeFileSync(targetPath, JSON.stringify(excalidrawDoc, null, 2));
console.log(`Generated editable Excalidraw architecture diagram at: ${targetPath}`);
