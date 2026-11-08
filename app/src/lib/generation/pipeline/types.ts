import { z } from "zod";

/**
 * Cadra AI Ads Manager - Sequential Image Generation Pipeline Types
 * Defines Zod schemas and TypeScript interfaces for all 6 sequential stages:
 * Product Understanding -> Creative Direction -> Visual Generation -> Art Direction -> Rendering -> Quality Assurance
 */

// ============================================================================
// STAGE 1: Product Understanding Schema
// ============================================================================

export const ProductProfileSchema = z.object({
  product_name: z.string().describe("Verified official product title"),
  product_category: z.string().describe("Category or product type, e.g. Phone Case, Beverage, Footwear"),
  physical_form: z.object({
    shape_and_silhouette: z.string().describe("Geometric outline, curves, edges, proportions, and form factor"),
    key_structural_elements: z.array(z.string()).describe("Distinct structural features, e.g. 'patented silicone finger loop on back', 'raised camera bezel'"),
    materials: z.array(z.string()).describe("Visible materials e.g. 'matte silicone', 'polycarbonate shell', 'brushed metal'"),
    finish: z.string().describe("Surface finish e.g. matte, gloss, satin, textured"),
  }),
  color_profile: z.object({
    dominant_colors: z.array(z.string()).describe("Exact color names/shades present on the product"),
    pattern_or_texture: z.string().describe("Surface pattern e.g. Ivy pinstripes, marble, matte monochrome"),
    accent_elements: z.string().optional().describe("Accent colors or trim details"),
  }),
  distinctive_features: z.array(z.string()).describe("Visual elements that make this product instantly authentic and recognizable"),
  preservation_rules: z.array(z.string()).describe("Strict preservation rules: what MUST NOT be altered, deformed, or invented in future generations"),
  branding_elements: z.object({
    has_visible_logo: z.boolean().describe("Whether a brand logo is visible on the authentic product"),
    logo_description: z.string().optional().describe("Description of logo appearance and placement if present"),
    brand_markers: z.array(z.string()).describe("Any unique brand insignia or signature hardware"),
  }),
  extracted_claims: z.array(z.string()).describe("Source-grounded facts extracted from product details (e.g. price, materials) - never invented"),
});

export type ProductProfile = z.infer<typeof ProductProfileSchema>;

// ============================================================================
// STAGE 2: Creative Director (Visual Plan) Schema
// ============================================================================

export const VisualPlanSchema = z.object({
  concept_id: z.string().describe("ID of the approved campaign concept"),
  advertising_angle: z.string().describe("The distinct strategic advertising angle (e.g. Friction Reliever, Social Proof, Daily Ritual)"),
  target_audience_appeal: z.string().describe("How this visual speaks to the target consumer"),
  scene_environment: z.string().describe("Commercial setting description: surface, environment, architectural textures, props"),
  product_staging: z.object({
    placement_zone: z.enum([
      "center",
      "lower_center",
      "upper_center",
      "floating_isometric",
      "flat_lay_centered",
    ]).describe("Spatial placement of the product within the 9:16 vertical frame"),
    scale_relative_to_frame: z.string().describe("e.g. 'Product occupies ~45% of vertical frame height in center'"),
    camera_angle_and_perspective: z.string().describe("e.g. 'Slight 45-degree top-down isometric view', 'Eye-level studio macro'"),
    lighting_style: z.string().describe("e.g. 'Clean commercial studio softbox with gentle ground contact shadow', 'Warm golden-hour rim lighting'"),
  }),
  negative_space_plan: z.object({
    headline_safe_zone: z.enum([
      "top_third",
      "bottom_third",
      "left_half",
      "right_half",
    ]).describe("Designated uncluttered area reserved for high-contrast marketing typography"),
    background_complexity_in_text_zone: z.string().describe("e.g. 'Smooth, low-texture gradient backdrop providing seamless readability for typography'"),
  }),
  supporting_props: z.array(z.string()).describe("Contextual lifestyle props that reinforce the scene without obstructing or touching the product"),
  color_harmony: z.object({
    backdrop_tones: z.array(z.string()).describe("Hex or color names for background surface and environment"),
    lighting_tint: z.string().describe("Warm, neutral, cool, daylight"),
    overall_mood: z.string().describe("e.g. Minimalist luxury, high-energy vibrant, clinical clean"),
  }),
  visual_generation_prompt: z.string().describe("Comprehensive positive prompt for google/nano-banana-2.1/edit strictly focused on environment, lighting, and product presentation with NO TEXT"),
  negative_prompt: z.string().describe("Unwanted elements: text, letters, watermark, distorted product, mutated shape, extra limbs"),
  product_preservation_directives: z.string().describe("Explicit command to preserve product shape, color, loop, and textures identically to reference image"),
});

