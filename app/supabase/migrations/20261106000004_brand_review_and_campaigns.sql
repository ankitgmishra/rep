-- Step 5: Brand Review, Approval & Campaign Creation Migration

-- 1. Extend brands table with approval columns
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Extend brand_kits table with user_edits and approval tracking
ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS user_edits JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3. Extend products table with selection and user_edits tracking
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_selected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_edits JSONB DEFAULT '{}'::jsonb;

-- 4. Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN ('Increase conversions', 'Product promotion', 'Product launch', 'Brand awareness')),
  additional_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
  selected_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create campaign_products join table
CREATE TABLE IF NOT EXISTS public.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_campaign_product UNIQUE (campaign_id, product_id)
);

-- 6. Indexes for campaigns & campaign_products
CREATE INDEX IF NOT EXISTS campaigns_brand_id_idx ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_products_campaign_id_idx ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_products_product_id_idx ON public.campaign_products(product_id);
CREATE INDEX IF NOT EXISTS campaign_products_user_id_idx ON public.campaign_products(user_id);

-- 7. Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for campaigns
DROP POLICY IF EXISTS "Users can read own campaigns" ON public.campaigns;
CREATE POLICY "Users can read own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
CREATE POLICY "Users can insert own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- 9. RLS Policies for campaign_products
DROP POLICY IF EXISTS "Users can read own campaign_products" ON public.campaign_products;
CREATE POLICY "Users can read own campaign_products"
  ON public.campaign_products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaign_products" ON public.campaign_products;
CREATE POLICY "Users can insert own campaign_products"
  ON public.campaign_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaign_products" ON public.campaign_products;
CREATE POLICY "Users can update own campaign_products"
  ON public.campaign_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaign_products" ON public.campaign_products;
CREATE POLICY "Users can delete own campaign_products"
  ON public.campaign_products FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Triggers for updated_at
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

