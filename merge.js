import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const folder = "./data";

const files = fs
  .readdirSync(folder)
  .filter((f) => f.endsWith(".json"));

async function fetchImage(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.source_url || "";
  } catch (err) {
    console.log("❌ Image fetch failed:", url);
    return "";
  }
}

async function run() {
  const allProducts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(folder, file), "utf-8");
    const parsed = JSON.parse(raw);

    const mediaUrl =
      parsed._links?.["wp:featuredmedia"]?.[0]?.href;

    let image = "";

    if (mediaUrl) {
      console.log("Fetching image for:", parsed.id);
      image = await fetchImage(mediaUrl);
    }

    allProducts.push({
      id: parsed.id,
      name: parsed.title?.rendered || "Product",
      price: 0,
      category: parsed.product_cat?.[0] || "general",
      tags: parsed.product_tag || [],
      image: image,
    });
  }

  fs.mkdirSync("./src/data", { recursive: true });

  fs.writeFileSync(
    "./src/data/products.json",
    JSON.stringify(allProducts, null, 2)
  );

  console.log(`✅ Done: ${allProducts.length} products`);
}

run();