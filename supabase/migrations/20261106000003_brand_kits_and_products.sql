-- Step 4: Brand Kits & Products Schema Migration

-- 1. Create brand_kits table
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  website_description TEXT,
  brand_colors JSONB DEFAULT '[]'::jsonb,
  brand_voice TEXT,
  brand_voice_is_inferred BOOLEAN DEFAULT true,
  value_proposition TEXT,
  value_proposition_is_inferred BOOLEAN DEFAULT false,
  target_audience TEXT,
  target_audience_is_inferred BOOLEAN DEFAULT true,
  key_selling_points JSONB DEFAULT '[]'::jsonb,
  shipping_info TEXT,
  return_policy TEXT,
  summary TEXT,
  missing_information JSONB DEFAULT '[]'::jsonb,
  source_url TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'completed',
  raw_extracted_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  price_formatted TEXT,
  currency TEXT DEFAULT 'USD',
  product_url TEXT NOT NULL,
  main_image_url TEXT,
  additional_image_urls JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  is_inferred BOOLEAN DEFAULT false,
  source_url TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'extracted',
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_brand_product_url UNIQUE (brand_id, product_url)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS brand_kits_brand_id_idx ON public.brand_kits(brand_id);
CREATE INDEX IF NOT EXISTS brand_kits_user_id_idx ON public.brand_kits(user_id);
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS products_user_id_idx ON public.products(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies for brand_kits
DROP POLICY IF EXISTS "Users can read own brand kits" ON public.brand_kits;
CREATE POLICY "Users can read own brand kits"
  ON public.brand_kits
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brand kits" ON public.brand_kits;
CREATE POLICY "Users can insert own brand kits"
  ON public.brand_kits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brand kits" ON public.brand_kits;
CREATE POLICY "Users can update own brand kits"
  ON public.brand_kits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own brand kits" ON public.brand_kits;
CREATE POLICY "Users can delete own brand kits"
  ON public.brand_kits
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Row Level Security Policies for products
DROP POLICY IF EXISTS "Users can read own products" ON public.products;
CREATE POLICY "Users can read own products"
  ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Updated_at Triggers
DROP TRIGGER IF EXISTS set_brand_kits_updated_at ON public.brand_kits;
CREATE TRIGGER set_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
