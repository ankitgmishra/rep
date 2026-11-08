import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CREATIVES_BUCKET = "ad-creatives";

export interface UploadAssetInput {
  userId: string;
  campaignId: string;
  creativeId: string;
  buffer: Buffer;
  mimeType: string;
  filename?: string;
}

export interface UploadAssetResult {
  success: boolean;
  storagePath?: string;
  signedUrl?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Uploads a composed creative image buffer to the private Supabase Storage bucket
 */
export async function uploadCreativeAsset(
  input: UploadAssetInput,
  customClient?: SupabaseClient
): Promise<UploadAssetResult> {
  let supabase = customClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
      try {
        const ws = (await import("ws")).default;
        if (typeof globalThis.WebSocket === "undefined") {
          (globalThis as unknown as Record<string, unknown>).WebSocket = ws;
        }
      } catch {
        // ws optional
      }
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
      );
    }
  }

  const fileExt = input.mimeType === "image/jpeg" ? "jpg" : "png";
  const filename = input.filename || `creative_${Date.now()}.${fileExt}`;
  const storagePath = `${input.userId}/${input.campaignId}/${input.creativeId}_${filename}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(CREATIVES_BUCKET)
      .upload(storagePath, input.buffer, {
        contentType: input.mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[STORAGE UPLOAD ERROR]:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Generate signed URL valid for 24 hours (86400 seconds)
    const { data: signedData, error: signError } = await supabase.storage
      .from(CREATIVES_BUCKET)
      .createSignedUrl(storagePath, 86400);

    if (signError || !signedData?.signedUrl) {
      console.warn("[STORAGE SIGNED URL WARNING]:", signError);
    }

    return {
      success: true,
      storagePath,
      signedUrl: signedData?.signedUrl,
      fileSize: input.buffer.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage upload failed";
    console.error("[STORAGE UNEXPECTED ERROR]:", err);
    return { success: false, error: msg };
  }
}

/**
 * Generates or refreshes a signed URL for a stored asset
 */
export async function getSignedCreativeUrl(
  storagePath: string,
  expiresInSeconds = 86400,
  customClient?: SupabaseClient
): Promise<string | null> {
  if (!storagePath) return null;
  let supabase = customClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
      try {
        const ws = (await import("ws")).default;
        if (typeof globalThis.WebSocket === "undefined") {
          (globalThis as unknown as Record<string, unknown>).WebSocket = ws;
        }
      } catch {
        // ws optional
      }
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
      );
    }
  }

  const { data, error } = await supabase.storage
    .from(CREATIVES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.warn("[SIGNED URL REFRESH ERROR]:", error);
    return null;
  }

  return data.signedUrl;
}
