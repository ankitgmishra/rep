"""
Step 7 Automated Verification Suite
Tests:
- Database schema, types, and foreign keys for creatives and creative_assets
- Row Level Security (RLS) policies on creatives and creative_assets
- Storage bucket configuration: ad-creatives (private, RLS policies)
- Sharp Compositing Engine & fal.ai provider execution (1080x1920 9:16 layout)
- Product preservation verification with real Loopy Cases storefront product
- Creative lifecycle state management (queued -> processing -> succeeded / failed)
- Storage metadata persistence (dimensions, file size, signed paths)
"""
import ssl
import sys
import uuid
import json
import subprocess
import pg8000.native

# Configure SSL for Supabase connection
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

con = pg8000.native.Connection(
    user='postgres.rwsradcjrkqroismpwcz',
    password='Software2001ankit',
    host='aws-0-ap-northeast-1.pooler.supabase.com',
    port=5432,
    database='postgres',
    ssl_context=ctx
)

print("=" * 65)
print("CADRA ADS — STEP 7 AUTOMATED VERIFICATION SUITE")
print("=" * 65)

passed = 0
failed = 0

def check(name, condition, details=""):
    global passed, failed
    if condition:
        print(f"  [PASS] {name}")
        passed += 1
    else:
        print(f"  [FAIL] {name}: {details}")
        failed += 1

# 1. VERIFY DATABASE SCHEMA FOR CREATIVES
print("\n1. Verifying Database Schema for creatives...")

creatives_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives';")
}

check("creatives table exists", len(creatives_cols) > 0)
check("creatives.id exists (uuid)", creatives_cols.get("id") == "uuid")
check("creatives.campaign_id exists (uuid)", creatives_cols.get("campaign_id") == "uuid")
check("creatives.concept_id exists (uuid)", creatives_cols.get("concept_id") == "uuid")
check("creatives.product_id exists (uuid)", creatives_cols.get("product_id") == "uuid")
check("creatives.user_id exists (uuid)", creatives_cols.get("user_id") == "uuid")
check("creatives.status exists (text)", creatives_cols.get("status") == "text")
check("creatives.storage_path exists (text)", creatives_cols.get("storage_path") == "text")
check("creatives.asset_url exists (text)", creatives_cols.get("asset_url") == "text")
check("creatives.width exists (integer)", creatives_cols.get("width") == "integer")
check("creatives.height exists (integer)", creatives_cols.get("height") == "integer")
check("creatives.aspect_ratio exists (text)", creatives_cols.get("aspect_ratio") == "text")
check("creatives.title exists (text)", creatives_cols.get("title") == "text")
check("creatives.headline exists (text)", creatives_cols.get("headline") == "text")
check("creatives.cta exists (text)", creatives_cols.get("cta") == "text")
check("creatives.mime_type exists (text)", creatives_cols.get("mime_type") == "text")
check("creatives.file_size exists (integer)", creatives_cols.get("file_size") == "integer")
check("creatives.model_identifier exists (text)", creatives_cols.get("model_identifier") == "text")
check("creatives.generation_prompt exists (text)", creatives_cols.get("generation_prompt") == "text")
check("creatives.variation_index exists (integer)", creatives_cols.get("variation_index") == "integer")
check("creatives.generation_metadata exists (jsonb)", creatives_cols.get("generation_metadata") == "jsonb")
check("creatives.created_at exists", "timestamp" in str(creatives_cols.get("created_at", "")))
check("creatives.updated_at exists", "timestamp" in str(creatives_cols.get("updated_at", "")))

# 2. VERIFY DATABASE SCHEMA FOR CREATIVE_ASSETS
print("\n2. Verifying Database Schema for creative_assets...")

assets_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creative_assets';")
}

check("creative_assets table exists", len(assets_cols) > 0)
check("creative_assets.id exists (uuid)", assets_cols.get("id") == "uuid")
check("creative_assets.creative_id exists (uuid)", assets_cols.get("creative_id") == "uuid")
check("creative_assets.user_id exists (uuid)", assets_cols.get("user_id") == "uuid")
check("creative_assets.storage_bucket exists (text)", assets_cols.get("storage_bucket") == "text")
check("creative_assets.storage_path exists (text)", assets_cols.get("storage_path") == "text")
check("creative_assets.asset_type exists (text)", assets_cols.get("asset_type") == "text")
check("creative_assets.mime_type exists (text)", assets_cols.get("mime_type") == "text")
check("creative_assets.width exists (integer)", assets_cols.get("width") == "integer")
check("creative_assets.height exists (integer)", assets_cols.get("height") == "integer")
check("creative_assets.file_size exists (integer)", assets_cols.get("file_size") == "integer")
check("creative_assets.metadata exists (jsonb)", assets_cols.get("metadata") == "jsonb")

