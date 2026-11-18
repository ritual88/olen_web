import type { APIRoute } from 'astro';

// Страницы, которые попадают в карту сайта.
// Политика и 404 исключены: они закрыты от индексации.
const PAGES = ['/', '/services', '/about', '/contact'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://example.com');

  const urls = PAGES.map((path) => {
    const loc = new URL(path, base).href;
    const priority = path === '/' ? '1.0' : '0.8';
    return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' }
  });
};