export type VisualPlan = z.infer<typeof VisualPlanSchema>;

// ============================================================================
// STAGE 4: Art Direction (Design Spec) Schema
// ============================================================================

export const DesignSpecSchema = z.object({
  layout_archetype_name: z.string().describe("Name describing this custom dynamic layout"),
  canvas: z.object({
    width: z.literal(1080),
    height: z.literal(1920),
  }),
  headline: z.object({
    text: z.string().describe("Primary advertising headline"),
    font_family: z.string().default("Plus Jakarta Sans, Inter, sans-serif"),
    font_size: z.number().min(32).max(96).describe("Font size in pixels"),
    font_weight: z.enum(["600", "700", "800", "900"]).default("800"),
    color: z.string().default("#FFFFFF"),
    text_align: z.enum(["left", "center", "right"]).default("center"),
    x: z.number().min(40).max(1040).describe("X coordinate for headline box"),
    y: z.number().min(60).max(1800).describe("Y coordinate for headline box"),
    max_width: z.number().min(300).max(980).describe("Maximum allowed width for text wrapping"),
    line_height_multiplier: z.number().default(1.15),
    letter_spacing: z.number().default(-0.5),
    text_shadow: z.object({
      color: z.string().default("rgba(0,0,0,0.4)"),
      blur: z.number().default(8),
      offset_y: z.number().default(3),
    }).optional(),
  }),
  supporting_copy: z.object({
    text: z.string().describe("Supporting value proposition or proof statement"),
    font_family: z.string().default("Plus Jakarta Sans, Inter, sans-serif"),
    font_size: z.number().min(18).max(44).default(26),
    font_weight: z.enum(["400", "500", "600"]).default("500"),
    color: z.string().default("#E2E8F0"),
    text_align: z.enum(["left", "center", "right"]).default("center"),
    x: z.number().min(40).max(1040),
    y: z.number().min(60).max(1860),
    max_width: z.number().min(280).max(960),
    line_height_multiplier: z.number().default(1.3),
  }).optional(),
  cta_button: z.object({
    text: z.string().describe("Call to action text e.g. 'Shop Now', 'Get Yours'"),
    x: z.number().min(40).max(800),
    y: z.number().min(200).max(1840),
    width: z.number().min(200).max(520).default(360),
    height: z.number().min(60).max(110).default(84),
    background_color: z.string().default("#FFFFFF"),
    text_color: z.string().default("#09090B"),
    font_size: z.number().min(18).max(32).default(24),
    font_weight: z.enum(["700", "800", "900"]).default("800"),
    border_radius: z.number().min(0).max(44).default(42),
    border_color: z.string().optional(),
    border_width: z.number().optional(),
    icon: z.enum(["arrow_right", "shopping_bag", "sparkle", "none"]).default("arrow_right"),
  }),
  badges: z.array(
    z.object({
      text: z.string().describe("Badge copy e.g. 'VERIFIED STORE PRICE: $42.99' or 'PATENTED LOOP DESIGN'"),
      x: z.number(),
      y: z.number(),
      padding_x: z.number().default(18),
      padding_y: z.number().default(10),
      background_color: z.string().default("rgba(0, 0, 0, 0.6)"),
      text_color: z.string().default("#FFFFFF"),
      border_radius: z.number().default(20),
      border_color: z.string().optional(),
      font_size: z.number().default(18),
      font_weight: z.enum(["600", "700", "800"]).default("700"),
    })
  ).default([]),
  brand_bar: z.object({
    brand_name: z.string(),
    x: z.number().default(60),
    y: z.number().default(90),
    color: z.string().default("#FFFFFF"),
    font_size: z.number().default(22),
    font_weight: z.enum(["700", "800"]).default("800"),
    show_logo: z.boolean().default(false),
  }).optional(),
  overlays: z.array(
    z.object({
      type: z.enum(["scrim_top", "scrim_bottom", "gradient_linear", "vignette"]),
      direction: z.enum(["to_bottom", "to_top"]).default("to_bottom"),
      y: z.number(),
      height: z.number(),
      start_opacity: z.number().min(0).max(1),
      end_opacity: z.number().min(0).max(1),
      color: z.string().default("#000000"),
    })
  ).default([]),
  source_grounded_claims: z.array(z.string()).describe("Claims grounded strictly in verified product catalog facts"),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;

// ============================================================================
// STAGE 6: Quality Assurance Schema
// ============================================================================

export const QAVerdictSchema = z.object({
  overall_verdict: z.enum(["pass", "fail"]).describe("Final QA pass or fail determination"),
  quality_score: z.number().min(0).max(100).describe("Composite advertising quality score (0-100)"),
  product_fidelity: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "fail"]),
    observations: z.string().describe("Did the product retain shape, color, loop, logo, and distinctive features?"),
  }),
  visual_realism_and_lighting: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "fail"]),
    observations: z.string().describe("Is the environment realistic with natural lighting and plausible ground contact?"),
  }),
  brand_consistency: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "fail"]),
    observations: z.string().describe("Does the color harmony and tone align with verified brand guidelines?"),
  }),
  typography_and_readability: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "fail"]),
    observations: z.string().describe("Is the headline, supporting copy, and CTA crisp, readable, and contrast-safe?"),
  }),
  product_obstruction: z.object({
    product_occluded_by_text: z.boolean().describe("Whether marketing typography or badges overlap the hero product"),
    observations: z.string(),
  }),
  factual_accuracy: z.object({
    all_claims_verified: z.boolean().describe("Whether all statements match verified brand/product data"),
    fabricated_claims_detected: z.array(z.string()).default([]).describe("Any unverified discounts, ratings, or benefits"),
  }),
  failure_routing: z.enum([
    "none",
    "visual_generation",
    "art_direction",
    "manual_review",
  ]).describe("Routing path if QA failed"),
  required_corrections: z.array(z.string()).describe("Precise actionable corrective instructions if not passing"),
});

export type QAVerdict = z.infer<typeof QAVerdictSchema>;

// ============================================================================
// Pipeline Progress & Execution State
// ============================================================================

export type PipelineStageName =
  | "product_understanding"
  | "creative_director"
  | "visual_generation"
  | "art_direction"
  | "rendering"
  | "quality_assurance"
  | "completed";

export interface PipelineExecutionInput {
  campaignId: string;
  conceptId: string;
  productId: string;
  userId: string;
  creativeId?: string;
  jobId?: string;
  feedbackContext?: {
    feedbackText: string;
    changeType: "copy_only" | "layout_only" | "visual_regeneration" | "full_revision";
    previousCreativeId: string;
    previousVersionNumber: number;
    appliedDirectives?: string[];
  };
}

export interface PipelineExecutionResult {
  success: boolean;
  creativeId: string;
  jobId?: string;
  stageReached: PipelineStageName;
  productProfile?: ProductProfile;
  visualPlan?: VisualPlan;
  rawVisualStoragePath?: string;
  designSpec?: DesignSpec;
  qaVerdict?: QAVerdict;
  finalStoragePath?: string;
  assetUrl?: string;
  error?: string;
}
