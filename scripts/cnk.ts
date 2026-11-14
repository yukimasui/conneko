/**
 * 配線言語（.cnk）のコマンドライン。
 *
 *   npm run cnk -- check <ファイル.cnk>               構文・名前の解決・電気的なチェックをして、指摘をコンパイラ風に表示する
 *   npm run cnk -- build <ファイル.cnk> [出力先.json]  図面 JSON（conneko-diagram）にする。アプリの「開く」で読み込める
 *   npm run cnk -- print <図面.json> [出力先.cnk]      図面 JSON を配線言語にする（--positions で機器の位置も書く）
 *   npm run cnk -- devices [検索語]                    機器カタログの機器種別を一覧する
 *   npm run cnk -- terminals <機器種別> [名前=値 …]     機器の端子とパラメータを表示する
 *
 * check は、エラーがあれば終了コード 1 を返す（--strict を付けると警告でも 1）。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveDevice } from '../src/devices/resolve';
import type { DeviceDefinition, ParamValues } from '../src/devices/types';
import { checkSource, formatDiagnostic, summarize } from '../src/lang/check';
import { printDiagram } from '../src/lang/print';
import { parseDiagram, toDiagramFile } from '../src/model/diagram';

/** 機器カタログを読み込む（アプリは Vite の import.meta.glob で読むが、ここではファイルを直接読む） */
async function loadCatalog(): Promise<DeviceDefinition[]> {
  const dir = resolve(import.meta.dirname, '../src/devices/catalog');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  const mods = await Promise.all(files.map((f) => import(pathToFileURL(resolve(dir, f)).href)));
  return mods.map((m) => m.default as DeviceDefinition).filter((d) => !!d && typeof d.type === 'string');
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [command, ...rest] = args.filter((a) => !a.startsWith('--'));

function usage(): never {
  console.error('使い方: npm run cnk -- <check|build|print|devices|terminals> …（scripts/cnk.ts の先頭を参照）');
  process.exit(2);
}
if (!command) usage();

/** ファイルを読む。なければ、スタックではなく 1 行で知らせる */
function read(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`${file} を読めません（${(e as NodeJS.ErrnoException).code ?? (e as Error).message}）`);
    process.exit(2);
  }
}

const defs = await loadCatalog();
const byType = new Map(defs.map((d) => [d.type, d]));
const lookup = (type: string) => byType.get(type);

if (command === 'check' || command === 'build') {
  const file = rest[0] ?? usage();
  const source = read(file);
  const result = checkSource(source, { lookup, defs });
  for (const d of result.diagnostics) console.log(`${formatDiagnostic(d, source, file)}\n`);
  const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = result.diagnostics.filter((d) => d.severity === 'warning').length;
  console.log(`${basename(file)}: ${summarize(result.diagnostics)}（機器 ${result.diagram.devices.length} 台、電線 ${result.diagram.wires.length} 本）`);
  if (command === 'build') {
    if (!result.ok) {
      console.error('構文・名前の解決にエラーがあるため、図面 JSON は書き出しません');
      process.exit(1);
    }
    const out = rest[1] ?? file.replace(/\.cnk$/, '') + '.json';
    writeFileSync(out, `${JSON.stringify(toDiagramFile(result.diagram), null, 2)}\n`);
    console.log(`${out} に書き出しました`);
  }
  process.exit(errors || (flags.has('--strict') && warnings) ? 1 : 0);
} else if (command === 'print') {
  const file = rest[0] ?? usage();
  let text: string;
  try {
    text = printDiagram(parseDiagram(read(file)), { lookup, positions: flags.has('--positions') });
  } catch (e) {
    console.error(`${file}: ${(e as Error).message}`);
    process.exit(1);
  }
  if (rest[1]) writeFileSync(rest[1], text);
  else process.stdout.write(text);
} else if (command === 'devices') {
  const q = (rest[0] ?? '').toLowerCase();
  const hits = defs.filter((d) => !q || [d.type, d.name, d.model, d.maker ?? '', d.category].some((s) => s.toLowerCase().includes(q)));
  for (const d of hits.sort((a, b) => (a.type < b.type ? -1 : 1))) console.log(`${d.type.padEnd(40)} ${d.name}（${d.model}）`);
  console.log(`${hits.length} 機種`);
} else if (command === 'terminals') {
  const def = lookup(rest[0] ?? usage());
  if (!def) {
    console.error(`機器種別 "${rest[0]}" は機器カタログにありません`);
    process.exit(1);
  }
  const params: ParamValues = {};
  for (const kv of rest.slice(1)) {
    const [k, v] = kv.split('=');
    const opt = def.params?.find((p) => p.key === k)?.options.find((o) => String(o.value) === v);
    params[k] = opt ? opt.value : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  }
  const r = resolveDevice(def, params);
  console.log(`${def.type}  ${def.name}（${def.model}）  機器名の接頭辞 ${def.labelPrefix}`);
  for (const p of def.params ?? []) {
    console.log(`  パラメータ ${p.key}（${p.label}${p.unit ? ` [${p.unit}]` : ''}） 既定 ${p.default}${p.input === 'text' ? '' : `  選択肢: ${p.options.map((o) => o.value).join(', ')}`}`);
  }
  for (const t of r.terminals) {
    const spec = t.supply ? `電源出力 ${t.supply.system}` : t.connector ? `コネクタ ${t.connector.kind}（${t.connector.pins} ピン）` : t.air ? `エア ${t.air.kind}` : t.signal ? `信号 ${t.signal.dir} ${t.signal.kind}` : '';
    console.log(`  ${t.id.padEnd(12)} ${t.role.padEnd(9)} ${[t.label && t.label !== t.id ? t.label : '', t.note ?? '', spec].filter(Boolean).join(' / ')}`);
  }
  if (r.pins.length) console.log(`  ピン: ${r.pins[0].id} 〜 ${r.pins[r.pins.length - 1].id}（${r.pins.length} 本）`);
} else {
  usage();
}
