"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUrl, normalizeStoreUrl } from "@/lib/utils";

export interface OnboardingInput {
  businessName: string;
  websiteUrl: string;
  industry: string;
  targetMarket: string;
}

export interface OnboardingResult {
  success: boolean;
  error?: string;
  brandId?: string;
}

export async function submitOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const supabase = await createClient();

  // 1. Verify authenticated operator session on server
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Authentication required. Please log in again.",
    };
  }

  // 2. Validate input on the server
  const businessName = (input.businessName || "").trim();
  const websiteUrl = (input.websiteUrl || "").trim();
  const industry = (input.industry || "").trim();
  const targetMarket = (input.targetMarket || "").trim();

  if (!businessName || businessName.length < 2) {
    return {
      success: false,
      error: "Store / business name must be at least 2 characters.",
    };
  }

  if (!websiteUrl || !isValidUrl(websiteUrl)) {
    return {
      success: false,
      error: "Please provide a valid storefront website URL (e.g., example.com).",
    };
  }

  if (!industry) {
    return {
      success: false,
      error: "Please select an industry category.",
    };
  }

  if (!targetMarket) {
    return {
      success: false,
      error: "Please select a primary target market.",
    };
  }

  const normalizedUrl = normalizeStoreUrl(websiteUrl);

  try {
    // 3. Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        business_name: businessName,
        website_url: normalizedUrl,
        industry: industry,
        target_market: targetMarket,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("[ONBOARDING ERROR] Profile update failed:", profileError);
      return {
        success: false,
        error: "Failed to save profile information. Please retry.",
      };
    }

    // 4. Create initial brand record in brands table
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .insert({
        user_id: user.id,
        name: businessName,
        website_url: normalizedUrl,
        industry: industry,
        research_status: "pending_research",
      })
      .select("id")
      .single();

    if (brandError) {
      console.error("[ONBOARDING ERROR] Brand creation failed:", brandError);
      // Profile was updated, so continue gracefully
    }

    return {
      success: true,
      brandId: brand?.id,
    };
  } catch (err: unknown) {
    console.error("[ONBOARDING ERROR] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during onboarding. Please try again.",
    };
  }
}
