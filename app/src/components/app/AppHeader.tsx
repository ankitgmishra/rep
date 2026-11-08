"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Plus, User, LogOut, Settings, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export function AppHeader() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { isOpen, toggleSidebar } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getBreadcrumbInfo = () => {
    if (pathname === "/dashboard") {
      return {
        title: "Overview",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Overview" }],
      };
    }
    if (pathname === "/brands/new") {
      return {
        title: "New Brand Research",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Brands", href: "/brands" },
          { label: "New Brand" },
        ],
      };
    }
    if (pathname.startsWith("/brands/")) {
      const parts = pathname.split("/");
      const id = parts[2] || "";
      return {
        title: "Brand Intelligence",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Brands", href: "/brands" },
          { label: id ? id.slice(0, 10) + "..." : "Details" },
        ],
      };
    }
    if (pathname === "/brands") {
      return {
        title: "Connected Brands",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Brands" }],
      };
    }
    if (pathname.startsWith("/campaigns/new")) {
      return {
        title: "Create Campaign",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Campaigns", href: "/campaigns" },
          { label: "New Campaign" },
        ],
      };
    }
    if (pathname.startsWith("/campaigns")) {
      return {
        title: "Campaigns",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Campaigns" }],
      };
    }
    if (pathname.startsWith("/creatives")) {
      return {
        title: "Saved Library",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Saved Library" }],
      };
    }
    if (pathname.startsWith("/settings")) {
      return {
        title: "Settings",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Settings" }],
      };
    }
    if (pathname.startsWith("/onboarding")) {
      return {
        title: "Storefront Onboarding",
        breadcrumbs: [{ label: "Workspace", href: "/dashboard" }, { label: "Onboarding" }],
      };
    }
    return {
      title: "Workspace",
      breadcrumbs: [{ label: "Workspace" }],
    };
  };

  const { title, breadcrumbs } = getBreadcrumbInfo();

  const userInitial = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-[#09090b]/95 px-6 sm:px-8 backdrop-blur-xs transition-colors duration-200">
      {/* Title & Breadcrumbs + Desktop Sidebar Toggle */}
      <div className="flex items-center gap-3 pl-16 md:pl-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs cursor-pointer"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <div className="flex flex-col">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-600" />}
              {bc.href ? (
                <Link href={bc.href} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="text-slate-900 dark:text-white font-medium">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h1 className="font-serif-title text-base sm:text-lg font-bold text-slate-950 dark:text-white leading-tight">
          {title}
        </h1>
      </div>
    </div>

      {/* Top Navigation Right Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-neutral-200 text-white dark:text-slate-950 px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </Link>

        {/* User Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 p-1.5 pr-2.5 transition-colors cursor-pointer text-slate-900 dark:text-white"
            aria-label="User account menu"
          >
            <div className="h-6 w-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs flex items-center justify-center font-semibold">
              {userInitial}
            </div>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-800 dark:text-neutral-200 max-w-[120px] truncate">
              {profile?.full_name || user?.email?.split("@")[0] || "Account"}
            </span>
            <span className="text-xs text-slate-400">▾</span>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 shadow-lg z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 mb-1">
                <div className="font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.full_name || "Account Member"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                  {user?.email}
                </div>
              </div>

              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </Link>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
