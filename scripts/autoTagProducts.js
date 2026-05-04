import fs from "fs";

// 👉 Load file
const data = JSON.parse(
  fs.readFileSync("./src/data/transformed_products.json", "utf-8")
);

const products = data.products; // ✅ FIX

// 👉 Rules
const rules = [
  { keyword: ["gift set", "combo"], categoryType: "corporate_gift_set", useCase: "employee_welcome_kit" },
  { keyword: ["bottle", "flask"], categoryType: "drinkware" },
  { keyword: ["mug"], categoryType: "drinkware" },
  { keyword: ["speaker"], categoryType: "audio_device", useCase: "tech_gifting" },
  { keyword: ["power bank"], categoryType: "power_bank", useCase: "tech_gifting" },
  { keyword: ["charger", "cable"], categoryType: "charging_accessory" },
  { keyword: ["backpack"], categoryType: "backpack" },
  { keyword: ["duffle"], categoryType: "travel_bag" },
  { keyword: ["trolley"], categoryType: "luggage" },
  { keyword: ["jacket", "hoodie"], categoryType: "outerwear", useCase: "seasonal_gifting" },
  { keyword: ["t-shirt", "polo"], categoryType: "apparel" },
  { keyword: ["shirt"], categoryType: "formal_wear" },
  { keyword: ["clock"], categoryType: "desk_clock" },
  { keyword: ["vacuum"], categoryType: "home_appliance" },
  { keyword: ["pen stand", "desk"], categoryType: "desk_accessory" },
];

// 👉 Tag generator
function generateAutoTags(name) {
  const lower = name.toLowerCase();

  const categoryType = new Set();
  const useCase = new Set();
  const attributes = new Set();

  rules.forEach(rule => {
    if (rule.keyword.some(k => lower.includes(k))) {
      if (rule.categoryType) categoryType.add(rule.categoryType);
      if (rule.useCase) useCase.add(rule.useCase);
    }
  });

  if (lower.includes("eco") || lower.includes("bamboo")) attributes.add("eco_friendly");
  if (lower.includes("wireless")) attributes.add("wireless");
  if (lower.includes("bluetooth")) attributes.add("bluetooth");
  if (lower.includes("steel")) attributes.add("stainless_steel");
  if (lower.includes("cotton")) attributes.add("cotton");
  if (lower.includes("premium") || lower.includes("branded")) attributes.add("premium");

  return {
    categoryType: [...categoryType],
    useCase: [...useCase],
    attributes: [...attributes]
  };
}

// 👉 Apply tags
const updatedProducts = products.map(p => ({
  ...p,
  autoTags: generateAutoTags(p.name)
}));

// 👉 Save FULL structure back
const updatedData = {
  ...data,
  products: updatedProducts
};

fs.writeFileSync(
  "./src/data/transformed_products_tagged.json",
  JSON.stringify(updatedData, null, 2)
);

console.log("✅ Auto-tagging complete → src/data/transformed_products_tagged.json");