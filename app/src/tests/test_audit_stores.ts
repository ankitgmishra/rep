import { scrapeStorefront } from "../lib/research/scraper";
import { isSafePublicUrl } from "../lib/research/security";

const STORES = [
  { name: "Loopy Cases", url: "https://loopycases.com" },
  { name: "Gymshark", url: "https://gymshark.com" },
  { name: "Bellroy", url: "https://bellroy.com" },
  { name: "Allbirds", url: "https://allbirds.com" },
  { name: "Liquid Death", url: "https://liquiddeath.com" },
];

async function testStores() {
  console.log("=================================================================");
  console.log("CADRA STOREFRONT AUDIT: 5 ECOMMERCE BRANDS");
  console.log("=================================================================\n");

  for (const store of STORES) {
    console.log(`-----------------------------------------------------------------`);
    console.log(`TESTING: ${store.name} (${store.url})`);
    console.log(`-----------------------------------------------------------------`);

    // 1. SSRF and URL validation check
    const safety = isSafePublicUrl(store.url);
    console.log(`  [SSRF Check]: safe=${safety.safe}, normalized=${safety.normalizedUrl}`);

    // 2. Direct Scraper / Firecrawl Scraper
    const startTime = Date.now();
    try {
      const data = await scrapeStorefront(store.url);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`  [STATUS]: SUCCESS (${elapsed}s)`);
      console.log(`  [Brand Name]: "${data.brand_name}"`);
      console.log(`  [Description]: "${(data.website_description || "").slice(0, 80)}..."`);
      console.log(`  [Is Shopify]: ${data.is_shopify}`);
      console.log(`  [Products Extracted]: ${data.products.length}`);

      if (data.products.length > 0) {
        console.log(`  [Sample Product 1]:`);
        console.log(`    - Title: "${data.products[0].title}"`);
        console.log(`    - Price: ${data.products[0].price_formatted || data.products[0].price || "N/A"}`);
        console.log(`    - Main Image: ${data.products[0].main_image_url || "NONE"}`);
        console.log(`    - URL: ${data.products[0].product_url}`);
      } else {
        console.log(`  [WARNING]: 0 products extracted from storefront!`);
      }
    } catch (err: unknown) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`  [STATUS]: FAILED / BLOCKED (${elapsed}s)`);
      console.log(`  [Error Details]: ${errorMsg}`);
    }
    console.log("");
  }
}

testStores().catch(console.error);
