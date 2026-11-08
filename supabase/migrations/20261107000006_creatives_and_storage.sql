-- Migration: 20261107000006_creatives_and_storage.sql
-- Step 7: fal.ai Image Generation, Sharp Composition & Supabase Storage

-- 1. Create Creatives Table
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES public.campaign_concepts(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    aspect_ratio TEXT NOT NULL DEFAULT '9:16',
    headline TEXT NOT NULL,
    supporting_copy TEXT,
    cta TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    error_message TEXT,
    storage_path TEXT,
    asset_url TEXT,
    model_identifier TEXT NOT NULL DEFAULT 'fal-ai/flux-1/dev/redux',
    generation_prompt TEXT NOT NULL,
    generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    width INT NOT NULL DEFAULT 1080,
    height INT NOT NULL DEFAULT 1920,
    file_size INT,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    variation_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Creative Assets Table
CREATE TABLE IF NOT EXISTS public.creative_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL DEFAULT 'final_composite',
    storage_bucket TEXT NOT NULL DEFAULT 'ad-creatives',
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    width INT NOT NULL DEFAULT 1080,
    height INT NOT NULL DEFAULT 1920,
    file_size INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_creatives_campaign_id ON public.creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_user_id ON public.creatives(user_id);
CREATE INDEX IF NOT EXISTS idx_creatives_concept_id ON public.creatives(concept_id);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON public.creatives(status);
CREATE INDEX IF NOT EXISTS idx_creative_assets_creative_id ON public.creative_assets(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_assets_user_id ON public.creative_assets(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

-- Creatives Policies
DROP POLICY IF EXISTS "Users can read own creatives" ON public.creatives;
CREATE POLICY "Users can read own creatives"
    ON public.creatives FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own creatives" ON public.creatives;
CREATE POLICY "Users can insert own creatives"
    ON public.creatives FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own creatives" ON public.creatives;
CREATE POLICY "Users can update own creatives"
    ON public.creatives FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own creatives" ON public.creatives;
CREATE POLICY "Users can delete own creatives"
    ON public.creatives FOR DELETE
    USING (auth.uid() = user_id);

-- Creative Assets Policies
DROP POLICY IF EXISTS "Users can read own creative assets" ON public.creative_assets;
CREATE POLICY "Users can read own creative assets"
    ON public.creative_assets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own creative assets" ON public.creative_assets;
CREATE POLICY "Users can insert own creative assets"
    ON public.creative_assets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own creative assets" ON public.creative_assets;
CREATE POLICY "Users can update own creative assets"
    ON public.creative_assets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own creative assets" ON public.creative_assets;
CREATE POLICY "Users can delete own creative assets"
    ON public.creative_assets FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at on creatives
DROP TRIGGER IF EXISTS set_creatives_updated_at ON public.creatives;
CREATE TRIGGER set_creatives_updated_at
    BEFORE UPDATE ON public.creatives
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Initialize Private Storage Bucket 'ad-creatives'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ad-creatives',
    'ad-creatives',
    false,
    52428800,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage Object RLS Policies
DROP POLICY IF EXISTS "Users can read own creative storage objects" ON storage.objects;
CREATE POLICY "Users can read own creative storage objects"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'ad-creatives' AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR auth.uid() = owner
        )
    );

DROP POLICY IF EXISTS "Users can insert own creative storage objects" ON storage.objects;
CREATE POLICY "Users can insert own creative storage objects"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'ad-creatives' AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR auth.uid() = owner
        )
    );

DROP POLICY IF EXISTS "Users can update own creative storage objects" ON storage.objects;
CREATE POLICY "Users can update own creative storage objects"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'ad-creatives' AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR auth.uid() = owner
        )
    );

DROP POLICY IF EXISTS "Users can delete own creative storage objects" ON storage.objects;
CREATE POLICY "Users can delete own creative storage objects"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'ad-creatives' AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR auth.uid() = owner
        )
    );

