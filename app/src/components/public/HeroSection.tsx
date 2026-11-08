import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-center py-16 sm:py-24">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden bg-white">
        <img
          src="/hero.png"
          alt="Ploy backdrop"
          className="w-full h-full object-cover object-center filter brightness-110 contrast-105 opacity-85"
        />
        {/* Luminous wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/50 to-white/90" />
        <div className="absolute inset-0 bg-draft-grid opacity-15" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/90 backdrop-blur-xs px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-xs mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Autonomous AI Ad Studio
        </div>

        {/* Primary Headline */}
        <h1 className="font-serif-title text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-slate-950 leading-[1.08] max-w-3xl mx-auto">
          Turn your store into ready-to-run ads.
        </h1>

        {/* Subheadline */}
        <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-700 max-w-xl mx-auto leading-relaxed">
          Ploy scans your storefront and generates high-converting image and video ads for Meta and TikTok in seconds.
        </p>

        {/* Action Button: Enter Studio */}
        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-8 py-3.5 text-base font-medium transition-all shadow-md hover:shadow-lg active:scale-98"
          >
            <span>Enter Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Trust points */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 backdrop-blur-xs px-3 py-1 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            No credentials needed
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 backdrop-blur-xs px-3 py-1 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Shopify & WooCommerce
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 backdrop-blur-xs px-3 py-1 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Meta & TikTok ready
          </span>
        </div>
      </div>
    </section>
  );
}
