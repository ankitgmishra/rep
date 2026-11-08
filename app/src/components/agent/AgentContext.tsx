"use client";

import React, { createContext, useContext, useState } from "react";

export type AgentStepStatus = "idle" | "running" | "completed" | "error";

export interface AgentLogItem {
  id: string;
  timestamp: string;
  agent:
    | "Supervisor"
    | "Research"
    | "Strategy"
    | "Creative Studio"
    | "Storage"
    | "Firecrawl"
    | "fal.ai"
    | "Supabase";
  step: string;
  message: string;
  status: "info" | "progress" | "success" | "error";
  data?: Record<string, unknown>;
}

interface AgentContextType {
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  logs: AgentLogItem[];
  addLog: (log: Omit<AgentLogItem, "id" | "timestamp">) => void;
  clearLogs: () => void;
  activePipelineStatus: {
    research: AgentStepStatus;
    strategy: AgentStepStatus;
    generation: AgentStepStatus;
    storage: AgentStepStatus;
  };
}

const initialLogs: AgentLogItem[] = [
  {
    id: "init-1",
    timestamp: "12:00:00",
    agent: "Supervisor",
    step: "System Ready",
    message: "Agent Orchestrator initialized. Standing by for ecommerce store URL.",
    status: "info",
  },
  {
    id: "init-2",
    timestamp: "12:00:01",
    agent: "Firecrawl",
    step: "Crawler Standby",
    message: "Scraping engine configured with product image extraction selectors.",
    status: "info",
  },
  {
    id: "init-3",
    timestamp: "12:00:02",
    agent: "fal.ai",
    step: "Visual Engine Standby",
    message: "Creative studio ready for vertical portrait generation.",
    status: "info",
  },
];

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [logs, setLogs] = useState<AgentLogItem[]>(initialLogs);

  const [activePipelineStatus] = useState({
    research: "idle" as AgentStepStatus,
    strategy: "idle" as AgentStepStatus,
    generation: "idle" as AgentStepStatus,
    storage: "idle" as AgentStepStatus,
  });

  const togglePanel = () => setIsPanelOpen((prev) => !prev);

  const addLog = (log: Omit<AgentLogItem, "id" | "timestamp">) => {
    const newEntry: AgentLogItem = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <AgentContext.Provider
      value={{
        isPanelOpen,
        setIsPanelOpen,
        togglePanel,
        logs,
        addLog,
        clearLogs,
        activePipelineStatus,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
