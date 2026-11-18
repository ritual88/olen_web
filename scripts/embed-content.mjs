// Вставляет содержимое content.json прямо в редактор.
// Нужно, чтобы редактор работал и без сервера — двойным щелчком по файлу.
// Запускается автоматически перед сборкой (npm run build → prebuild).

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contentPath = path.join(root, 'public', 'content.json');
const editorPath = path.join(root, 'public', 'tools', 'editor.html');

const json = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const safe = JSON.stringify(json).replace(/</g, '\\u003c');

let html = fs.readFileSync(editorPath, 'utf8');

if (!html.includes('<!--CONTENT-START-->')) {
  console.error('В editor.html нет маркеров CONTENT-START / CONTENT-END');
  process.exit(1);
}

const block =
  '<!--CONTENT-START-->\n' +
  '<script id="initial-content" type="application/json">' +
  safe +
  '</script>\n' +
  '<!--CONTENT-END-->';

html = html.replace(/<!--CONTENT-START-->[\s\S]*?<!--CONTENT-END-->/, block);
fs.writeFileSync(editorPath, html, 'utf8');

console.log('editor.html: встроено полей контента —', Object.keys(json).length);
