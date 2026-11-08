import { NextRequest, NextResponse } from "next/server";
import { deleteCampaign } from "@/lib/actions/campaigns";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await context.params;
    const res = await deleteCampaign(campaignId);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to delete campaign" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
