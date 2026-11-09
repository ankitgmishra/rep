"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Building2,
  RefreshCw,
  Download,
  ThumbsUp,
  Info,
  Maximize2,
  X,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  History,
  Store,
  RotateCcw,
  Check,
  ChevronRight,
  ArrowLeft,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { BrandCodexCard } from "./cards/BrandCodexCard";
import { ConceptsDeckCard } from "./cards/ConceptsDeckCard";
import { CreativeInspectionCard } from "./cards/CreativeInspectionCard";
import { WelcomeBrandCards } from "./cards/WelcomeBrandCards";

export interface DiscoveredProduct {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_formatted: string | null;
  currency: string;
  product_url: string;
  main_image_url: string | null;
  category: string | null;
}
export type ProductData = DiscoveredProduct;

export interface BrandKitData {
  id?: string;
  brand_name: string;
  logo_url: string | null;
  website_description?: string | null;
  brand_colors: Array<{ hex: string; usage: string; is_inferred?: boolean }>;
  brand_voice: string;
  brand_voice_is_inferred?: boolean;
  value_proposition: string;
  value_proposition_is_inferred?: boolean;
  target_audience: string;
  target_audience_is_inferred?: boolean;
  key_selling_points: Array<{ point: string; is_inferred: boolean }>;
  missing_information?: string[];
  sources_checked?: string[];
  is_shopify?: boolean;

  // 1. Brand identity
  brand_description?: string | null;
  core_value_proposition?: string | null;
  positioning_and_differentiators?: string[];

  // 2. Target audience Inferred
  primary_customer_segments?: string[];
  customer_motivations?: string[];
  likely_purchasing_motivations?: string[];

  // 3. Brand voice and messaging
  tone_of_voice?: string | null;
  common_messaging_themes?: string[];
  example_messaging?: string[];

  // 4. Visual identity
  photography_style?: string | null;
  visual_aesthetic?: string | null;
}

export interface AdConcept {
  id: string;
  concept_name: string;
  angle: string;
  target_audience: string;
  core_message: string;
  headline: string;
  supporting_copy: string | null;
  cta: string;
  visual_direction: string;
  strategic_reasoning: string;
  is_approved?: boolean;
}

export interface AdCreativeVersion {
  id: string;
  version_number: number;
  asset_url: string;
  storage_path: string;
  generation_prompt: string;
  revised_instructions?: string | null;
  approval_status: "pending" | "approved" | "rejected";
  metadata?: Record<string, unknown>;
}

export interface AdCreative {
  id: string;
  campaign_id?: string;
  concept_id?: string;
  product_id?: string;
  title: string;
  headline: string;
  supporting_copy?: string | null;
  cta: string;
  asset_url: string;
  storage_path: string;
  status: "processing" | "succeeded" | "failed";
  model_identifier: string;
  review?: {
    product_fidelity_score: number;
    product_fidelity_notes?: string;
    headline_detected: string;
    headline_matches_expected: boolean;
    cta_detected: string;
    cta_matches_expected: boolean;
    text_legibility_score: number;
    composition_score: number;
    overall_verdict: string;
    revision_suggestions?: string[];
  };
  versions?: AdCreativeVersion[];
}
export type AdCreativeRecord = AdCreative;

export type WorkflowStage =
  | "idle"
  | "researching"
  | "awaiting_confirmation"
  | "developing_concepts"
  | "ready_to_generate"
  | "generating"
  | "review"
  | "approved";

export interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  timestamp: string;
  text?: string;
  type?: "text" | "research_summary" | "concepts_selection" | "creative_result";
  data?: {
    brand?: { id: string; name: string; website_url: string };
    brandKit?: BrandKitData;
    products?: DiscoveredProduct[];
    selectedProductId?: string;
    campaign?: { id: string; name: string; objective: string };
    concepts?: AdConcept[];
    selectedConceptId?: string;
    creative?: AdCreative;
    creatives?: AdCreative[];
    versionNumber?: number;
  };
}

