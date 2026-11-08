"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  Sparkles,
  Plus,
  Building2,
  Layers,
  LayoutDashboard,
  Settings,
  LogOut,
  Globe,
  X,
  Menu,
  Store,
  FolderKanban,
  CheckCircle2,
  Sun,
  Moon,
  MessageSquare,
  Trash2,
  PanelLeftClose,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SavedBrandItem {
  id: string;
  name: string;
  website_url: string;
  approval_status: string;
  research_status: string;
  product_count: number;
}

export interface SavedCampaignItem {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  status: string;
  objective: string;
  creative_count: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "AI Ads Agent", href: "/dashboard", icon: MessageSquare },
  { name: "Saved Library", href: "/creatives", icon: FolderKanban },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({
  pathname,
  onClose,
  onDesktopClose,
  user,
  profile,
  signOut,
}: {
  pathname: string;
  onClose?: () => void;
  onDesktopClose?: () => void;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBrandId = searchParams.get("brandId");
  const activeCampaignId = searchParams.get("campaignId");

  const [savedBrands, setSavedBrands] = useState<SavedBrandItem[]>([]);
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaignItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("ploy-theme") || localStorage.getItem("cadra-theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ploy-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ploy-theme", "light");
    }
  };

  const fetchSavedData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingSaved(true);
      const res = await fetch("/api/agent/saved");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedBrands(data.brands || []);
          setSavedCampaigns(data.campaigns || []);
        }
      }
    } catch (err) {
      console.error("Failed to load saved agent history:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedData();
  }, [fetchSavedData, pathname, activeBrandId, activeCampaignId]);

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] || "U").toUpperCase();

  const handleNewCampaign = () => {
    onClose?.();
    router.push("/dashboard");
  };

  const handleSelectBrand = (brandId: string) => {
    onClose?.();
    router.push(`/dashboard?brandId=${brandId}`);
  };

  const handleSelectCampaign = (campaignId: string) => {
    onClose?.();
    router.push(`/dashboard?campaignId=${campaignId}`);
  };

  const handleDeleteBrand = async (brandId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this saved brand from your workspace?")) return;
    setSavedBrands((prev) => prev.filter((b) => b.id !== brandId));
    try {
      await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Failed to delete brand:", err);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between p-4 transition-colors duration-200 overflow-y-auto font-sans",
        isDarkMode
          ? "bg-[#09090b] text-white border-r border-[#27272a]"
          : "bg-white text-slate-900 border-r border-slate-200"
      )}
    >
      <div className="space-y-5">
        {/* Clean Logo Header */}
        <div className="flex items-center justify-between px-1">
          <Link href="/dashboard" className="group flex items-center">
            <span
              className={cn(
                "text-2xl font-bold tracking-tight lowercase font-sans",
                isDarkMode ? "text-white" : "text-slate-950"
              )}
            >
              ploy
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {onDesktopClose && (
              <button
                type="button"
                onClick={onDesktopClose}
                className={cn(
                  "hidden md:flex p-1.5 rounded-lg transition-colors cursor-pointer",
                  isDarkMode
                    ? "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "md:hidden p-1 rounded-lg transition-colors cursor-pointer",
                  isDarkMode ? "text-neutral-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                )}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Action: Clean High-Contrast Create Button */}
        <button
          onClick={handleNewCampaign}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200 font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>New Ad Campaign</span>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isAgentActive =
              item.href === "/dashboard" &&
              pathname === "/dashboard" &&
              !activeBrandId &&
              !activeCampaignId;
            const isActive =
              isAgentActive ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
                  isActive
                    ? isDarkMode
                      ? "bg-neutral-800 text-white font-bold"
                      : "bg-slate-100 text-slate-950 font-bold"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-emerald-500"
                      : isDarkMode
                      ? "text-neutral-400"
                      : "text-slate-500"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Saved Stores */}
        <div
          className={cn(
            "space-y-2 pt-3 border-t",
            isDarkMode ? "border-neutral-800" : "border-slate-100"
          )}
        >
          <div className="flex items-center justify-between px-2">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isDarkMode ? "text-neutral-400" : "text-slate-400"
              )}
            >
              Saved Stores
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {savedBrands.length}
            </span>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
            {savedBrands.length > 0 ? (
              savedBrands.map((b) => {
                const isSelected = activeBrandId === b.id;
                let hostname = "";
                try {
                  hostname = new URL(b.website_url).hostname.replace(/^www\./, "");
                } catch {
                  hostname = b.website_url;
                }

                return (
                  <div
                    key={b.id}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs group",
                      isSelected
                        ? isDarkMode
                          ? "bg-neutral-800 text-white font-bold border border-neutral-700"
                          : "bg-slate-100 text-slate-950 font-bold border border-slate-200"
                        : isDarkMode
                        ? "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectBrand(b.id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="h-7 w-7 rounded-lg bg-slate-900 dark:bg-neutral-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-800 dark:border-neutral-700">
                        {b.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate leading-tight">{b.name}</div>
                        <div
                          className={cn(
                            "text-[10px] truncate",
                            isDarkMode ? "text-neutral-400" : "text-slate-400"
                          )}
                        >
                          {hostname} • {b.product_count} SKUs
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBrand(b.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer"
                        title="Delete brand"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className={cn(
                  "text-[11px] px-2 py-1 italic",
                  isDarkMode ? "text-neutral-500" : "text-slate-400"
                )}
              >
                {isLoadingSaved ? "Loading..." : "No stores researched yet."}
              </div>
            )}
          </div>
        </div>

        {/* Recent Campaigns */}
        <div
          className={cn(
            "space-y-2 pt-3 border-t",
            isDarkMode ? "border-neutral-800" : "border-slate-100"
          )}
        >
          <div className="flex items-center justify-between px-2">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isDarkMode ? "text-neutral-400" : "text-slate-400"
              )}
            >
              Recent Campaigns
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {savedCampaigns.length}
            </span>
          </div>

          <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
            {savedCampaigns.length > 0 ? (
              savedCampaigns.map((c) => {
                const isSelected = activeCampaignId === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCampaign(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs cursor-pointer group",
                      isSelected
                        ? isDarkMode
                          ? "bg-neutral-800 text-white font-bold border border-neutral-700"
                          : "bg-slate-100 text-slate-950 font-bold border border-slate-200"
                        : isDarkMode
                        ? "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FolderKanban
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isSelected
                            ? "text-emerald-500"
                            : isDarkMode
                            ? "text-neutral-400"
                            : "text-slate-400"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate leading-tight">{c.name}</div>
                        <div
                          className={cn(
                            "text-[10px] truncate",
                            isDarkMode ? "text-neutral-400" : "text-slate-400"
                          )}
                        >
                          {c.brand_name} • {c.creative_count} ads
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div
                className={cn(
                  "text-[11px] px-2 py-1 italic",
                  isDarkMode ? "text-neutral-500" : "text-slate-400"
                )}
              >
                {isLoadingSaved ? "Loading..." : "No campaigns created yet."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Appearance Toggle & User Profile */}
      <div
        className={cn(
          "pt-4 space-y-3 border-t",
          isDarkMode ? "border-neutral-800" : "border-slate-200"
        )}
      >
        {/* Straight Appearance Switcher */}
        <button
          onClick={toggleTheme}
          className={cn(
            "w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            isDarkMode
              ? "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"
          )}
        >
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
            <span>{isDarkMode ? "Light Theme" : "Dark Theme"}</span>
          </div>
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              isDarkMode ? "bg-neutral-900 text-neutral-300" : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            {isDarkMode ? "Dark" : "Light"}
          </span>
        </button>

        {user && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl p-2 border",
              isDarkMode
                ? "bg-neutral-800/60 border-neutral-700"
                : "bg-slate-50 border-slate-100"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-xs font-semibold truncate",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}
              >
                {profile?.full_name || "Account Member"}
              </div>
              <div
                className={cn(
                  "text-[10px] truncate",
                  isDarkMode ? "text-neutral-400" : "text-slate-500"
                )}
              >
                {user.email}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-0.5 px-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1 text-[11px] transition-colors",
              isDarkMode
                ? "text-neutral-400 hover:text-white"
                : "text-slate-500 hover:text-slate-950"
            )}
          >
            <Globe className="w-3 h-3" />
            <span>Public Site</span>
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-3 h-3" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { isOpen, closeSidebar } = useSidebar();

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-neutral-200 shadow-sm hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-80 max-w-sm bg-white dark:bg-neutral-900 shadow-2xl z-10 flex flex-col h-full">
            <React.Suspense
              fallback={
                <div className="flex h-full flex-col justify-between p-4 bg-white dark:bg-neutral-900" />
              }
            >
              <SidebarContent
                pathname={pathname}
                onClose={() => setMobileOpen(false)}
                user={user}
                profile={profile}
                signOut={signOut}
              />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Width: 336px - 384px) with Collapse / Expand */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col h-full transition-all duration-300 ease-in-out",
          isOpen ? "w-84 xl:w-96" : "w-0 overflow-hidden border-0"
        )}
      >
        <React.Suspense
          fallback={
            <div className="flex h-full flex-col justify-between p-4 bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800" />
          }
        >
          <SidebarContent
            pathname={pathname}
            onDesktopClose={closeSidebar}
            user={user}
            profile={profile}
            signOut={signOut}
          />
        </React.Suspense>
      </aside>
    </>
  );
}
