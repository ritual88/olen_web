import { defineConfig } from 'astro/config';

// Домен подставляется переменной окружения SITE_URL (например, в настройках Vercel).
// Пока не задан — боевой адрес на Vercel. Когда появится домен, поменять здесь или задать SITE_URL в Vercel.
const site = process.env.SITE_URL || 'https://olenweb.vercel.app';

export default defineConfig({
  site,
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  server: { port: 4321 }
});
