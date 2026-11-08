"use client";

import React from "react";
import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-baseline">
          <span className="text-2xl font-bold tracking-tight text-slate-950 lowercase font-sans">
            ploy
          </span>
        </Link>

        {/* Action Link */}
        <div className="flex items-center">
          <Link
            href="/login"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Enter Studio
          </Link>
        </div>
      </div>
    </header>
  );
}
