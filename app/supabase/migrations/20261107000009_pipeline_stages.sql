-- Migration: 20261107000009_pipeline_stages.sql
-- Step 11: Sequential AI-Directed Advertising Pipeline Schema Enhancements

-- Add pipeline stage tracking and asset paths to creative_generation_jobs
ALTER TABLE public.creative_generation_jobs 
    ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'product_understanding',
    ADD COLUMN IF NOT EXISTS raw_visual_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS product_profile JSONB,
    ADD COLUMN IF NOT EXISTS visual_plan JSONB,
    ADD COLUMN IF NOT EXISTS design_spec JSONB,
    ADD COLUMN IF NOT EXISTS qa_verdict JSONB;

-- Add raw visual path to creatives for zero-latency copy/layout revisions
ALTER TABLE public.creatives
    ADD COLUMN IF NOT EXISTS raw_visual_storage_path TEXT;

-- Index on pipeline stage
CREATE INDEX IF NOT EXISTS idx_cg_jobs_pipeline_stage ON public.creative_generation_jobs(pipeline_stage);
