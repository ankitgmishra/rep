"use client";

import React, { useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const OTP_LENGTH = 8;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const typeParam = (searchParams.get("type") as "signup" | "email" | "sms" | "phone_change" | "email_change") || "signup";
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pastedData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < OTP_LENGTH; i++) {
        newDigits[i] = pastedData[i] || "";
      }
      setOtpDigits(newDigits);
      setError(null);
      const nextEmpty = newDigits.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otpDigits.join("");
    if (otpCode.length < OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits of the verification code.`);
      return;
    }

    if (!emailParam) {
      setError("Missing email address. Please return to the sign-up page and try again.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: emailParam,
        token: otpCode,
        type: typeParam,
      });

      if (verifyError) {
        console.error("[VERIFY-OTP] Supabase error:", verifyError.message, verifyError);
        if (verifyError.message.toLowerCase().includes("expired")) {
          setError("Verification code has expired. Please request a new one.");
        } else if (
          verifyError.message.toLowerCase().includes("invalid") ||
          verifyError.message.toLowerCase().includes("token")
        ) {
          setError("Invalid verification code. Please check and try again.");
        } else {
          setError(verifyError.message || "Verification failed. Please try again.");
        }
        setIsVerifying(false);
        return;
      }

      console.log("[VERIFY-OTP] Success:", data);
      setIsSuccess(true);

      if (data.session) {
        setTimeout(() => {
          router.push(nextUrl);
          router.refresh();
        }, 1500);
      } else {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during verification.";
      console.error("[VERIFY-OTP] Unexpected error:", message);
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !emailParam) return;

    setError(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: typeParam === "email" ? "email_change" : "signup",
        email: emailParam,
      });

      if (resendError) {
        console.error("[VERIFY-OTP RESEND] Supabase error:", resendError.message, resendError);
        if (resendError.message.toLowerCase().includes("rate limit")) {
          setError("Too many requests. Please wait a moment before trying again.");
        } else {
          setError(resendError.message || "Failed to resend verification code.");
        }
        return;
      }

      console.log("[VERIFY-OTP RESEND] Code resent to:", emailParam);
      startResendCooldown();
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend code.";
      console.error("[VERIFY-OTP RESEND] Unexpected error:", message);
      setError(message);
    }
  };

  return (
    <div className="w-full">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          SECURITY PROTOCOL
        </div>
        <h1 className="mt-2 font-serif-title text-3xl font-normal text-neutral-950">
          Enter verification code
        </h1>
        <p className="mt-2 text-xs text-neutral-600 font-light">
          Input the 8-digit code dispatched to your registered email address.
        </p>
      </div>

      {error && (
        <div className="mt-6 border border-red-300 bg-red-50/70 p-3 font-mono text-xs text-red-700 flex items-start gap-2">
          <span className="font-bold shrink-0">[ ERROR ]</span>
          <span>{error}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="mt-8 border border-emerald-300 bg-emerald-50/70 p-3 font-mono text-xs text-emerald-800">
          <span className="font-bold">[ VERIFIED ]</span>{" "}
          Identity confirmed successfully. Redirecting to your workspace…
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="border border-neutral-300 bg-neutral-50 p-6 space-y-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 font-medium text-center">
              Verification Code
            </div>

            {emailParam && (
              <div className="text-center">
                <p className="text-xs text-neutral-600 font-light">
                  Code sent to{" "}
                  <span className="font-bold text-neutral-950 underline">{emailParam}</span>
                </p>
              </div>
            )}

            <div className="flex justify-center gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  autoFocus={index === 0}
                  className="w-10 h-12 border-2 border-neutral-950 bg-neutral-50/50 text-center font-mono text-lg font-bold text-neutral-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-950 rounded-none transition-colors"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                variant="primary"
                isLoading={isVerifying}
                disabled={isVerifying || otpDigits.join("").length < OTP_LENGTH}
                onClick={handleVerify}
                className="w-full justify-center text-xs font-mono uppercase tracking-widest py-3 cursor-pointer"
              >
                Verify Code
              </Button>
            </div>
          </div>

          <div className="text-center font-mono text-xs text-neutral-500 space-y-2">
            <div>
              {resendCooldown > 0 ? (
                <span className="text-neutral-400">
                  Resend available in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!emailParam}
                  className="text-neutral-500 hover:text-neutral-950 underline underline-offset-4 font-mono text-[11px] uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [ RESEND CODE ]
                </button>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Check your spam folder if you do not see the message.
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 text-center font-mono text-xs text-neutral-500">
            Wrong email?{" "}
            <Link href="/signup" className="font-bold text-neutral-950 hover:underline">
              Start over
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="font-mono text-xs text-neutral-400">Loading verification...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
