"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { updateProfileName } from "@/lib/actions/settings";
import { User, Mail, Store, CheckCircle2, Clock, LogOut } from "lucide-react";

function SettingsForm() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(() => profile?.full_name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const trimmed = fullName.trim();
    if (!trimmed || trimmed.length < 2) {
      setMessage({
        type: "error",
        text: "Full name must be at least 2 characters.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProfileName({ fullName: trimmed });
      if (!res.success) {
        setMessage({
          type: "error",
          text: res.error || "Failed to update profile name.",
        });
        setIsSaving(false);
        return;
      }

      await refreshProfile();
      setMessage({
        type: "success",
        text: "Your profile name has been updated.",
      });
      setIsSaving(false);
    } catch (err: unknown) {
      console.error("Profile update error:", err);
      setMessage({
        type: "error",
        text: "An unexpected error occurred while updating profile.",
      });
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-950">
          Account Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your account profile, store connection details, and session settings.
        </p>
      </div>

      {/* Profile Details & Name Update */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Profile Information
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Your name is linked to created campaigns and generated ad assets.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Account Details Overview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-200/80">
            <span className="text-slate-500 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Email Address
            </span>
            <span className="text-slate-900 font-medium">{user?.email || "—"}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-200/80">
            <span className="text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              Onboarding
            </span>
            <span>
              {profile?.onboarding_completed ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5" /> In Progress
                </span>
              )}
            </span>
          </div>

          {profile?.business_name && (
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-400" />
                Store Name
              </span>
              <span className="text-slate-900 font-medium">{profile.business_name}</span>
            </div>
          )}

          {profile?.website_url && (
            <div className="flex flex-col sm:flex-row sm:justify-between py-1">
              <span className="text-slate-500">Website</span>
              <span className="text-slate-900 font-medium">{profile.website_url}</span>
            </div>
          )}
        </div>

        {/* Update Profile Name Form */}
        <form onSubmit={handleUpdateName} className="space-y-4 pt-2">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            helperText="The name shown in your workspace navigation and exports."
            required
          />

          <div className="pt-2 flex justify-start">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              className="rounded-lg px-5 py-2.5"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Sign Out Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Sign Out
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Sign out of your account on this device.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { profile } = useAuth();
  return (
    <div className="h-full w-full overflow-y-auto p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingsForm key={profile?.full_name || profile?.id || "form"} />
      </div>
    </div>
  );
}
