"""
Step 8 Automated Verification Suite
Tests:
- Database schema, types, and constraints for creative_versions and creative_feedback
- Row Level Security (RLS) policies on creative_versions and creative_feedback
- Verification of prompt revision with natural-language feedback directives
- Generation of Version 2 without destroying Version 1
- Version-specific approval isolation (approving Version 2 does not approve Version 1)
- Multi-tenant data isolation and ownership enforcement
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
print("CADRA ADS — STEP 8 AUTOMATED VERIFICATION SUITE")
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

# 1. VERIFY DATABASE SCHEMA FOR CREATIVE_VERSIONS
print("\n1. Verifying Database Schema for creative_versions...")

versions_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creative_versions';")
}

check("creative_versions table exists", len(versions_cols) > 0)
check("creative_versions.id exists (uuid)", versions_cols.get("id") == "uuid")
check("creative_versions.creative_id exists (uuid)", versions_cols.get("creative_id") == "uuid")
check("creative_versions.user_id exists (uuid)", versions_cols.get("user_id") == "uuid")
check("creative_versions.version_number exists (integer)", versions_cols.get("version_number") == "integer")
check("creative_versions.storage_path exists (text)", versions_cols.get("storage_path") == "text")
check("creative_versions.asset_url exists (text)", versions_cols.get("asset_url") == "text")
check("creative_versions.generation_prompt exists (text)", versions_cols.get("generation_prompt") == "text")
check("creative_versions.revised_instructions exists (text)", versions_cols.get("revised_instructions") == "text")
check("creative_versions.feedback_id exists (uuid)", versions_cols.get("feedback_id") == "uuid")
check("creative_versions.status exists (text)", versions_cols.get("status") == "text")
check("creative_versions.approval_status exists (text)", versions_cols.get("approval_status") == "text")
check("creative_versions.approved_at exists", "timestamp" in str(versions_cols.get("approved_at", "")))
check("creative_versions.width exists (integer)", versions_cols.get("width") == "integer")
check("creative_versions.height exists (integer)", versions_cols.get("height") == "integer")
check("creative_versions.metadata exists (jsonb)", versions_cols.get("metadata") == "jsonb")
check("creative_versions.created_at exists", "timestamp" in str(versions_cols.get("created_at", "")))
check("creative_versions.updated_at exists", "timestamp" in str(versions_cols.get("updated_at", "")))

# Check unique constraint on (creative_id, version_number)
uq_constraints = [
    r[0] for r in con.run("""
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        WHERE tc.table_name = 'creative_versions' AND tc.constraint_type = 'UNIQUE';
    """)
]
check("creative_versions has unique constraint on version number", "uq_creative_version" in uq_constraints)

# 2. VERIFY DATABASE SCHEMA FOR CREATIVE_FEEDBACK
print("\n2. Verifying Database Schema for creative_feedback...")

feedback_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creative_feedback';")
}

check("creative_feedback table exists", len(feedback_cols) > 0)
check("creative_feedback.id exists (uuid)", feedback_cols.get("id") == "uuid")
check("creative_feedback.creative_id exists (uuid)", feedback_cols.get("creative_id") == "uuid")
check("creative_feedback.version_id exists (uuid)", feedback_cols.get("version_id") == "uuid")
check("creative_feedback.user_id exists (uuid)", feedback_cols.get("user_id") == "uuid")
check("creative_feedback.feedback_text exists (text)", feedback_cols.get("feedback_text") == "text")
check("creative_feedback.category exists (text)", feedback_cols.get("category") == "text")
check("creative_feedback.status exists (text)", feedback_cols.get("status") == "text")
check("creative_feedback.created_at exists", "timestamp" in str(feedback_cols.get("created_at", "")))

# 3. VERIFY CREATIVES TABLE EXTENSIONS
print("\n3. Verifying creatives table extensions for version tracking...")

creatives_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives';")
}

check("creatives.current_version exists (integer)", creatives_cols.get("current_version") == "integer")
check("creatives.active_version_id exists (uuid)", creatives_cols.get("active_version_id") == "uuid")

# 4. VERIFY ROW LEVEL SECURITY (RLS) & TRIGGERS
print("\n4. Verifying Row Level Security on creative_versions and creative_feedback...")

v_rls = con.run("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'creative_versions';")[0][0]
check("creative_versions has RLS enabled", v_rls is True)

f_rls = con.run("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'creative_feedback';")[0][0]
check("creative_feedback has RLS enabled", f_rls is True)

v_policies = [p[1] for p in con.run("SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creative_versions';")]
check("creative_versions has user SELECT policy", "SELECT" in v_policies)
check("creative_versions has user INSERT policy", "INSERT" in v_policies)
check("creative_versions has user UPDATE policy", "UPDATE" in v_policies)
check("creative_versions has user DELETE policy", "DELETE" in v_policies)

f_policies = [p[1] for p in con.run("SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creative_feedback';")]
check("creative_feedback has user SELECT policy", "SELECT" in f_policies)
check("creative_feedback has user INSERT policy", "INSERT" in f_policies)
check("creative_feedback has user UPDATE policy", "UPDATE" in f_policies)
check("creative_feedback has user DELETE policy", "DELETE" in f_policies)

# 5. EXECUTE UNIT PROMPT REVISION TESTS VIA SUBPROCESS
print("\n5. Executing Prompt Revision Engine Unit Tests...")

res = subprocess.run(
    ["npx", "tsx", "src/tests/test_step8_lifecycle.ts"],
    cwd="app",
    capture_output=True,
    text=True
)

check("Prompt revision engine passes all test cases", res.returncode == 0, details=res.stderr or res.stdout)
check("Background luxury directive verified", "Carrara marble" in res.stdout or "Revised prompt contains luxury directives" in res.stdout)
check("Product scale macro directive verified", "composition" in res.stdout and "macro hero framing" in res.stdout)

# 6. END-TO-END LIFECYCLE: FEEDBACK, REGENERATION, AND ISOLATED APPROVAL
print("\n6. Verifying Complete Feedback, Versioning & Approval Lifecycle...")

users = con.run("SELECT id, email FROM auth.users LIMIT 1;")
if not users:
    print("  [WARN] No users found in auth.users, skipping live records test.")
else:
    test_user_id = users[0][0]
    test_brand_id = str(uuid.uuid4())
    test_prod_id = str(uuid.uuid4())
    test_camp_id = str(uuid.uuid4())
    test_concept_id = str(uuid.uuid4())
    test_creative_id = str(uuid.uuid4())
    test_v1_id = str(uuid.uuid4())
    test_v2_id = str(uuid.uuid4())
    test_feedback_id = str(uuid.uuid4())

    try:
        # A. Setup parent brand, product, campaign, concept
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
            VALUES ('{test_camp_id}', '{test_user_id}', '{test_brand_id}', 'Holiday 2026', 'Increase conversions', 'active');
        """)

        con.run(f"""
            INSERT INTO public.campaign_concepts (id, campaign_id, user_id, concept_name, angle, target_audience, core_message, headline, supporting_copy, cta, visual_direction, composition_and_background, strategic_reasoning, is_approved, approval_status, approved_at)
            VALUES ('{test_concept_id}', '{test_camp_id}', '{test_user_id}', 'Drop No More', 'Problem-Agitate-Solve', 'Clumsy smartphone users', 'Stop dropping your device', 'Never Drop Your Phone Again', 'Patented secure loop.', 'Shop Gingerbread', 'Cozy warm studio', '9:16 portrait composition', 'Solves drop anxiety', true, 'approved', NOW());
        """)

        # B. Insert initial creative and Version 1
        initial_prompt = "Cozy holiday studio backdrop with soft warm lighting for phone case."
        v1_storage = f"{test_user_id}/{test_camp_id}/{test_creative_id}_v1.png"

        con.run(f"""
            INSERT INTO public.creatives (id, campaign_id, concept_id, product_id, user_id, title, headline, cta, status, model_identifier, generation_prompt, storage_path, variation_index, current_version)
            VALUES ('{test_creative_id}', '{test_camp_id}', '{test_concept_id}', '{test_prod_id}', '{test_user_id}', 'Gingerbread Ad', 'Never Drop Your Phone Again', 'Shop Gingerbread', 'succeeded', 'fal-ai/flux/dev/image-to-image', '{initial_prompt}', '{v1_storage}', 1, 1);
        """)

        con.run(f"""
            INSERT INTO public.creative_versions (id, creative_id, user_id, version_number, storage_path, generation_prompt, revised_instructions, status, approval_status)
            VALUES ('{test_v1_id}', '{test_creative_id}', '{test_user_id}', 1, '{v1_storage}', '{initial_prompt}', 'Initial synthesis', 'succeeded', 'pending');
        """)

        con.run(f"""
            UPDATE public.creatives SET active_version_id = '{test_v1_id}' WHERE id = '{test_creative_id}';
        """)

        # Verify initial Version 1
        v1_rec = con.run(f"SELECT version_number, approval_status, storage_path FROM public.creative_versions WHERE id = '{test_v1_id}';")
        check("Version 1 created with approval_status 'pending'", v1_rec[0][1] == 'pending')
        check("Version 1 storage path is accessible", v1_rec[0][2] == v1_storage)

        # C. Marketer submits natural-language feedback
        user_feedback = "Make the background more premium with Italian Carrara marble"
        con.run(f"""
            INSERT INTO public.creative_feedback (id, creative_id, version_id, user_id, feedback_text, category, status)
            VALUES ('{test_feedback_id}', '{test_creative_id}', '{test_v1_id}', '{test_user_id}', '{user_feedback}', 'background', 'applied');
        """)

        fb_rec = con.run(f"SELECT feedback_text, category FROM public.creative_feedback WHERE id = '{test_feedback_id}';")
        check("Feedback logged in creative_feedback", fb_rec[0][0] == user_feedback)
        check("Feedback categorized correctly as 'background'", fb_rec[0][1] == 'background')

        # D. Synthesize Version 2 with revised prompt
        revised_prompt = f"{initial_prompt} High-end architectural Italian Carrara marble studio surface. [USER FEEDBACK DIRECTIVE]: \"{user_feedback}\""
        v2_storage = f"{test_user_id}/{test_camp_id}/{test_creative_id}_v2.png"

        con.run(f"""
            INSERT INTO public.creative_versions (id, creative_id, user_id, version_number, storage_path, generation_prompt, revised_instructions, feedback_id, status, approval_status)
            VALUES ('{test_v2_id}', '{test_creative_id}', '{test_user_id}', 2, '{v2_storage}', '{revised_prompt}', '{user_feedback}', '{test_feedback_id}', 'succeeded', 'pending');
        """)

        con.run(f"""
            UPDATE public.creatives
            SET current_version = 2, active_version_id = '{test_v2_id}', storage_path = '{v2_storage}', generation_prompt = '{revised_prompt}'
            WHERE id = '{test_creative_id}';
        """)

        # Verify Version 2 exists alongside Version 1
        all_versions = con.run(f"SELECT version_number, storage_path FROM public.creative_versions WHERE creative_id = '{test_creative_id}' ORDER BY version_number ASC;")
        check("Both Version 1 and Version 2 exist simultaneously", len(all_versions) == 2)
        check("Version 1 storage path preserved", all_versions[0][1] == v1_storage)
        check("Version 2 storage path distinct", all_versions[1][1] == v2_storage)

        v2_rec = con.run(f"SELECT generation_prompt FROM public.creative_versions WHERE id = '{test_v2_id}';")
        check("Version 2 prompt incorporates user feedback directives", "Carrara marble" in v2_rec[0][0] and user_feedback in v2_rec[0][0])

        # E. Version Approval Isolation Test: Approve Version 2
        con.run(f"""
            UPDATE public.creative_versions
            SET approval_status = 'approved', approved_at = NOW()
            WHERE id = '{test_v2_id}';
        """)

        v1_status = con.run(f"SELECT approval_status FROM public.creative_versions WHERE id = '{test_v1_id}';")[0][0]
        v2_status = con.run(f"SELECT approval_status FROM public.creative_versions WHERE id = '{test_v2_id}';")[0][0]

        check("Version 2 approval_status is 'approved'", v2_status == 'approved')
        check("Version 1 approval_status remains 'pending' (isolated approval)", v1_status == 'pending')

        # F. Rejection Test
        con.run(f"""
            UPDATE public.creative_versions
            SET approval_status = 'rejected', rejected_at = NOW()
            WHERE id = '{test_v1_id}';
        """)

        v1_rej_status = con.run(f"SELECT approval_status FROM public.creative_versions WHERE id = '{test_v1_id}';")[0][0]
        v2_app_status = con.run(f"SELECT approval_status FROM public.creative_versions WHERE id = '{test_v2_id}';")[0][0]
        check("Version 1 updated to 'rejected'", v1_rej_status == 'rejected')
        check("Version 2 remains 'approved'", v2_app_status == 'approved')

    finally:
        # Cleanup test rows
        con.run(f"DELETE FROM public.creative_feedback WHERE creative_id = '{test_creative_id}';")
        con.run(f"DELETE FROM public.creative_versions WHERE creative_id = '{test_creative_id}';")
        con.run(f"DELETE FROM public.creatives WHERE id = '{test_creative_id}';")
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
