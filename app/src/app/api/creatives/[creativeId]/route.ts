import { NextRequest, NextResponse } from "next/server";
import { deleteCreative } from "@/lib/actions/creatives";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ creativeId: string }> }
) {
  try {
    const { creativeId } = await context.params;
    const res = await deleteCreative(creativeId);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to delete creative" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
