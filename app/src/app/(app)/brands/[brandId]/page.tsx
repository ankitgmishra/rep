import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandCodexView } from "@/components/app/BrandCodexView";

interface Props {
  params: Promise<{ brandId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { brandId } = await params;
  return {
    title: `Brand Intelligence (${brandId.slice(0, 8)}) — Ploy`,
    description: "Storefront brand profile and autonomous research findings.",
  };
}

export default async function BrandDetailsPage({ params }: Props) {
  const { brandId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch brand owned by current authenticated user
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="border border-neutral-300 bg-white p-8">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
            TAXONOMY QUERY • NOT FOUND
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-neutral-950 mt-2">
            Brand Record Not Found
          </h2>
          <p className="mt-2 text-xs text-neutral-600 font-mono">
            The brand identifier [{brandId}] does not exist or is not associated with your account.
          </p>
          <div className="mt-6">
            <Link
              href="/brands"
              className="inline-block border border-neutral-950 bg-neutral-950 text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors"
            >
              Return to Connected Brands
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch existing brand kit if available
  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("brand_id", brandId)
    .single();

  // Fetch existing products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-neutral-400">Loading brand profile...</div>}>
      <BrandCodexView
        brand={brand}
        initialBrandKit={brandKit || null}
        initialProducts={products || []}
      />
    </Suspense>
  );
}
