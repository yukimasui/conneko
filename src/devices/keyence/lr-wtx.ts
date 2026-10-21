/**
 * KEYENCE のアンプ内蔵型レーザ・LED 光電センサ LR-W（ホワイトスポット）、LR-T（TOF レーザ）、LR-X（CMOS レーザ、ケーブル中継アンプ）。
 *
 * 外形（KEYENCE 外形寸法図より、1mm ≒ 2px）:
 * - LR-W500: 38.1 × 46.7 × 24.6 mm、LR-W70 / LR-WF10: 32.3 × 44.5 × 19.9 mm。アルミの銀色の本体、前面に検出窓、
 *   背面に表示とボタン、底面は赤い樹脂。ケーブルは背面下から斜め、コネクタタイプ（…C）は底面に M12 オスコネクタ
 * - LR-TB2000: 41 × 36.9 × 22.1 mm、LR-TB5000: 51.4 × 43.2 × 30.6 mm。前面に大きな検出窓、上面に表示とボタン。
 *   ケーブルは底面の後ろ寄りから下へ、コネクタタイプ（…C）は 0.15m のケーブル付 M12
 * - LR-X: 小さなセンサヘッドと、ケーブルの途中のアンプ（表示付き）。ケーブルタイプは 2m のバラ線、…C はアンプの先に M8
 *
 * 配線（KEYENCE 取扱説明書・カタログより）:
 * - LR-W: 茶（1）= DC10〜30V、黒（4）= 制御出力、白（2）= 外部入力（チューニング / 投光停止）、青（3）= 0V。
 *   NPN / PNP は初期設定で選ぶ。LR-W70 取扱説明書 96M13827 https://www.afmeng.com/PDFFiles/AS_77442_LR-W70_IM_96M13827_GB_WW_1125-1.pdf
 * - LR-T: 茶（1）= DC20〜30V、青（3）= 0V、黒（4）・白（2）の機能は初期設定で選ぶ
 *   （出力1+出力2: 黒 = 出力1・白 = 出力2 / 入力+出力1: 黒 = 外部入力・白 = 出力1 / 出力1+アナログ・入力+アナログ（TB5000 のみ）: 白 = アナログ）。
 *   LR-TB2000 取扱説明書 96M12738 https://www.nexinstrument.com/assets/images/pdf/LR-TB2000%20Series_All-Purpose%20Laser%20Sensor.pdf
 *   LR-TB5000 取扱説明書 https://www.manualsdir.com/manuals/657869/keyence-lr-tb5000-series.html
 * - LR-X: 茶（1）= DC16〜30V、黒（4）= 出力1、白（2）= 出力2 または外部入力（初期設定）、青（3）= 0V。NPN / PNP も初期設定。
 *   LR-X カタログ p.20〜21 https://5.imimg.com/data5/SELLER/Doc/2022/9/EF/PO/AN/29295296/laser-sensor-lr-x100.pdf
 * 外部入力は NPN の設定では 0V、PNP の設定では +V と短絡して ON。
 * 仕様: https://www.keyence.co.jp/products/sensor/photoelectric/lr-w/specs/ 、/lr-t/specs/ 、/lr-x/specs/
 */
import type { DeviceDefinition, ParamDef, ParamValues, SignalSpec } from '../types';
import { buildPhoto, cableHint, type PhotoConn } from './photo';
import { OUTPUT_PARAM, outName, pick, sensorInput, switchedOut, type Lead } from './sensor-parts';
import { PIN2_PARAM } from './amp-series';

const defs = `
  <defs>
    <linearGradient id="lralu-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef0f2"/>
      <stop offset="0.5" stop-color="#c3c8cd"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <linearGradient id="lrwin-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a1a1a"/>
      <stop offset="0.5" stop-color="#2a0808"/>
      <stop offset="1" stop-color="#140404"/>
    </linearGradient>
    <linearGradient id="lrblk-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b3d41"/>
      <stop offset="1" stop-color="#1a1b1d"/>
    </linearGradient>
  </defs>`;

const lines = (x: number, y: number, rows: string[], size = 2.8, color = '#333') =>
  rows.map((t, i) => `<text x="${x}" y="${y + i * (size + 1.2)}" font-family="sans-serif" font-size="${size}" fill="${color}">${t}</text>`).join('');

