import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateCreativeVersion } from "@/lib/generation/orchestrator";

export const maxDuration = 120; // 2 minutes serverless execution

export async function POST(
  req: Request,
  { params }: { params: Promise<{ creativeId: string }> }
) {
  try {
    const { creativeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { versionId, feedbackText } = body;

    if (!feedbackText || typeof feedbackText !== "string" || !feedbackText.trim()) {
      return NextResponse.json(
        { success: false, error: "Feedback instruction is required for regeneration." },
        { status: 400 }
      );
    }

    const result = await regenerateCreativeVersion({
      creativeId,
      versionId,
      feedbackText: feedbackText.trim(),
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Regeneration pipeline failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      version: result.version,
      changeSummary: result.changeSummary,
      changeType: result.changeType,
      appliedDirectives: result.appliedDirectives,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error during regeneration";
    console.error("[CREATIVE REGENERATION ROUTE ERROR]:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

