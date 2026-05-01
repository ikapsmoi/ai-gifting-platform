import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 8787);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const DATA_DIR = path.join(__dirname, "data");
const CANDIDATE_LIMIT = Number(process.env.CATALOG_CANDIDATE_LIMIT || 60);
const PRODUCT_COUNT = 20;
const WHATSAPP_NUMBER = "919871621921";
const API_ORIGIN = process.env.API_ORIGIN || `http://127.0.0.1:${PORT}`;

const productCatalog = loadProductCatalog(DATA_DIR);
const productById = new Map(productCatalog.map((product) => [product.id, product]));
const mediaUrlCache = new Map();

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    occasion: { type: "string" },
    audience: { type: "string" },
    budget: { type: "string" },
    giftOptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          introLine1: { type: "string" },
          introLine2: { type: "string" },
        },
        required: ["id", "introLine1", "introLine2"],
      },
    },
  },
  required: ["summary", "occasion", "audience", "budget", "giftOptions"],
};

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  const requestUrl = new URL(
    request.url || "/",
    `http://${request.headers.host || "127.0.0.1"}`,
  );

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      model: OPENAI_MODEL,
      productCount: productCatalog.length,
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/catalog-sample") {
    sendJson(response, 200, {
      count: productCatalog.length,
      sample: productCatalog.slice(0, 5),
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/product-showcase") {
    const showcase = selectCandidateProducts(
      productCatalog,
      "employee welcome kits Diwali corporate gift sets eco friendly wireless chargers power banks diary pen bottle mug",
      24,
    ).map(toShowcaseProduct);

    sendJson(response, 200, {
      count: showcase.length,
      products: showcase,
    });
    return;
  }

  if (
    request.method === "GET" &&
    requestUrl.pathname.startsWith("/api/product-image/")
  ) {
    await handleProductImage(requestUrl, response);
    return;
  }

  if (
    request.method === "GET" &&
    requestUrl.pathname.startsWith("/api/product-image-debug/")
  ) {
    await handleProductImageDebug(requestUrl, response);
    return;
  }

  if (
    request.method === "POST" &&
    requestUrl.pathname === "/api/gift-recommendations"
  ) {
    await handleGiftRecommendations(request, response);
    return;
  }

  sendJson(response, 404, { error: "Route not found." });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`AI gifting API running at http://127.0.0.1:${PORT}`);
    console.log(`Loaded ${productCatalog.length} catalog products from data/.`);
  });
}

async function handleGiftRecommendations(request, response) {
  try {
    const { brief } = await readJsonBody(request);
    const cleanBrief = cleanText(brief);

    if (cleanBrief.length < 8) {
      sendJson(response, 400, {
        error: "Add a little more detail about the occasion, audience, and budget.",
      });
      return;
    }

    if (productCatalog.length === 0) {
      sendJson(response, 500, {
        error: "No products were found in the data folder.",
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      sendJson(response, 500, {
        error: "OPENAI_API_KEY is missing. Add it to .env and restart the API server.",
      });
      return;
    }

    const candidates = selectCandidateProducts(
      productCatalog,
      cleanBrief,
      CANDIDATE_LIMIT,
    );

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: [
          "You are a corporate gifting strategist for Indian and global B2B teams.",
          `Choose exactly ${PRODUCT_COUNT} products from PRODUCT_CATALOG only.`,
          "Never invent product IDs. Every giftOptions item must use an id from PRODUCT_CATALOG.",
          "Rank products by fit for the client brief, audience, occasion, quantity, budget, and corporate gifting utility.",
          "Each product option must include only id, introLine1, and introLine2.",
          "introLine1 and introLine2 must be short, clean, and suitable under a product image.",
          "Do not mention products outside the provided catalog.",
        ].join(" "),
        input: JSON.stringify({
          clientBrief: cleanBrief,
          productCatalog: candidates.map(toModelProduct),
        }),
        max_output_tokens: 3000,
        text: {
          format: {
            type: "json_schema",
            name: "catalog_gift_recommendations",
            strict: true,
            schema: recommendationSchema,
          },
        },
      }),
    });

    const payload = await readJsonResponse(openaiResponse);

    if (!openaiResponse.ok) {
      sendJson(response, 502, {
        error:
          payload?.error?.message ||
          "OpenAI could not generate recommendations right now.",
      });
      return;
    }

    const outputText = extractOutputText(payload);
    const recommendations = normalizeRecommendations(
      JSON.parse(outputText),
      candidates,
      cleanBrief,
    );

    sendJson(response, 200, {
      data: recommendations,
      model: payload.model || OPENAI_MODEL,
      source: "uploaded-catalog",
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Something went wrong while generating gifts.",
    });
  }
}

