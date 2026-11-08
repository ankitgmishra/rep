"use server";

import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileInput {
  fullName: string;
}

export interface SettingsResult {
  success: boolean;
  error?: string;
}

export async function updateProfileName(
  input: UpdateProfileInput
): Promise<SettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  const fullName = (input.fullName || "").trim();
  if (!fullName || fullName.length < 2) {
    return {
      success: false,
      error: "Profile name must be at least 2 characters.",
    };
  }

  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[SETTINGS ERROR] Profile update failed:", updateError);
      return {
        success: false,
        error: "Failed to update profile name. Please try again.",
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    console.error("[SETTINGS UNEXPECTED ERROR]:", err);
    return {
      success: false,
      error: "An unexpected error occurred while updating profile.",
    };
  }
}
