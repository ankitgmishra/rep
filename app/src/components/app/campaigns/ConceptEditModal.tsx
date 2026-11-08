"use client";

import React, { useState } from "react";
import type { Database } from "@/lib/supabase/types";

type CampaignConceptRow = Database["public"]["Tables"]["campaign_concepts"]["Row"];

interface ConceptEditModalProps {
  concept: CampaignConceptRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (conceptId: string, updates: { headline: string; supporting_copy: string; cta: string; concept_name: string }) => Promise<void>;
}

export function ConceptEditModal({
  concept,
  isOpen,
  onClose,
  onSave,
}: ConceptEditModalProps) {
  const [conceptName, setConceptName] = useState(concept.concept_name);
  const [headline, setHeadline] = useState(concept.headline);
  const [supportingCopy, setSupportingCopy] = useState(concept.supporting_copy);
  const [cta, setCta] = useState(concept.cta);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!headline.trim()) {
      setError("Headline cannot be blank.");
      return;
    }
    if (!supportingCopy.trim()) {
      setError("Supporting copy cannot be blank.");
      return;
    }
    if (!cta.trim()) {
      setError("CTA text cannot be blank.");
      return;
    }

    try {
      setIsSaving(true);
      await onSave(concept.id, {
        concept_name: conceptName.trim(),
        headline: headline.trim(),
        supporting_copy: supportingCopy.trim(),
        cta: cta.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save edits.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Edit Ad Concept
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              Refine Copy & Creative Angle
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg px-2 py-1 rounded-md transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-neutral-600 mb-1">
              Concept Name
            </label>
            <input
              type="text"
              value={conceptName}
              onChange={(e) => setConceptName(e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] uppercase tracking-wider text-neutral-600">
                Hook Headline
              </label>
              <span className="text-[10px] text-neutral-400">
                RECOMMENDED 8-12 WORDS
              </span>
            </div>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-950 focus:border-neutral-950 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-neutral-600 mb-1">
              Supporting Body Copy
            </label>
            <textarea
              value={supportingCopy}
              onChange={(e) => setSupportingCopy(e.target.value)}
              rows={3}
              className="w-full border border-neutral-300 bg-white p-3 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-neutral-600 mb-1">
              Call To Action (CTA)
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 focus:border-neutral-950 focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-500">
            Source note: Edits will be isolated in <code className="text-neutral-800">user_edits</code> to preserve provenance. Original AI output is retained for auditing.
          </div>

          {error && (
            <div className="border border-red-500 bg-red-50 p-3 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="border border-neutral-300 px-4 py-1.5 uppercase text-neutral-700 hover:border-neutral-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="border border-neutral-950 bg-neutral-950 text-white px-5 py-1.5 uppercase font-bold hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Refinements"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

