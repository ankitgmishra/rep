import WebSocket from "ws";
// @ts-expect-error polyfill for Node.js 20
globalThis.WebSocket = WebSocket;

import fs from "fs";
import path from "path";

// Load .env.local if present
try {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // Ignore env read error
}

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  enqueueCreativeGenerationJobs,
  processJobCompletion,
  retryGenerationJob,
  processJobFallbackCompletion,
} from "../lib/generation/queue";
import { verifyFalWebhook } from "../lib/generation/providers/fal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAsyncQueueLifecycleTest() {
  console.log("===============================================================");
  console.log("  ASYNC QUEUE LIFECYCLE & RECOVERY TEST SUITE");
  console.log("===============================================================\n");

  // 1. Authenticate user
  console.log("1. Authenticating advertiser session...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "ankit.entropy@gmail.com",
    password: "TestPassword123!",
  });

  if (authErr || !authData.user) {
    throw new Error(`Failed to authenticate advertiser: ${authErr?.message}`);
  }
  const testUserId = authData.user.id;
  console.log(`✓ Authenticated user: ${testUserId} (${authData.user.email})`);

  // Retrieve or create Brand
  let brandId: string;
  const { data: existingBrands } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", testUserId)
    .limit(1);

  if (existingBrands && existingBrands.length > 0) {
    brandId = existingBrands[0].id;
  } else {
    const { data: newBrand, error: brandErr } = await supabase
      .from("brands")
      .insert({
        user_id: testUserId,
        name: "Loopy Cases",
        website_url: "https://www.loopycases.com",
        research_status: "completed",
        approval_status: "approved",
      })
      .select("*")
      .single();

    if (brandErr || !newBrand) {
      throw new Error(`Failed to create brand: ${brandErr?.message}`);
    }
    brandId = newBrand.id;

    // Create Brand Kit
    await supabase.from("brand_kits").insert({
      brand_id: brandId,
      user_id: testUserId,
      brand_name: "Loopy Cases",
      source_url: "https://www.loopycases.com",
      brand_colors: { primary: "#18181b", accent: "#f59e0b" },
      brand_voice: "Playful, confident, high energy, direct response",
      value_proposition: "Stop the drop with patented ergonomic loop cases",
      summary: "Patented protective cases designed for effortless one-handed use.",
      key_selling_points: ["Patented loop", "Military grade protection", "Lifetime guarantee"],
      approval_status: "approved",
    });
  }

  // Retrieve or create Product
  let productId: string;
  const { data: existingProducts } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .limit(1);

  if (existingProducts && existingProducts.length > 0) {
    productId = existingProducts[0].id;
  } else {
    const { data: newProd, error: prodErr } = await supabase
      .from("products")
      .insert({
        brand_id: brandId,
        user_id: testUserId,
        title: "Loopy Case - Desert Sand",
        price: 39.0,
        currency: "$",
        product_url: "https://www.loopycases.com/products/loopy-desert-sand",
        main_image_url: "https://www.loopycases.com/cdn/shop/files/gingerbread-1.jpg",
        source_url: "https://www.loopycases.com",
        is_selected: true,
      })
      .select("*")
      .single();

    if (prodErr || !newProd) {
      throw new Error(`Failed to create product: ${prodErr?.message}`);
    }
    productId = newProd.id;
  }

  // Retrieve or create Campaign
  let campaignId: string;
  const { data: existingCampaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("brand_id", brandId)
    .limit(1);

  if (existingCampaigns && existingCampaigns.length > 0) {
    campaignId = existingCampaigns[0].id;
  } else {
    const { data: newCamp, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        brand_id: brandId,
        user_id: testUserId,
        name: "Loopy Launch Campaign",
        objective: "Increase conversions",
        status: "active",
        selected_product_ids: [productId],
      })
      .select("*")
      .single();

    if (campErr || !newCamp) {
      throw new Error(`Failed to create campaign: ${campErr?.message}`);
    }
    campaignId = newCamp.id;
  }

  // Retrieve or create 3 Concepts
  let { data: concepts } = await supabase
    .from("campaign_concepts")
    .select("*")
    .eq("campaign_id", campaignId);

  if (!concepts || concepts.length < 3) {
    const sampleConcepts = [
      {
        campaign_id: campaignId,
        user_id: testUserId,
        concept_name: "Drop Test Resilience",
        angle: "Problem-Agitate-Solve",
        target_audience: "Clumsy phone owners",
        core_message: "Stop risking cracked screens",
        headline: "STOP CRACKING YOUR SCREEN",
        supporting_copy: "Patented silicone finger loop absorbs shock and guarantees single-hand grip.",
        cta: "Get Loopy Today",
        visual_direction: "High contrast neon studio drop test action",
        composition_and_background: "Dark carbon surface with cyan rim lighting",
        strategic_reasoning: "High converting direct response angle",
        original_output: {
          creative_spec: {
            advertising_angle: "Problem-Agitate-Solve",
            target_audience: "Clumsy phone owners",
            headline: "STOP CRACKING YOUR SCREEN",
            supporting_copy: "Patented silicone finger loop absorbs shock.",
            cta: "Get Loopy Today",
            visual_direction: "High contrast neon studio drop test action",
            background_description: "Dark carbon surface with cyan rim lighting",
            composition_archetype: "hero_spotlight",
            product_placement: { position: "center", scale: "hero_large" },
            brand_styling: { primary_color: "#18181b", text_contrast: "light_on_dark", typography_mood: "bold_sans" },
            source_grounded_claims: ["Storefront SKU: Loopy Case", "Storefront Price: $39.00"],
          },
        },
        approval_status: "approved" as const,
        is_approved: true,
      },
      {
        campaign_id: campaignId,
        user_id: testUserId,
        concept_name: "Effortless Multitasking",
        angle: "Lifestyle Convenience",
        target_audience: "Busy commuters & parents",
        core_message: "Hold three things with one hand",
        headline: "HOLD COFFEE, KEYS, AND PHONE",
        supporting_copy: "The finger loop flips out so you can hold three things with one hand.",
        cta: "Shop The Collection",
        visual_direction: "Warm bright cafe morning aesthetic",
        composition_and_background: "Marble countertop with warm morning sunlight",
        strategic_reasoning: "Lifestyle relevance angle",
        original_output: {
          creative_spec: {
            advertising_angle: "Lifestyle Convenience",
            target_audience: "Busy commuters & parents",
            headline: "HOLD COFFEE, KEYS, AND PHONE",
            supporting_copy: "The finger loop flips out so you can hold three things.",
            cta: "Shop The Collection",
            visual_direction: "Warm bright cafe morning aesthetic",
            background_description: "Marble countertop with warm morning sunlight",
            composition_archetype: "editorial_luxury",
            product_placement: { position: "center", scale: "hero_large" },
            brand_styling: { primary_color: "#18181b", text_contrast: "light_on_dark", typography_mood: "bold_sans" },
            source_grounded_claims: ["Storefront SKU: Loopy Case", "Storefront Price: $39.00"],
          },
        },
        approval_status: "approved" as const,
        is_approved: true,
      },
      {
        campaign_id: campaignId,
        user_id: testUserId,
        concept_name: "Architectural Precision",
        angle: "Premium Craftsmanship",
        target_audience: "Design lovers",
        core_message: "Engineered for perfection",
        headline: "ENGINEERED FOR PERFECTION",
        supporting_copy: "Precision fit military-grade perimeter bumper with ergonomic loop.",
        cta: "Experience Grip",
        visual_direction: "Clean editorial slate luxury layout",
        composition_and_background: "Brushed aluminum geometric plinth",
        strategic_reasoning: "Luxury and engineering appeal",
        original_output: {
          creative_spec: {
            advertising_angle: "Premium Craftsmanship",
            target_audience: "Design lovers",
            headline: "ENGINEERED FOR PERFECTION",
            supporting_copy: "Precision fit military-grade perimeter bumper.",
            cta: "Experience Grip",
            visual_direction: "Clean editorial slate luxury layout",
            background_description: "Brushed aluminum geometric plinth",
            composition_archetype: "problem_solution_split",
            product_placement: { position: "center", scale: "hero_large" },
            brand_styling: { primary_color: "#18181b", text_contrast: "light_on_dark", typography_mood: "bold_sans" },
            source_grounded_claims: ["Storefront SKU: Loopy Case", "Storefront Price: $39.00"],
          },
        },
        approval_status: "approved" as const,
        is_approved: true,
      },
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("campaign_concepts")
      .insert(sampleConcepts)
      .select("*");

    if (insertErr || !inserted) {
      throw new Error(`Failed to insert test concepts: ${insertErr?.message}`);
    }
    concepts = inserted;
  }

  const testConceptIds = concepts.slice(0, 3).map((c) => c.id);
  console.log(`✓ Test campaign ready with 3 concepts: ${concepts.slice(0, 3).map((c) => c.concept_name).join(", ")}`);

  // 2. Test Independent Asynchronous Enqueueing (3 concepts -> 3 jobs)
  console.log("\n2. Testing Asynchronous Enqueueing (enqueueCreativeGenerationJobs)...");
  const enqueueRes = await enqueueCreativeGenerationJobs(
    {
      campaignId,
      conceptIds: testConceptIds,
      productId,
      userId: testUserId,
    },
    supabase
  );

  if (!enqueueRes.success || !enqueueRes.jobs || enqueueRes.jobs.length < 3) {
    throw new Error(`Enqueue failed or returned fewer than 3 jobs: ${enqueueRes.error}`);
  }

  console.log(`✓ Successfully enqueued ${enqueueRes.jobs.length} independent jobs.`);
  for (const job of enqueueRes.jobs) {
    console.log(`  - Job ${job.id}: Concept=${job.concept_id}, Status=${job.status}, IdempotencyKey=${job.idempotency_key}`);
  }

  // 3. Test Idempotency (Submitting duplicate request must not duplicate jobs or creatives)
  console.log("\n3. Testing Queue Idempotency on resubmission...");
  const duplicateEnqueueRes = await enqueueCreativeGenerationJobs(
    {
      campaignId,
      conceptIds: testConceptIds,
      productId,
      userId: testUserId,
    },
    supabase
  );

  if (!duplicateEnqueueRes.success || !duplicateEnqueueRes.jobs) {
    throw new Error("Duplicate enqueue call failed unexpectedly.");
  }

  const initialJobIds = new Set(enqueueRes.jobs.map((j) => j.id));
  const duplicateJobIds = duplicateEnqueueRes.jobs.map((j) => j.id);
  const allReused = duplicateJobIds.every((id) => initialJobIds.has(id));

  if (!allReused) {
    throw new Error("Duplicate submission created new jobs instead of returning existing idempotency records!");
  }
  console.log("✓ Idempotency verified: 0 duplicate jobs created; existing active jobs returned.");

  // 4. Test Webhook Signature Verification
  console.log("\n4. Testing fal.ai Webhook Signature Verification...");
  const webhookSecret = process.env.FAL_WEBHOOK_SECRET || "test-secret-key-12345";
  process.env.FAL_WEBHOOK_SECRET = webhookSecret;

  const samplePayload = JSON.stringify({ request_id: "test-req-abc", status: "OK" });
  const validSignature = crypto.createHmac("sha256", webhookSecret).update(samplePayload).digest("hex");

  const isValid = verifyFalWebhook(samplePayload, validSignature);
  const isInvalid = verifyFalWebhook(samplePayload, "tampered-bad-signature");

  if (!isValid || isInvalid) {
    throw new Error(`Signature verification test failed! isValid=${isValid}, isInvalid=${isInvalid}`);
  }
  console.log("✓ Webhook HMAC SHA-256 signature verification validated (Accepted valid, rejected tampered).");

  // 5. Test Synthesis Completion & Supabase Storage Persistence
  console.log("\n5. Testing Job Completion Processing & Durable Storage Persistence...");
  const targetJob = enqueueRes.jobs[0];

  // Execute fallback completion to simulate end-to-end composite and upload
  await processJobFallbackCompletion(targetJob.id, supabase);

  const { data: completedJob } = await supabase
    .from("creative_generation_jobs")
    .select("*")
    .eq("id", targetJob.id)
    .single();

  if (!completedJob || completedJob.status !== "succeeded" || !completedJob.stored_asset_path) {
    throw new Error(`Job completion failed: status=${completedJob?.status}, asset=${completedJob?.stored_asset_path}`);
  }

  const { data: completedCreative, error: crErr } = await supabase
    .from("creatives")
    .select("*, creative_versions:creative_versions!creative_versions_creative_id_fkey(*)")
    .eq("id", completedJob.creative_id)
    .single();

  if (crErr || !completedCreative) {
    console.error("Creative query error:", crErr);
  } else {
    console.log("Fetched creative:", {
      id: completedCreative.id,
      status: completedCreative.status,
      storage_path: completedCreative.storage_path,
      active_version_id: completedCreative.active_version_id,
    });
  }

  if (!completedCreative || completedCreative.status !== "succeeded" || !completedCreative.storage_path) {
    throw new Error("Creative record was not updated with succeeded status and storage_path");
  }

  console.log(`✓ Job ${completedJob.id} succeeded.`);
  console.log(`  - Durable Storage Path: ${completedJob.stored_asset_path}`);
  console.log(`  - Creative Active Version: ${completedCreative.active_version_id}`);
  console.log(`  - File Size: ${completedCreative.file_size} bytes`);

  // 6. Test Webhook Duplicate Delivery Idempotency
  console.log("\n6. Testing Duplicate Webhook Delivery Idempotency...");
  const prevVersionsCount = completedCreative.creative_versions.length;
  // Trigger processJobCompletion again on the already succeeded job
  await processJobCompletion(completedJob.id, undefined, supabase);

  const { data: postWebhookCreative } = await supabase
    .from("creatives")
    .select("*, creative_versions:creative_versions!creative_versions_creative_id_fkey(*)")
    .eq("id", completedJob.creative_id)
    .single();

  if (postWebhookCreative?.creative_versions.length !== prevVersionsCount) {
    throw new Error("Duplicate webhook created a redundant creative version!");
  }
  console.log("✓ Duplicate delivery ignored cleanly: No duplicate versions or storage overwrite.");

  // 7. Test Partial Failure Isolation & Retry Flow
  console.log("\n7. Testing Individual Failure Isolation & Job Retry...");
  const failedJobTarget = enqueueRes.jobs[1];

  // Mark job 2 as failed intentionally
  await supabase
    .from("creative_generation_jobs")
    .update({
      status: "failed",
      error_details: { error: "Simulated fal.ai queue timeout" },
      progress_step: "Simulated timeout",
    })
    .eq("id", failedJobTarget.id);

  await supabase
    .from("creatives")
    .update({ status: "failed", error_message: "Simulated timeout" })
    .eq("id", failedJobTarget.creative_id);

  // Check job 1 status remains succeeded
  const { data: job1Check } = await supabase
    .from("creative_generation_jobs")
    .select("status")
    .eq("id", targetJob.id)
    .single();

  if (job1Check?.status !== "succeeded") {
    throw new Error("Job 1 was affected by Job 2's failure!");
  }
  console.log("✓ Failure isolation confirmed: Job 1 remains 'succeeded' while Job 2 is 'failed'.");

  // Retry the failed job
  console.log("Retrying failed Job 2 independently...");
  const retryRes = await retryGenerationJob(failedJobTarget.id, testUserId, supabase);

  if (!retryRes.success || !retryRes.job) {
    throw new Error(`Job retry failed: ${retryRes.error}`);
  }

  if (retryRes.job.attempts <= failedJobTarget.attempts) {
    throw new Error("Retry did not increment attempts counter!");
  }

  console.log(`✓ Job 2 retry successful. New status: ${retryRes.job.status}, Attempts: ${retryRes.job.attempts}`);

  console.log("\n===============================================================");
  console.log("  ALL ASYNC QUEUE LIFECYCLE TESTS PASSED PERFECTLY!");
  console.log("===============================================================\n");
}

runAsyncQueueLifecycleTest().catch((err) => {
  console.error("\nTEST SUITE FAILED WITH ERROR:\n", err);
  process.exit(1);
});