interface AgentChatWorkspaceProps {
  initialBrandId?: string;
  initialCampaignId?: string;
  initialStoreUrl?: string;
}

async function safeFetchJson<T = any>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (res.status === 504 || text.includes("FUNCTION_INVOCATION_TIMEOUT") || text.includes("timeout")) {
      throw new Error("Serverless function timed out (60s limit). Please retry with a direct product or collection URL.");
    }
    if (res.status === 401) {
      throw new Error("Your session expired. Please refresh and log in.");
    }
    throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100) || "Empty response"}`);
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export function AgentChatWorkspace({
  initialBrandId,
  initialCampaignId,
  initialStoreUrl = "",
}: AgentChatWorkspaceProps) {
  const router = useRouter();

  // Chat & Telemetry state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState(initialStoreUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<WorkflowStage>("idle");
  const [telemetryMessage, setTelemetryMessage] = useState<string>("");

  // Session context
  const [activeBrand, setActiveBrand] = useState<{
    id: string;
    name: string;
    website_url: string;
  } | null>(null);
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKitData | null>(null);
  const [activeProducts, setActiveProducts] = useState<DiscoveredProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [activeCampaign, setActiveCampaign] = useState<{
    id: string;
    name: string;
    objective: string;
  } | null>(null);
  const [activeConcepts, setActiveConcepts] = useState<AdConcept[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [activeCreative, setActiveCreative] = useState<AdCreative | null>(null);
  const [allCreatives, setAllCreatives] = useState<AdCreative[]>([]);
  const [savedBrands, setSavedBrands] = useState<
    Array<{
      id: string;
      name: string;
      website_url: string;
      product_count?: number;
    }>
  >([]);

  // Modals & inputs
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, telemetryMessage]);

  const addAgentMessage = (
    text: string,
    type: ChatMessage["type"] = "text",
    data?: ChatMessage["data"]
  ) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: "agent",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
      type,
      data,
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  const addUserMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
      type: "text",
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  // Restore saved session
  const loadSavedSession = useCallback(
    async (brandIdToLoad?: string, campaignIdToLoad?: string) => {
      if (!brandIdToLoad && !campaignIdToLoad) return;
      setIsProcessing(true);
      setTelemetryMessage("Restoring saved workspace...");

      try {
        const data = await safeFetchJson<{
          success: boolean;
          empty?: boolean;
          brand?: { id: string; name: string; website_url: string };
          brandKit?: BrandKitData;
          products?: DiscoveredProduct[];
          campaign?: { id: string; name: string; objective: string };
          concepts?: AdConcept[];
          creatives?: AdCreative[];
        }>("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "load_session",
            brandId: brandIdToLoad,
            campaignId: campaignIdToLoad,
          }),
        });

        if (data.empty) {
          setActiveStage("idle");
          setTelemetryMessage("");
          return;
        }

        const restoredMessages: ChatMessage[] = [];

        // 1. Welcome
        restoredMessages.push({
          id: `restored-welcome-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Resumed active workspace for ${data.brand?.name || "your brand"}. You can review your Brand Profile, select products, or generate 9:16 ads.`,
          type: "text",
        });

        // 2. Brand & Products
        if (data.brand && data.brandKit) {
          setActiveBrand(data.brand);
          setActiveBrandKit(data.brandKit);
          setActiveProducts(data.products || []);
          const chosenProdId = data.products?.[0]?.id || "";
          setSelectedProductId(chosenProdId);
          setActiveStage("awaiting_confirmation");

          restoredMessages.push({
            id: `restored-brand-${Date.now()}`,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Brand research complete for ${data.brand.name}. I verified brand identity facts, separated inferences, and discovered ${
              data.products?.length || 0
            } authentic catalog SKUs.`,
            type: "research_summary",
            data: {
              brand: data.brand,
              brandKit: data.brandKit,
              products: data.products || [],
              selectedProductId: chosenProdId,
            },
          });
        }

        // 3. Concepts
        if (data.campaign && data.concepts && data.concepts.length > 0) {
          setActiveCampaign(data.campaign);
          setActiveConcepts(data.concepts);
          setSelectedConceptId(data.concepts[0]?.id || "");
          setActiveStage("ready_to_generate");

          restoredMessages.push({
            id: `restored-concepts-${Date.now()}`,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Formulated ${data.concepts.length} strategic direct-response angles for your campaign.`,
            type: "concepts_selection",
            data: {
              campaign: data.campaign,
              concepts: data.concepts,
              selectedProductId: data.products?.[0]?.id,
              selectedConceptId: data.concepts[0]?.id,
            },
          });
        }

        // 4. Creatives
        if (data.creatives && data.creatives.length > 0) {
          setAllCreatives(data.creatives);
          setActiveCreative(data.creatives[0]);
          setActiveStage("review");

          restoredMessages.push({
            id: `restored-creatives-${Date.now()}`,
            sender: "agent",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Loaded ${data.creatives.length} production 9:16 portrait advertisements from Supabase Storage.`,
            type: "creative_result",
            data: {
              creatives: data.creatives,
              creative: data.creatives[0],
            },
          });
        }

        setMessages(restoredMessages);
      } catch (err: unknown) {
        console.error("Error restoring session:", err);
      } finally {
        setIsProcessing(false);
        setTelemetryMessage("");
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    fetch("/api/agent/saved")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.brands) {
          setSavedBrands(data.brands);
        }
      })
      .catch((err) => {
        console.warn("Could not load saved brands:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialBrandId || initialCampaignId) {
      loadSavedSession(initialBrandId, initialCampaignId);
    } else if (initialStoreUrl) {
      handleResearchStore(initialStoreUrl);
    }
  }, [initialBrandId, initialCampaignId, initialStoreUrl, loadSavedSession]);

  // STEP 1: Research Storefront URL
  const handleResearchStore = async (urlToResearch: string) => {
    if (!urlToResearch.trim()) return;

    addUserMessage(`Analyze store URL: ${urlToResearch}`);
    setIsProcessing(true);
    setActiveStage("researching");
    setTelemetryMessage("Researching storefront pages and discovering products...");

    try {
      const data = await safeFetchJson<{
        success: boolean;
        brand: { id: string; name: string; website_url: string };
        brandKit: BrandKitData;
        products: DiscoveredProduct[];
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research_store",
          storeUrl: urlToResearch.trim(),
        }),
      });

      setActiveBrand(data.brand);
      setActiveBrandKit(data.brandKit);
      setActiveProducts(data.products || []);
      if (data.products?.length > 0) {
        setSelectedProductId(data.products[0].id);
      }

      setActiveStage("awaiting_confirmation");
      setTelemetryMessage("");

      addAgentMessage(
        `Brand research complete for ${data.brand.name}. I extracted verified storefront colors, official logo, and ${
          data.products?.length || 0
        } catalog SKUs with authentic photography. Please inspect the Brand Profile below and select the product you want to advertise:`,
        "research_summary",
        {
          brand: data.brand,
          brandKit: data.brandKit,
          products: data.products,
          selectedProductId: data.products?.[0]?.id,
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during storefront research.";
      setTelemetryMessage("");
      setActiveStage("idle");
      addAgentMessage(`Research failed: ${msg}. Please check the URL and try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2: Develop Creative Concepts
  const handleConfirmAndDevelopConcepts = async (
    prodId?: string,
    customInstructions?: string
  ) => {
    if (!activeBrand?.id) return;
    const targetProdId = prodId || selectedProductId || activeProducts[0]?.id;
    if (!targetProdId) return;

    setSelectedProductId(targetProdId);
    const chosenProduct = activeProducts.find((p) => p.id === targetProdId) || activeProducts[0];

    const promptNote = customInstructions ? ` with focus: "${customInstructions}"` : "";
    addUserMessage(`Selected product: "${chosenProduct.title}". Formulate strategic concepts${promptNote}.`);

    setIsProcessing(true);
    setActiveStage("developing_concepts");
    setTelemetryMessage(
      `Formulating 3 distinct direct-response concepts for ${chosenProduct.title}...`
    );

    try {
      const data = await safeFetchJson<{
        success: boolean;
        campaign: { id: string; name: string; objective: string };
        concepts: AdConcept[];
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_and_develop_concepts",
          brandId: activeBrand.id,
          productId: targetProdId,
          additionalInstructions: customInstructions || null,
        }),
      });

      setActiveCampaign(data.campaign);
      setActiveConcepts(data.concepts || []);
      if (data.concepts?.length > 0) {
        setSelectedConceptId(data.concepts[0].id);
      }

      setActiveStage("ready_to_generate");
      setTelemetryMessage("");

      addAgentMessage(
        `Formulated ${data.concepts.length} distinct direct-response concepts grounded strictly in ${chosenProduct.title}'s verified features. You can generate an individual concept, generate all concepts at once, or request fresh angles:`,
        "concepts_selection",
        {
          campaign: data.campaign,
          concepts: data.concepts,
          selectedProductId: targetProdId,
          selectedConceptId: data.concepts[0]?.id,
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating concepts.";
      setTelemetryMessage("");
      setActiveStage("awaiting_confirmation");
      addAgentMessage(`Concept generation failed: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3: Complete Single Ad Generation via fal.ai
  const handleGenerateAd = async (concId?: string | null) => {
    const targetConceptId = concId || selectedConceptId || activeConcepts[0]?.id;
    const targetProductId = selectedProductId || activeProducts[0]?.id;
    if (!targetConceptId || !targetProductId || !activeCampaign?.id) return;

    const chosenConcept = activeConcepts.find((c) => c.id === targetConceptId) || activeConcepts[0];
    addUserMessage(`Generate 9:16 finished ad for concept: "${chosenConcept.concept_name}".`);

    setIsProcessing(true);
    setActiveStage("generating");
    setTelemetryMessage(`Generating finished 9:16 portrait ad...`);

    try {
      const data = await safeFetchJson<{
        success: boolean;
        creative: AdCreative;
        review: AdCreative["review"];
        version: AdCreativeVersion;
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_ad",
          conceptId: targetConceptId,
          productId: targetProductId,
          campaignId: activeCampaign.id,
        }),
      });

      const creativeData: AdCreative = {
        ...data.creative,
        review: data.review,
        versions: [data.version],
      };

      setActiveCreative(creativeData);
      setAllCreatives((prev) => [creativeData, ...prev.filter((c) => c.id !== creativeData.id)]);
      setActiveStage("review");
      setTelemetryMessage("");

      addAgentMessage(
        `Finished 9:16 portrait advertisement generated! Product fidelity and headline legibility have been verified. You can review, download, or reply with feedback to revise:`,
        "creative_result",
        {
          creative: creativeData,
          versionNumber: 1,
          creatives: [creativeData, ...allCreatives.filter((c) => c.id !== creativeData.id)],
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during ad generation.";
      setTelemetryMessage("");
      setActiveStage("ready_to_generate");
      addAgentMessage(`Generation failed: ${msg}. You can retry without losing your choices.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3B: Batch "Generate All Concepts" via fal.ai
  const handleGenerateAllAds = async () => {
    if (!activeCampaign?.id || activeConcepts.length === 0) return;
    const targetProductId = selectedProductId || activeProducts[0]?.id;

    addUserMessage(`✨ Generate All Concepts (${activeConcepts.length} finished 9:16 portrait ads)`);
    setIsProcessing(true);
    setActiveStage("generating");
    setTelemetryMessage(
      `Generating ${activeConcepts.length} complete 9:16 portrait ads...`
    );

    try {
      const data = await safeFetchJson<{
        success: boolean;
        creatives: AdCreative[];
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_all_ads",
          campaignId: activeCampaign.id,
          productId: targetProductId,
        }),
      });

      const newCreatives: AdCreative[] = data.creatives || [];
      if (newCreatives.length > 0) {
        setAllCreatives(newCreatives);
        setActiveCreative(newCreatives[0]);
        setActiveStage("review");

        if (newCreatives.length > 1) {
          addAgentMessage(
            `✨ All ${newCreatives.length} advertising concepts rendered into production 9:16 portrait ads in parallel! Here are your generated creatives ready for inspection and feedback:`
          );
          for (let i = 0; i < newCreatives.length; i++) {
            const c = newCreatives[i];
            addAgentMessage(
              `Ad ${i + 1} of ${newCreatives.length} — "${c.title}"`,
              "creative_result",
              {
                creatives: newCreatives,
                creative: c,
                versionNumber: 1,
              }
            );
          }
        } else {
          addAgentMessage(
            `All ${newCreatives.length} advertising concepts rendered into production 9:16 portrait ads! Embedded typography, authentic product photography, and CTA buttons are ready. Inspect and compare them below:`,
            "creative_result",
            {
              creatives: newCreatives,
              creative: newCreatives[0],
              versionNumber: 1,
            }
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Batch ad generation failed.";
      setActiveStage("ready_to_generate");
      addAgentMessage(`Batch generation failed: ${msg}. Try generating an individual concept.`);
    } finally {
      setIsProcessing(false);
      setTelemetryMessage("");
    }
  };

  // STEP 4: Natural Language Feedback Iteration
  const handleIterateCreative = async (feedbackTextToApply: string, targetCreativeId?: string) => {
    const targetId = targetCreativeId || activeCreative?.id || allCreatives[allCreatives.length - 1]?.id;
    if (!feedbackTextToApply.trim()) return;

    if (!targetId) {
      addAgentMessage("Please generate an ad creative before submitting revision requests.");
      return;
    }

    addUserMessage(`Revision requested: "${feedbackTextToApply.trim()}"`);
    setIsProcessing(true);
    setActiveStage("generating");
    setTelemetryMessage("Analyzing feedback & generating revised 9:16 ad...");

    try {
      const data = await safeFetchJson<{
        success: boolean;
        creative: AdCreative;
        version: AdCreativeVersion;
        allVersions?: AdCreativeVersion[];
        review?: AdCreative["review"];
        changeSummary?: string;
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "iterate_creative",
          creativeId: targetId,
          feedbackText: feedbackTextToApply.trim(),
        }),
      });

      const existingCreative = allCreatives.find((c) => c.id === targetId) || activeCreative;

      const updatedCreative: AdCreative = {
        ...(existingCreative || {}),
        ...(data.creative || {}),
        asset_url: data.version?.asset_url || data.creative?.asset_url || existingCreative?.asset_url || "",
        versions: data.allVersions || [...(existingCreative?.versions || []), data.version],
        review: data.review || data.creative?.review || existingCreative?.review,
      };

      setActiveCreative(updatedCreative);
      setAllCreatives((prev) => {
        const exists = prev.some((c) => c.id === updatedCreative.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedCreative.id ? updatedCreative : c));
        }
        return [...prev, updatedCreative];
      });
      setActiveStage("review");
      setTelemetryMessage("");

      addAgentMessage(
        `Revised Version ${data.version.version_number} is ready! ${
          data.changeSummary || `Applied your feedback: "${feedbackTextToApply.trim()}".`
        } You can compare all versions above or continue iterating until you're ready to approve.`,
        "creative_result",
        {
          creative: updatedCreative,
          versionNumber: data.version.version_number,
          creatives: allCreatives.map((c) =>
            c.id === updatedCreative.id ? updatedCreative : c
          ),
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error revising creative.";
      setTelemetryMessage("");
      setActiveStage("review");
      addAgentMessage(`Revision error: ${msg}. You can try again or refine your instruction.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 5: Approve Creative
  const handleApproveCreative = async (creativeId: string, versionNumber = 1) => {
    addUserMessage(`Approve Version ${versionNumber} for production.`);
    setIsProcessing(true);
    setTelemetryMessage(`Approving creative version ${versionNumber}...`);
    try {
      const data = await safeFetchJson<{
        success: boolean;
      }>("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_creative",
          creativeId,
          versionNumber,
        }),
      });

      setActiveCreative((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          versions: prev.versions?.map((v) =>
            v.version_number === versionNumber
              ? { ...v, approval_status: "approved" as const }
              : v
          ),
        };
      });

      setAllCreatives((prev) =>
        prev.map((c) =>
          c.id === creativeId
            ? {
                ...c,
                versions: c.versions?.map((v) =>
                  v.version_number === versionNumber
                    ? { ...v, approval_status: "approved" as const }
                    : v
                ),
              }
            : c
        )
      );

      setActiveStage("approved");
      addAgentMessage(
        `Creative Version ${versionNumber} officially approved! This advertisement is ready for Meta/TikTok deployment.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      addAgentMessage(`Approval error: ${msg}`);
    } finally {
      setIsProcessing(false);
      setTelemetryMessage("");
    }
  };

  // Switch product back to selection
  const handleSwitchProduct = () => {
    setActiveStage("awaiting_confirmation");
    addAgentMessage(
      "Here is your catalog. Select a different product to advertise:",
      "research_summary",
      {
        brand: activeBrand || undefined,
        brandKit: activeBrandKit || undefined,
        products: activeProducts,
        selectedProductId: selectedProductId,
      }
    );
  };

  // Generic message submission
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const text = inputMessage.trim();
    setInputMessage("");

    // 1. URL routing
    if (
      text.includes(".") &&
      !text.includes(" ") &&
      (text.startsWith("http") ||
        text.includes(".com") ||
        text.includes(".store") ||
        text.includes(".co") ||
        text.includes(".shop"))
    ) {
      handleResearchStore(text);
      return;
    }

    // 2. Intent: "generate all"
    if (
      text.toLowerCase().includes("generate all") ||
      text.toLowerCase().includes("make all ads") ||
      text.toLowerCase().includes("generate all concepts")
    ) {
      if (activeConcepts.length > 0) {
        handleGenerateAllAds();
        return;
      }
    }

    // 3. Intent: "switch product"
    if (
      text.toLowerCase().includes("switch product") ||
      text.toLowerCase().includes("change product") ||
      text.toLowerCase().includes("different product") ||
      text.toLowerCase().includes("show catalog")
    ) {
      handleSwitchProduct();
      return;
    }

    // 4. If we already have generated ad creatives, user text is natural-language revision feedback!
    if (activeCreative || allCreatives.length > 0) {
      const isExplicitNewConcepts =
        text.toLowerCase().includes("new concept") ||
        text.toLowerCase().includes("fresh concept") ||
        text.toLowerCase().includes("more concept") ||
        text.toLowerCase().includes("reset concept");

      if (isExplicitNewConcepts) {
        handleConfirmAndDevelopConcepts(selectedProductId, text);
        return;
      }

      // Route natural language directive directly to creative iteration
      handleIterateCreative(text, activeCreative?.id || allCreatives[allCreatives.length - 1]?.id);
      return;
    }

    // 5. Intent: "new concepts" when no ad generated yet
    if (
      text.toLowerCase().includes("new concept") ||
      text.toLowerCase().includes("different concept") ||
      text.toLowerCase().includes("more concept") ||
      text.toLowerCase().includes("different angle")
    ) {
      handleConfirmAndDevelopConcepts(selectedProductId, text);
      return;
    }

    // 6. Gemini standard chat
    addUserMessage(text);
    setIsProcessing(true);
    safeFetchJson<{ message?: string }>("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_message", message: text }),
    })
      .then((data) => {
        addAgentMessage(data.message || "I am standing by.");
      })
      .catch((err) => {
        addAgentMessage(`Error: ${err.message}`);
      })
      .finally(() => setIsProcessing(false));
  };

  const handleDeleteBrand = async (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this saved brand from your workspace?")) return;
    setSavedBrands((prev) => prev.filter((b) => b.id !== brandId));
    try {
      await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Failed to delete brand:", err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-neutral-800 bg-white/95 dark:bg-[#09090b]/95 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 dark:text-white lowercase tracking-tight font-sans">
            {activeBrand ? activeBrand.name : "ploy"}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono hidden sm:inline">
            (Autonomous Creative Agent)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeStage !== "idle" && (
            <Badge
              variant={
                activeStage === "approved"
                  ? "success"
                  : activeStage === "generating" || activeStage === "researching"
                  ? "default"
                  : "outline"
              }
              className="capitalize text-[10px] font-semibold px-2 py-0.5"
            >
              {activeStage.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Single Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/30 dark:bg-[#09090b]">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">
          {/* Welcome Screen when Empty */}
          {messages.length === 0 && (
            <div className="py-16 sm:py-24 text-center space-y-6">
              <div className="space-y-2">
                <h1 className="font-serif-title text-3xl sm:text-4xl font-normal tracking-tight text-slate-950 dark:text-white">
                  What brand are we advertising today?
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Enter your ecommerce storefront URL. The agent will research your brand, discover authentic SKUs, formulate direct-response angles, and generate finished 9:16 portrait ads.
                </p>
              </div>

              {/* Saved Brands with Resume Option */}
              <WelcomeBrandCards
                savedBrands={savedBrands}
                onSelectBrand={loadSavedSession}
                onDeleteBrand={handleDeleteBrand}
              />
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* Message Header & Bubble */}
              {msg.sender === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs font-medium">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 shrink-0 mt-0.5 tracking-tight lowercase font-sans select-none">
                    ploy
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    {msg.text && (
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {/* CARD 1: Brand Codex & Product Catalog */}
                    {msg.type === "research_summary" && msg.data?.brandKit && (
                      <BrandCodexCard
                        brandKit={msg.data.brandKit}
                        products={msg.data.products}
                        selectedProductId={selectedProductId}
                        onSelectProduct={(pId) => setSelectedProductId(pId)}
                        onConfirmAndDevelopConcepts={handleConfirmAndDevelopConcepts}
                        isProcessing={isProcessing}
                      />
                    )}

                    {/* CARD 2: Strategic Direct-Response Concepts */}
                    {msg.type === "concepts_selection" && msg.data?.concepts && (
                      <ConceptsDeckCard
                        concepts={msg.data.concepts}
                        selectedConceptId={selectedConceptId}
                        onSelectConcept={(cId) => setSelectedConceptId(cId)}
                        onGenerateAd={handleGenerateAd}
                        onGenerateAllAds={handleGenerateAllAds}
                        onSwitchProduct={handleSwitchProduct}
                        onRequestCustomConcepts={(pId, prompt) =>
                          handleConfirmAndDevelopConcepts(pId || selectedProductId || undefined, prompt)
                        }
                        selectedProductId={selectedProductId}
                        isProcessing={isProcessing}
                      />
                    )}

                    {/* CARD 3: Generated 9:16 Portrait Ad Creative */}
                    {msg.type === "creative_result" && msg.data?.creative && (
                      <CreativeInspectionCard
                        creative={
                          allCreatives.find((c) => c.id === msg.data?.creative?.id) ||
                          (activeCreative?.id === msg.data?.creative?.id ? activeCreative : msg.data.creative)
                        }
                        allCreatives={allCreatives}
                        onSelectCreative={(c) => setActiveCreative(c)}
                        initialVersionNumber={msg.data?.versionNumber}
                        onApproveCreative={handleApproveCreative}
                        onIterateCreative={(feedback, targetId) =>
                          handleIterateCreative(feedback, targetId || msg.data?.creative?.id)
                        }
                        onOpenCompareModal={() => {
                          const target =
                            allCreatives.find((c) => c.id === msg.data?.creative?.id) ||
                            activeCreative;
                          if (target) setActiveCreative(target);
                          setCompareModalOpen(true);
                        }}
                        onOpenPreviewModal={(url) => setPreviewModalUrl(url)}
                        isProcessing={isProcessing}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Live Telemetry Progress Banner */}
          {telemetryMessage && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 animate-pulse text-xs text-slate-700 dark:text-neutral-300">
              <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
              <span className="font-medium">{telemetryMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-4 sm:px-6 lg:px-8 bg-white/95 dark:bg-[#09090b]/95 border-t border-slate-100 dark:border-neutral-800 shrink-0 transition-colors duration-200">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 rounded-2xl border border-slate-300/80 dark:border-neutral-700 bg-white dark:bg-[#18181b] p-2.5 sm:p-3 shadow-sm focus-within:border-slate-500 dark:focus-within:border-neutral-500 focus-within:ring-2 focus-within:ring-slate-200 dark:focus-within:ring-neutral-800 transition-all"
          >
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                activeStage === "idle"
                  ? "Enter store URL to research (e.g. loopycases.com)..."
                  : activeStage === "review"
                  ? "Reply with feedback to revise ad (e.g. 'darker marble background')..."
                  : "Message ploy..."
              }
              disabled={isProcessing}
              className="flex-1 text-sm sm:text-base border-0 focus-visible:ring-0 shadow-none bg-transparent px-3 h-10 sm:h-11 placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-white"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isProcessing}
              className="bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 rounded-xl h-10 sm:h-11 w-10 sm:w-11 p-0 flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </form>
          <div className="text-[10px] text-slate-400 dark:text-neutral-500 text-center mt-2 font-light">
            ploy • Autonomous Storefront Research, Strategy & 9:16 Ad Generation
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md"
        >
          <div className="relative max-h-[92vh] aspect-[9/16] w-full max-w-[480px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black">
            <Image src={previewModalUrl} alt="Preview" fill className="object-cover" unoptimized />
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {compareModalOpen && activeCreative?.versions && (
        <div
          onClick={() => setCompareModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-950 dark:text-white">
                  Creative Version Comparison & Evolution
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Side-by-side evolution of creative generation through natural-language iterations.
                </p>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCreative.versions.map((v) => {
                const isApproved = v.approval_status === "approved";
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-slate-200 dark:border-neutral-800 p-4 space-y-3.5 bg-slate-50/70 dark:bg-neutral-800/80 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Version 0{v.version_number} {v.version_number === 1 ? "(Initial)" : "(Revision)"}
                        </span>
                        <Badge
                          variant={isApproved ? "success" : "outline"}
                          className="text-[10px]"
                        >
                          {isApproved ? "Approved" : "In Review"}
                        </Badge>
                      </div>

                      <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-neutral-700 group">
                        <Image
                          src={v.asset_url}
                          alt={`Version ${v.version_number}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(v.asset_url)}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer shadow-md"
                          title="Zoom"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {v.revised_instructions && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 text-[11px] text-slate-700 dark:text-neutral-300">
                          <span className="font-bold text-slate-900 dark:text-white block text-[10px] mb-0.5">
                            Feedback Applied:
                          </span>
                          &ldquo;{v.revised_instructions}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-neutral-700">
                      <a
                        href={v.asset_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`ad_${activeCreative.id}_v${v.version_number}.png`}
                        className="flex-1 text-center py-2 px-3 rounded-lg bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-800 dark:text-white transition-colors"
                      >
                        Download
                      </a>
                      {!isApproved ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleApproveCreative(activeCreative.id, v.version_number);
                            setCompareModalOpen(false);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Approve v{v.version_number}
                        </button>
                      ) : (
                        <span className="flex-1 text-center py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
