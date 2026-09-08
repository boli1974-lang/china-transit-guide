export const prerender = true;

export function GET() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://jadebound.com/china-240-hour-visa-free-transit/</loc>
  </url>
  <url>
    <loc>https://jadebound.com/do-us-citizens-need-a-visa-for-china/</loc>
  </url>
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}