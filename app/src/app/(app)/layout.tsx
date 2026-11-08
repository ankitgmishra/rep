import React from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { SidebarProvider } from "@/context/SidebarContext";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 selection:bg-slate-950 selection:text-white transition-colors duration-200">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-[#09090b] relative transition-colors duration-200">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
