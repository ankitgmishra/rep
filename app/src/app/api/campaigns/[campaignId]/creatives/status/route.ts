import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkJobStatusAndRecover } from "@/lib/generation/queue";
import { getSignedCreativeUrl } from "@/lib/storage/creatives";

export async function GET(
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
        { error: "Unauthorized: Please sign in to check creative status." },
        { status: 401 }
      );
    }

    // 1. Fetch current jobs for the campaign
    const { data: rawJobs, error: jobsErr } = await supabase
      .from("creative_generation_jobs")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (jobsErr) {
      return NextResponse.json({ error: jobsErr.message }, { status: 500 });
    }

    const jobs = rawJobs || [];

    // 2. Proactively check status and recover any jobs still marked "generating"
    const pendingJobs = jobs.filter(
      (j) => j.status === "generating" && j.fal_request_id
    );

    if (pendingJobs.length > 0) {
      await Promise.allSettled(
        pendingJobs.map((j) => checkJobStatusAndRecover(j.id, supabase))
      );
    }

    // 3. Re-fetch up-to-date jobs and creatives
    const [{ data: updatedJobs }, { data: creatives }] = await Promise.all([
      supabase
        .from("creative_generation_jobs")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("creatives")
        .select(`
          *,
          creative_versions!creative_versions_creative_id_fkey (*)
        `)
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    // Hydrate fresh signed URLs for creatives that have completed storage paths
    const hydratedCreatives = await Promise.all(
      (creatives || []).map(async (c) => {
        let freshSignedUrl: string | null = null;
        if (c.storage_path) {
          try {
            freshSignedUrl = await getSignedCreativeUrl(c.storage_path, 86400);
          } catch {
            // Fallback to asset_url
          }
        }
        return {
          ...c,
          freshSignedUrl: freshSignedUrl || c.asset_url,
        };
      })
    );

    return NextResponse.json({
      success: true,
      jobs: updatedJobs || jobs,
      creatives: hydratedCreatives,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CAMPAIGN CREATIVES STATUS ERROR]:", err);
    return NextResponse.json(
      { error: "Failed to retrieve creative status", details: message },
      { status: 500 }
    );
  }
}
