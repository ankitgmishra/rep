import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    // Fetch brands
    const { data: brands, error: bErr } = await supabase
      .from("brands")
      .select("id, name, website_url, approval_status, research_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bErr) {
      console.error("[SAVED API] Error fetching brands:", bErr);
    }

    // Fetch products count per brand
    const { data: products } = await supabase
      .from("products")
      .select("id, brand_id")
      .eq("user_id", user.id);

    const productCountByBrand = new Map<string, number>();
    (products || []).forEach((p) => {
      productCountByBrand.set(p.brand_id, (productCountByBrand.get(p.brand_id) || 0) + 1);
    });

    const enrichedBrands = (brands || []).map((b) => ({
      ...b,
      product_count: productCountByBrand.get(b.id) || 0,
    }));

    // Fetch campaigns
    const { data: campaigns, error: cErr } = await supabase
      .from("campaigns")
      .select("id, name, brand_id, status, objective, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (cErr) {
      console.error("[SAVED API] Error fetching campaigns:", cErr);
    }

    // Fetch creatives count per campaign
    const { data: creatives } = await supabase
      .from("creatives")
      .select("id, campaign_id")
      .eq("user_id", user.id);

    const creativeCountByCampaign = new Map<string, number>();
    (creatives || []).forEach((c) => {
      creativeCountByCampaign.set(c.campaign_id, (creativeCountByCampaign.get(c.campaign_id) || 0) + 1);
    });

    const brandNameMap = new Map((brands || []).map((b) => [b.id, b.name]));

    const enrichedCampaigns = (campaigns || []).map((c) => ({
      ...c,
      brand_name: brandNameMap.get(c.brand_id) || "Connected Store",
      creative_count: creativeCountByCampaign.get(c.id) || 0,
    }));

    return NextResponse.json({
      success: true,
      brands: enrichedBrands,
      campaigns: enrichedCampaigns,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
