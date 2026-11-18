// Приём заявки с формы. Единственная серверная часть сайта.
// Живёт как функция Vercel: файл в /api автоматически становится эндпоинтом /api/contact.
// Токен бота читается из переменных окружения и никогда не попадает в браузер.

const ALLOWED_TYPES = new Set(['full', 'design', 'support', 'other']);

const TYPE_LABELS = {
  full: 'Сайт под ключ',
  design: 'Только дизайн',
  support: 'Поддержка',
  other: 'Пока не знаю'
};

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validate(payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const errors = {};

  const name = str(data.name).slice(0, 80);
  const contact = str(data.contact).slice(0, 120);
  const message = str(data.message).slice(0, 2000);
  const type = ALLOWED_TYPES.has(data.type) ? data.type : 'other';

  if (name.length < 2) errors.name = 'Укажите имя';
  if (contact.length < 3) errors.contact = 'Укажите Telegram или почту';

  // Ловушка для ботов: поле скрыто от людей, но автозаполнялки в него лезут.
  if (str(data.company).length > 0) errors.spam = 'spam';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, contact, message, type }
  };
}

export function buildText(value) {
  const lines = [
    'Новая заявка с сайта',
    '',
    'Имя: ' + value.name,
    'Контакт: ' + value.contact,
    'Что нужно: ' + (TYPE_LABELS[value.type] || value.type)
  ];

  if (value.message) {
    lines.push('', 'О проекте:', value.message);
  }

  return lines.join('\n');
}

export async function sendTelegram({ token, chatId, text, fetchImpl = fetch }) {
  if (!token || !chatId) {
    return { ok: false, reason: 'not-configured' };
  }

  try {
    const res = await fetchImpl('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    return { ok: res.ok && data && data.ok === true, status: res.status };
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // прямые запросы без браузера пропускаем: защита от чужих страниц, а не от curl
  try {
    const host = new URL(origin).host;
    const target = req.headers.host;
    return !target || host === target;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method' });
    return;
  }

  if (!sameOrigin(req)) {
    res.status(403).json({ ok: false, error: 'origin' });
    return;
  }

  const raw = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const result = validate(raw);

  if (!result.ok) {
    if (result.errors.spam) {
      res.status(200).json({ ok: true }); // боту отвечаем «успех», чтобы не подсказывать
      return;
    }
    res.status(422).json({ ok: false, errors: result.errors });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const sent = await sendTelegram({ token, chatId, text: buildText(result.value) });

  if (!sent.ok) {
    console.error('contact: telegram failed', sent.reason || sent.status);
    res.status(502).json({ ok: false, error: 'delivery' });
    return;
  }

  res.status(200).json({ ok: true });
}

function safeParse(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    return {};
  }
}
