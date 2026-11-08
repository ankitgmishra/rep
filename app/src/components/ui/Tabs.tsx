"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [tab, setTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : tab;

  const handleTabChange = (val: string) => {
    if (value === undefined) setTab(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 text-slate-400",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabTrigger({
  value,
  children,
  className,
  ...props
}: TabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabTrigger must be used within Tabs");
  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
        isActive
          ? "bg-slate-800 text-white shadow-sm shadow-black/40 font-semibold"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabContent({ value, children, className, ...props }: TabContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabContent must be used within Tabs");
  if (context.activeTab !== value) return null;

  return (
    <div className={cn("mt-4 animate-fadeIn", className)} {...props}>
      {children}
    </div>
  );
}

