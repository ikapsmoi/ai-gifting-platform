/**
 * SEOEngine.js 
 * Handles Pan-India Programmatic Metadata & Schema
 */

const TOP_CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Gurgaon", "Noida", "Hyderabad", 
  "Pune", "Chennai", "Kolkata", "Ahmedabad", "Chandigarh", "Jaipur",
  "Lucknow", "Indore", "Surat", "Kochi", "Visakhapatnam"
];

const SEO_DATA = {
  defaultTitle: "Bulk Corporate Gifts India | Wholesale Employee Kits | GiftsZone",
  defaultDesc: "India's leading wholesale supplier for corporate gifts, joining kits, and promotional merchandise. 12+ years of experience. PAN India delivery.",
  keywords: "bulk corporate gifts, employee joining kits, wholesale gifts india, corporate merchandise, customized corporate gifts"
};

export const getCityContext = () => {
  const params = new URLSearchParams(window.location.search);
  const cityParam = params.get('city');
  
  if (cityParam && TOP_CITIES.some(c => c.toLowerCase() === cityParam.toLowerCase())) {
    return cityParam.charAt(0).toUpperCase() + cityParam.slice(1);
  }
  return "India";
};

export const injectSEO = () => {
  const city = getCityContext();
  const isGlobal = city === "India";

  // 1. Update Document Title
  document.title = isGlobal 
    ? SEO_DATA.defaultTitle 
    : `Bulk Corporate Gifts in ${city} | #1 Wholesale Supplier | GiftsZone`;

  // 2. Update Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = isGlobal 
    ? SEO_DATA.defaultDesc 
    : `Looking for bulk corporate gifts in ${city}? GiftsZone offers premium employee joining kits and wholesale merchandise with custom branding in ${city}.`;

  // 3. Inject JSON-LD Schema
  const schemaId = "seo-schema-script";
  let schemaScript = document.getElementById(schemaId);
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.id = schemaId;
    schemaScript.type = "application/ld+json";
    document.head.appendChild(schemaScript);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "CorporateGiftsZone",
    "url": "https://www.giftszone.in",
    "logo": "https://www.giftszone.in/logo.png",
    "description": metaDesc.content,
    "areaServed": isGlobal ? "India" : city,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ghaziabad",
      "addressRegion": "UP",
      "addressCountry": "IN"
    }
  };
  schemaScript.innerHTML = JSON.stringify(schema);
};

export { TOP_CITIES };