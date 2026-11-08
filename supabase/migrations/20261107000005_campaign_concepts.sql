-- Migration: 20261107000005_campaign_concepts.sql
-- Step 6: AI Campaign Strategy & Ad Concepts

CREATE TABLE IF NOT EXISTS public.campaign_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    angle TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    core_message TEXT NOT NULL,
    headline TEXT NOT NULL,
    supporting_copy TEXT NOT NULL,
    cta TEXT NOT NULL,
    visual_direction TEXT NOT NULL,
    composition_and_background TEXT NOT NULL,
    strategic_reasoning TEXT NOT NULL,
    original_output JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_edits JSONB DEFAULT '{}'::jsonb,
    approval_status TEXT NOT NULL DEFAULT 'draft',
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_concepts_campaign_id ON public.campaign_concepts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_concepts_user_id ON public.campaign_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_concepts_is_approved ON public.campaign_concepts(campaign_id, is_approved);

-- Add approved_concept_id to campaigns if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'approved_concept_id'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD COLUMN approved_concept_id UUID REFERENCES public.campaign_concepts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.campaign_concepts ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_concepts
DROP POLICY IF EXISTS "Users can read own campaign concepts" ON public.campaign_concepts;
CREATE POLICY "Users can read own campaign concepts"
    ON public.campaign_concepts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaign concepts" ON public.campaign_concepts;
CREATE POLICY "Users can insert own campaign concepts"
    ON public.campaign_concepts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaign concepts" ON public.campaign_concepts;
CREATE POLICY "Users can update own campaign concepts"
    ON public.campaign_concepts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaign concepts" ON public.campaign_concepts;
CREATE POLICY "Users can delete own campaign concepts"
    ON public.campaign_concepts FOR DELETE
    USING (auth.uid() = user_id);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS set_campaign_concepts_updated_at ON public.campaign_concepts;
CREATE TRIGGER set_campaign_concepts_updated_at
    BEFORE UPDATE ON public.campaign_concepts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

