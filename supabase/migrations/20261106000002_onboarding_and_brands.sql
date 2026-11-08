-- Step 3: Onboarding Profile Extensions & Brands Table Migration

-- 1. Extend profiles table with onboarding fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS target_market TEXT;

-- 2. Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  industry TEXT,
  research_status TEXT NOT NULL DEFAULT 'pending_research',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for brands performance
CREATE INDEX IF NOT EXISTS brands_user_id_idx ON public.brands(user_id);
CREATE INDEX IF NOT EXISTS brands_created_at_idx ON public.brands(created_at DESC);

-- 4. Enable Row Level Security (RLS) on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies for brands
DROP POLICY IF EXISTS "Users can read own brands" ON public.brands;
CREATE POLICY "Users can read own brands"
  ON public.brands
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brands" ON public.brands;
CREATE POLICY "Users can insert own brands"
  ON public.brands
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brands" ON public.brands;
CREATE POLICY "Users can update own brands"
  ON public.brands
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own brands" ON public.brands;
CREATE POLICY "Users can delete own brands"
  ON public.brands
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Trigger for brands updated_at
DROP TRIGGER IF EXISTS set_brands_updated_at ON public.brands;
CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
