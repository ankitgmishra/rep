import { isSafePublicUrl } from "./security";
import { getGeminiModel } from "@/lib/llm/gemini";
import { generateObject } from "ai";
import { z } from "zod";

export interface RawScrapedProduct {
  title: string;
  description: string;
  price: number | null;
  price_formatted: string | null;
  currency: string;
  product_url: string;
  main_image_url: string | null;
  additional_image_urls: string[];
  category: string | null;
  sku?: string | null;
  source_url: string;
}

export interface RawScrapedBrand {
  brand_name: string;
  website_url: string;
  logo_url: string | null;
  website_description: string | null;
  detected_colors: Array<{ hex: string; usage: string }>;
  shipping_info: string | null;
  return_policy: string | null;
  raw_headings: string[];
  raw_paragraphs: string[];
  products: RawScrapedProduct[];
  is_shopify: boolean;
  source_urls_checked: string[];
  branding_raw?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  personality?: Record<string, unknown>;
}

interface FirecrawlBranding {
  brandName?: string;
  logo?: string;
  colorScheme?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    textPrimary?: string;
    link?: string;
    [key: string]: string | undefined;
  };
  typography?: {
    fontFamilies?: {
      primary?: string;
      heading?: string;
    };
    fontSizes?: Record<string, string>;
    fontStacks?: Record<string, string[]>;
  };
  fonts?: Array<{
    family: string;
    role?: string;
  }>;
  spacing?: {
    baseUnit?: number;
    borderRadius?: string;
  };
  components?: Record<string, unknown>;
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
  personality?: {
    tone?: string;
    energy?: string;
    targetAudience?: string;
  };
  confidence?: Record<string, number>;
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    branding?: FirecrawlBranding;
    metadata?: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      sourceURL?: string;
      statusCode?: number;
    };
    links?: string[];
  };
  error?: string;
}

/**
 * Extracts product items from Firecrawl markdown using Gemini
 */
