import type { Metadata } from "next";
import "./globals.css";
import { AgentProvider } from "@/components/agent/AgentContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "ploy — Autonomous AI Ads Manager for Ecommerce",
  description:
    "From your storefront to ads that are ready to run. Turn your ecommerce products into on-brand advertising creatives.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white text-neutral-900 antialiased">
      <body className="min-h-full bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
        <AuthProvider>
          <AgentProvider>{children}</AgentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
