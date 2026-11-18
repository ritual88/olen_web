import { defineConfig } from 'astro/config';

// Домен подставляется переменной окружения SITE_URL (например, в настройках Vercel).
// Пока не задан — заглушка, чтобы canonical и sitemap собирались без ошибок.
const site = process.env.SITE_URL || 'https://example.com';

export default defineConfig({
  site,
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  server: { port: 4321 }
});
