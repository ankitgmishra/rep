"use client";

import React, { useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { isValidUrl, normalizeStoreUrl } from "@/lib/utils";
import { getPersistedStoreUrl, persistTargetStoreUrl } from "@/lib/store-url";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const OTP_LENGTH = 8;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [storeUrl, setStoreUrl] = useState(() => {
    return searchParams.get("storeUrl") || getPersistedStoreUrl() || "";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationPending, setIsVerificationPending] = useState(false);

  // OTP verification state
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
        setOtpSuccess(true);
        setTimeout(() => {
          router.push(storeUrl ? `/dashboard?url=${encodeURIComponent(storeUrl)}` : "/dashboard");
          router.refresh();
        }, 1200);
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

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter your name";
    }

    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (storeUrl.trim() && !isValidUrl(storeUrl.trim())) {
      newErrors.storeUrl = "Please enter a valid store domain (e.g. brand.com)";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "You must agree to the terms to continue";
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
      const cleanStoreUrl = storeUrl.trim() ? normalizeStoreUrl(storeUrl.trim()) : "";
      if (cleanStoreUrl) {
        persistTargetStoreUrl(cleanStoreUrl);
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            store_url: cleanStoreUrl,
          },
        },
      });

      if (error) {
        setGeneralError(error.message || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push(cleanStoreUrl ? `/dashboard?url=${encodeURIComponent(cleanStoreUrl)}` : "/dashboard");
        router.refresh();
        return;
      }

      setIsVerificationPending(true);
      startResendCooldown();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during registration.";
      setGeneralError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerificationPending) {
    return (
      <div className="w-full">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-slate-950">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the 8-digit verification code sent to <strong className="text-slate-900">{email}</strong>.
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
            <span>Email verified successfully. Redirecting to your workspace…</span>
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
                  Verify & Continue
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
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div>
        <h1 className="font-serif-title text-3xl font-bold text-slate-950">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Connect your ecommerce store to start generating on-brand advertising creatives.
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
            label="Full Name"
            type="text"
            required
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            placeholder="Your name"
            error={errors.fullName}
          />
        </div>

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
          <Input
            label="Store URL (Optional)"
            type="text"
            value={storeUrl}
            onChange={(e) => {
              setStoreUrl(e.target.value);
              if (errors.storeUrl) setErrors((prev) => ({ ...prev, storeUrl: "" }));
            }}
            placeholder="allbirds.com or https://store.com"
            helperText="We automatically extract brand colors, fonts, and products."
            error={errors.storeUrl}
          />
        </div>

        <div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-slate-700">
              Create Password
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-950 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          </div>
          <Input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder="Minimum 8 characters"
            error={errors.password}
          />
        </div>

        <div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-slate-700">
              Confirm Password
            </span>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-950 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showConfirmPassword ? "Hide" : "Show"}</span>
            </button>
          </div>
          <Input
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
            placeholder="Re-enter password"
            error={errors.confirmPassword}
          />
        </div>

        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (errors.acceptTerms) setErrors((prev) => ({ ...prev, acceptTerms: "" }));
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950 accent-slate-950"
            />
            <span className="text-xs text-slate-600 leading-normal">
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.acceptTerms}</p>
          )}
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
            Create Account
          </Button>
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-600">
        Already have a workspace?{" "}
        <Link href="/login" className="font-semibold text-slate-950 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading registration...</div>}>
      <SignupForm />
    </Suspense>
  );
}
