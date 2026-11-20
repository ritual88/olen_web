// Сервер для Timeweb Cloud (App Platform).
// Отдаёт собранный сайт из dist/ и обрабатывает форму на /api/contact.
// Никаких зависимостей: только стандартная библиотека Node.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { validate, buildText, sendTelegram } from './api/contact.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' https://mc.yandex.ru; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://mc.yandex.ru; connect-src 'self' https://mc.yandex.ru; frame-src https://mc.yandex.ru; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

const gzipCache = new Map();

function cacheControl(filePath) {
  if (filePath.includes(`${path.sep}_astro${path.sep}`) || filePath.includes(`${path.sep}fonts${path.sep}`)) {
    return 'public, max-age=31536000, immutable';
  }
  if (filePath.endsWith('.html')) return 'no-cache';
  return 'public, max-age=86400';
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), { 'content-type': 'application/json; charset=utf-8' });
}

function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function handleContact(req, res) {
  if (!sameOrigin(req)) {
    sendJson(res, 403, { ok: false, error: 'origin' });
    return;
  }

  let raw = '';
  try {
    raw = await readBody(req);
  } catch {
    sendJson(res, 413, { ok: false, error: 'size' });
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  const result = validate(payload);

  if (!result.ok) {
    if (result.errors.spam) {
      sendJson(res, 200, { ok: true });
      return;
    }
    sendJson(res, 422, { ok: false, errors: result.errors });
    return;
  }

  const sent = await sendTelegram({
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    text: buildText(result.value)
  });

  if (!sent.ok) {
    console.error('contact: не доставлено', sent.reason || sent.status);
    sendJson(res, 502, { ok: false, error: 'delivery' });
    return;
  }

  sendJson(res, 200, { ok: true });
}

function serveStatic(req, res, urlPath) {
  const clean = decodeURIComponent(urlPath);

  let filePath = path.join(DIST, path.normalize(clean));
  if (!filePath.startsWith(DIST)) {
    send(res, 403, 'Forbidden');
    return;
  }

  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    stat = null;
  }

  // Каталог без слэша на конце — уводим на версию со слэшем, как делал Vercel.
  if (stat && stat.isDirectory() && !clean.endsWith('/')) {
    send(res, 308, '', { location: encodeURI(clean + '/') });
    return;
  }

  if (stat && stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    try {
      stat = fs.statSync(filePath);
    } catch {
      stat = null;
    }
  }

  if (!stat || !stat.isFile()) {
    const notFound = path.join(DIST, '404.html');
    if (fs.existsSync(notFound)) {
      send(res, 404, fs.readFileSync(notFound), {
        'content-type': TYPES['.html'],
        'cache-control': 'no-cache'
      });
      return;
    }
    send(res, 404, 'Not found');
    return;
  }

  const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const headers = {
    'content-type': type,
    'cache-control': cacheControl(filePath)
  };

  const isText = /^(text\/|application\/(json|javascript|xml))/.test(type) || type === 'image/svg+xml';
  const wantsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');

  if (isText && wantsGzip && stat.size > 1024) {
    const key = filePath + ':' + stat.mtimeMs;
    let buf = gzipCache.get(key);
    if (!buf) {
      buf = zlib.gzipSync(fs.readFileSync(filePath));
      gzipCache.set(key, buf);
    }
    headers['content-encoding'] = 'gzip';
    headers['vary'] = 'Accept-Encoding';
    send(res, 200, buf, headers);
    return;
  }

  send(res, 200, fs.readFileSync(filePath), headers);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/contact') {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      sendJson(res, 405, { ok: false, error: 'method' });
      return;
    }
    await handleContact(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'method' });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Сайт слушает http://${HOST}:${PORT}`);
});
