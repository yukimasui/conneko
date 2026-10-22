/**
 * 展開図 JSON（conneko-schematic）の見本を作る開発用スクリプト。
 *
 *   npm run schematic-sample -- [出力先.json] [--png]
 *
 * 1 枚目は記号ライブラリの全記号の一覧（回転した配置と箱の例を含む）、2 枚目は自己保持回路の段の見本。
 * 出力先の既定は tools/dxf/samples/sample.json（Python スクリプトの確認に使う）。
 * --png を付けると、アプリ側の描画（src/schematic/svg.ts）でシートごとの PNG も出す（<出力先>.<シートID>.png）。
 */
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import {
  PAPER_SIZES,
  SCHEMATIC_FORMAT,
  SCHEMATIC_LAYERS,
  SCHEMATIC_VERSION,
  type Point,
  type SchematicExport,
  type SchematicInsert,
  type SchematicSheetOut,
  type SymbolDef,
} from '../src/schematic/format';
import { pinPoint } from '../src/schematic/place';
import { sheetSvg } from '../src/schematic/svg';
import { boxSymbol, LIBRARY_SYMBOL_IDS, librarySymbol } from '../src/schematic/symbols';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'tools/dxf/samples/sample.json';
const png = args.includes('--png');

const symbols: Record<string, SymbolDef> = {};
const use = (id: string): SymbolDef => {
  const def = symbols[id] ?? librarySymbol(id);
  if (!def) throw new Error(`記号 ${id} がありません`);
  symbols[id] = def;
  return def;
};

const { width: W, height: H } = PAPER_SIZES.A3;

/** 図面枠と表題欄（仮。図面枠の作り込みは段階 3） */
function frame(sheet: SchematicSheetOut, title: string) {
  sheet.polylines.push(
    { points: [[10, 10], [W - 10, 10], [W - 10, H - 10], [10, H - 10]], closed: true, layer: 'FRAME' },
    { points: [[W - 130, 10], [W - 10, 10], [W - 10, 30], [W - 130, 30]], closed: true, layer: 'FRAME' },
  );
  sheet.texts.push(
    { at: [W - 125, 24], text: 'Conneko 展開図の見本', height: 3, align: 'left', layer: 'FRAME' },
    { at: [W - 125, 15], text: title, height: 3.5, align: 'left', layer: 'FRAME' },
  );
}

// ---- 1 枚目: 記号一覧 ----

const catalog: SchematicSheetOut = { id: 'D1', name: '記号一覧', paper: { width: W, height: H }, inserts: [], polylines: [], dots: [], texts: [] };
frame(catalog, '記号一覧（JIS C 0617）');

/** 見本の属性の値（端子番号は記号の端子名） */
function sampleAttributes(def: SymbolDef): Record<string, string> {
  const values: Record<string, string> = { TAG: 'X1', ADDR: 'X000', XREF: '12', COMMENT: 'コメント' };
  for (const pin of Object.keys(def.pins)) values[`T${pin}`] = pin;
  return values;
}

const cells: { id: string; label: string; rotation?: number }[] = [
  ...LIBRARY_SYMBOL_IDS.filter((id) => !id.endsWith('-v')).map((id) => ({ id, label: id })),
  { id: 'elb-3p', label: 'elb-3p（270° 回転）', rotation: 270 },
  { id: 'box_sample', label: '箱（機器ごとに作る）' },
];
symbols.box_sample = boxSymbol('PS5R-VE24', [
  { pin: 'L', label: 'L' },
  { pin: 'N', label: 'N' },
  { pin: 'FG', label: 'FG' },
], [
  { pin: '+V', label: '+V' },
  { pin: '-V', label: '-V' },
]);

const COLS = 7;
const CELL_W = 55;
const CELL_H = 42;
cells.forEach((c, i) => {
  const def = use(c.id);
  const x = 15 + (i % COLS) * CELL_W;
  const top = H - 15 - Math.floor(i / COLS) * CELL_H;
  const at: Point = c.rotation ? [x + 20, top - 10] : [x + 10, top - 14];
  catalog.inserts.push({ symbol: c.id, at, rotation: c.rotation, layer: 'SYMBOL', attributes: sampleAttributes(def) });
  catalog.texts.push({ at: [x + 2, top - CELL_H + 4], text: c.label, height: 2, align: 'left', layer: 'TEXT' });
});

// ---- 3 枚目: 縦向き（主回路）の記号の一覧 ----

const verticalCatalog: SchematicSheetOut = { id: 'D3', name: '記号一覧（縦）', paper: { width: W, height: H }, inserts: [], polylines: [], dots: [], texts: [] };
frame(verticalCatalog, '記号一覧（縦向き・主回路）');
LIBRARY_SYMBOL_IDS.filter((id) => id.endsWith('-v')).forEach((id, i) => {
  const def = use(id);
  const x = 15 + (i % COLS) * CELL_W;
  const top = H - 15 - Math.floor(i / COLS) * CELL_H;
  verticalCatalog.inserts.push({ symbol: id, at: [x + 12, top - 8], layer: 'SYMBOL', attributes: sampleAttributes(def) });
  verticalCatalog.texts.push({ at: [x + 2, top - CELL_H + 4], text: id, height: 2, align: 'left', layer: 'TEXT' });
});

// ---- 2 枚目: 段の見本（自己保持回路） ----

