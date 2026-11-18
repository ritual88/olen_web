// Проверка обработчика /api/contact без запуска сервера:
// имитируем запросы Vercel и смотрим ответы. Одна из проверок реально шлёт сообщение в Telegram.
//
// Запуск: node --env-file=.env scripts/test-handler.mjs

import handler from '../api/contact.js';

function makeRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function call(name, req) {
  const res = makeRes();
  try {
    await handler(req, res);
  } catch (error) {
    console.log(name, '→ исключение:', error.message);
    return null;
  }
  const body = res.body ? JSON.stringify(res.body) : '';
  console.log(name, '→', res.statusCode, body);
  return res;
}

const goodBody = {
  name: 'Тест формы',
  contact: '@test',
  type: 'full',
  message: 'Проверка обработчика. Если видите это сообщение — цепочка работает.'
};

await call('GET-запрос', { method: 'GET', headers: {}, body: null });

await call('чужой сайт', {
  method: 'POST',
  headers: { origin: 'https://evil.example', host: 'mysite.vercel.app' },
  body: JSON.stringify(goodBody)
});

await call('пустые поля', {
  method: 'POST',
  headers: { origin: 'http://localhost:4321', host: 'localhost:4321' },
  body: JSON.stringify({ name: '', contact: '' })
});

await call('honeypot', {
  method: 'POST',
  headers: { origin: 'http://localhost:4321', host: 'localhost:4321' },
  body: JSON.stringify({ ...goodBody, company: 'ООО Ромашка' })
});

await call('нормальная заявка', {
  method: 'POST',
  headers: { origin: 'http://localhost:4321', host: 'localhost:4321' },
  body: JSON.stringify(goodBody)
});
