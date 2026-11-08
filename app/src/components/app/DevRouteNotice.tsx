import React from "react";

export interface DevRouteNoticeProps {
  routeName: string;
  plannedFeatures: string[];
}

export function DevRouteNotice({ routeName, plannedFeatures }: DevRouteNoticeProps) {
  return (
    <div className="border border-neutral-300 bg-white p-5 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <span className="font-bold uppercase tracking-wider text-neutral-900">
          ARCHITECTURAL SCAFFOLDING • {routeName}
        </span>
        <span className="border border-neutral-300 px-2 py-0.5 text-[10px] uppercase text-neutral-500">
          STEP 1 FOUNDATION
        </span>
      </div>
      <p className="mt-3 text-neutral-600 leading-relaxed font-sans text-xs">
        This route structure and shared layout are established in Step 1. In subsequent steps,
        this interface connects to backend database models, automated storefront research,
        and generative ad synthesis.
      </p>

      <div className="mt-4 pt-3 border-t border-neutral-100">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
          UPCOMING CAPABILITIES:
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {plannedFeatures.map((feat, idx) => (
            <span
              key={idx}
              className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] text-neutral-700"
            >
              + {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
