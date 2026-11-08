import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retryGenerationJob } from "@/lib/generation/queue";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to retry jobs." },
        { status: 401 }
      );
    }

    const result = await retryGenerationJob(jobId, user.id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to retry generation job." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      job: result.job,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[JOB RETRY ERROR]:", err);
    return NextResponse.json(
      { error: "Internal server error retrying job", details: message },
      { status: 500 }
    );
  }
}
