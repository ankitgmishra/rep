import React from "react";
import Link from "next/link";
import { getCreativeById } from "@/lib/actions/creatives";
import { CreativeStudioView } from "@/components/app/CreativeStudioView";
import { CreativeDetailWorkspace } from "@/components/app/creatives/CreativeDetailWorkspace";

interface Props {
  params: Promise<{ creativeId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { creativeId } = await params;
  const creative = await getCreativeById(creativeId);

  return {
    title: creative ? `${creative.title} — ploy` : "Creative Inspection — ploy",
    description: "Inspect synthesized 9:16 advertising creative, version history, feedback directives, and storage provenance.",
  };
}

export default async function CreativeDetailPage({ params }: Props) {
  const { creativeId } = await params;
  const creative = await getCreativeById(creativeId);

  // If not found in database, check if it's one of the legacy mock ids
  if (!creative) {
    if (["cr-1", "cr-2", "cr-3", "cr-4", "cr-101"].includes(creativeId)) {
      return <CreativeStudioView creativeId={creativeId} />;
    }

    return (
      <div className="space-y-6 font-mono text-xs">
        <div className="border border-red-300 bg-red-50 p-6 text-red-800">
          <div className="font-bold uppercase">[ ERROR ]: Creative Not Found</div>
          <p className="mt-1">
            The creative asset with identifier <code className="text-red-950 font-bold">{creativeId}</code> was not found.
          </p>
          <div className="mt-4">
            <Link
              href="/creatives"
              className="border border-red-800 bg-red-800 text-white px-3 py-1 uppercase tracking-wider text-[11px]"
            >
              Return to Creative Library &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CreativeDetailWorkspace creative={creative} />;
}
