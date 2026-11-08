"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DevRouteNotice } from "@/components/app/DevRouteNotice";

interface Props {
  creativeId: string;
}

export function CreativeStudioView({ creativeId }: Props) {
  const [promptFeedback, setPromptFeedback] = useState("");
  const [activeVersion, setActiveVersion] = useState("v3");
  const [isApproved, setIsApproved] = useState(false);

  const versions = [
    {
      id: "v3",
      label: "Revision 03 (Current)",
      desc: "Increased bottle contrast by 15% and softened background sunlight.",
      date: "10 mins ago",
    },
    {
      id: "v2",
      label: "Revision 02",
      desc: "Swapped body copy to highlight 72h clinical hydration metric.",
      date: "1 hour ago",
    },
    {
      id: "v1",
      label: "Revision 01 (Initial)",
      desc: "Initial synthesis from store product assets.",
      date: "3 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3 font-mono text-xs">
          <Link href="/creatives" className="text-neutral-500 hover:text-black underline underline-offset-4">
            [ RETURN TO ARCHIVE ]
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-700">{creativeId}</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setIsApproved(!isApproved)}
            className={`px-4 py-2 uppercase tracking-wider transition-colors border ${
              isApproved
                ? "bg-neutral-900 text-white border-neutral-900"
                : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            {isApproved ? "[ CREATIVE APPROVED ]" : "Approve for Meta/TikTok"}
          </button>
          <button className="border border-neutral-300 hover:border-neutral-900 px-4 py-2 uppercase tracking-wider transition-colors">
            Export Package
          </button>
        </div>
      </div>

      <DevRouteNotice
        routeName={`Creative Studio & Iteration Engine (${creativeId})`}
        plannedFeatures={[
          "Live creative generation studio",
          "Sharp layer re-composition and text overlay adjustments",
          "Interactive side-by-side version comparison slider",
          "One-click sync to Meta Marketing API and TikTok Ads Manager",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 9:16 Canvas Plate */}
        <div className="lg:col-span-6 border border-neutral-300 bg-white p-8 flex flex-col items-center">
          <div className="w-full text-center pb-4 border-b border-neutral-200 font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
            9:16 VERTICAL AD CANVAS (1080 × 1920 PX)
          </div>

          <div className="w-full max-w-xs mt-6">
            <div className="relative aspect-[9/16] w-full border border-neutral-900 bg-neutral-50 p-6 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                <span>Luminary Botanicals</span>
                <span className="border border-neutral-400 px-1">{activeVersion}</span>
              </div>

              <div className="my-auto text-center py-6">
                <div className="mx-auto h-32 w-16 border border-neutral-900 bg-white flex flex-col items-center justify-center p-1">
                  <div className="h-4 w-4 border-b border-neutral-400 mb-2" />
                  <div className="font-serif text-[8px] font-bold text-neutral-900">
                    LUMINARY
                  </div>
                </div>
                <div className="mt-4 font-serif-title text-sm font-bold text-neutral-950 tracking-wide uppercase">
                  72H Dewy Radiance
                </div>
                <div className="font-mono text-[9px] text-neutral-500 mt-1">
                  Cold-Pressed Rosehip & Squalane
                </div>
              </div>

              <div className="border border-neutral-900 bg-neutral-950 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-white">
                Shop Radiance Night Serum
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-neutral-500">
              <span>Aspect: 9:16 Vertical</span>
              <span>Geometry: 100% Locked</span>
            </div>
          </div>
        </div>

        {/* Right: Studio Prompt & Iteration Panel */}
        <div className="lg:col-span-6 space-y-6">
          <div className="border border-neutral-300 bg-white p-6 space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              DIRECTIVE INPUT
            </div>
            <h3 className="font-serif-title text-lg font-bold text-neutral-950">
              Prompt Iteration Studio
            </h3>
            <p className="text-xs text-neutral-600 font-light">
              Refine this creative composition using natural language instructions.
            </p>

            <textarea
              rows={3}
              value={promptFeedback}
              onChange={(e) => setPromptFeedback(e.target.value)}
              placeholder="e.g. 'Make the lighting more dramatic with evening sunset hues and add delicate water droplet textures'"
              className="w-full border border-neutral-300 bg-white p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none rounded-none font-mono"
            />

            <div className="flex justify-end">
              <button
                disabled={!promptFeedback.trim()}
                className="border border-neutral-900 bg-neutral-950 text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-40 transition-colors"
              >
                Synthesize Revision (Step 4 Preview)
              </button>
            </div>
          </div>

          {/* Version History Branching */}
          <div className="border border-neutral-300 bg-white p-6 space-y-4 font-mono text-xs">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">
              REVISION TREE
            </div>
            <h3 className="font-serif-title text-lg font-bold text-neutral-950 font-sans">
              Version History & Rollback
            </h3>

            <div className="space-y-3">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  onClick={() => setActiveVersion(ver.id)}
                  className={`cursor-pointer p-4 border transition-colors ${
                    activeVersion === ver.id
                      ? "border-neutral-900 bg-neutral-50/70"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-neutral-950">
                    <span>{ver.label}</span>
                    <span className="text-[10px] text-neutral-400">{ver.date}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-600 font-sans font-light">
                    {ver.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

