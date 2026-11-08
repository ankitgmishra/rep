import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFalQueueStatus,
  submitToFalQueue,
} from "./providers/fal";
import {
  enqueueSequentialCreativeJobs,
  processJobSequentialCompletion,
  executeSequentialPipeline,
  type EnqueueSequentialJobsInput,
  type EnqueueSequentialJobsResult,
} from "./pipeline/orchestrator";
import type { Database } from "@/lib/supabase/types";

type JobRow = Database["public"]["Tables"]["creative_generation_jobs"]["Row"];

export type EnqueueJobsInput = EnqueueSequentialJobsInput;
export type EnqueueJobsResult = EnqueueSequentialJobsResult;

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * Enqueues creative generation jobs asynchronously using the sequential pipeline & fal.ai Queue API.
 */
export async function enqueueCreativeGenerationJobs(
  input: EnqueueJobsInput,
  customClient?: SupabaseClient
): Promise<EnqueueJobsResult> {
  return enqueueSequentialCreativeJobs(input, customClient);
}

/**
 * Completes a creative generation job once fal.ai queue finishes:
 * Runs Stage 4 (Art Direction) -> Stage 5 (Sharp Rendering) -> Stage 6 (Quality Assurance) -> Supabase Storage.
 */
export async function processJobCompletion(
  jobIdOrRequestId: string,
  payloadImageUrlOrClient?: string | SupabaseClient,
  customClient?: SupabaseClient
): Promise<{ success: boolean; creativeId?: string; error?: string }> {
  let payloadUrl: string | undefined = undefined;
  let client = customClient;
  if (typeof payloadImageUrlOrClient === "string") {
    payloadUrl = payloadImageUrlOrClient;
  } else if (payloadImageUrlOrClient && typeof payloadImageUrlOrClient === "object") {
    client = payloadImageUrlOrClient as SupabaseClient;
  }
  return processJobSequentialCompletion(jobIdOrRequestId, payloadUrl, client);
}

/**
 * Backward compatibility alias for fallback completion tests
 */
export const processJobFallbackCompletion = processJobCompletion;

/**
 * Checks in-flight job status against fal.ai and auto-completes finished jobs
 */
export async function checkJobStatusAndRecover(
  jobId: string,
  customClient?: SupabaseClient
): Promise<{ status: string; job?: JobRow; error?: string }> {
  const supabase = customClient || (await createClient());

  const { data: job, error: jobErr } = await supabase
    .from("creative_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return { status: "failed", error: "Job not found" };
  }

  if (job.status === "succeeded" || job.status === "failed") {
    return { status: job.status, job };
  }

  if (job.status === "generating" && job.fal_request_id) {
    const queueStatus = await getFalQueueStatus(job.fal_model_identifier, job.fal_request_id);

    if (queueStatus.status === "COMPLETED") {
      console.log(`[JOB RECOVERY] Job ${job.id} marked COMPLETED on fal.ai. Completing sequential pipeline...`);
      await processJobSequentialCompletion(job.id, undefined, supabase);

      const { data: refreshed } = await supabase
        .from("creative_generation_jobs")
        .select("*")
        .eq("id", job.id)
        .single();

      return { status: refreshed?.status || "succeeded", job: refreshed || job };
    }

    if (queueStatus.status === "ERROR") {
      await supabase
        .from("creative_generation_jobs")
        .update({
          status: "failed",
          error_details: { error: queueStatus.error || "Generation error on fal.ai queue" },
          progress_step: `fal.ai queue error: ${queueStatus.error || "Unknown error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await supabase
        .from("creatives")
        .update({ status: "failed", error_message: queueStatus.error })
        .eq("id", job.creative_id);

      return { status: "failed", error: queueStatus.error };
    }

    const step = queueStatus.status === "IN_PROGRESS"
      ? "Synthesizing visual on fal.ai..."
      : "Waiting in fal.ai queue...";

    await supabase
      .from("creative_generation_jobs")
      .update({ progress_step: step, updated_at: new Date().toISOString() })
      .eq("id", job.id);
  }

  return { status: job.status, job };
}

/**
 * Retries an individual failed creative generation job using the sequential pipeline
 */
export async function retryGenerationJob(
  jobId: string,
  userId: string,
  customClient?: SupabaseClient
): Promise<{ success: boolean; job?: JobRow; error?: string }> {
  const supabase = customClient || (await createClient());

  const { data: job, error: jobErr } = await supabase
    .from("creative_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (jobErr || !job) {
    return { success: false, error: "Job not found or access denied." };
  }

  const nextAttempts = job.attempts + 1;
  const webhookUrl = `${getAppBaseUrl()}/api/webhooks/fal`;

  await supabase
    .from("creative_generation_jobs")
    .update({
      status: "queued",
      attempts: nextAttempts,
      error_details: null,
      progress_step: `Retrying (Attempt ${nextAttempts})...`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  await supabase
    .from("creatives")
    .update({ status: "queued", error_message: null })
    .eq("id", job.creative_id);

  // Retrieve product
  const { data: product } = await supabase
    .from("products")
    .select("main_image_url")
    .eq("id", job.product_id)
    .single();

  try {
    const { requestId } = await submitToFalQueue(job.fal_model_identifier, {
      prompt: job.generation_prompt,
      referenceImageUrl: product?.main_image_url || "",
      webhookUrl,
    });

    const { data: updated } = await supabase
      .from("creative_generation_jobs")
      .update({
        fal_request_id: requestId,
        status: "generating",
        progress_step: `Queued on fal.ai (Request: ${requestId})`,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    await supabase
      .from("creatives")
      .update({ status: "processing" })
      .eq("id", job.creative_id);

    return { success: true, job: updated || job };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[RETRY QUEUE ERROR] fal queue retry submission failed:`, errorMsg);

    const { data: finalJob } = await supabase
      .from("creative_generation_jobs")
      .update({
        status: "failed",
        error_details: { error: errorMsg },
        progress_step: `Retry failed: ${errorMsg}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    await supabase
      .from("creatives")
      .update({ status: "failed", error_message: errorMsg, updated_at: new Date().toISOString() })
      .eq("id", job.creative_id);

    return {
      success: false,
      job: finalJob || job,
      error: errorMsg,
    };
  }
}
