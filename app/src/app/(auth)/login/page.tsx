"use client";

import React, { useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const OTP_LENGTH = 8;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const authErrorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(
    authErrorParam === "auth_callback_failed"
      ? "Authentication verification failed or expired. Please sign in again."
      : null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Email verification flow (shown when login fails due to unconfirmed email)
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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
    setOtpError(null);
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
      setOtpError(null);
      const nextEmpty = newDigits.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otpDigits.join("");
    if (otpCode.length < OTP_LENGTH) {
      setOtpError(`Please enter all ${OTP_LENGTH} digits of the verification code.`);
      return;
    }

    setIsVerifying(true);
    setOtpError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: "signup",
      });

      if (error) {
        setOtpError(error.message || "Invalid or expired code. Please try again.");
        setIsVerifying(false);
        return;
      }

      if (data.session) {
        // OTP verification succeeded and we got a session — user is now logged in
        setOtpSuccess(true);
        setTimeout(() => {
          router.push(nextUrl);
          router.refresh();
        }, 1200);
      } else {
        // Verified but no session — try signing in with password now
        setOtpSuccess(true);
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (loginError) {
          setOtpError("Email verified, but login failed. Please try signing in again.");
          setOtpSuccess(false);
          setIsVerifying(false);
          return;
        }
        if (loginData.session) {
          setTimeout(() => {
            router.push(nextUrl);
            router.refresh();
          }, 1200);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setOtpError(message);
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        setOtpError(error.message);
        return;
      }

      startResendCooldown();
    } catch {
      setOtpError("Failed to resend verification code.");
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your work email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("invalid login credentials") ||
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          // Supabase returns "Invalid login credentials" for BOTH wrong password
          // AND unconfirmed email. Try to resend OTP to detect unconfirmed accounts.
          try {
            const { error: resendError } = await supabase.auth.resend({
              type: "signup",
              email: email.trim(),
            });

            if (!resendError) {
              // OTP resend succeeded → the email exists but is unconfirmed
              setNeedsVerification(true);
              startResendCooldown();
              setIsLoading(false);
              return;
            }
          } catch {
            // Resend failed — treat as normal invalid credentials
          }

          setGeneralError("Invalid email or password. Please verify your credentials and try again.");
        } else {
          setGeneralError(error.message || "Unable to sign in. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during sign-in.";
      setGeneralError(message);
      setIsLoading(false);
    }
  };

  // ---------- Verification flow (when login detects unconfirmed email) ----------
  if (needsVerification) {
    return (
      <div className="w-full">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-slate-950">
            Verify your email to continue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account exists but your email hasn&apos;t been confirmed yet.
            Enter the 8-digit verification code sent to{" "}
            <strong className="text-slate-900">{email}</strong>.
          </p>
        </div>

        {otpError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {otpError}
          </div>
        )}

        {otpSuccess ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Email verified successfully. Signing you in…</span>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
              <div className="text-center text-xs font-medium text-slate-700">
                Verification Code
              </div>

              <div className="flex justify-center gap-1.5 sm:gap-2">
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
                    className="w-9 sm:w-10 h-12 rounded-lg border border-slate-300 bg-white text-center text-lg font-bold text-slate-950 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-colors"
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
                  onClick={handleVerifyOtp}
                  className="w-full justify-center text-sm font-medium py-3 rounded-lg"
                >
                  Verify &amp; Sign In
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 space-y-1">
              <div>
                {resendCooldown > 0 ? (
                  <span>Resend available in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-slate-900 font-semibold hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Check your spam folder if you do not see the email.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setNeedsVerification(false);
                  setOtpDigits(Array(OTP_LENGTH).fill(""));
                  setOtpError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-950 hover:underline cursor-pointer"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Normal login form ----------
  return (
    <div className="w-full">
      <div>
        <h1 className="font-serif-title text-3xl font-bold text-slate-950">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Access your brand workspace and creative library.
        </p>
      </div>

      {generalError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Input
            label="Work Email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="name@company.com"
            error={errors.email}
          />
        </div>

        <div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-slate-700">
              Password
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-950 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
              <Link
                href="/forgot-password"
                className="text-xs text-slate-500 hover:text-slate-950 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          <Input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder="••••••••••••"
            error={errors.password}
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950 accent-slate-950"
            />
            <span className="text-slate-600">
              Remember me
            </span>
          </label>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full justify-center text-sm font-medium py-3 rounded-lg"
          >
            Sign In
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-600">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/signup"
          className="font-semibold text-slate-950 hover:underline"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading sign-in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
