"use client";

import React, { useState } from "react";
import { Sparkles, ArrowLeft, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdConcept } from "../AgentChatWorkspace";

export interface ConceptsDeckCardProps {
  concepts: AdConcept[];
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
  onGenerateAd: (conceptId?: string | null) => void;
  onGenerateAllAds: () => void;
  onSwitchProduct: () => void;
  onRequestCustomConcepts: (productId?: string | null, customPrompt?: string) => void;
  selectedProductId: string | null;
  isProcessing: boolean;
}

export function ConceptsDeckCard({
  concepts,
  selectedConceptId,
  onSelectConcept,
  onGenerateAd,
  onGenerateAllAds,
  onSwitchProduct,
  onRequestCustomConcepts,
  selectedProductId,
  isProcessing,
}: ConceptsDeckCardProps) {
  const [isRequestingNewConcepts, setIsRequestingNewConcepts] = useState(false);
  const [newConceptsPrompt, setNewConceptsPrompt] = useState("");

  const handleFormulateCustom = () => {
    if (!newConceptsPrompt.trim()) return;
    onRequestCustomConcepts(selectedProductId, newConceptsPrompt.trim());
    setIsRequestingNewConcepts(false);
    setNewConceptsPrompt("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-5 shadow-sm space-y-4">
      {/* Deck Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-sm sm:text-base text-slate-950 dark:text-white">
            Direct-Response Concepts Deck
          </h3>
        </div>
        <button
          onClick={onSwitchProduct}
          className="text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch SKU</span>
        </button>
      </div>

      {/* Concepts List */}
      <div className="space-y-3">
        {concepts.map((concept) => {
          const isSelected = selectedConceptId === concept.id;
          return (
            <div
              key={concept.id}
              onClick={() => onSelectConcept(concept.id)}
              className={`rounded-xl border p-4 transition-all space-y-2 text-left cursor-pointer ${
                isSelected
                  ? "border-slate-950 dark:border-white bg-slate-50 dark:bg-neutral-800/80 ring-1 ring-slate-950 dark:ring-white"
                  : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {concept.concept_name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {concept.angle}
                </Badge>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                &ldquo;{concept.headline}&rdquo;
              </div>
              {concept.supporting_copy && (
                <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                  {concept.supporting_copy}
                </p>
              )}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                <span className="truncate max-w-sm">
                  Setting: {concept.visual_direction.slice(0, 60)}...
                </span>
                <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded shrink-0">
                  CTA: {concept.cta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Custom Focus Prompt */}
      {isRequestingNewConcepts && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
            <span>Custom Concept Focus:</span>
            <button
              onClick={() => setIsRequestingNewConcepts(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              value={newConceptsPrompt}
              onChange={(e) => setNewConceptsPrompt(e.target.value)}
              placeholder="e.g. Focus on holiday gift bundles or user durability..."
              className="text-xs bg-white dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newConceptsPrompt.trim()) {
                  handleFormulateCustom();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleFormulateCustom}
              disabled={!newConceptsPrompt.trim() || isProcessing}
              className="bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs font-bold shrink-0 cursor-pointer"
            >
              Formulate
            </Button>
          </div>
        </div>
      )}

      {/* Concept Action Buttons */}
      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setIsRequestingNewConcepts(!isRequestingNewConcepts)}
          className="text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Request New Angles</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerateAllAds}
            disabled={isProcessing}
            variant="outline"
            className="text-xs font-bold text-slate-800 dark:text-white border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>✨ Generate All Concepts</span>
          </Button>

          <Button
            onClick={() => onGenerateAd(selectedConceptId)}
            disabled={isProcessing}
            className="bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 text-xs font-bold cursor-pointer shadow-xs transition-colors"
          >
            <span>Generate Selected Ad</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