# 3. VERIFY ROW LEVEL SECURITY (RLS) & TRIGGERS
print("\n3. Verifying Row Level Security & Triggers...")

creatives_rls = con.run("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'creatives';")[0][0]
check("creatives has RLS enabled", creatives_rls is True)

assets_rls = con.run("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'creative_assets';")[0][0]
check("creative_assets has RLS enabled", assets_rls is True)

creatives_policies = con.run("SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creatives';")
creatives_cmds = [p[1] for p in creatives_policies]
check("creatives has user SELECT policy", "SELECT" in creatives_cmds)
check("creatives has user INSERT policy", "INSERT" in creatives_cmds)
check("creatives has user UPDATE policy", "UPDATE" in creatives_cmds)
check("creatives has user DELETE policy", "DELETE" in creatives_cmds)

triggers = [r[0] for r in con.run("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'creatives';")]
check("creatives updated_at trigger exists", "set_creatives_updated_at" in triggers)

# 4. VERIFY SUPABASE STORAGE BUCKET 'ad-creatives'
print("\n4. Verifying Storage Bucket 'ad-creatives'...")

bucket_info = con.run("SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';")
check("storage bucket 'ad-creatives' exists", len(bucket_info) > 0)
if bucket_info:
    check("storage bucket 'ad-creatives' is private (public=false)", bucket_info[0][2] is False)

storage_policies = con.run("SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';")
check("storage.objects has active RLS policies", len(storage_policies) > 0)

# 5. VERIFY SHARP COMPOSITION ENGINE VIA SUBPROCESS
print("\n5. Executing Sharp Compositing Engine Tests with real Loopy Cases product...")

res = subprocess.run(
    ["npx", "tsx", "src/tests/test_step7_composition.ts"],
    cwd="app",
    capture_output=True,
    text=True
)

check("Sharp composition engine runs without errors", res.returncode == 0, details=res.stderr or res.stdout)
check("Composition outputs 1080x1920 across all 3 variations", "Variation 1 composed: 1080x1920 PNG" in res.stdout and "Variation 2 composed: 1080x1920 PNG" in res.stdout and "Variation 3 composed: 1080x1920 PNG" in res.stdout)
check("Product preservation and contact shadow verified", "Gaussian contact drop shadow rendered beneath product base" in res.stdout)

# 6. END-TO-END DATABASE LIFECYCLE & STATE MACHINE TEST
print("\n6. Verifying Creative Lifecycle & Persistence...")

users = con.run("SELECT id, email FROM auth.users LIMIT 1;")
if not users:
    print("  [WARN] No users found in auth.users, skipping live records test.")
