import React from "react";
import { HeroSection } from "@/components/public/HeroSection";

export const metadata = {
  title: "Ploy — Autonomous AI Ads for Ecommerce",
  description:
    "Turn your store into ready-to-run ads. Ploy scans your storefront and generates high-converting image and video ads in seconds.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1">
      <HeroSection />
    </div>
  );
}
