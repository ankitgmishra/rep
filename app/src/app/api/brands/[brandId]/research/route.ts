import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeBrandResearch, type ResearchProgressEvent } from "@/lib/research/orchestrator";

interface Props {
  params: Promise<{ brandId: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Props) {
  const { brandId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", brandId)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    brand,
    brandKit: brandKit || null,
    products: products || [],
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  const { brandId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url, user_id")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  // Create SSE stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: ResearchProgressEvent) => {
    try {
      const dataString = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(dataString));
    } catch {
      // Client disconnected
    }
  };

  // Run research in background while streaming
  (async () => {
    try {
      const result = await executeBrandResearch(brandId, async (event) => {
        await sendEvent(event);
      });

      if (!result.success) {
        await sendEvent({
          step: "failed",
          message: result.error || "Research encountered an unrecoverable error.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pipeline exception";
      await sendEvent({
        step: "failed",
        message: msg,
      });
    } finally {
      try {
        await writer.close();
      } catch {
        // Stream already closed
      }
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