const ladder: SchematicSheetOut = { id: 'D2', name: '見本の段', paper: { width: W, height: H }, inserts: [], polylines: [], dots: [], texts: [] };
frame(ladder, '見本の段（自己保持回路）');

const RAIL_L = 40;
const RAIL_R = 380;
const ROW = [250, 235, 220];
const ROW_NO = [1, 2, 3];

/** 記号を置き、端子の位置を返す */
function put(symbol: string, x: number, y: number, attributes: Record<string, string>): { p1: Point; p2: Point; ins: SchematicInsert } {
  const def = use(symbol);
  const ins: SchematicInsert = { symbol, at: [x, y], layer: 'SYMBOL', attributes };
  ladder.inserts.push(ins);
  return { p1: pinPoint(def, '1', [x, y]), p2: pinPoint(def, '2', [x, y]), ins };
}
/** 線と線番 */
function wire(points: Point[], wireNo?: string) {
  ladder.polylines.push({ points, layer: 'WIRE' });
  if (!wireNo) return;
  // 線番は最初の横向きの区間の中央の上に書く
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (a[1] === b[1]) {
      ladder.texts.push({ at: [(a[0] + b[0]) / 2, a[1] + 1.8], text: wireNo, height: 2.5, layer: 'WIRENO' });
      return;
    }
  }
}

// 母線と行番号
ladder.polylines.push({ points: [[RAIL_L, 265], [RAIL_L, 205]], layer: 'WIRE' }, { points: [[RAIL_R, 265], [RAIL_R, 205]], layer: 'WIRE' });
ladder.texts.push(
  { at: [RAIL_L, 268], text: '+24V', height: 2.5, layer: 'TAG' },
  { at: [RAIL_R, 268], text: '0V', height: 2.5, layer: 'TAG' },
);
ROW.forEach((y, i) => ladder.texts.push({ at: [25, y], text: String(ROW_NO[i]), height: 2.5, layer: 'FRAME' }));

// 1 行目: 停止 PB2（b）→ 起動 PB1（a）→ サーマル THR1（b）→ MC1 コイル
const pb2 = put('contact-nc-pushbutton', 60, ROW[0], { TAG: 'PB2', T1: '11', T2: '12' });
const pb1 = put('contact-no-pushbutton', 90, ROW[0], { TAG: 'PB1', T1: '13', T2: '14' });
const thr = put('contact-nc-thermal', 130, ROW[0], { TAG: 'THR1', T1: '95', T2: '96' });
const mc = put('coil', 330, ROW[0], { TAG: 'MC1', T1: 'A1', T2: 'A2', XREF: '2, 3' });
wire([[RAIL_L, ROW[0]], pb2.p1], '1');
wire([pb2.p2, pb1.p1], '2');
wire([pb1.p2, thr.p1], '3');
wire([thr.p2, mc.p1], '4');
wire([mc.p2, [RAIL_R, ROW[0]]], 'N');

// 2 行目: 自己保持 MC1 13-14（PB1 と並列）
const hold = put('contact-no', 90, ROW[1], { TAG: 'MC1', T1: '13', T2: '14', XREF: '1' });
wire([[80, ROW[0]], [80, ROW[1]], hold.p1]);
wire([hold.p2, [110, ROW[1]], [110, ROW[0]]]);
ladder.dots.push({ at: [80, ROW[0]], layer: 'WIRE' }, { at: [110, ROW[0]], layer: 'WIRE' });

// 3 行目: MC1 43-44 → 運転表示灯 PL1
const run = put('contact-no', 60, ROW[2], { TAG: 'MC1', T1: '43', T2: '44', XREF: '1' });
const pl = put('lamp', 330, ROW[2], { TAG: 'PL1', T1: 'X1', T2: 'X2' });
wire([[RAIL_L, ROW[2]], run.p1], '1');
wire([run.p2, pl.p1], '5');
wire([pl.p2, [RAIL_R, ROW[2]]], 'N');
for (const y of [ROW[0], ROW[2]]) ladder.dots.push({ at: [RAIL_L, y], layer: 'WIRE' }, { at: [RAIL_R, y], layer: 'WIRE' });

const doc: SchematicExport = {
  format: SCHEMATIC_FORMAT,
  version: SCHEMATIC_VERSION,
  unit: 'mm',
  title: 'Conneko 展開図の見本',
  revision: 'A',
  layers: SCHEMATIC_LAYERS,
  symbols,
  sheets: [catalog, ladder, verticalCatalog],
};

/** 数値を丸め、座標の [x, y] は 1 行に収めた JSON */
function toJson(v: unknown): string {
  const text = JSON.stringify(v, (_, x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x), 2);
  return text.replace(/\[\s*(-?[\d.e+-]+),\s*(-?[\d.e+-]+)\s*\]/g, '[$1, $2]') + '\n';
}

writeFileSync(out, toJson(doc));
console.log(`展開図 JSON を出力: ${out}`);

if (png) {
  for (const sheet of doc.sheets) {
    const svg = sheetSvg(doc, sheet);
    const image = new Resvg(svg, {
      fitTo: { mode: 'width', value: 2520 },
      font: { loadSystemFonts: true, defaultFontFamily: 'Noto Sans CJK JP' },
    }).render();
    const file = out.replace(/\.json$/, '') + `.${sheet.id}.png`;
    writeFileSync(file, image.asPng());
    console.log(`PNG を出力: ${file}`);
  }
}
