import fs from 'fs';

const cities = [
  "delhi", "mumbai", "bangalore", "gurgaon", "noida", "hyderabad", 
  "pune", "chennai", "kolkata", "ahmedabad", "chandigarh", "jaipur"
];
const baseUrl = "https://www.giftszone.in";

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <priority>1.0</priority>
  </url>
  ${cities.map(city => `
  <url>
    <loc>${baseUrl}/?city=${city}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

try {
  fs.writeFileSync('./public/sitemap.xml', sitemap);
  console.log('✅ sitemap.xml generated in /public');
} catch (err) {
  console.error('❌ Error generating sitemap:', err);
}