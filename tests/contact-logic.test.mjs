// Проверки чистой логики приёма заявок: без сети, без сервера, без базы.
// Запуск: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { validate, buildText, sendTelegram } from '../api/contact.js';

test('имя короче двух символов отклоняется', () => {
  const result = validate({ name: 'А', contact: '@ok' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
});

test('имя из двух символов принимается', () => {
  const result = validate({ name: 'Ан', contact: '@ok' });
  assert.equal(result.ok, true);
});

test('контакт короче трёх символов отклоняется', () => {
  const result = validate({ name: 'Анна', contact: '@@' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.contact);
});

test('контакт из трёх символов принимается', () => {
  const result = validate({ name: 'Анна', contact: '@@a' });
  assert.equal(result.ok, true);
});

test('пробелы по краям обрезаются', () => {
  const result = validate({ name: '  Анна  ', contact: '  @anna  ' });
  assert.equal(result.value.name, 'Анна');
  assert.equal(result.value.contact, '@anna');
});

test('длинные значения обрезаются по лимитам', () => {
  const result = validate({
    name: 'я'.repeat(200),
    contact: 'к'.repeat(300),
    message: 'м'.repeat(5000)
  });
  assert.equal(result.value.name.length, 80);
  assert.equal(result.value.contact.length, 120);
  assert.equal(result.value.message.length, 2000);
});

test('неизвестный тип превращается в other', () => {
  assert.equal(validate({ name: 'Анна', contact: '@a', type: 'hack' }).value.type, 'other');
  assert.equal(validate({ name: 'Анна', contact: '@a', type: 'design' }).value.type, 'design');
});

test('ловушка для ботов срабатывает на поле company', () => {
  const result = validate({ name: 'Анна', contact: '@a', company: 'ООО Ромашка' });
  assert.equal(result.ok, false);
  assert.equal(result.errors.spam, 'spam');
});

test('мусор вместо объекта не роняет проверку', () => {
  for (const bad of [null, undefined, 'строка', 42, [], true]) {
    const result = validate(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errors.name);
    assert.ok(result.errors.contact);
  }
});

test('текст сообщения содержит имя, контакт и тип', () => {
  const text = buildText({ name: 'Анна', contact: '@anna', type: 'full', message: 'Нужен сайт' });
  assert.match(text, /Анна/);
  assert.match(text, /@anna/);
  assert.match(text, /Сайт под ключ/);
  assert.match(text, /Нужен сайт/);
});

test('без сообщения блок «О проекте» не добавляется', () => {
  const text = buildText({ name: 'Анна', contact: '@anna', type: 'other', message: '' });
  assert.doesNotMatch(text, /О проекте/);
});

test('без токена отправка не выполняется', async () => {
  const result = await sendTelegram({ token: '', chatId: '', text: 'x' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not-configured');
});

test('ошибка Telegram не считается успехом', async () => {
  const fakeFetch = async () => ({ ok: false, status: 400, json: async () => ({ ok: false }) });
  const result = await sendTelegram({ token: 't', chatId: '1', text: 'x', fetchImpl: fakeFetch });
  assert.equal(result.ok, false);
});

test('исключение в сети даёт понятную причину', async () => {
  const fakeFetch = async () => {
    throw new Error('нет сети');
  };
  const result = await sendTelegram({ token: 't', chatId: '1', text: 'x', fetchImpl: fakeFetch });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'network');
});

test('тело запроса содержит chat_id и отключённое превью ссылок', async () => {
  let sent = null;
  const fakeFetch = async (url, options) => {
    sent = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  await sendTelegram({ token: 'T', chatId: '42', text: 'привет', fetchImpl: fakeFetch });

  assert.match(sent.url, /botT\/sendMessage$/);
  assert.equal(sent.body.chat_id, '42');
  assert.equal(sent.body.text, 'привет');
  assert.equal(sent.body.disable_web_page_preview, true);
});
