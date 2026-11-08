"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  toggleSidebar: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ploy_desktop_sidebar_open");
      if (saved !== null) {
        setIsOpen(saved === "true");
      }
    } catch {
      // ignore SSR or storage exceptions
    }
  }, []);

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ploy_desktop_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  const openSidebar = () => {
    setIsOpen(true);
    try {
      localStorage.setItem("ploy_desktop_sidebar_open", "true");
    } catch {}
  };

  const closeSidebar = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("ploy_desktop_sidebar_open", "false");
    } catch {}
  };

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
