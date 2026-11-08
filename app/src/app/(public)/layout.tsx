import React from "react";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <PublicHeader />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
