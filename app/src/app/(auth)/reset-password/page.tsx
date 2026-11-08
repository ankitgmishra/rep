"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = "New password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setGeneralError(
          updateError.message || "Failed to update password. Your recovery link may have expired."
        );
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setGeneralError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          CREDENTIAL UPDATE
        </div>
        <h1 className="mt-2 font-serif-title text-3xl font-normal text-neutral-950">
          Choose a new password
        </h1>
        <p className="mt-2 text-xs text-neutral-600 font-light">
          Create a secure password to protect your Ploy workspace.
        </p>
      </div>

      {generalError && (
        <div className="mt-6 border border-red-300 bg-red-50/70 p-3 font-mono text-xs text-red-700 flex items-start gap-2">
          <span className="font-bold shrink-0">[ ERROR ]</span>
          <span>{generalError}</span>
        </div>
      )}

      {success ? (
        <div className="mt-8 border border-neutral-300 bg-neutral-50 p-6 text-center space-y-4 font-mono text-xs">
          <div className="font-bold text-neutral-950 uppercase tracking-widest">
            [ PASSWORD UPDATED ]
          </div>
          <p className="text-neutral-700 font-sans text-sm leading-relaxed">
            Your credentials have been securely updated. You can now access your studio workspace.
          </p>
          <div className="pt-4 border-t border-neutral-200 flex justify-center gap-4">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => router.push("/dashboard")}
              className="text-xs font-mono uppercase tracking-widest px-6"
            >
              Enter Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 font-medium">
                New Password
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="font-mono text-[10px] text-neutral-500 hover:text-neutral-950 uppercase tracking-wider"
              >
                {showPassword ? "[ HIDE ]" : "[ SHOW ]"}
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
              placeholder="At least 8 characters"
              error={errors.password}
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 font-medium">
                Confirm New Password
              </span>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="font-mono text-[10px] text-neutral-500 hover:text-neutral-950 uppercase tracking-wider"
              >
                {showConfirmPassword ? "[ HIDE ]" : "[ SHOW ]"}
              </button>
            </div>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              placeholder="Re-enter password"
              error={errors.confirmPassword}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full justify-center text-xs font-mono uppercase tracking-widest py-3"
            >
              Update Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