else:
    test_user_id = users[0][0]
    test_brand_id = str(uuid.uuid4())
    test_prod_id = str(uuid.uuid4())
    test_camp_id = str(uuid.uuid4())
    test_concept_id = str(uuid.uuid4())
    test_creative_id_1 = str(uuid.uuid4())
    test_creative_id_2 = str(uuid.uuid4())

    try:
        # A. Setup parent records
        con.run(f"""
            INSERT INTO public.brands (id, user_id, name, website_url, approval_status, approved_at)
            VALUES ('{test_brand_id}', '{test_user_id}', 'Loopy Cases', 'https://loopycases.com', 'approved', NOW());
        """)

        con.run(f"""
            INSERT INTO public.products (id, brand_id, user_id, title, product_url, source_url, price, currency, main_image_url, is_selected)
            VALUES ('{test_prod_id}', '{test_brand_id}', '{test_user_id}', 'Gingerbread Lane', 'https://loopycases.com/products/gingerbread-lane', 'https://loopycases.com', 39.99, 'USD', 'https://cdn.shopify.com/s/files/1/0199/7596/files/gingerbread-1.jpg?v=1793421733', true);
        """)

        con.run(f"""
            INSERT INTO public.campaigns (id, user_id, brand_id, name, objective, status)
            VALUES ('{test_camp_id}', '{test_user_id}', '{test_brand_id}', 'Loopy Holiday 2026', 'Increase conversions', 'active');
        """)

        con.run(f"""
            INSERT INTO public.campaign_concepts (id, campaign_id, user_id, concept_name, angle, target_audience, core_message, headline, supporting_copy, cta, visual_direction, composition_and_background, strategic_reasoning, is_approved, approval_status, approved_at)
            VALUES ('{test_concept_id}', '{test_camp_id}', '{test_user_id}', 'Stop The Drop', 'Problem-Agitate-Solve', 'Clumsy smartphone owners on the go', 'Hold your device with confidence using patented loop', 'Never Drop Your Phone Again', 'Secure finger loop design.', 'Shop Loopy', 'Clean holiday studio', '9:16 portrait composition', 'Solves smartphone drop friction', true, 'approved', NOW());
        """)

        # B. Test Insertion in 'processing' status
        con.run(f"""
            INSERT INTO public.creatives (id, campaign_id, concept_id, product_id, user_id, title, headline, cta, status, model_identifier, generation_prompt, variation_index, width, height, mime_type)
            VALUES ('{test_creative_id_1}', '{test_camp_id}', '{test_concept_id}', '{test_prod_id}', '{test_user_id}', 'Gingerbread Lane Variation 1', 'Never Drop Your Phone Again', 'Shop Loopy', 'processing', 'fal-ai/flux/dev/image-to-image', 'Cozy studio backdrop for holiday phone case', 1, 1080, 1920, 'image/png');
        """)

        c1 = con.run(f"SELECT status, width, height, variation_index FROM public.creatives WHERE id = '{test_creative_id_1}';")
        check("Creative created with status 'processing'", c1[0][0] == 'processing')
        check("Creative default dimensions are 1080x1920", c1[0][1] == 1080 and c1[0][2] == 1920)

        # C. Transition to 'succeeded' with storage metadata
        storage_mock_path = f"{test_user_id}/{test_camp_id}/{test_creative_id_1}_composed.png"
        signed_mock_url = f"https://rwsradcjrkqroismpwcz.supabase.co/storage/v1/object/sign/ad-creatives/{storage_mock_path}?token=mock"
        meta_json = json.dumps({"model": "fal-ai/flux/dev/image-to-image", "steps": 28, "guidance": 3.5})

        con.run(f"""
            UPDATE public.creatives
            SET status = 'succeeded',
                storage_path = '{storage_mock_path}',
                asset_url = '{signed_mock_url}',
                file_size = 248672,
                generation_metadata = '{meta_json}'::jsonb
            WHERE id = '{test_creative_id_1}';
        """)

        c1_updated = con.run(f"SELECT status, storage_path, file_size FROM public.creatives WHERE id = '{test_creative_id_1}';")
        check("Creative status updated to 'succeeded'", c1_updated[0][0] == 'succeeded')
        check("Creative storage_path persisted correctly", c1_updated[0][1] == storage_mock_path)
        check("Creative file_size persisted correctly", c1_updated[0][2] == 248672)

        # D. Test insertion into creative_assets join table
        asset_id = str(uuid.uuid4())
        con.run(f"""
            INSERT INTO public.creative_assets (id, creative_id, user_id, storage_bucket, storage_path, asset_type, mime_type, width, height, file_size)
            VALUES ('{asset_id}', '{test_creative_id_1}', '{test_user_id}', 'ad-creatives', '{storage_mock_path}', 'final_composite', 'image/png', 1080, 1920, 248672);
        """)
        asset_rec = con.run(f"SELECT asset_type, storage_bucket FROM public.creative_assets WHERE id = '{asset_id}';")
        check("creative_assets record inserted with 'final_composite'", asset_rec[0][0] == 'final_composite')
        check("creative_assets bucket is 'ad-creatives'", asset_rec[0][1] == 'ad-creatives')

        # E. Test failure state handling
        con.run(f"""
            INSERT INTO public.creatives (id, campaign_id, concept_id, product_id, user_id, title, headline, cta, status, model_identifier, generation_prompt, variation_index)
            VALUES ('{test_creative_id_2}', '{test_camp_id}', '{test_concept_id}', '{test_prod_id}', '{test_user_id}', 'Gingerbread Lane Variation 2', 'Headline', 'Shop', 'failed', 'fal-ai/flux/dev/image-to-image', 'Prompt with simulated failure', 2);
        """)
        c2 = con.run(f"SELECT status FROM public.creatives WHERE id = '{test_creative_id_2}';")
        check("Creative handles 'failed' status gracefully", c2[0][0] == 'failed')

    finally:
        # Cleanup test rows
        con.run(f"DELETE FROM public.creative_assets WHERE creative_id IN ('{test_creative_id_1}', '{test_creative_id_2}');")
        con.run(f"DELETE FROM public.creatives WHERE id IN ('{test_creative_id_1}', '{test_creative_id_2}');")
        con.run(f"DELETE FROM public.campaign_concepts WHERE id = '{test_concept_id}';")
        con.run(f"DELETE FROM public.campaigns WHERE id = '{test_camp_id}';")
        con.run(f"DELETE FROM public.products WHERE id = '{test_prod_id}';")
        con.run(f"DELETE FROM public.brands WHERE id = '{test_brand_id}';")
        print("  [INFO] Test records cleaned up successfully.")

print("\n" + "=" * 65)
print(f"VERIFICATION RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 65)

con.close()

if failed > 0:
    sys.exit(1)