async function handleProductImage(requestUrl, response) {
  const productId = decodeURIComponent(
    requestUrl.pathname.replace("/api/product-image/", ""),
  );
  const product = productById.get(productId);

  if (!product) {
    sendPlaceholderSvg(response, "Product image");
    return;
  }

  const cachedUrl = mediaUrlCache.get(product.id);

  if (cachedUrl) {
    await sendProxiedImage(response, cachedUrl, product.name);
    return;
  }

  const imageUrl = await resolveProductImageUrl(product);

  if (imageUrl) {
    mediaUrlCache.set(product.id, imageUrl);
    await sendProxiedImage(response, imageUrl, product.name);
    return;
  }

  sendPlaceholderSvg(response, product.name);
}

async function handleProductImageDebug(requestUrl, response) {
  const productId = decodeURIComponent(
    requestUrl.pathname.replace("/api/product-image-debug/", ""),
  );
  const product = productById.get(productId);

  if (!product) {
    sendJson(response, 404, { error: "Product not found.", productId });
    return;
  }

  const imageResolution = await resolveProductImageUrl(product, {
    includeDebug: true,
  });

  sendJson(response, 200, {
    id: product.id,
    name: product.name,
    productUrl: product.productUrl,
    featuredMedia: product.featuredMedia,
    mediaApiUrl: product.mediaApiUrl,
    directImageUrl: product.directImageUrl,
    resolvedImageUrl: imageResolution.imageUrl,
    debug: imageResolution.debug,
  });
}

