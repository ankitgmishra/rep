import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/actions/campaigns";
import { runCampaignStrategyAgent } from "@/lib/strategy/agent";
import type { Json } from "@/lib/supabase/types";

export const maxDuration = 60; // 60s max execution time

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to generate campaign strategies." },
        { status: 401 }
      );
    }

    // 1. Fetch campaign, brand, brand kit, and products
    const campaignData = await getCampaignById(campaignId);

    if (!campaignData || !campaignData.campaign) {
      return NextResponse.json(
        { error: "Campaign not found or access denied." },
        { status: 404 }
      );
    }

    const { campaign, brand, brandKit, products } = campaignData;

    // 2. Enforce Human Approval Checkpoint
    if (!brand || brand.approval_status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Brand approval required: This brand has not passed the Stage 5 Human Approval Checkpoint. Review and approve the brand before synthesizing advertising concepts.",
        },
        { status: 400 }
      );
    }

    // 3. Ensure at least one product is allocated
    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          error:
            "No products allocated to this campaign. Please allocate at least one verified product.",
        },
        { status: 400 }
      );
    }

    // 4. Parse request body for optional revision instructions
    let revisionInstructions: string | undefined = undefined;
    try {
      const body = await request.json();
      if (body && typeof body.revisionInstructions === "string") {
        revisionInstructions = body.revisionInstructions.trim();
      }
    } catch {
      // Body may be empty on initial generation
    }

    // 5. Run the Strategy Agent
    const strategyResult = await runCampaignStrategyAgent({
      brand,
      brandKit,
      products,
      objective: campaign.objective,
      additionalInstructions: campaign.additional_instructions,
      revisionInstructions,
    });

    // 6. Persist the 3 concepts into campaign_concepts table
    // Per requirement, all three concepts default to approved so marketer can generate all or selectively toggle
    const nowIso = new Date().toISOString();
    const conceptsToInsert = strategyResult.concepts.map((concept) => ({
      campaign_id: campaignId,
      user_id: user.id,
      concept_name: concept.concept_name,
      angle: concept.angle,
      target_audience: concept.target_audience,
      core_message: concept.core_message,
      headline: concept.headline,
      supporting_copy: concept.supporting_copy,
      cta: concept.cta,
      visual_direction: concept.visual_direction,
      composition_and_background: concept.composition_and_background,
      strategic_reasoning: concept.strategic_reasoning,
      original_output: concept as unknown as Json,
      user_edits: {} as unknown as Json,
      approval_status: "approved" as const,
      is_approved: true,
      approved_at: nowIso,
    }));

    // If this is a revision, we keep previous concepts or archive them.
    // Insert new concepts
    const { data: insertedConcepts, error: insertError } = await supabase
      .from("campaign_concepts")
      .insert(conceptsToInsert)
      .select("*")
      .order("created_at", { ascending: true });

    if (insertError) {
      console.error("[CAMPAIGN CONCEPTS INSERT ERROR]:", insertError);
      return NextResponse.json(
        { error: "Failed to persist strategy concepts in database: " + insertError.message },
        { status: 500 }
      );
    }

    // Update campaign status to 'active' or 'concepts_ready'
    await supabase
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaignId)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      strategic_overview: strategyResult.strategic_overview,
      concepts: insertedConcepts || [],
    });
  } catch (err: unknown) {
    console.error("[CAMPAIGN STRATEGY ERROR]:", err);
    const msg = err instanceof Error ? err.message : "Unexpected campaign strategy failure";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
