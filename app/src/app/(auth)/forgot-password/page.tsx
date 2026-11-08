"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your account email");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        if (resetError.message.toLowerCase().includes("rate limit")) {
          setError("Too many password reset requests. Please wait a few moments before trying again.");
        } else {
          setError(resetError.message || "Failed to dispatch recovery link.");
        }
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          RECOVERY
        </div>
        <h1 className="mt-2 font-serif-title text-3xl font-normal text-neutral-950">
          Reset password
        </h1>
        <p className="mt-2 text-xs text-neutral-600 font-light">
          Enter the work email associated with your studio workspace.
        </p>
      </div>

      {error && (
        <div className="mt-6 border border-red-300 bg-red-50/70 p-3 font-mono text-xs text-red-700 flex items-start gap-2">
          <span className="font-bold shrink-0">[ ERROR ]</span>
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="mt-8 border border-neutral-300 bg-neutral-50 p-6 text-center space-y-4 font-mono text-xs">
          <div className="font-bold text-neutral-950 uppercase tracking-widest">
            [ INSTRUCTIONS DISPATCHED ]
          </div>
          <p className="text-neutral-700 font-sans text-sm leading-relaxed">
            If an account exists for <span className="font-bold text-neutral-950 underline">{email}</span>, you will receive password reset instructions.
          </p>
          <p className="text-[11px] text-neutral-500 font-mono">
            Follow the link in your email to choose a new password. Check spam if not received.
          </p>
          <div className="pt-4 border-t border-neutral-200">
            <Link
              href="/login"
              className="inline-block border border-neutral-900 bg-neutral-950 text-white px-6 py-2.5 text-xs font-mono uppercase tracking-widest hover:bg-neutral-800 transition-colors"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Account Email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="marketer@yourstore.com"
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full justify-center text-xs font-mono uppercase tracking-widest py-3"
            >
              Send Reset Link
            </Button>
          </div>

          <div className="pt-4 text-center font-mono text-xs">
            <Link
              href="/login"
              className="text-neutral-500 hover:text-neutral-950 underline underline-offset-4"
            >
              [ RETURN TO SIGN IN ]
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
