// Проверки обработчика заявки без порта и без настоящей сети.
// Сеть подменена: если тест попробует куда-то пойти по-настоящему — он упадёт.
// Запуск: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

const realFetch = globalThis.fetch;

function makeRes() {
  return {
    statusCode: 0,
    body: null,
    headersSent: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headersSent[name] = value;
    }
  };
}

async function call(handler, req) {
  const res = makeRes();
  await handler(req, res);
  return res;
}

function req({ method = 'POST', origin, host = 'site.ru', body = '' }) {
  return {
    method,
    headers: { origin, host },
    body
  };
}

const goodPayload = {
  name: 'Анна',
  contact: '@anna',
  type: 'full',
  message: 'Нужен сайт'
};

test.beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'TEST_TOKEN';
  process.env.TELEGRAM_CHAT_ID = '1';
  globalThis.fetch = async () => {
    throw new Error('настоящая сеть запрещена в тестах');
  };
});

test.afterEach(() => {
  globalThis.fetch = realFetch;
});

async function loadHandler() {
  const mod = await import('../api/contact.js');
  return mod.default;
}

test('GET отклоняется', async () => {
  const handler = await loadHandler();
  const res = await call(handler, req({ method: 'GET', origin: 'https://site.ru' }));
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { ok: false, error: 'method' });
});

test('запрос с чужого сайта отклоняется', async () => {
  const handler = await loadHandler();
  const res = await call(
    handler,
    req({ origin: 'https://evil.example', host: 'site.ru', body: JSON.stringify(goodPayload) })
  );
  assert.equal(res.statusCode, 403);
});

test('запрос без указания источника проходит', async () => {
  const handler = await loadHandler();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const res = await call(handler, req({ body: JSON.stringify(goodPayload) }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(calls.length, 1, 'Telegram вызывается ровно один раз');
});

test('пустые поля дают 422 и ошибки по полям', async () => {
  const handler = await loadHandler();
  const res = await call(handler, req({ origin: 'https://site.ru', body: JSON.stringify({ name: '', contact: '' }) }));
  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors.name);
  assert.ok(res.body.errors.contact);
});

test('битый JSON не роняет обработчик', async () => {
  const handler = await loadHandler();
  const res = await call(handler, req({ origin: 'https://site.ru', body: '{это не json' }));
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.ok, false);
});

test('ловушка для ботов отвечает успехом, но в Telegram не ходит', async () => {
  let called = 0;
  globalThis.fetch = async () => {
    called++;
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const handler = await loadHandler();
  const res = await call(
    handler,
    req({ origin: 'https://site.ru', body: JSON.stringify({ ...goodPayload, company: 'ООО Ромашка' }) })
  );

  assert.equal(res.statusCode, 200);
  assert.equal(called, 0, 'заявка бота не должна уходить');
});

test('отказ Telegram возвращает 502', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ ok: false }) });
  const handler = await loadHandler();
  const res = await call(handler, req({ origin: 'https://site.ru', body: JSON.stringify(goodPayload) }));
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { ok: false, error: 'delivery' });
});

test('без токена в окружении заявка не считается доставленной', async () => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  const handler = await loadHandler();
  const res = await call(handler, req({ origin: 'https://site.ru', body: JSON.stringify(goodPayload) }));
  assert.equal(res.statusCode, 502);
});