async function resolveProductImageUrl(product, options = {}) {
  const debug = [];

  if (product.directImageUrl) {
    debug.push({ step: "directImageUrl", ok: true, url: product.directImageUrl });
    return options.includeDebug
      ? { imageUrl: product.directImageUrl, debug }
      : product.directImageUrl;
  }

  if (!product.mediaApiUrl) {
    debug.push({ step: "mediaApiUrl", ok: false, error: "Missing media API URL" });
    return options.includeDebug ? { imageUrl: "", debug } : "";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const mediaResponse = await fetchWithBrowserHeaders(product.mediaApiUrl, {
      accept: "application/json",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!mediaResponse.ok) {
      debug.push({
        step: "mediaApiFetch",
        ok: false,
        status: mediaResponse.status,
        statusText: mediaResponse.statusText,
      });
      return options.includeDebug ? { imageUrl: "", debug } : "";
    }

    const media = await mediaResponse.json();
    const imageUrl =
      media?.media_details?.sizes?.medium_large?.source_url ||
      media?.media_details?.sizes?.large?.source_url ||
      media?.media_details?.sizes?.full?.source_url ||
      media?.source_url ||
      media?.guid?.rendered ||
      "";

    if (isUsableImageUrl(imageUrl)) {
      debug.push({ step: "mediaApiImageUrl", ok: true, url: imageUrl });
      return options.includeDebug ? { imageUrl, debug } : imageUrl;
    }

    debug.push({
      step: "mediaApiImageUrl",
      ok: false,
      error: "Media API did not return a usable image URL",
      rawUrl: imageUrl,
    });

    const pageImageUrl = await resolveImageFromProductPage(product, debug);

    return options.includeDebug
      ? { imageUrl: pageImageUrl, debug }
      : pageImageUrl;
  } catch (error) {
    debug.push({
      step: "mediaApiFetch",
      ok: false,
      error: error.message || "Media API fetch failed",
    });

    const pageImageUrl = await resolveImageFromProductPage(product, debug);

    return options.includeDebug
      ? { imageUrl: pageImageUrl, debug }
      : pageImageUrl;
  }
}

async function resolveImageFromProductPage(product, debug) {
  if (!product.productUrl) {
    debug.push({ step: "productPageFallback", ok: false, error: "Missing product URL" });
    return "";
  }

  try {
    const pageResponse = await fetchWithBrowserHeaders(product.productUrl, {
      accept: "text/html",
    });

    if (!pageResponse.ok) {
      debug.push({
        step: "productPageFallback",
        ok: false,
        status: pageResponse.status,
        statusText: pageResponse.statusText,
      });
      return "";
    }

    const html = await pageResponse.text();
    const imageUrl = extractImageUrlFromHtml(html);

    if (isUsableImageUrl(imageUrl)) {
      debug.push({ step: "productPageFallback", ok: true, url: imageUrl });
      return imageUrl;
    }

    debug.push({
      step: "productPageFallback",
      ok: false,
      error: "Product page did not contain a usable image URL",
      rawUrl: imageUrl,
    });
    return "";
  } catch (error) {
    debug.push({
      step: "productPageFallback",
      ok: false,
      error: error.message || "Product page fetch failed",
    });
    return "";
  }
}

function loadProductCatalog(dataDir) {
  if (!existsSync(dataDir)) {
    return [];
  }

  const files = readdirSync(dataDir)
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

  const products = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);

    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8"));
      const entries = Array.isArray(parsed) ? parsed : [parsed];

      for (const entry of entries) {
        const product = normalizeCatalogProduct(entry, file);

        if (product) {
          products.push(product);
        }
      }
    } catch {
      // Ignore malformed catalog files so one bad product does not break the app.
    }
  }

  return products;
}

function normalizeCatalogProduct(raw, file) {
  if (!raw || raw.type !== "product") {
    return null;
  }

  const id = cleanText(raw.id || path.basename(file, ".json"));
  const title = stripHtml(raw.title?.rendered || raw.name || "");
  const excerpt = stripHtml(raw.excerpt?.rendered || "");
  const content = stripHtml(raw.content?.rendered || "");
  const classes = Object.values(raw.class_list || {}).filter(
    (value) => typeof value === "string",
  );
  const categories = classes
    .filter((value) => value.startsWith("product_cat-"))
    .map((value) => slugToTitle(value.replace("product_cat-", "")));
  const tags = classes
    .filter((value) => value.startsWith("product_tag-"))
    .map((value) => slugToTitle(value.replace("product_tag-", "")));
  const productUrl = cleanText(raw.link || raw.guid?.rendered || "");
  const directImageUrl = extractImageUrl(raw);
  const featuredMedia = Number(raw.featured_media || 0);
  const mediaApiUrl =
    raw._links?.["wp:featuredmedia"]?.[0]?.href ||
    buildWordPressMediaUrl(productUrl, featuredMedia);
  const price = extractPrice(raw);
  const moq = extractLabel(excerpt, "MOQ");
  const description = excerpt || content;
  const searchText = [
    title,
    raw.slug,
    categories.join(" "),
    tags.join(" "),
    description,
  ]
    .join(" ")
    .toLowerCase();

  return {
    id,
    name: title || `Product ${id}`,
    productUrl,
    directImageUrl,
    imageUrl: `${API_ORIGIN}/api/product-image/${encodeURIComponent(id)}`,
    featuredMedia,
    mediaApiUrl,
    categories,
    tags,
    price,
    priceLabel: price ? `INR ${price}` : "",
    moq,
    description: limitText(description, 240),
    searchText,
  };
}