/* ------------------------------------------------------------------ */
/* LR-W                                                                 */
/* ------------------------------------------------------------------ */

interface LrwType {
  code: string;
  kind: string;
  range: string;
  w: number;
  h: number;
  current: number;
}
const LRW_TYPES: LrwType[] = [
  { code: 'W500', kind: 'ホワイトスポット 標準', range: '30〜500mm', w: 76, h: 93, current: 0.065 },
  { code: 'W70', kind: 'ホワイトスポット 小型小スポット', range: '30〜70mm', w: 65, h: 89, current: 0.06 },
  { code: 'WF10', kind: 'ホワイトスポット ファイバ型', range: 'ファイバによる', w: 65, h: 89, current: 0.05 },
];

/** LR-W の側面（右下 = 背面下の角を (xr, yb) にそろえる）と背面 */
function lrwBody(t: LrwType, model: string, xr: number, yb: number, conn: 'cable' | 'M12') {
  const x = xr - t.w;
  const y = yb - t.h;
  const fiber = t.code === 'WF10';
  return `
  <!-- 側面（アルミ） -->
  <rect x="${x}" y="${y}" width="${t.w}" height="${t.h}" rx="3" fill="url(#lralu-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  <!-- 上面の表示灯・ダイヤル -->
  <rect x="${x + 8}" y="${y - 3}" width="22" height="4" rx="1.4" fill="#2a2b2e"/>
  <rect x="${x + 10}" y="${y - 2.4}" width="5" height="2.4" rx="0.6" fill="#ff9d2e"/>
  <rect x="${x + 16}" y="${y - 2.4}" width="5" height="2.4" rx="0.6" fill="#45e05f"/>
  <circle cx="${x + 27}" cy="${y - 1}" r="2.2" fill="#c9ccd0" stroke="#55585d" stroke-width="0.4"/>
  <!-- 検出面（左端） -->
  <rect x="${x - 2}" y="${y + 10}" width="6" height="${t.h * 0.62}" rx="1.4" fill="url(#lrwin-{{uid}})" stroke="#0b0b0c" stroke-width="0.5"/>
  ${fiber ? `<rect x="${x - 8}" y="${y + 20}" width="7" height="18" rx="1.5" fill="#1f2022"/><text x="${x - 4.5}" y="${y + 44}" text-anchor="middle" font-family="sans-serif" font-size="2.6" fill="#555">ファイバ</text>` : ''}
  <!-- 取付穴（後ろ寄り） -->
  ${[y + 6, y + t.h - 31].map((cy) => `<circle cx="${xr - 6}" cy="${cy}" r="3.2" fill="#f4f5f6" stroke="#6d7277" stroke-width="0.6"/>`).join('')}
  <!-- 底面の赤い樹脂部 -->
  <rect x="${x + 1}" y="${yb - 7}" width="${t.w - 2}" height="7" rx="1.5" fill="#c8262a" stroke="#7a1414" stroke-width="0.5"/>
  <!-- 銘板 -->
  <text x="${x + t.w * 0.55}" y="${y + 14}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#1d2a3a">KEYENCE</text>
  <text x="${x + t.w * 0.55}" y="${y + 20}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">${model}</text>
  ${lines(x + 12, y + 28, ['BN: 10-30VDC', 'BU: 0V', 'BK: OUTPUT', 'WH: EXT. INPUT', 'IO-Link'], 2.7, '#444')}
  <circle cx="${x + t.w - 16}" cy="${yb - 18}" r="3" fill="none" stroke="#555" stroke-width="0.5"/>
  <text x="${x + t.w - 16}" y="${yb - 16.8}" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#555">CE</text>
  <!-- 背面（表示とボタン） -->
  <rect x="${xr + 6}" y="${y + 2}" width="22" height="${t.h - 2}" rx="2.5" fill="url(#lralu-{{uid}})" stroke="#5c6166" stroke-width="0.7"/>
  <rect x="${xr + 10}" y="${y + 22}" width="14" height="22" rx="1" fill="#0b0b0c"/>
  <text x="${xr + 17}" y="${y + 36}" text-anchor="middle" font-family="monospace" font-size="5.5" font-weight="bold" fill="#ff3b30">850</text>
  <rect x="${xr + 10}" y="${y + 16}" width="6" height="3" rx="0.8" fill="#55585d"/><rect x="${xr + 18}" y="${y + 16}" width="6" height="3" rx="0.8" fill="#55585d"/>
  <rect x="${xr + 7}" y="${yb - 7}" width="20" height="7" rx="1.5" fill="#c8262a" stroke="#7a1414" stroke-width="0.5"/>
  ${conn === 'cable' ? `<path d="M${xr - 14} ${yb - 1} l8 0 l3 6 l-7 3 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>` : ''}`;
}