async function extractProductsWithGemini(
  markdown: string,
  targetUrl: string,
  discoveredLinks: string[] = []
): Promise<RawScrapedProduct[]> {
  try {
    // Broaden link patterns: products, item, shop, collections, etc.
    const productLinks = discoveredLinks
      .filter((l) => {
        const lower = l.toLowerCase();
        return (
          lower.includes("/products/") ||
          lower.includes("/product/") ||
          lower.includes("/item/") ||
          lower.includes("/p/") ||
          lower.includes("/shop/") ||
          lower.includes("/collections/")
        );
      })
      .slice(0, 25);

    const schema = z.object({
      products: z.array(
        z.object({
          title: z.string().describe("The clean product name"),
          description: z.string().describe("Product description or key feature statement"),
          price: z.number().nullable().describe("Numerical price in dollars, e.g. 39.99"),
          price_formatted: z.string().nullable().describe("Formatted price with currency symbol, e.g. $39.99"),
          currency: z.string().default("USD"),
          product_url: z.string().describe("Full URL or path to the product page"),
          main_image_url: z.string().nullable().describe("Direct image CDN URL for the product from the markdown"),
          category: z.string().nullable().describe("Category or product type"),
        })
      ).max(20),
    });

    const promptText = `Analyze this Firecrawl markdown extract of an ecommerce store.
Discovered Product / Catalog Links on this store: ${JSON.stringify(productLinks)}

Firecrawl Markdown Extract:
${markdown.slice(0, 14000)}

Extract all genuine catalog products discovered in this Firecrawl scrape.
RULES:
1. ONLY extract real products that appear in the text and images above.
2. NEVER invent fake URLs or hallucinate fake image links. The image URL must be a real CDN link found in the markdown.
3. Ensure product URLs are fully qualified (prepend '${targetUrl}' if relative).
4. CRITICAL PRODUCT URL MATCHING:
   - The 'product_url' must correspond to the product in 'title'.
   - Match it with discovered product links containing words from the title, or format the URL as '${new URL(targetUrl).origin}/products/' + slugified title. Do NOT mismatch links.`;

    const model = getGeminiModel();
    const { object } = await generateObject({
      model,
      schema,
      system: "You are an expert ecommerce product catalog extractor. Extract only real products with real CDN image URLs from Firecrawl markdown data, ensuring 100% accurate 1-to-1 matching between product titles and their corresponding product page URLs.",
      prompt: promptText,
    });

    if (object && Array.isArray(object.products) && object.products.length > 0) {
      const origin = new URL(targetUrl).origin;
      return object.products.map((p) => {
        let fullUrl = p.product_url;
        if (!fullUrl.startsWith("http")) {
          fullUrl = `${targetUrl.replace(/\/$/, "")}/${fullUrl.replace(/^\//, "")}`;
        }

        // Validate slug correlation to avoid mismatched links
        const titleTokens = p.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => t.length > 2 && t !== "case" && t !== "cases" && t !== "loopy");
        const urlLower = fullUrl.toLowerCase();
        const hasMatchingToken = titleTokens.some((token) => urlLower.includes(token));

        // If current URL does not contain any title words, search discoveredLinks for a better match
        if (!hasMatchingToken && discoveredLinks.length > 0) {
          const betterMatch = discoveredLinks.find((link) => {
            const lLower = link.toLowerCase();
            return titleTokens.some((token) => lLower.includes(token));
          });
          if (betterMatch) {
            fullUrl = betterMatch.startsWith("http") ? betterMatch : `${origin}${betterMatch.startsWith("/") ? "" : "/"}${betterMatch}`;
          } else if (titleTokens.length > 0) {
            // Generate clean slug URL for this exact product on the store
            const slug = titleTokens.join("-");
            fullUrl = `${origin}/products/${slug}`;
          }
        }

        return {
          title: p.title.trim(),
          description: p.description.slice(0, 500),
          price: p.price,
          price_formatted: p.price_formatted || (p.price ? `$${p.price.toFixed(2)}` : null),
          currency: p.currency || "USD",
          product_url: fullUrl,
          main_image_url: p.main_image_url,
          additional_image_urls: [],
          category: p.category || "General Merchandise",
          source_url: targetUrl,
        };
      });
    }

    return [];
  } catch (err) {
    console.warn("[FIRECRAWL EXTRACTOR] Gemini product extraction error, falling back to heuristic markdown parser:", err);
    try {
      const fallbackProducts = extractProductsFromMarkdownHeuristic(markdown, targetUrl);
      if (fallbackProducts.length > 0) {
        return fallbackProducts;
      }
    } catch (fallbackErr) {
      console.error("[FIRECRAWL EXTRACTOR] Fallback parser also failed:", fallbackErr);
    }
    return [];
  }
}

/**
 * Deterministic markdown parser for Firecrawl markdown structure
 */
