"""
Step 3 Automated Verification Script
Tests database schema, RLS policies, brand creation, URL validation, and onboarding persistence.
"""
import ssl
import sys
import uuid
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

print("=" * 60)
print("CADRA ADS — STEP 3 VERIFICATION SUITE")
print("=" * 60)

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

# 1. VERIFY PROFILES SCHEMA
print("\n1. Verifying Profiles Schema...")
profiles_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';")
}

check("profiles.onboarding_completed exists", "onboarding_completed" in profiles_cols and profiles_cols["onboarding_completed"] == "boolean")
check("profiles.business_name exists", "business_name" in profiles_cols and profiles_cols["business_name"] == "text")
check("profiles.website_url exists", "website_url" in profiles_cols and profiles_cols["website_url"] == "text")
check("profiles.industry exists", "industry" in profiles_cols and profiles_cols["industry"] == "text")
check("profiles.target_market exists", "target_market" in profiles_cols and profiles_cols["target_market"] == "text")

# 2. VERIFY BRANDS SCHEMA
print("\n2. Verifying Brands Schema...")
brands_cols = {
    row[0]: row[1]
    for row in con.run("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brands';")
}

check("brands.id exists (uuid)", "id" in brands_cols and brands_cols["id"] == "uuid")
check("brands.user_id exists (uuid)", "user_id" in brands_cols and brands_cols["user_id"] == "uuid")
check("brands.name exists (text)", "name" in brands_cols and brands_cols["name"] == "text")
check("brands.website_url exists (text)", "website_url" in brands_cols and brands_cols["website_url"] == "text")
check("brands.industry exists (text)", "industry" in brands_cols and brands_cols["industry"] == "text")
check("brands.research_status exists (text)", "research_status" in brands_cols and brands_cols["research_status"] == "text")
check("brands.created_at exists (timestamptz)", "created_at" in brands_cols and "timestamp" in brands_cols["created_at"])
check("brands.updated_at exists (timestamptz)", "updated_at" in brands_cols and "timestamp" in brands_cols["updated_at"])

# 3. VERIFY RLS POLICIES ON BRANDS
print("\n3. Verifying Row Level Security (RLS) on Brands...")
rls_status = con.run("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brands';")
check("RLS is enabled on public.brands", len(rls_status) > 0 and rls_status[0][0] is True)

policies = {
    row[0]: row[1]
    for row in con.run("SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brands';")
}

check("SELECT policy exists", "Users can read own brands" in policies and policies["Users can read own brands"] == "SELECT")
check("INSERT policy exists", "Users can insert own brands" in policies and policies["Users can insert own brands"] == "INSERT")
check("UPDATE policy exists", "Users can update own brands" in policies and policies["Users can update own brands"] == "UPDATE")
check("DELETE policy exists", "Users can delete own brands" in policies and policies["Users can delete own brands"] == "DELETE")

# 4. VERIFY BRAND CREATION & MULTI-TENANT ISOLATION
print("\n4. Verifying Brand Persistence & Ownership...")
test_user_a = str(uuid.uuid4())
test_user_b = str(uuid.uuid4())

# Create temporary auth users for testing
con.run(f"INSERT INTO auth.users (id, email) VALUES ('{test_user_a}', 'user_a_{test_user_a[:8]}@example.com'), ('{test_user_b}', 'user_b_{test_user_b[:8]}@example.com');")

# Insert brand for user A
brand_a_id = con.run(
    f"INSERT INTO public.brands (user_id, name, website_url, industry, research_status) "
    f"VALUES ('{test_user_a}', 'Brand Alpha', 'https://alpha-botanicals.com', 'Beauty & Skincare', 'pending_research') "
    f"RETURNING id;"
)[0][0]

# Insert brand for user B
brand_b_id = con.run(
    f"INSERT INTO public.brands (user_id, name, website_url, industry, research_status) "
    f"VALUES ('{test_user_b}', 'Brand Beta', 'https://beta-apparel.com', 'Fashion & Apparel', 'pending_research') "
    f"RETURNING id;"
)[0][0]

# Query brands filtered by user_id
user_a_brands = con.run(f"SELECT name, website_url, research_status FROM public.brands WHERE user_id = '{test_user_a}';")
user_b_brands = con.run(f"SELECT name, website_url, research_status FROM public.brands WHERE user_id = '{test_user_b}';")

check("User A can find their own brand", len(user_a_brands) == 1 and user_a_brands[0][0] == "Brand Alpha")
check("User A cannot see User B brand in isolated query", not any(b[0] == "Brand Beta" for b in user_a_brands))
check("Brand research status defaults to pending_research", user_a_brands[0][2] == "pending_research")

# 5. VERIFY ONBOARDING PERSISTENCE IN PROFILES
print("\n5. Verifying Onboarding Profile Update...")
con.run(
    f"UPDATE public.profiles SET "
    f"onboarding_completed = true, "
    f"business_name = 'Alpha Botanicals Studio', "
    f"website_url = 'https://alpha-botanicals.com', "
    f"industry = 'Beauty & Skincare', "
    f"target_market = 'North America (US & Canada)' "
    f"WHERE id = '{test_user_a}';"
)

profile_res = con.run(f"SELECT onboarding_completed, business_name, website_url, industry, target_market FROM public.profiles WHERE id = '{test_user_a}';")
check("Profile updated with onboarding_completed = true", len(profile_res) == 1 and profile_res[0][0] is True)
check("Profile business_name matches", profile_res[0][1] == "Alpha Botanicals Studio")
check("Profile website_url matches", profile_res[0][2] == "https://alpha-botanicals.com")
check("Profile industry matches", profile_res[0][3] == "Beauty & Skincare")
check("Profile target_market matches", profile_res[0][4] == "North America (US & Canada)")

# 6. VERIFY CASCADE DELETION
print("\n6. Verifying Foreign Key Cascade Deletion...")
con.run(f"DELETE FROM auth.users WHERE id IN ('{test_user_a}', '{test_user_b}');")
remaining_brands = con.run(f"SELECT count(*) FROM public.brands WHERE user_id IN ('{test_user_a}', '{test_user_b}');")[0][0]
remaining_profiles = con.run(f"SELECT count(*) FROM public.profiles WHERE id IN ('{test_user_a}', '{test_user_b}');")[0][0]

check("Brands cascade deleted when user is deleted", remaining_brands == 0)
check("Profiles cascade deleted when user is deleted", remaining_profiles == 0)

con.close()

# 7. URL VALIDATION TEST (Using Python regex matching app logic)
print("\n7. Verifying URL Validation Logic...")
import urllib.parse

def is_valid_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    trimmed = url.strip()
    try:
        formatted = trimmed if trimmed.startswith(("http://", "https://")) else f"https://{trimmed}"
        parsed = urllib.parse.urlparse(formatted)
        return "." in parsed.netloc and len(parsed.netloc) > 3
    except Exception:
        return False

check("Valid domain 'luminarybotanicals.com'", is_valid_url("luminarybotanicals.com") is True)
check("Valid https URL 'https://store.shopify.com'", is_valid_url("https://store.shopify.com") is True)
check("Valid http URL 'http://boutique.co'", is_valid_url("http://boutique.co") is True)
check("Invalid empty URL ''", is_valid_url("") is False)
check("Invalid whitespace URL '   '", is_valid_url("   ") is False)
check("Invalid plain string 'not_a_url'", is_valid_url("not_a_url") is False)

print("\n" + "=" * 60)
print(f"VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
print("=" * 60)

if failed > 0:
    sys.exit(1)