export function buildLrw(conn: 'cable' | 'M12'): DeviceDefinition {
  const t = (p: ParamValues) => pick(LRW_TYPES, p.model);
  const XR = 94;
  const YB = 118;
  const leads: Lead[] = [
    { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'BK', label: '制御出力（NPN/PNP は設定による）', role: 'out', signal: switchedOut },
    { color: 'WH', label: '外部入力（チューニング/投光停止）', role: 'in', signal: sensorInput },
  ];
  const name = (p: ParamValues) => `LR-${t(p).code}${conn === 'M12' ? 'C' : ''}`;
  return buildPhoto({
    type: conn === 'M12' ? 'keyence.lr-w.m12' : 'keyence.lr-w',
    name: '光電センサ（ホワイトスポット）',
    model: `LR-W500/W70/WF10${conn === 'M12' ? '（C、M12 コネクタ）' : '（ケーブル）'}`,
    labelPrefix: 'PH',
    description:
      `KEYENCE のホワイトスポット光電センサ LR-W シリーズ（${conn === 'M12' ? 'M12 4ピン コネクタ' : 'ケーブル 2m'}）。` +
      `種類は params の model で選ぶ: ${LRW_TYPES.map((m) => `LR-${m.code}（${m.kind} ${m.range}）`).join('、')}。` +
      'NPN / PNP は初期設定で選ぶ（params の output）。' +
      `${conn === 'M12' ? 'M12 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力、2（白）= 外部入力' : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力、白 = 外部入力'}。` +
      '外部入力はチューニング / 投光停止を選べ、NPN の設定では 0V、PNP の設定では +V と短絡で ON。制御出力はオープンコレクタ DC30V 以下・50mA 以下（IO-Link 対応）。' +
      cableHint(conn) +
      '電源 DC10〜30V、消費電流 24V 時 50〜65mA 以下（種類による）。',
    width: 130,
    body: (p) => `${defs}${lrwBody(t(p), name(p), XR, YB, conn)}`,
    exit: conn === 'M12' ? { x: XR - 20, y: YB } : { x: XR - 9, y: YB + 5 },
    leadCenterX: XR - 26,
    conn,
    cableLeads: leads,
    pinLeads: [leads[0], leads[3], leads[1], leads[2]],
    vmin: 10,
    vmax: 30,
    rated: 0.05,
    params: [
      { key: 'model', label: '種類（型式）', options: LRW_TYPES.map((m) => ({ value: m.code, label: `LR-${m.code}（${m.kind} ${m.range}）` })), default: 'W500' },
      { ...OUTPUT_PARAM, label: '出力形式（初期設定）' },
    ],
    loadCurrent: 0.065,
    title: (p) => `LR-${t(p).code} ${t(p).kind}・${outName(p)}`,
  });
}

/* ------------------------------------------------------------------ */
/* LR-T                                                                 */
/* ------------------------------------------------------------------ */

interface LrtType {
  code: string;
  range: string;
  w: number;
  h: number;
}
const LRT_TYPES: LrtType[] = [
  { code: 'TB2000', range: '60〜2000mm', w: 82, h: 74 },
  { code: 'TB5000', range: '60〜5000mm', w: 103, h: 86 },
];

