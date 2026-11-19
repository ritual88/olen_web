// Разбор отчёта Lighthouse: оценки, метрики, главные возможности роста.
// Запуск: node scripts/lh-report.mjs previews/lh-mobile.json

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Укажи путь к JSON-отчёту');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const cats = data.categories;

const score = (v) => Math.round(v * 100);
console.log('=== ' + (data.configSettings?.formFactor === 'desktop' ? 'ДЕСКТОП' : 'МОБИЛЬНЫЙ') + ' ===');
for (const key of ['performance', 'accessibility', 'best-practices', 'seo']) {
  if (cats[key]) console.log(String(cats[key].title).padEnd(18), score(cats[key].score));
}

const metrics = [
  ['first-contentful-paint', 'FCP'],
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
  ['speed-index', 'Speed Index']
];

console.log('\n--- метрики ---');
for (const [id, label] of metrics) {
  const a = data.audits[id];
  if (a) console.log(label.padEnd(14), a.displayValue || '', '  (' + a.score + ')');
}

const failed = Object.values(data.audits)
  .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary')
  .map((a) => '- ' + a.title);

if (failed.length) {
  console.log('\n--- не пройдено ---');
  failed.slice(0, 15).forEach((line) => console.log(line));
}

const opps = Object.values(data.audits)
  .filter((a) => a.details && a.details.type === 'opportunity' && a.numericValue > 0)
  .sort((a, b) => b.numericValue - a.numericValue)
  .slice(0, 8);

if (opps.length) {
  console.log('\n--- что ускорит ---');
  for (const o of opps) {
    console.log('- ' + o.title + ': ' + Math.round(o.numericValue) + ' мс');
  }
}
