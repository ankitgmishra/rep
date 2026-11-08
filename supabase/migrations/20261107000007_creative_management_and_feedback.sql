-- Migration: 20261107000007_creative_management_and_feedback.sql
-- Step 8: Creative Management, Feedback & Versioning

-- 1. Create Creative Versions Table
CREATE TABLE IF NOT EXISTS public.creative_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    asset_url TEXT,
    generation_prompt TEXT NOT NULL,
    revised_instructions TEXT,
    feedback_id UUID,
    status TEXT NOT NULL DEFAULT 'succeeded', -- 'processing', 'succeeded', 'failed'
    approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    width INT NOT NULL DEFAULT 1080,
    height INT NOT NULL DEFAULT 1920,
    file_size INT,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_creative_version UNIQUE (creative_id, version_number)
);

-- 2. Create Creative Feedback Table
CREATE TABLE IF NOT EXISTS public.creative_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.creative_versions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'applied', -- 'pending', 'applied', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key from creative_versions to creative_feedback if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_creative_version_feedback'
    ) THEN
        ALTER TABLE public.creative_versions
        ADD CONSTRAINT fk_creative_version_feedback
        FOREIGN KEY (feedback_id) REFERENCES public.creative_feedback(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Extend Creatives Table with Version Tracking
ALTER TABLE public.creatives
ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS active_version_id UUID REFERENCES public.creative_versions(id) ON DELETE SET NULL;

-- 4. Indexes for Fast Version & Feedback Lookup
CREATE INDEX IF NOT EXISTS idx_creative_versions_creative_id ON public.creative_versions(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_versions_user_id ON public.creative_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_versions_approval ON public.creative_versions(approval_status);
CREATE INDEX IF NOT EXISTS idx_creative_feedback_creative_id ON public.creative_feedback(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_feedback_version_id ON public.creative_feedback(version_id);
CREATE INDEX IF NOT EXISTS idx_creative_feedback_user_id ON public.creative_feedback(user_id);

-- 5. Row Level Security on creative_versions
ALTER TABLE public.creative_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own creative versions" ON public.creative_versions;
CREATE POLICY "Users can view own creative versions"
    ON public.creative_versions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own creative versions" ON public.creative_versions;
CREATE POLICY "Users can insert own creative versions"
    ON public.creative_versions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own creative versions" ON public.creative_versions;
CREATE POLICY "Users can update own creative versions"
    ON public.creative_versions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own creative versions" ON public.creative_versions;
CREATE POLICY "Users can delete own creative versions"
    ON public.creative_versions FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Row Level Security on creative_feedback
ALTER TABLE public.creative_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own creative feedback" ON public.creative_feedback;
CREATE POLICY "Users can view own creative feedback"
    ON public.creative_feedback FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own creative feedback" ON public.creative_feedback;
CREATE POLICY "Users can insert own creative feedback"
    ON public.creative_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own creative feedback" ON public.creative_feedback;
CREATE POLICY "Users can update own creative feedback"
    ON public.creative_feedback FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own creative feedback" ON public.creative_feedback;
CREATE POLICY "Users can delete own creative feedback"
    ON public.creative_feedback FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.handle_creative_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_creative_versions_updated_at ON public.creative_versions;
CREATE TRIGGER set_creative_versions_updated_at
    BEFORE UPDATE ON public.creative_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_creative_versions_updated_at();

-- 8. Backfill Initial Version 1 for existing completed creatives
INSERT INTO public.creative_versions (
    creative_id,
    user_id,
    version_number,
    storage_path,
    asset_url,
    generation_prompt,
    status,
    approval_status,
    width,
    height,
    file_size,
    mime_type,
    metadata,
    created_at,
    updated_at
)
SELECT 
    c.id,
    c.user_id,
    1,
    COALESCE(c.storage_path, 'pending/' || c.id::text),
    c.asset_url,
    c.generation_prompt,
    c.status,
    'pending',
    c.width,
    c.height,
    c.file_size,
    c.mime_type,
    c.generation_metadata,
    c.created_at,
    c.updated_at
FROM public.creatives c
WHERE NOT EXISTS (
    SELECT 1 FROM public.creative_versions cv WHERE cv.creative_id = c.id AND cv.version_number = 1
)
ON CONFLICT (creative_id, version_number) DO NOTHING;

-- Link active_version_id for backfilled creatives
UPDATE public.creatives c
SET active_version_id = cv.id
FROM public.creative_versions cv
WHERE cv.creative_id = c.id AND cv.version_number = 1 AND c.active_version_id IS NULL;

