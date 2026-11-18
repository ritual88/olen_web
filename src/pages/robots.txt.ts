import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://example.com');
  const sitemap = new URL('/sitemap.xml', base).href;

  const body = `User-agent: *
Allow: /

# Редактор текста и серверный эндпоинт не индексируются
Disallow: /tools/
Disallow: /api/

Sitemap: ${sitemap}
`;

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
};
