"use client";

import React, { useState } from "react";
import { useAgent, AgentLogItem } from "./AgentContext";
import {
  X,
  Bot,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Sparkles,
  Database,
  Trash2,
  Terminal,
  Cpu,
} from "lucide-react";

export function AgentActivityPanel() {
  const { isPanelOpen, setIsPanelOpen, logs, clearLogs, addLog } = useAgent();
  const [activeTab, setActiveTab] = useState<"stream" | "pipeline" | "health">("stream");

  if (!isPanelOpen) return null;

  const simulateStep = () => {
    addLog({
      agent: "Research",
      step: "Storefront Discovery",
      message: "Initiated deep crawl on store domain. Analyzing product catalog metadata...",
      status: "progress",
    });

    setTimeout(() => {
      addLog({
        agent: "Strategy",
        step: "Hook Generation",
        message: "Generated 3 high-converting ad angles: 'DTC Problem-Solver', 'Aesthetic Focus', 'Social Proof'.",
        status: "info",
      });
    }, 1200);

    setTimeout(() => {
      addLog({
        agent: "Creative Studio",
        step: "Visual Placement",
        message: "Generated authentic product composition for 9:16 portrait ad format.",
        status: "success",
      });
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsPanelOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          aria-label="Agent Activity Stream"
          className="w-screen max-w-lg border-l border-[#222736] bg-[#0c0e14] text-gray-200 shadow-2xl flex flex-col"
        >
          {/* Panel Header */}
          <div className="border-b border-[#1f2430] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Agent Orchestration</h3>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Real-time AI telemetry & generation status</p>
                </div>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-[#1a1e2b] hover:text-white transition-colors"
                title="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation tabs */}
            <div className="mt-4 flex gap-2 border-b border-[#1f2430] pb-2 text-xs">
              <button
                onClick={() => setActiveTab("stream")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  activeTab === "stream"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#161a24]"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                Live Log ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  activeTab === "pipeline"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#161a24]"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Pipeline Stages
              </button>
              <button
                onClick={() => setActiveTab("health")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  activeTab === "health"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#161a24]"
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                System Services
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === "stream" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-medium text-gray-400">Activity Telemetry</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={simulateStep}
                      className="rounded bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30"
                    >
                      Simulate Event
                    </button>
                    <button
                      onClick={clearLogs}
                      className="rounded p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Clear logs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {logs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No active log entries. Logs will stream here during store ingestion and creative generation.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {logs.map((log: AgentLogItem) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-[#1e2330] bg-[#12151d] p-3 text-xs transition-colors hover:border-[#2a3142]"
                      >
                        <div className="flex items-center justify-between text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-gray-400">{log.timestamp}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                log.agent === "Firecrawl" || log.agent === "Research"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : log.agent === "fal.ai" || log.agent === "Creative Studio"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : log.agent === "Strategy"
                                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}
                            >
                              {log.agent}
                            </span>
                            <span className="font-medium text-gray-300">{log.step}</span>
                          </div>
                          {log.status === "success" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          {log.status === "progress" && (
                            <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                          )}
                          {log.status === "error" && (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                          )}
                        </div>
                        <p className="mt-2 text-gray-300 leading-relaxed font-sans">{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "pipeline" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#1f2430] bg-[#11141c] p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    4-Stage Creative Pipeline
                  </h4>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">Storefront Research & Product Extraction</span>
                          <span className="rounded bg-gray-500/10 px-2 py-0.5 text-[10px] text-gray-400">Storefront Scanner</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Extracts authentic product photos, pricing, and key benefits from store URL.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">Copywriting & Angle Strategy</span>
                          <span className="rounded bg-gray-500/10 px-2 py-0.5 text-[10px] text-gray-400">Strategy Engine</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Synthesizes hooks, primary ad text, and urgency-driven CTAs customized for brand voice.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">Visual Synthesis & Placement</span>
                          <span className="rounded bg-gray-500/10 px-2 py-0.5 text-[10px] text-gray-400">Creative Studio</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Combines product cutouts into lifestyle scenes in 1:1, 9:16, and 16:9 aspect ratios.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">Review & Human-in-the-Loop Feedback</span>
                          <span className="rounded bg-gray-500/10 px-2 py-0.5 text-[10px] text-gray-400">Feedback Loop</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Approval workflow allowing instant export or iterative revision prompts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "health" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#1f2430] bg-[#11141c] p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    System Health
                  </h4>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="flex items-center gap-2.5">
                        <Database className="h-4 w-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-medium text-white">Cloud Storage & Database</p>
                          <p className="text-[11px] text-gray-400">Persistence & Schema Bindings</p>
                        </div>
                      </div>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        Configured
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="flex items-center gap-2.5">
                        <Globe className="h-4 w-4 text-amber-400" />
                        <div>
                          <p className="text-xs font-medium text-white">Catalog Discovery Scanner</p>
                          <p className="text-[11px] text-gray-400">Storefront Extraction Engine</p>
                        </div>
                      </div>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                        Ready
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <div>
                          <p className="text-xs font-medium text-white">Ad Generation Studio</p>
                          <p className="text-[11px] text-gray-400">Reference Guided Synthesis</p>
                        </div>
                      </div>
                      <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
                        Ready
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-[#1e2330] bg-[#141722] p-3">
                      <div className="flex items-center gap-2.5">
                        <Bot className="h-4 w-4 text-cyan-400" />
                        <div>
                          <p className="text-xs font-medium text-white">Ad Strategy Reasoning</p>
                          <p className="text-[11px] text-gray-400">Creative Strategist Intelligence</p>
                        </div>
                      </div>
                      <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="border-t border-[#1f2430] bg-[#090b10] px-6 py-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Ploy Agent Runtime v1.0</span>
              <span className="font-mono text-emerald-400">● 100% Operational</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
