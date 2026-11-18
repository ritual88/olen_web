// Быстрая проверка собранного сайта: заголовки, alt, ссылки, мета.
// Запуск: node scripts/audit.mjs

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

const pages = fs
  .readdirSync(DIST, { recursive: true })
  .filter((f) => String(f).endsWith('.html'))
  .map((f) => String(f));

let problems = 0;

for (const rel of pages) {
  const file = path.join(DIST, rel);
  const html = fs.readFileSync(file, 'utf8');
  const url = '/' + rel.replace(/index\.html$/, '').replace(/\\/g, '/');

  const h1 = (html.match(/<h1[ >]/g) || []).length;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((tag) => !/\balt=/.test(tag));
  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  const broken = links.filter((href) => {
    if (href.startsWith('/fonts/') || href.startsWith('/js/') || href.startsWith('/img/')) {
      return !fs.existsSync(path.join(DIST, href.replace(/^\//, '')));
    }
    const clean = href.replace(/^\//, '').replace(/\/$/, '');
    if (!clean) return !fs.existsSync(path.join(DIST, 'index.html'));
    const asFile = path.join(DIST, clean);
    return !(
      fs.existsSync(path.join(asFile, 'index.html')) ||
      fs.existsSync(asFile + '.html') ||
      (fs.existsSync(asFile) && fs.statSync(asFile).isFile())
    );
  });

  const issues = [];
  if (h1 !== 1) issues.push('H1: ' + h1);
  if (title.length > 65) issues.push('title ' + title.length + ' симв.');
  if (desc.length > 165) issues.push('description ' + desc.length + ' симв.');
  if (noAlt.length) issues.push('img без alt: ' + noAlt.length);
  if (broken.length) issues.push('битые ссылки: ' + [...new Set(broken)].join(', '));

  problems += issues.length;
  console.log((issues.length ? '⚠ ' : '✓ ') + url + (issues.length ? ' — ' + issues.join('; ') : ''));
}

const assets = fs.readdirSync(DIST, { recursive: true });
console.log('\nфайлов в сборке:', assets.length);
console.log(problems ? '\nпроблем: ' + problems : '\nпроблем не найдено');
