import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Left Side: Brand Visual Media */}
      <div className="relative flex-1 min-h-[240px] sm:min-h-[320px] lg:min-h-screen bg-slate-950 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
        <video
          src="/video.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
        <div className="absolute bottom-8 left-8 right-8 hidden lg:block text-white">
          <div className="inline-block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            Autonomous Creative Studio
          </div>
          <h2 className="font-serif-title text-2xl font-normal text-white/95 max-w-md leading-snug">
            Turn your ecommerce products into ads that stop the scroll and convert.
          </h2>
        </div>
      </div>

      {/* Right Side: Form Container */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white shrink-0">
        {/* Top Navigation */}
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-950 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
          <span className="text-xl font-bold tracking-tight text-slate-950 lowercase font-sans">
            ploy
          </span>
        </div>

        {/* Center Form */}
        <div className="my-auto py-8">{children}</div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 ploy</span>
        </div>
      </div>
    </div>
  );
}
