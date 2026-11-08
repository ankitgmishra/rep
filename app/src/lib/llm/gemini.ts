import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * ploy AI Ads Manager - Gemini LLM Provider
 * Integrates Google Gemini via Vercel AI Gateway with direct fallback.
 * Model is dynamically picked from environment variable GEMINI_MODEL.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";

export function getGeminiModel(modelName?: string) {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY?.trim() || "";

  // Configure Google Generative AI provider
  // If AI_GATEWAY_API_KEY is configured and no direct Gemini key is provided, route through Vercel AI Gateway
  const apiKey = geminiApiKey || gatewayApiKey;

  if (!apiKey) {
    throw new Error(
      "No Gemini API key or Vercel AI Gateway key configured. Please set GEMINI_API_KEY or AI_GATEWAY_API_KEY."
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  // Pick model from environment variable GEMINI_MODEL first, then argument, then fallback
  const resolvedModel = process.env.GEMINI_MODEL?.trim() || modelName || DEFAULT_MODEL;

  return google(resolvedModel);
}