function selectCandidateProducts(catalog, brief, limit) {
  const tokens = extractTokens(brief);
  const budget = extractBudget(brief);

  return catalog
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(product, tokens, budget),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(limit, PRODUCT_COUNT))
    .map((entry) => entry.product);
}

function scoreProduct(product, tokens, budget) {
  let score = 0;
  const name = product.name.toLowerCase();
  const categoryText = [...product.categories, ...product.tags]
    .join(" ")
    .toLowerCase();

  for (const token of tokens) {
    if (name.includes(token)) {
      score += 5;
    }

    if (categoryText.includes(token)) {
      score += 4;
    }

    if (product.searchText.includes(token)) {
      score += 2;
    }
  }

  if (budget && product.price) {
    if (product.price <= budget) {
      score += 8;
    } else {
      score -= Math.min(10, Math.ceil((product.price - budget) / budget));
    }
  }

  if (product.directImageUrl || product.featuredMedia) {
    score += 1;
  }

  return score;
}

function normalizeRecommendations(recommendations, candidates, brief) {
  const options = Array.isArray(recommendations?.giftOptions)
    ? recommendations.giftOptions
    : [];
  const candidateById = new Map(candidates.map((product) => [product.id, product]));
  const usedIds = new Set();
  const selected = [];

  for (const option of options) {
    const product = candidateById.get(cleanText(option.id));

    if (product && !usedIds.has(product.id)) {
      selected.push({ option, product });
      usedIds.add(product.id);
    }
  }

  for (const product of candidates) {
    if (selected.length >= PRODUCT_COUNT) {
      break;
    }

    if (!usedIds.has(product.id)) {
      selected.push({ option: {}, product });
      usedIds.add(product.id);
    }
  }

  const giftOptions = selected.slice(0, PRODUCT_COUNT).map(({ option, product }) => ({
    id: product.id,
    name: product.name,
    introLine1: limitText(cleanText(option.introLine1) || product.name, 90),
    introLine2: limitText(
      cleanText(option.introLine2) ||
        product.description ||
        "A strong fit for curated corporate gifting.",
      100,
    ),
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    price: product.priceLabel,
    whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
  }));

  return {
    summary:
      cleanText(recommendations?.summary) ||
      `Showing ${giftOptions.length} products from your uploaded catalog for: ${brief}`,
    occasion: cleanText(recommendations?.occasion) || "Corporate gifting",
    audience: cleanText(recommendations?.audience) || "Recipients",
    budget: cleanText(recommendations?.budget) || "Catalog matched",
    giftOptions,
  };
}

function toModelProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: product.priceLabel,
    moq: product.moq,
    categories: product.categories.slice(0, 4),
    tags: product.tags.slice(0, 8),
    description: product.description,
    productUrl: product.productUrl,
  };
}

function toShowcaseProduct(product) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    category: product.categories[0] || "Corporate Gift",
  };
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const textPart = payload.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text" && content.text);

  if (!textPart) {
    throw new Error("The AI response did not include structured output text.");
  }

  return textPart.text;
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`OpenAI returned an empty response with status ${response.status}.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `OpenAI returned a non-JSON response with status ${response.status}.`,
    );
  }
}

function extractTokens(value) {
  const stopWords = new Set([
    "and",
    "are",
    "for",
    "from",
    "gift",
    "gifts",
    "give",
    "inr",
    "our",
    "the",
    "under",
    "with",
  ]);

  return cleanText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function extractBudget(value) {
  const text = cleanText(value).toLowerCase();
  const contextMatch = text.match(
    /(?:under|below|upto|up to|less than|within|budget|inr|rs|₹)\D{0,20}(\d[\d,]*)/,
  );

  if (contextMatch) {
    return Number(contextMatch[1].replace(/,/g, ""));
  }

  return null;
}

function extractPrice(raw) {
  const content = String(raw.content?.rendered || "");
  const priceMatch = content.match(/"price"\s*:\s*"?(₹?[\d,.]+)"?/i);

  if (!priceMatch) {
    return null;
  }

  const price = Number(priceMatch[1].replace(/[₹,]/g, ""));
  return Number.isFinite(price) ? price : null;
}

function extractLabel(text, label) {
  const source = cleanText(text);
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedLabel}\\s*:?\\s*([^|,]+)`, "i"));
  return match ? limitText(match[1], 60) : "";
}