/** 黒線・白線の機能（初期設定） */
export const LRT_IO_PARAM: ParamDef = {
  key: 'io',
  label: '入出力の組み合わせ（初期設定）',
  options: [
    { value: 'out2', label: '黒 = 出力1、白 = 出力2' },
    { value: 'in-out1', label: '黒 = 外部入力、白 = 出力1' },
    { value: 'out-analog', label: '黒 = 出力1、白 = アナログ（TB5000 のみ）' },
    { value: 'in-analog', label: '黒 = 外部入力、白 = アナログ（TB5000 のみ）' },
  ],
  default: 'out2',
};
const ANALOG_PARAM: ParamDef = {
  key: 'analog',
  label: 'アナログ出力',
  options: [
    { value: 'I', label: '電流 4〜20mA' },
    { value: 'V', label: '電圧 0〜10V' },
  ],
  default: 'I',
};
const analogOut = (p: ParamValues): SignalSpec => ({ dir: 'out', kind: p.analog === 'V' ? 'analog-v' : 'analog-i' });

function lrtBody(t: LrtType, model: string, xr: number, yb: number) {
  const x = xr - t.w;
  const y = yb - t.h;
  return `
  <!-- 本体（側面、アルミ） -->
  <rect x="${x}" y="${y}" width="${t.w}" height="${t.h}" rx="3" fill="url(#lralu-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  <!-- 上面の表示とボタン -->
  <rect x="${x + t.w * 0.4}" y="${y - 4}" width="${t.w * 0.38}" height="5" rx="1" fill="#0b0b0c"/>
  <text x="${x + t.w * 0.59}" y="${y - 0.3}" text-anchor="middle" font-family="monospace" font-size="4" font-weight="bold" fill="#ff3b30">1500</text>
  <rect x="${x + 8}" y="${y - 3.4}" width="${t.w * 0.28}" height="4" rx="1.2" fill="#2a2b2e"/>
  <rect x="${x + 10}" y="${y - 2.8}" width="4.5" height="2.4" rx="0.6" fill="#ff9d2e"/>
  <rect x="${x + 16}" y="${y - 2.8}" width="4.5" height="2.4" rx="0.6" fill="#45e05f"/>
  <!-- 検出面（左端の大きな窓） -->
  <rect x="${x - 2.5}" y="${y + 6}" width="7" height="${t.h - 12}" rx="1.6" fill="url(#lrwin-{{uid}})" stroke="#0b0b0c" stroke-width="0.5"/>
  <!-- 取付穴 -->
  <circle cx="${x + 10}" cy="${yb - 7}" r="3.2" fill="#f4f5f6" stroke="#6d7277" stroke-width="0.6"/>
  <circle cx="${xr - 12}" cy="${yb - 7 - t.h * 0.56}" r="3.2" fill="#f4f5f6" stroke="#6d7277" stroke-width="0.6"/>
  <text x="${x + t.w * 0.5}" y="${y + 13}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#1d2a3a">KEYENCE</text>
  <text x="${x + t.w * 0.5}" y="${y + 19}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">${model}</text>
  ${lines(x + 12, y + 27, ['BN: 20-30VDC', 'BU: 0V', 'BK/WH: I/O（設定）', 'CLASS 2 LASER'], 2.7, '#444')}
  <rect x="${xr - 12}" y="${yb - 4}" width="10" height="4" rx="1" fill="#1d1e20"/>`;
}

