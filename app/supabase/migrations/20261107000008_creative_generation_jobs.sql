-- Migration: 20261107000008_creative_generation_jobs.sql
-- Step 10: Asynchronous Creative Generation Jobs & Queue Management

CREATE TABLE IF NOT EXISTS public.creative_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES public.campaign_concepts(id) ON DELETE SET NULL,
    creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    creative_spec JSONB NOT NULL,
    generation_prompt TEXT NOT NULL,
    fal_model_identifier TEXT NOT NULL,
    fal_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'generating', 'composing', 'succeeded', 'failed'
    progress_step TEXT DEFAULT 'Job queued',
    stored_asset_path TEXT,
    attempts INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 3,
    error_details JSONB,
    idempotency_key TEXT UNIQUE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Fast Querying and Recovery
CREATE INDEX IF NOT EXISTS idx_cg_jobs_creative_id ON public.creative_generation_jobs(creative_id);
CREATE INDEX IF NOT EXISTS idx_cg_jobs_campaign_id ON public.creative_generation_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cg_jobs_user_id ON public.creative_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cg_jobs_status ON public.creative_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cg_jobs_fal_request_id ON public.creative_generation_jobs(fal_request_id);
CREATE INDEX IF NOT EXISTS idx_cg_jobs_idempotency_key ON public.creative_generation_jobs(idempotency_key);

-- Enable Row Level Security (RLS)
ALTER TABLE public.creative_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Granular RLS Policies for Generation Jobs
DROP POLICY IF EXISTS "Users can read own generation jobs" ON public.creative_generation_jobs;
CREATE POLICY "Users can read own generation jobs"
    ON public.creative_generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generation jobs" ON public.creative_generation_jobs;
CREATE POLICY "Users can insert own generation jobs"
    ON public.creative_generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own generation jobs" ON public.creative_generation_jobs;
CREATE POLICY "Users can update own generation jobs"
    ON public.creative_generation_jobs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own generation jobs" ON public.creative_generation_jobs;
CREATE POLICY "Users can delete own generation jobs"
    ON public.creative_generation_jobs FOR DELETE
    USING (auth.uid() = user_id);
