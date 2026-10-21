/**
 * 機器定義のプレビュー画像を作る開発用スクリプト。
 *
 *   npm run render-device -- src/devices/catalog/xxx.ts [出力先.png] [--no-terminals] [--param key=value ...]
 *
 * --param でパラメータを指定して描画できる（svg が関数の機器の確認用）。
 * 端子位置には赤い丸と端子IDを重ねて描く（--no-terminals で非表示）。
 * あわせて定義の基本的な整合性（端子IDの重複、範囲外の端子、{{uid}} の付け忘れ）を検査する。
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from '../src/devices/types';

const rawArgs = process.argv.slice(2);
const paramArgs: string[] = [];
const args: string[] = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--param') paramArgs.push(rawArgs[++i] ?? '');
  else args.push(rawArgs[i]);
}
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: npm run render-device -- <device.ts> [out.png] [--no-terminals]');
  process.exit(1);
}
const out = args.filter((a) => !a.startsWith('--'))[1] ?? file.replace(/\.ts$/, '.preview.png');
const showTerminals = !args.includes('--no-terminals');

const mod = await import(pathToFileURL(resolve(file)).href);
const def: DeviceDefinition = mod.default;

const params: ParamValues = {};
for (const a of paramArgs) {
  const [k, v] = a.split('=');
  params[k] = v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;
}
const svgSource = typeof def.svg === 'function' ? def.svg(paramsWithDefaults(def, params)) : def.svg;

const problems: string[] = [];
const ids = new Set<string>();
for (const t of def.terminals) {
  if (ids.has(t.id)) problems.push(`端子IDが重複: ${t.id}`);
  ids.add(t.id);
  if (t.x < 0 || t.x > def.width || t.y < 0 || t.y > def.height) problems.push(`端子が範囲外: ${t.id}`);
  if (t.role === 'supply' && !t.supply) problems.push(`supply 端子に supply 指定がない: ${t.id}`);
  if (t.role === 'input' && !t.accepts) problems.push(`input 端子に accepts 指定がない: ${t.id}`);
  if (t.role === 'connector' && !t.connector) problems.push(`connector 端子に connector 指定がない: ${t.id}`);
}
const pinIds = new Set<string>();
for (const p of def.pins ?? []) {
  const [cn, no] = p.id.split('#');
  const conn = def.terminals.find((t) => t.id === cn)?.connector;
  if (!conn || !(Number(no) >= 1 && Number(no) <= conn.pins)) problems.push(`ピンIDが不正（'<コネクタ端子ID>#<1〜ピン数>'）: ${p.id}`);
  if (pinIds.has(p.id)) problems.push(`ピンIDが重複: ${p.id}`);
  pinIds.add(p.id);
}
for (const id of pinIds) ids.add(id);
for (const l of def.links ?? []) {
  if (!ids.has(l.from) || !ids.has(l.to)) problems.push(`links に存在しない端子: ${l.from} -> ${l.to}`);
}
for (const g of def.distinctGroups ?? []) {
  for (const id of g) if (!ids.has(id)) problems.push(`distinctGroups に存在しない端子: ${id}`);
}
const idAttrs = [...svgSource.matchAll(/\bid="([^"]*)"/g)].map((m) => m[1]);
for (const id of idAttrs) if (!id.includes('{{uid}}')) problems.push(`SVGのidに {{uid}} がない: ${id}`);
if (/<script|<image|<foreignObject|href="http/i.test(svgSource)) problems.push('SVGに使用禁止の要素/外部参照がある');

const svgBody = svgSource.split('{{uid}}').join('preview');
const markers = showTerminals
  ? def.terminals
      .map(
        (t) =>
          (t.connector
            ? `<rect x="${t.x - (t.side === 'top' || t.side === 'bottom' ? t.connector.width / 2 : 2)}" y="${t.y - (t.side === 'top' || t.side === 'bottom' ? 2 : t.connector.width / 2)}" width="${t.side === 'top' || t.side === 'bottom' ? t.connector.width : 4}" height="${t.side === 'top' || t.side === 'bottom' ? 4 : t.connector.width}" fill="none" stroke="red" stroke-width="1"/>`
            : '') +
          `<circle cx="${t.x}" cy="${t.y}" r="3" fill="none" stroke="red" stroke-width="1.2"/>` +
          `<text x="${t.x + 4}" y="${t.y - 4}" font-size="9" fill="red" font-family="sans-serif">${t.id}</text>`,
      )
      .join('')
  : '';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${def.width} ${def.height}" width="${def.width}" height="${def.height}"><rect width="100%" height="100%" fill="#f4f6f8"/>${svgBody}${markers}</svg>`;

try {
  const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 3 }, font: { loadSystemFonts: true } }).render().asPng();
  writeFileSync(out, png);
  console.log(`rendered: ${out} (${def.width}x${def.height})`);
} catch (e) {
  problems.push(`SVGの描画に失敗: ${(e as Error).message}`);
}

if (problems.length) {
  console.error('問題:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(2);
}
console.log('検査OK');
