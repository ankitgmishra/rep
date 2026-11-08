import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueCreativeGenerationJobs } from "@/lib/generation/queue";

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
        { error: "Unauthorized: Please sign in to generate creative assets." },
        { status: 401 }
      );
    }

    let conceptIds: string[] | undefined = undefined;
    let productId: string | undefined = undefined;

    try {
      const body = await request.json();
      if (Array.isArray(body.conceptIds) && body.conceptIds.length > 0) {
        conceptIds = body.conceptIds;
      } else if (body.conceptId) {
        conceptIds = [body.conceptId];
      }
      if (body.productId) productId = body.productId;
    } catch {
      // Body empty or optional
    }

    // Submit asynchronous jobs to fal.ai Queue API and return immediately (HTTP 202)
    const result = await enqueueCreativeGenerationJobs({
      campaignId,
      conceptIds,
      productId,
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to enqueue creative generation jobs." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        queued: true,
        jobs: result.jobs || [],
        creatives: result.creatives || [],
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error during generation queueing.";
    console.error("[CREATIVE QUEUE SUBMISSION ERROR]:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
