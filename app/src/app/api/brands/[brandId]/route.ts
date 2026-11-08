import { NextRequest, NextResponse } from "next/server";
import { deleteBrand } from "@/lib/actions/brands";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await context.params;
    const res = await deleteBrand(brandId);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to delete store" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