function extractImageUrl(raw) {
  const embeddedImage =
    raw._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
    raw.yoast_head_json?.og_image?.[0]?.url ||
    "";

  if (isUsableImageUrl(embeddedImage)) {
    return embeddedImage;
  }

  const rawText = JSON.stringify(raw);
  const imageMatch = rawText.match(
    /https?:\\?\/\\?\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp)/i,
  );
  const imageUrl = imageMatch?.[0]?.replaceAll("\\/", "/") || "";

  return isUsableImageUrl(imageUrl) ? imageUrl : "";
}

function isUsableImageUrl(value) {
  const url = cleanText(value);

  return (
    /^https?:\/\//i.test(url) &&
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url) &&
    !url.includes("yourwebsite.com") &&
    !url.includes("example.com")
  );
}

function buildWordPressMediaUrl(productUrl, featuredMedia) {
  if (!featuredMedia || !productUrl) {
    return "";
  }

  try {
    const origin = new URL(productUrl).origin;
    return `${origin}/wp-json/wp/v2/media/${featuredMedia}`;
  } catch {
    return "";
  }
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function decodeHtmlEntities(value) {
  return cleanText(
    String(value || "")
      .replace(/&nbsp;/g, " ")
      .replace(/&#038;/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#8211;|&#8212;/g, "-")
      .replace(/&#8217;/g, "'"),
  );
}

function slugToTitle(value) {
  return cleanText(value).replace(/-/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limitText(value, maxLength = 120) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function loadEnv(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function sendProxiedImage(response, imageUrl, label) {
  try {
    const imageResponse = await fetchWithBrowserHeaders(imageUrl, {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    });
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    if (!imageResponse.ok || !contentType.startsWith("image/")) {
      sendPlaceholderSvg(response, label);
      return;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    response.end(imageBuffer);
  } catch {
    sendPlaceholderSvg(response, label);
  }
}

function fetchWithBrowserHeaders(url, options = {}) {
  return fetch(url, {
    signal: options.signal,
    headers: {
      Accept: options.accept || "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
}

function extractImageUrlFromHtml(html) {
  const source = String(html || "");
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<img[^>]+class=["'][^"']*(?:wp-post-image|attachment-woocommerce_single|product)[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:wp-post-image|attachment-woocommerce_single|product)[^"']*["']/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);

    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  const srcsetMatch = source.match(
    /<img[^>]+(?:wp-post-image|attachment-woocommerce_single|product)[^>]+srcset=["']([^"']+)["']/i,
  );

  if (srcsetMatch?.[1]) {
    return decodeHtmlEntities(srcsetMatch[1].split(",")[0].trim().split(/\s+/)[0]);
  }

  return "";
}

function sendPlaceholderSvg(response, label) {
  const safeLabel = escapeXml(limitText(label, 42));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f3f4f6"/><rect x="48" y="48" width="544" height="384" rx="18" fill="#ffffff" stroke="#d1d5db"/><text x="320" y="234" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Product Image</text><text x="320" y="272" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">${safeLabel}</text></svg>`;

  response.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300",
  });
  response.end(svg);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export {
  loadProductCatalog,
  normalizeRecommendations,
  resolveProductImageUrl,
  selectCandidateProducts,
  toModelProduct,
  toShowcaseProduct,
};