export function buildLrt(conn: 'cable' | 'M12-pigtail'): DeviceDefinition {
  const t = (p: ParamValues) => pick(LRT_TYPES, p.model);
  const XR = 120;
  const YB = 104;
  const bk: Lead = {
    color: 'BK',
    label: '出力1 / 外部入力（params の io で選ぶ）',
    role: 'out',
    signal: (p) => (String(p.io).startsWith('in') ? sensorInput(p) : switchedOut(p)),
  };
  const wh: Lead = {
    color: 'WH',
    label: '出力2 / 出力1 / アナログ（params の io で選ぶ）',
    role: 'out',
    signal: (p) => (String(p.io).endsWith('analog') ? analogOut(p) : switchedOut(p)),
  };
  const leads: Lead[] = [{ color: 'BN', label: '+V（DC20〜30V）', role: 'plus' }, { color: 'BU', label: '0V', role: 'minus' }, bk, wh];
  const name = (p: ParamValues) => `LR-${t(p).code}${conn === 'M12-pigtail' ? 'C' : ''}`;
  return buildPhoto({
    type: conn === 'cable' ? 'keyence.lr-t' : 'keyence.lr-t.m12',
    name: 'レーザセンサ（TOF）',
    model: `LR-TB2000/TB5000${conn === 'cable' ? '（ケーブル）' : 'C（ケーブル付 M12）'}`,
    labelPrefix: 'LS',
    description:
      `KEYENCE のアンプ内蔵型 TOF レーザセンサ LR-T シリーズ（${conn === 'cable' ? 'ケーブル 2m' : 'ケーブル付 M12 4ピン コネクタ（0.15m）'}）。` +
      `種類は params の model で選ぶ: ${LRT_TYPES.map((m) => `LR-${m.code}（${m.range}）`).join('、')}。` +
      'NPN / PNP（params の output）と、黒・白の線の機能（params の io）は初期設定で選ぶ: 黒 = 出力1・白 = 出力2 / 黒 = 外部入力・白 = 出力1 / 白 = アナログ出力（TB5000 のみ、params の analog で 4〜20mA か 0〜10V）。' +
      `${conn === 'cable' ? '芯線は茶 = +24V、青 = 0V、黒・白 = 入出力' : 'M12 のピン 1（茶）= +24V、3（青）= 0V、4（黒）・2（白）= 入出力'}。` +
      '外部入力（投光停止 / チューニング / DATUM 更新）は NPN の設定では 0V、PNP の設定では +V と短絡で ON。制御出力はオープンコレクタ DC30V 以下・50mA 以下（IO-Link 対応）。' +
      cableHint(conn) +
      '電源 DC20〜30V、消費電流 TB2000 45mA・TB5000 50mA 以下。レーザクラス 2。',
    width: 140,
    body: (p) => `${defs}${lrtBody(t(p), name(p), XR, YB)}`,
    exit: { x: XR - 7, y: YB },
    leadCenterX: XR - 30,
    conn,
    cableLeads: leads,
    pinLeads: [leads[0], wh, leads[1], bk],
    vmin: 20,
    vmax: 30,
    rated: 0.05,
    params: [
      { key: 'model', label: '種類（型式）', options: LRT_TYPES.map((m) => ({ value: m.code, label: `LR-${m.code}（${m.range}）` })), default: 'TB2000' },
      { ...OUTPUT_PARAM, label: '出力形式（初期設定）' },
      LRT_IO_PARAM,
      ANALOG_PARAM,
    ],
    loadCurrent: 0.05,
    title: (p) => `TOF レーザ LR-${t(p).code} ${t(p).range}・${outName(p)}`,
    pigtailLength: conn === 'M12-pigtail' ? '0.15m' : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* LR-X（ヘッド + ケーブル中継アンプ）                                   */
/* ------------------------------------------------------------------ */

const LRX_TYPES = [
  { code: 'X50', range: '25〜50mm' },
  { code: 'X100', range: '25〜100mm' },
  { code: 'X250', range: '30〜250mm' },
];

/** LR-X の姿: 左上にセンサヘッド、ケーブルの途中に縦向きのアンプ（下端が (cx, yb)） */
function lrxBody(model: string, cx: number, yb: number) {
  const ax = cx - 9;
  const ay = yb - 74;
  return `
  <!-- ヘッドからアンプへのケーブル -->
  <path d="M28 54 C28 72 ${cx} ${ay - 22} ${cx} ${ay + 2}" fill="none" stroke="#0e0e0f" stroke-width="5.4" stroke-linecap="round"/>
  <path d="M28 54 C28 72 ${cx} ${ay - 22} ${cx} ${ay + 2}" fill="none" stroke="#2b2c2e" stroke-width="4" stroke-linecap="round"/>
  <!-- センサヘッド（銀色の小さな箱、前面が左） -->
  <rect x="14" y="16" width="30" height="38" rx="2.5" fill="url(#lralu-{{uid}})" stroke="#5c6166" stroke-width="0.7"/>
  <rect x="12" y="22" width="5" height="22" rx="1.2" fill="url(#lrwin-{{uid}})" stroke="#0b0b0c" stroke-width="0.4"/>
  <rect x="22" y="20" width="14" height="5" rx="1" fill="#2a2b2e"/>
  <rect x="24" y="21" width="10" height="3" rx="0.6" fill="#45e05f"/>
  <text x="31" y="36" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold" fill="#1d2a3a">KEYENCE</text>
  <text x="31" y="41" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#333">${model}</text>
  <text x="31" y="47" text-anchor="middle" font-family="sans-serif" font-size="2.4" fill="#c00">LASER</text>
  <!-- ケーブル中継アンプ -->
  <rect x="${ax}" y="${ay}" width="18" height="74" rx="5" fill="url(#lrblk-{{uid}})" stroke="#0a0a0b" stroke-width="0.7"/>
  <rect x="${ax + 3}" y="${ay + 10}" width="12" height="26" rx="1" fill="#0b0b0c" stroke="#3d3f43" stroke-width="0.4"/>
  <text x="${cx}" y="${ay + 26}" text-anchor="middle" font-family="monospace" font-size="4.2" font-weight="bold" fill="#3cff6a" transform="rotate(-90 ${cx} ${ay + 23})">85.0</text>
  <rect x="${ax + 4}" y="${ay + 40}" width="10" height="3" rx="1" fill="#45e05f"/>
  <circle cx="${cx}" cy="${ay + 50}" r="2.6" fill="#55585d"/><circle cx="${cx}" cy="${ay + 57}" r="2.6" fill="#55585d"/>
  <text x="${ax + 21}" y="${ay + 66}" font-family="sans-serif" font-size="2.8" fill="#555">アンプ</text>`;
}

export function buildLrx(conn: 'cable' | 'M8'): DeviceDefinition {
  const t = (p: ParamValues) => pick(LRX_TYPES, p.model);
  const CX = 58;
  const YB = 150;
  const wh: Lead = {
    color: 'WH',
    label: '制御出力2 / 外部入力（params の pin2 で選ぶ）',
    role: 'out',
    signal: (p) => (p.pin2 === 'in' ? sensorInput(p) : switchedOut(p)),
  };
  const leads: Lead[] = [
    { color: 'BN', label: '+V（DC16〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'BK', label: '制御出力1（NPN/PNP は設定による）', role: 'out', signal: switchedOut },
    wh,
  ];
  return buildPhoto({
    type: conn === 'M8' ? 'keyence.lr-x.m8' : 'keyence.lr-x',
    name: 'レーザセンサ（CMOS）',
    model: `LR-X50/X100/X250${conn === 'M8' ? 'C（M8）' : '（ケーブル）'}`,
    labelPrefix: 'LS',
    description:
      `KEYENCE の CMOS レーザセンサ LR-X シリーズ 標準タイプ（センサヘッドとケーブル中継アンプが一体、${conn === 'M8' ? 'アンプの先に M8 4ピン コネクタ' : 'ケーブル 2m'}）。` +
      `種類は params の model で選ぶ: ${LRX_TYPES.map((m) => `LR-${m.code}（${m.range}）`).join('、')}。` +
      'NPN / PNP（params の output）と、白線（ピン 2）を出力2 と外部入力のどちらに使うか（params の pin2）は初期設定で選ぶ。' +
      `${conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 出力1、2（白）= 出力2 / 外部入力' : '芯線は茶 = +24V、青 = 0V、黒 = 出力1、白 = 出力2 / 外部入力'}。` +
      '外部入力は NPN の設定では 0V、PNP の設定では +V と短絡で ON。制御出力はオープンコレクタ DC30V 以下・50mA 以下（IO-Link 対応）。' +
      cableHint(conn) +
      '電源 DC16〜30V、消費電流 24V 時 38mA。',
    width: 104,
    body: (p) => `${defs}${lrxBody(`LR-${t(p).code}${conn === 'M8' ? 'C' : ''}`, CX, YB)}`,
    exit: { x: CX, y: YB },
    leadCenterX: CX,
    conn: conn as PhotoConn,
    cableLeads: leads,
    pinLeads: [leads[0], wh, leads[1], leads[2]],
    vmin: 16,
    vmax: 30,
    rated: 0.05,
    params: [
      { key: 'model', label: '種類（型式）', options: LRX_TYPES.map((m) => ({ value: m.code, label: `LR-${m.code}（${m.range}）` })), default: 'X100' },
      { ...OUTPUT_PARAM, label: '出力形式（初期設定）' },
      PIN2_PARAM,
    ],
    loadCurrent: 0.038,
    title: (p) => `CMOS レーザ LR-${t(p).code} ${t(p).range}・${outName(p)}`,
  });
}
