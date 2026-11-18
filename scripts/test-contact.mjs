// Проверка формы без сервера: прогоняет валидацию и, если в .env есть chat_id,
// реально отправляет тестовое сообщение в Telegram.
//
// Запуск: node --env-file=.env scripts/test-contact.mjs

import { validate, buildText, sendTelegram } from '../api/contact.js';

const payload = {
  name: 'Тест',
  contact: '@test',
  type: 'full',
  message: 'Проверка формы. Если вы это видите — доставка работает.'
};

const result = validate(payload);
console.log('валидация:', result.ok ? 'ок' : 'ошибка', JSON.stringify(result.errors));

const text = buildText(result.value);
console.log('--- текст сообщения ---');
console.log(text);
console.log('-----------------------');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token) {
  console.log('нет TELEGRAM_BOT_TOKEN в .env');
  process.exit(0);
}

if (!chatId) {
  console.log('нет TELEGRAM_CHAT_ID в .env — отправку пропускаю');
  process.exit(0);
}

const sent = await sendTelegram({ token, chatId, text });
console.log('отправка:', sent.ok ? 'доставлено' : 'не доставлено', sent.reason || sent.status || '');

const bad = validate({ name: 'a', contact: '', type: 'hack' });
console.log('плохие данные:', bad.ok ? 'ПРОПУЩЕНЫ (ошибка)' : 'отклонены', JSON.stringify(bad.errors));

const bot = validate({ name: 'Бот', contact: 'spam@spam.ru', company: 'ООО Ромашка' });
console.log('honeypot:', bot.errors.spam ? 'пойман' : 'НЕ ПОЙМАН (ошибка)');
