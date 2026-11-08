import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processJobCompletion } from "@/lib/generation/queue";
import { verifyFalWebhook } from "@/lib/generation/providers/fal";

export const dynamic = "force-dynamic";

export { verifyFalWebhook };

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const rawBody = await req.text();

    // 1. Verify Webhook Signature / Token
    const isAuthentic = verifyFalWebhook(rawBody, req.headers, url);
    if (!isAuthentic) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let body: {
      request_id?: string;
      gateway_request_id?: string;
      status?: "OK" | "ERROR";
      payload?: { images?: Array<{ url: string }> };
      error?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const requestId = body.request_id || body.gateway_request_id;
    if (!requestId) {
      return NextResponse.json({ error: "Missing request_id in webhook payload" }, { status: 400 });
    }

    console.log(`[FAL WEBHOOK RECEIVED] Request ID: ${requestId}, Status: ${body.status}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Handle Completion or Error
    if (body.status === "ERROR") {
      console.warn(`[FAL WEBHOOK ERROR] Generation failed on fal for request ${requestId}:`, body.error);

      await supabase
        .from("creative_generation_jobs")
        .update({
          status: "failed",
          error_details: { error: body.error || "fal.ai generation failed" },
          progress_step: `fal.ai error: ${body.error || "Generation error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("fal_request_id", requestId);

      const { data: job } = await supabase
        .from("creative_generation_jobs")
        .select("creative_id")
        .eq("fal_request_id", requestId)
        .maybeSingle();

      if (job?.creative_id) {
        await supabase
          .from("creatives")
          .update({ status: "failed", error_message: body.error || "fal.ai generation failed" })
          .eq("id", job.creative_id);
      }

      return NextResponse.json({ received: true, status: "error_recorded" });
    }

    // 3. Process Succeeded Result Idempotently
    const imageUrl = body.payload?.images?.[0]?.url;
    const result = await processJobCompletion(requestId, imageUrl, supabase);

    return NextResponse.json({
      received: true,
      request_id: requestId,
      success: result.success,
      creative_id: result.creativeId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[FAL WEBHOOK UNCAUGHT ERROR]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
