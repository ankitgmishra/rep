import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://placeholder-project.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://placeholder-project.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
});

export const env = {
  get server() {
    return serverEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      FAL_KEY: process.env.FAL_KEY,
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      NODE_ENV: process.env.NODE_ENV,
    });
  },
  get client() {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  },
};

export function getServiceHealth() {
  const isServer = typeof window === "undefined";
  if (!isServer) {
    return {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")),
    };
  }

  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"
    ),
    fal: Boolean(process.env.FAL_KEY && process.env.FAL_KEY !== "placeholder-fal-key"),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY !== "placeholder-firecrawl-key"),
    aiGateway: Boolean(
      (process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_API_KEY !== "placeholder-ai-gateway-key") ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "placeholder-gemini-key")
    ),
  };
}
