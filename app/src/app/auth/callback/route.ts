import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  const redirectTo = requestUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("next");

  try {
    const supabase = await createClient();

    // 1. Token Hash OTP Verification (used in Supabase recovery and magic links)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
      console.error("Token hash verifyOtp error:", error);
    }

    // 2. PKCE Code Exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
      console.error("Auth callback exchangeCodeForSession error:", error);
    }
  } catch (err) {
    console.error("Auth callback unexpected exception:", err);
  }

  // If next is reset-password, redirect to reset-password with clear error instead of bouncing to login
  if (next.includes("reset-password")) {
    const resetUrl = requestUrl.clone();
    resetUrl.pathname = "/reset-password";
    resetUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(resetUrl);
  }

  // Redirect to login with error notification if exchange fails
  const loginUrl = requestUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