function extractProductsFromMarkdownHeuristic(
  markdown: string,
  targetUrl: string
): RawScrapedProduct[] {
  const products: RawScrapedProduct[] = [];
  const origin = new URL(targetUrl).origin;
  const seenTitles = new Set<string>();

  // PATTERN A: Markdown image links [![Product Title](image_url)](product_url)
  // Highly reliable for modern ecommerce (Shopify, Gymshark, Loopy Cases, etc.)
  const imageLinkPattern = /\[!\[([^\]]+)\]\((https?:\/\/[^\)]+)\).*?\]\((https?:\/\/[^\s\)]+)(?:\s+"[^"]*")?\)/g;
  let imgMatch;

  while ((imgMatch = imageLinkPattern.exec(markdown)) !== null) {
    const rawTitle = imgMatch[1].trim();
    const mainImageUrl = imgMatch[2].trim();
    let productUrl = imgMatch[3].trim();

    // Clean title
    const title = rawTitle.replace(/[™®]/g, "").replace(/\s+/g, " ").trim();
    const titleLower = title.toLowerCase();
    if (
      title.length < 3 ||
      seenTitles.has(titleLower) ||
      titleLower === "logo" ||
      titleLower.includes("newsletter") ||
      titleLower.includes("sign up")
    ) {
      continue;
    }

    // Ignore logos or nav icons
    if (mainImageUrl.toLowerCase().includes("logo") || mainImageUrl.toLowerCase().includes("favicon")) {
      continue;
    }
    seenTitles.add(titleLower);

    const urlLower = productUrl.toLowerCase();
    if (
      urlLower.includes("/cart") ||
      urlLower.includes("/account") ||
      urlLower.includes("/login") ||
      urlLower.includes("/checkout") ||
      urlLower.includes("/pages/")
    ) {
      continue;
    }

    if (!productUrl.startsWith("http")) {
      productUrl = `${origin}${productUrl.startsWith("/") ? "" : "/"}${productUrl}`;
    }

    products.push({
      title,
      description: `${title} available at ${new URL(targetUrl).hostname}`,
      price: null,
      price_formatted: null,
      currency: "USD",
      product_url: productUrl,
      main_image_url: mainImageUrl,
      additional_image_urls: [],
      category: "Catalog SKU",
      source_url: targetUrl,
    });

    if (products.length >= 20) break;
  }

  if (products.length >= 3) {
    return products;
  }

  // PATTERN B: Heading-based product blocks: ### [Product Title](url)
  const blocks = markdown.split(/(?=###\s+\[)/);

  for (const block of blocks) {
    const titleMatch = block.match(/###\s+\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    const rawUrl = titleMatch[2].trim();
    const urlLower = rawUrl.toLowerCase();

    // Ignore cart/account links
    if (
      urlLower.includes("/cart") ||
      urlLower.includes("/account") ||
      urlLower.includes("/login") ||
      urlLower.includes("/checkout")
    ) {
      continue;
    }

    // Look for image URL in block or adjacent text
    const imageMatch = block.match(/\((https?:\/\/[^\)]+\.(?:jpg|jpeg|png|webp|pjpg)[^\)]*)\)/i);
    const mainImageUrl = imageMatch ? imageMatch[1] : null;

    // Look for price
    const priceMatch = block.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
    const priceNum = priceMatch ? parseFloat(priceMatch[1]) : null;
    const priceFormatted = priceNum !== null ? `$${priceNum.toFixed(2)}` : null;

    products.push({
      title,
      description: `${title} available at ${new URL(targetUrl).hostname}`,
      price: priceNum,
      price_formatted: priceFormatted,
      currency: "USD",
      product_url: rawUrl.startsWith("http") ? rawUrl : `${origin}${rawUrl}`,
      main_image_url: mainImageUrl,
      additional_image_urls: [],
      category: "General Merchandise",
      source_url: targetUrl,
    });

    if (products.length >= 20) break;
  }

  return products;
}

/**
 * Scrapes storefront using Firecrawl as the PRIMARY AND ONLY extraction mechanism.
 * Utilizes Firecrawl's Brand Extractor for colors, typography, logos, and visual style,
 * and Firecrawl's scraping for website content and product information.
 */
