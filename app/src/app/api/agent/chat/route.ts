import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafePublicUrl } from "@/lib/research/security";
import { scrapeStorefront } from "@/lib/research/scraper";
import { runBrandResearchAgent } from "@/lib/research/agent";
import { runCampaignStrategyAgent, type AdConcept } from "@/lib/strategy/agent";
import {
  generateCompleteAdvertisementViaFal,
  NANO_BANANA_EDIT_MODEL,
} from "@/lib/generation/providers/fal";
import { uploadCreativeAsset, getSignedCreativeUrl } from "@/lib/storage/creatives";
import { regenerateCreativeVersion } from "@/lib/generation/orchestrator";
import { getGeminiModel } from "@/lib/llm/gemini";
import { generateText } from "ai";

export const maxDuration = 60; // Maximum allowed on Vercel Hobby plan (60s)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const body = await req.json();
    const {
      action,
      brandId,
      campaignId,
      creativeId,
      productId,
      conceptId,
      storeUrl,
      message,
      feedbackText,
      additionalInstructions,
    } = body;

    // ACTION: Load Saved Session into Chat Workspace
    if (action === "load_session") {
      let resolvedBrandId = brandId;
      let resolvedCampaign: Record<string, unknown> | null = null;

      if (campaignId) {
        const { data: camp } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaignId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (camp) {
          resolvedCampaign = camp;
          resolvedBrandId = camp.brand_id;
        }
      }

      if (!resolvedBrandId && !campaignId) {
        // Default to the user's latest brand
        const { data: latestBrand } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestBrand) {
          resolvedBrandId = latestBrand.id;
        }
      }

      if (!resolvedBrandId) {
        return NextResponse.json({ success: true, empty: true });
      }

      // Fetch Brand
      const { data: brand } = await supabase
        .from("brands")
        .select("*")
        .eq("id", resolvedBrandId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!brand) {
        return NextResponse.json({ error: "Brand not found." }, { status: 404 });
      }

      // Fetch Brand Kit
      const { data: brandKit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("brand_id", resolvedBrandId)
        .maybeSingle();

      // Fetch Products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("brand_id", resolvedBrandId)
        .order("created_at", { ascending: true });

      // If no campaign specified, get the latest campaign for this brand
      if (!resolvedCampaign) {
        const { data: camp } = await supabase
          .from("campaigns")
          .select("*")
          .eq("brand_id", resolvedBrandId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (camp) resolvedCampaign = camp;
      }

      // Fetch Concepts for this campaign
      let concepts: Record<string, unknown>[] = [];
      if (resolvedCampaign?.id) {
        const { data: cList } = await supabase
          .from("campaign_concepts")
          .select("*")
          .eq("campaign_id", resolvedCampaign.id as string)
          .order("created_at", { ascending: true });
        concepts = cList || [];
      }

      // Fetch Creatives for this campaign
      let creativesWithSignedUrls: Record<string, unknown>[] = [];
      if (resolvedCampaign?.id) {
        const { data: crList } = await supabase
          .from("creatives")
          .select("*")
          .eq("campaign_id", resolvedCampaign.id as string)
          .order("created_at", { ascending: false });

        if (crList && crList.length > 0) {
          creativesWithSignedUrls = await Promise.all(
            crList.map(async (cr) => {
              let signedUrl = cr.asset_url;
              if (cr.storage_path) {
                try {
                  const fresh = await getSignedCreativeUrl(cr.storage_path, 86400);
                  if (fresh) signedUrl = fresh;
                } catch {
                  // fallback
                }
              }

              // Fetch versions
              const { data: rawVersions } = await supabase
                .from("creative_versions")
                .select("*")
                .eq("creative_id", cr.id)
                .order("version_number", { ascending: true });

              const versions = await Promise.all(
                (rawVersions || []).map(async (v) => {
                  let vUrl = v.asset_url;
                  if (v.storage_path) {
                    try {
                      const freshV = await getSignedCreativeUrl(v.storage_path, 86400);
                      if (freshV) vUrl = freshV;
                    } catch {
                      // fallback
                    }
                  }
                  return { ...v, asset_url: vUrl };
                })
              );

              return {
                ...cr,
                asset_url: signedUrl,
                versions,
                review: (cr.generation_metadata as Record<string, unknown>)?.review || null,
              };
            })
          );
        }
      }

      let hydratedBrandKit: Record<string, unknown> | null = brandKit;
      if (brandKit && brandKit.raw_extracted_data) {
        const raw = brandKit.raw_extracted_data as Record<string, unknown>;
        hydratedBrandKit = {
          ...brandKit,
          brand_description: raw.brand_description || brandKit.website_description || null,
          core_value_proposition: raw.core_value_proposition || brandKit.value_proposition || null,
          positioning_and_differentiators: raw.positioning_and_differentiators || [],
          primary_customer_segments: raw.primary_customer_segments || [],
          customer_motivations: raw.customer_motivations || [],
          likely_purchasing_motivations: raw.likely_purchasing_motivations || [],
          tone_of_voice: raw.tone_of_voice || brandKit.brand_voice || null,
          common_messaging_themes: raw.common_messaging_themes || [],
          example_messaging: raw.example_messaging || [],
          photography_style: raw.photography_style || null,
          visual_aesthetic: raw.visual_aesthetic || null,
        };
      }

      return NextResponse.json({
        success: true,
        brand: {
          id: brand.id,
          name: brand.name,
          website_url: brand.website_url,
        },
        brandKit: hydratedBrandKit || null,
        products: products || [],
        campaign: resolvedCampaign,
        concepts,
        creatives: creativesWithSignedUrls,
      });
    }

    // ACTION 1: Research Storefront URL
    if (action === "research_store") {
      if (!storeUrl || typeof storeUrl !== "string") {
        return NextResponse.json({ error: "Store URL is required." }, { status: 400 });
      }

      const safety = isSafePublicUrl(storeUrl);
      if (!safety.safe || !safety.normalizedUrl) {
        return NextResponse.json({ error: safety.error || "Invalid or unsafe URL." }, { status: 400 });
      }

      const targetUrl = safety.normalizedUrl;

      // Create or locate brand
      let brandRecord: { id: string; name: string; website_url: string };
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id, name, website_url")
        .eq("user_id", user.id)
        .eq("website_url", targetUrl)
        .maybeSingle();

      if (existingBrand) {
        brandRecord = existingBrand;
      } else {
        const tempName = new URL(targetUrl).hostname.replace(/^www\./, "").split(".")[0];
        const formattedName = tempName.charAt(0).toUpperCase() + tempName.slice(1);
        const { data: newBrand, error: bErr } = await supabase
          .from("brands")
          .insert({
            user_id: user.id,
            name: formattedName,
            website_url: targetUrl,
            research_status: "researching",
          })
          .select("id, name, website_url")
          .single();

        if (bErr || !newBrand) {
          return NextResponse.json({ error: bErr?.message || "Failed to create brand." }, { status: 500 });
        }
        brandRecord = newBrand;
      }

      // Execute Firecrawl Brand Extractor and multi-page research
      console.log(`[AGENT API] Starting Firecrawl research on ${targetUrl}...`);
      const scraped = await scrapeStorefront(targetUrl);

      // Structure facts, inferences, and missing information with Gemini
      console.log(`[AGENT API] Structuring brand intelligence with Gemini...`);
      const structuredKit = await runBrandResearchAgent(scraped);

      // Persist Brand Kit
      await supabase.from("brand_kits").delete().eq("brand_id", brandRecord.id);
      const { data: insertedKit, error: kitErr } = await supabase
        .from("brand_kits")
        .insert({
          brand_id: brandRecord.id,
          user_id: user.id,
          brand_name: structuredKit.brand_name || brandRecord.name,
          brand_colors: structuredKit.brand_colors,
          logo_url: structuredKit.logo_url || scraped.logo_url,
          brand_voice: structuredKit.brand_voice,
          brand_voice_is_inferred: structuredKit.brand_voice_is_inferred,
          value_proposition: structuredKit.value_proposition,
          value_proposition_is_inferred: structuredKit.value_proposition_is_inferred,
          target_audience: structuredKit.target_audience,
          target_audience_is_inferred: structuredKit.target_audience_is_inferred,
          key_selling_points: structuredKit.key_selling_points,
          summary: structuredKit.summary,
          missing_information: structuredKit.missing_information,
          source_url: targetUrl,
          extraction_status: scraped.products.length > 0 ? "completed" : "partial",
          raw_extracted_data: {
            is_shopify: scraped.is_shopify,
            sources_checked: scraped.source_urls_checked,
            detected_colors: scraped.detected_colors,
            brand_description: structuredKit.brand_description,
            core_value_proposition: structuredKit.core_value_proposition,
            positioning_and_differentiators: structuredKit.positioning_and_differentiators,
            primary_customer_segments: structuredKit.primary_customer_segments,
            customer_motivations: structuredKit.customer_motivations,
            likely_purchasing_motivations: structuredKit.likely_purchasing_motivations,
            tone_of_voice: structuredKit.tone_of_voice,
            common_messaging_themes: structuredKit.common_messaging_themes,
            example_messaging: structuredKit.example_messaging,
            photography_style: structuredKit.photography_style,
            visual_aesthetic: structuredKit.visual_aesthetic,
          },
          approval_status: "pending",
        })
        .select("id")
        .single();

      if (kitErr) {
        console.error("[AGENT API] Brand kit insert error:", kitErr);
      }

      // Persist Products
      if (scraped.products.length > 0) {
        await supabase.from("products").delete().eq("brand_id", brandRecord.id);
        const productInserts = scraped.products.map((p) => ({
          brand_id: brandRecord.id,
          user_id: user.id,
          title: p.title,
          description: p.description,
          price: p.price,
          price_formatted: p.price_formatted,
          currency: p.currency,
          product_url: p.product_url,
          main_image_url: p.main_image_url,
          additional_image_urls: p.additional_image_urls,
          category: p.category,
          is_inferred: false,
          source_url: p.source_url,
          extraction_status: "extracted",
        }));
        await supabase.from("products").insert(productInserts);
      }

      // Update brand record
      await supabase
        .from("brands")
        .update({
          name: structuredKit.brand_name || brandRecord.name,
          research_status: scraped.products.length > 0 ? "completed" : "partial",
          updated_at: new Date().toISOString(),
        })
        .eq("id", brandRecord.id);

      // Fetch saved products with IDs
      const { data: savedProducts } = await supabase
        .from("products")
        .select("*")
        .eq("brand_id", brandRecord.id);

      return NextResponse.json({
        success: true,
        brand: {
          id: brandRecord.id,
          name: structuredKit.brand_name || brandRecord.name,
          website_url: targetUrl,
        },
        brandKit: {
          id: insertedKit?.id,
          ...structuredKit,
          sources_checked: scraped.source_urls_checked,
          is_shopify: scraped.is_shopify,
        },
        products: savedProducts || [],
      });
    }

    // ACTION 2: Human Checkpoint: Confirm Brand & Product -> Develop Creative Concepts
    if (action === "confirm_and_develop_concepts") {
      if (!brandId || !productId) {
        return NextResponse.json({ error: "brandId and productId are required." }, { status: 400 });
      }

      // Mark brand kit approved
      await supabase
        .from("brand_kits")
        .update({ approval_status: "approved", updated_at: new Date().toISOString() })
        .eq("brand_id", brandId);

      await supabase
        .from("brands")
        .update({ approval_status: "approved", updated_at: new Date().toISOString() })
        .eq("id", brandId);

      // Fetch brand kit & product
      const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).single();
      const { data: brandKit } = await supabase.from("brand_kits").select("*").eq("brand_id", brandId).single();
      const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

      if (!brand || !brandKit || !product) {
        return NextResponse.json({ error: "Brand, Brand Kit, or Product not found." }, { status: 404 });
      }

      // Create or locate active campaign
      let campaignRecord: { id: string; name: string; objective: "Increase conversions" | "Product promotion" | "Product launch" | "Brand awareness" };
      const { data: existingCamp } = await supabase
        .from("campaigns")
        .select("id, name, objective")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCamp) {
        campaignRecord = existingCamp as typeof campaignRecord;
      } else {
        const { data: newCamp, error: cErr } = await supabase
          .from("campaigns")
          .insert({
            user_id: user.id,
            brand_id: brandId,
            name: `${product.title} Launch Campaign`,
            objective: "Increase conversions",
            status: "active",
          })
          .select("id, name, objective")
          .single();

        if (cErr || !newCamp) {
          return NextResponse.json({ error: "Failed to initialize campaign." }, { status: 500 });
        }
        campaignRecord = newCamp as typeof campaignRecord;
      }

      // Generate 3 distinct creative concepts using Gemini
      console.log(`[AGENT API] Developing 3 distinct creative concepts for ${product.title}...`);
      const strategyOutput = await runCampaignStrategyAgent({
        brand: {
          id: brand.id,
          name: brand.name,
          website_url: brand.website_url,
          industry: brand.industry,
        },
        brandKit,
        products: [product],
        objective: campaignRecord.objective,
        additionalInstructions: additionalInstructions || null,
      });

      // Clear existing concepts and persist new ones
      await supabase.from("campaign_concepts").delete().eq("campaign_id", campaignRecord.id);

      const conceptInserts = strategyOutput.concepts.map((c: AdConcept, index: number) => ({
        campaign_id: campaignRecord.id,
        user_id: user.id,
        concept_name: c.concept_name,
        angle: c.angle,
        target_audience: c.target_audience,
        core_message: c.core_message,
        headline: c.headline,
        supporting_copy: c.supporting_copy,
        cta: c.cta,
        visual_direction: c.visual_direction,
        composition_and_background: c.composition_and_background || "9:16 portrait vertical advertising layout",
        strategic_reasoning: c.strategic_reasoning,
        is_approved: index === 0, // approve first concept by default
      }));

      const { data: savedConcepts, error: concErr } = await supabase
        .from("campaign_concepts")
        .insert(conceptInserts)
        .select("*");

      if (concErr) {
        console.error("[AGENT API] Concepts insert error:", concErr);
      }

      return NextResponse.json({
        success: true,
        campaign: campaignRecord,
        selectedProduct: product,
        concepts: savedConcepts || [],
      });
    }

    // ACTION 3: Generate Single 9:16 Advertisement via fal.ai
    if (action === "generate_ad") {
      if (!conceptId || !productId || !campaignId) {
        return NextResponse.json({ error: "conceptId, productId, and campaignId are required." }, { status: 400 });
      }

      const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }
      const { data: brand } = await supabase.from("brands").select("*").eq("id", campaign.brand_id).single();
      const { data: concept } = await supabase.from("campaign_concepts").select("*").eq("id", conceptId).single();
      const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
      const { data: brandKit } = await supabase.from("brand_kits").select("*").eq("brand_id", campaign.brand_id).maybeSingle();

      if (!concept || !product || !product.main_image_url) {
        return NextResponse.json({ error: "Missing concept or product with photo." }, { status: 400 });
      }

      // Initialize creative record
      const { data: creative, error: crErr } = await supabase
        .from("creatives")
        .insert({
          campaign_id: campaign.id,
          concept_id: concept.id,
          product_id: product.id,
          user_id: user.id,
          title: `${concept.concept_name} - ${product.title}`,
          aspect_ratio: "9:16",
          headline: concept.headline,
          supporting_copy: concept.supporting_copy || "",
          cta: concept.cta || "Shop Now",
          status: "processing",
          model_identifier: NANO_BANANA_EDIT_MODEL,
          generation_prompt: concept.headline,
          width: 1080,
          height: 1920,
        })
        .select("*")
        .single();

      if (crErr || !creative) {
        return NextResponse.json({ error: "Failed to initialize creative record." }, { status: 500 });
      }

      // Generate complete advertisement via fal.ai
      console.log(`[AGENT API] Calling fal.ai ${NANO_BANANA_EDIT_MODEL} with product photo ${product.main_image_url}...`);
      const adResult = await generateCompleteAdvertisementViaFal({
        brandName: brand?.name || "Brand",
        productTitle: product.title,
        referenceImageUrl: product.main_image_url,
        headline: concept.headline,
        supportingCopy: concept.supporting_copy,
        cta: concept.cta || "Shop Now",
        angle: concept.angle,
        visualDirection: concept.visual_direction,
        brandColors: (brandKit?.brand_colors as Array<{ hex: string; usage: string }>) || [],
      });

      if (!adResult.success || !adResult.imageBuffer) {
        await supabase
          .from("creatives")
          .update({ status: "failed", error_message: adResult.error || "Generation failed" })
          .eq("id", creative.id);
        return NextResponse.json({ error: adResult.error || "Generation failed on fal.ai." }, { status: 500 });
      }

      // Upload directly into Supabase Storage
      console.log(`[AGENT API] Uploading generated 9:16 ad to Supabase Storage...`);
      const upload = await uploadCreativeAsset({
        userId: user.id,
        campaignId: campaign.id,
        creativeId: creative.id,
        buffer: adResult.imageBuffer,
        mimeType: "image/png",
        filename: `v1_${Date.now()}.png`,
      });

      const signedUrl = upload.signedUrl;
      const storagePath = upload.storagePath || "";

      // Update creative record
      const metadata = {
        pipeline_version: "3.0-pure-fal-ad",
        model_identifier: NANO_BANANA_EDIT_MODEL,
        generation_prompt: adResult.generationPrompt,
        review: adResult.review,
      };

      await supabase
        .from("creatives")
        .update({
          status: "succeeded",
          storage_path: storagePath,
          asset_url: signedUrl,
          file_size: adResult.imageBuffer.length,
          generation_metadata: metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creative.id);

      // Create version 1 record
      const { data: v1 } = await supabase
        .from("creative_versions")
        .insert({
          creative_id: creative.id,
          user_id: user.id,
          version_number: 1,
          storage_path: storagePath,
          asset_url: signedUrl,
          generation_prompt: adResult.generationPrompt,
          status: "succeeded",
          approval_status: "pending",
          width: 1080,
          height: 1920,
          file_size: adResult.imageBuffer.length,
          metadata,
        })
        .select("*")
        .single();

      return NextResponse.json({
        success: true,
        creative: {
          ...creative,
          status: "succeeded",
          asset_url: signedUrl,
          storage_path: storagePath,
          review: adResult.review,
          versions: [v1],
        },
        version: v1,
        review: adResult.review,
      });
    }

    // ACTION: Generate All Ads ("Generate All Concepts")
    if (action === "generate_all_ads") {
      if (!campaignId) {
        return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
      }

      const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }

      const { data: brand } = await supabase.from("brands").select("*").eq("id", campaign.brand_id).single();
      const { data: brandKit } = await supabase.from("brand_kits").select("*").eq("brand_id", campaign.brand_id).maybeSingle();
      const { data: concepts } = await supabase.from("campaign_concepts").select("*").eq("campaign_id", campaignId);

      if (!concepts || concepts.length === 0) {
        return NextResponse.json({ error: "No concepts found for this campaign." }, { status: 400 });
      }

      // Determine product to use
      let productRecord = null;
      if (productId) {
        const { data: p } = await supabase.from("products").select("*").eq("id", productId).single();
        productRecord = p;
      }
      if (!productRecord) {
        const { data: pList } = await supabase.from("products").select("*").eq("brand_id", campaign.brand_id).limit(1);
        productRecord = pList?.[0] || null;
      }

      if (!productRecord || !productRecord.main_image_url) {
        return NextResponse.json({ error: "Missing product with image for ad generation." }, { status: 400 });
      }

      const verifiedReferenceImageUrl: string = productRecord.main_image_url;
      const verifiedProductTitle: string = productRecord.title;
      const verifiedProductId: string = productRecord.id;

      console.log(`[AGENT API] Batch generating 9:16 ads in parallel for ${concepts.length} concepts on ${verifiedProductTitle}...`);

      const tasks = concepts.map(async (concept) => {
        // Initialize creative record
        const { data: creative } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaign.id,
            concept_id: concept.id,
            product_id: verifiedProductId,
            user_id: user.id,
            title: `${concept.concept_name} - ${verifiedProductTitle}`,
            aspect_ratio: "9:16",
            headline: concept.headline,
            supporting_copy: concept.supporting_copy || "",
            cta: concept.cta || "Shop Now",
            status: "processing",
            model_identifier: NANO_BANANA_EDIT_MODEL,
            generation_prompt: concept.headline,
            width: 1080,
            height: 1920,
          })
          .select("*")
          .single();

        if (!creative) return null;

        try {
          // Generate complete advertisement via fal.ai
          const adResult = await generateCompleteAdvertisementViaFal({
            brandName: brand?.name || "Brand",
            productTitle: verifiedProductTitle,
            referenceImageUrl: verifiedReferenceImageUrl,
            headline: concept.headline,
            supportingCopy: concept.supporting_copy,
            cta: concept.cta || "Shop Now",
            angle: concept.angle,
            visualDirection: concept.visual_direction,
            brandColors: (brandKit?.brand_colors as Array<{ hex: string; usage: string }>) || [],
          });

          if (!adResult.success || !adResult.imageBuffer) {
            await supabase
              .from("creatives")
              .update({ status: "failed", error_message: adResult.error || "Generation failed" })
              .eq("id", creative.id);
            return null;
          }

          // Upload to Supabase Storage
          const upload = await uploadCreativeAsset({
            userId: user.id,
            campaignId: campaign.id,
            creativeId: creative.id,
            buffer: adResult.imageBuffer,
            mimeType: "image/png",
            filename: `v1_${Date.now()}_${concept.id.slice(0, 8)}.png`,
          });

          const signedUrl = upload.signedUrl;
          const storagePath = upload.storagePath || "";

          const metadata = {
            pipeline_version: "3.0-pure-fal-ad",
            model_identifier: NANO_BANANA_EDIT_MODEL,
            generation_prompt: adResult.generationPrompt,
            review: adResult.review,
          };

          await supabase
            .from("creatives")
            .update({
              status: "succeeded",
              storage_path: storagePath,
              asset_url: signedUrl,
              file_size: adResult.imageBuffer.length,
              generation_metadata: metadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", creative.id);

          const { data: v1 } = await supabase
            .from("creative_versions")
            .insert({
              creative_id: creative.id,
              user_id: user.id,
              version_number: 1,
              storage_path: storagePath,
              asset_url: signedUrl,
              generation_prompt: adResult.generationPrompt,
              status: "succeeded",
              approval_status: "pending",
              width: 1080,
              height: 1920,
              file_size: adResult.imageBuffer.length,
              metadata,
            })
            .select("*")
            .single();

          return {
            ...creative,
            status: "succeeded",
            asset_url: signedUrl,
            storage_path: storagePath,
            review: adResult.review,
            versions: [v1],
          };
        } catch (e: unknown) {
          const errText = e instanceof Error ? e.message : "Error generating ad";
          await supabase
            .from("creatives")
            .update({ status: "failed", error_message: errText })
            .eq("id", creative.id);
          return null;
        }
      });

      const settled = await Promise.allSettled(tasks);
      const generatedCreatives = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);

      return NextResponse.json({
        success: true,
        count: generatedCreatives.length,
        creatives: generatedCreatives,
      });
    }

    // ACTION 4: Natural-Language Feedback Iteration
    if (action === "iterate_creative") {
      if (!creativeId || !feedbackText || !feedbackText.trim()) {
        return NextResponse.json({ error: "creativeId and feedbackText are required." }, { status: 400 });
      }

      console.log(`[AGENT API] Applying natural language feedback on Creative ${creativeId}: "${feedbackText}"`);
      const regenResult = await regenerateCreativeVersion({
        creativeId,
        feedbackText: feedbackText.trim(),
        userId: user.id,
      });

      if (!regenResult.success) {
        return NextResponse.json({ error: regenResult.error || "Revision failed." }, { status: 500 });
      }

      // Fetch all versions for comparison
      const { data: allVersions } = await supabase
        .from("creative_versions")
        .select("*")
        .eq("creative_id", creativeId)
        .order("version_number", { ascending: true });

      // Refresh signed URLs
      const versionsWithSignedUrls = await Promise.all(
        (allVersions || []).map(async (v) => {
          let sUrl = v.asset_url;
          if (v.storage_path) {
            const fresh = await getSignedCreativeUrl(v.storage_path, 86400);
            if (fresh) sUrl = fresh;
          }
          return { ...v, asset_url: sUrl };
        })
      );

      // Fetch updated creative row
      const { data: updatedCr } = await supabase
        .from("creatives")
        .select("*")
        .eq("id", creativeId)
        .single();

      return NextResponse.json({
        success: true,
        version: regenResult.version,
        changeSummary: regenResult.changeSummary,
        changeType: regenResult.changeType,
        allVersions: versionsWithSignedUrls,
        review: regenResult.review,
        creative: {
          ...(updatedCr || {}),
          asset_url: regenResult.version?.asset_url || updatedCr?.asset_url,
          versions: versionsWithSignedUrls,
          review: regenResult.review,
        },
      });
    }

    // ACTION 5: Approve Creative Version
    if (action === "approve_creative") {
      if (!creativeId) {
        return NextResponse.json({ error: "creativeId is required." }, { status: 400 });
      }

      const versionNumber = body.versionNumber || 1;
      await supabase
        .from("creative_versions")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("creative_id", creativeId)
        .eq("version_number", versionNumber);

      await supabase
        .from("creatives")
        .update({
          status: "succeeded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", creativeId);

      return NextResponse.json({ success: true, approved: true });
    }

    // ACTION 6: Conversational Chat with Gemini
    if (action === "send_message" || !action) {
      const userMessage = message || "";
      const model = getGeminiModel();

      const response = await generateText({
        model,
        system: `You are the ploy AI Ads Manager Agent. You help ecommerce marketers turn store URLs into high-converting 9:16 portrait advertisements.
Your core workflow is:
1. Research brand & products from store URL using Firecrawl Brand Extractor and crawler.
2. Present interactive Brand Kit and discovered product catalogue for user inspection and selection.
3. Pause for user confirmation (mandatory human checkpoint).
4. Develop distinct advertising concepts using Gemini.
5. Generate finished 9:16 advertisements via fal.ai google/nano-banana-2.1/edit.
6. Review generated ads with Gemini Vision and allow iteration based on natural-language feedback.

Keep responses concise, helpful, and focused on marketing performance.`,
        prompt: userMessage,
      });

      return NextResponse.json({
        success: true,
        message: response.text,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    let errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("[AGENT CHAT API ERROR]:", err);
    if (errorMsg.includes("timeout") || errorMsg.includes("TimeoutError") || errorMsg.includes("aborted")) {
      errorMsg = `${errorMsg} (Note: Vercel Hobby serverless functions have a 60s hard ceiling. For heavy storefronts, please retry with a direct product or collection URL.)`;
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