export async function scrapeStorefront(rawUrl: string): Promise<RawScrapedBrand> {
  const safety = isSafePublicUrl(rawUrl);
  if (!safety.safe || !safety.normalizedUrl) {
    throw new Error(`SSRF Blocked: ${safety.error || "Unsafe URL provided."}`);
  }

  const targetUrl = safety.normalizedUrl;
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey || apiKey === "placeholder-firecrawl-key" || apiKey.trim() === "") {
    throw new Error(
      "FIRECRAWL_API_KEY is not configured. Firecrawl is required as the primary and only website extraction mechanism."
    );
  }

  // 1. Invoke Firecrawl Scrape API with Brand Extractor and Markdown formats
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: ["branding", "markdown", "links"],
      onlyMainContent: false,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Firecrawl API request failed with status ${res.status}: ${errorText}`);
  }

  const json: FirecrawlScrapeResponse = await res.json();
  if (!json.success || !json.data) {
    throw new Error(`Firecrawl scrape unsuccessful: ${json.error || "No data returned."}`);
  }

  const { branding, markdown = "", metadata = {}, links = [] } = json.data;

  // 2. Extract Brand Identity from Firecrawl Brand Extractor
  let brandName = branding?.brandName?.trim() || "";
  if (!brandName || brandName.length < 2) {
    brandName = metadata.title?.split(/[-|–—•:]/)[0]?.trim() || new URL(targetUrl).hostname.replace(/^www\./, "").split(".")[0];
    brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
  }

  // Logo from Firecrawl Brand Extractor
  const logoUrl =
    branding?.logo ||
    branding?.images?.logo ||
    branding?.images?.ogImage ||
    metadata.ogImage ||
    branding?.images?.favicon ||
    null;

  // Colors from Firecrawl Brand Extractor
  const detectedColors: Array<{ hex: string; usage: string }> = [];
  if (branding?.colors) {
    const c = branding.colors;
    if (c.primary) detectedColors.push({ hex: c.primary.toUpperCase(), usage: "Primary Brand Color" });
    if (c.secondary) detectedColors.push({ hex: c.secondary.toUpperCase(), usage: "Secondary Brand Color" });
    if (c.accent) detectedColors.push({ hex: c.accent.toUpperCase(), usage: "Accent Color" });
    if (c.background) detectedColors.push({ hex: c.background.toUpperCase(), usage: "Background Color" });
    if (c.textPrimary) detectedColors.push({ hex: c.textPrimary.toUpperCase(), usage: "Text Color" });
    if (c.link) detectedColors.push({ hex: c.link.toUpperCase(), usage: "Link Color" });
  }

  // 3. Extract Website Description
  const websiteDescription = metadata.description || metadata.ogDescription || null;

  // 4. Extract Headings and Paragraphs from Firecrawl Markdown
  const rawHeadings: string[] = [];
  const headingMatches = markdown.match(/^(?:#{1,3})\s+(.+)$/gm) || [];
  for (const h of headingMatches) {
    const cleanH = h.replace(/^#{1,3}\s+/, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();
    if (cleanH.length > 5 && cleanH.length < 140 && !rawHeadings.includes(cleanH)) {
      rawHeadings.push(cleanH);
      if (rawHeadings.length >= 10) break;
    }
  }

  const rawParagraphs: string[] = [];
  const lines = markdown.split("\n\n");
  for (const line of lines) {
    const cleanL = line.replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[*_#]/g, "").trim();
    if (cleanL.length > 25 && cleanL.length < 350 && !cleanL.startsWith("!") && !rawParagraphs.includes(cleanL)) {
      rawParagraphs.push(cleanL);
      if (rawParagraphs.length >= 8) break;
    }
  }

  // 5. Extract Products from Firecrawl Markdown and Discovered Links
  let products = await extractProductsWithGemini(markdown, targetUrl, links);

  // If homepage yielded no products (common on stores like Gymshark where homepage is just promo banners),
  // automatically discover collection or shop pages from discovered links and extract products!
  if (products.length === 0 && links.length > 0) {
    const origin = new URL(targetUrl).origin;
    const catalogCandidate = links.find((l) => {
      const lower = l.toLowerCase();
      return (
        lower.includes("/collections/all") ||
        lower.includes("/collections") ||
        lower.includes("/shop") ||
        lower.includes("/products") ||
        lower.includes("/categories") ||
        lower.includes("/catalog")
      );
    });

    if (catalogCandidate) {
      const catalogUrl = catalogCandidate.startsWith("http")
        ? catalogCandidate
        : `${origin}${catalogCandidate.startsWith("/") ? "" : "/"}${catalogCandidate}`;
      console.log(`[FIRECRAWL DEEP CATALOG] Homepage had 0 products. Scraping catalog page: ${catalogUrl}...`);
      try {
        const catRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            url: catalogUrl,
            formats: ["markdown", "links"],
            onlyMainContent: true,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (catRes.ok) {
          const catJson = await catRes.json();
          if (catJson.success && catJson.data?.markdown) {
            const catProducts = await extractProductsWithGemini(
              catJson.data.markdown,
              catalogUrl,
              catJson.data.links || []
            );
            if (catProducts.length > 0) {
              products = catProducts;
            }
          }
        }
      } catch (catErr) {
        console.warn("[FIRECRAWL DEEP CATALOG] Failed scraping catalog sub-page:", catErr);
      }
    }
  }

  // 6. Multi-Page Discovery & Deep Extraction:
  // Brand research beyond the homepage: Discover About, Policy/Guarantee, and Collection pages
  const sourceUrlsChecked: string[] = [targetUrl];
  let shippingInfo: string | null = null;
  let returnPolicy: string | null = null;

  try {
    const origin = new URL(targetUrl).origin;
    const candidateSubPages = links
      .map((l) => (l.startsWith("http") ? l : `${origin}${l.startsWith("/") ? "" : "/"}${l}`))
      .filter((l) => {
        try {
          const u = new URL(l);
          if (u.origin !== origin) return false;
          const p = u.pathname.toLowerCase();
          if (p === "/" || p === "") return false;
          if (p.includes("/cart") || p.includes("/checkout") || p.includes("/account") || p.includes("/login")) return false;
          return true;
        } catch {
          return false;
        }
      });

    // Discover About / Story page
    const aboutLink = candidateSubPages.find((l) => {
      const p = new URL(l).pathname.toLowerCase();
      return p.includes("/about") || p.includes("/story") || p.includes("/our-story") || p.includes("/who-we-are");
    });

    // Discover Policy / FAQ / Guarantee page
    const policyLink = candidateSubPages.find((l) => {
      const p = new URL(l).pathname.toLowerCase();
      return p.includes("/guarantee") || p.includes("/policy") || p.includes("/shipping") || p.includes("/return") || p.includes("/faq");
    });

    // Scrape high-priority sub-page (e.g. About page or Guarantee page)
    const pagesToDeepScrape = [aboutLink, policyLink].filter(Boolean) as string[];

    for (const subPageUrl of pagesToDeepScrape.slice(0, 2)) {
      if (sourceUrlsChecked.includes(subPageUrl)) continue;
      console.log(`[FIRECRAWL DEEP SCRAPE] Inspecting sub-page beyond homepage: ${subPageUrl}...`);
      try {
        const subRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            url: subPageUrl,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (subRes.ok) {
          const subJson = await subRes.json();
          if (subJson.success && subJson.data?.markdown) {
            sourceUrlsChecked.push(subPageUrl);
            const subMd = subJson.data.markdown;

            // Extract policy or guarantee text
            if (subPageUrl.toLowerCase().includes("guarantee") || subPageUrl.toLowerCase().includes("return") || subPageUrl.toLowerCase().includes("shipping")) {
              const guaranteeMatch = subMd.match(/(?:30[ -]?day|money[ -]?back|guarantee|warranty|free shipping|free returns)[^\n.]*/i);
              if (guaranteeMatch) {
                returnPolicy = guaranteeMatch[0].trim();
              }
            }

            // Extract story paragraphs from about page
            const subLines = subMd.split("\n\n");
            for (const sLine of subLines) {
              const clean = sLine.replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[*_#]/g, "").trim();
              if (clean.length > 40 && clean.length < 300 && !clean.startsWith("!") && !rawParagraphs.includes(clean)) {
                rawParagraphs.push(clean);
                if (rawParagraphs.length >= 14) break;
              }
            }
          }
        }
      } catch (subErr) {
        console.warn(`[FIRECRAWL DEEP SCRAPE] Sub-page scrape for ${subPageUrl} skipped:`, subErr);
      }
    }
  } catch (err) {
    console.warn("[FIRECRAWL MULTI-PAGE] Multi-page discovery error:", err);
  }

  return {
    brand_name: brandName,
    website_url: targetUrl,
    logo_url: logoUrl,
    website_description: websiteDescription,
    detected_colors: detectedColors,
    shipping_info: shippingInfo,
    return_policy: returnPolicy,
    raw_headings: rawHeadings,
    raw_paragraphs: rawParagraphs,
    products,
    is_shopify: markdown.includes("cdn.shopify.com") || links.some((l) => l.includes("shopify")),
    source_urls_checked: sourceUrlsChecked,
    branding_raw: branding as unknown as Record<string, unknown>,
    typography: branding?.typography as unknown as Record<string, unknown>,
    personality: branding?.personality as unknown as Record<string, unknown>,
  };
}
