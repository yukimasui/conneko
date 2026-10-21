/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G シリーズの共通描画と機器定義の組み立て。
 *
 * 外形（KEYENCE 外形寸法図より）:
 * - 角型: 側面 20 × 31 mm、厚さ 13.1 mm。側面に M3 取付穴 2 個、正面（検出面）に赤いレンズ、
 *   上面に表示灯（橙/緑）、背面に感度調整トリマ・動作モード切換スイッチ。
 *   ケーブルタイプは背面下から斜めにケーブルが出る。M8 コネクタタイプ（…CN/CP）は底面の後ろ寄りに M8 オスコネクタ、
 *   ケーブル付 M12 コネクタタイプ（…EN/EP）は 0.3m のケーブルの先に M12 オスコネクタ。
 * - ナット型（…B / …CB）: 長さ 44.4 × 高さ 31 mm、厚さ 12.5 mm。前側 15mm が M18 ネジの鼻部（ナットで穴に取り付ける）、
 *   後ろ側の本体に長穴 2 個。出力は Bipolar（NPN と PNP の 2 出力を同時に持つ）。
 *   ケーブルタイプ（…B）は背面下から斜めにケーブル、M12 コネクタタイプ（…CB）は背面下に M12 オスコネクタが後ろ向きに付く。
 * 図は「検出面を左に向けた側面」を少し立体的に描く（1mm ≒ 2px）。
 *
 * 配線（KEYENCE 入出力回路図より）:
 * - NPN / PNP タイプ（角型）: 茶（ピン1）= DC10〜30V、青（ピン3）= 0V、黒（ピン4）= 制御出力。ピン2 は未使用
 * - Bipolar タイプ（ナット型）: 茶（ピン1）、青（ピン3）、黒（ピン4）= PNP 出力、白（ピン2）= NPN 出力
 * - 透過型の投光器: 茶（ピン1）、青（ピン3）だけ
 * 制御出力はオープンコレクタ 30V 以下・100mA 以下・残留電圧 1V 以下、応答時間 500µs。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41cn/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41b/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51cn/io-circuit/
 *       各型式の dimensions ページ（pz-g41cn / pz-g41en / pz-g41b / pz-g41cb / pz-g51b）
 */
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, PinDef, TerminalDef } from '../types';
import {
  OUTPUT_PARAM,
  leadPins,
  outName,
  pick,
  pigtailMale,
  roundConnector,
  roundMale,
  sensorCable,
  sensorOutputLinks,
  sheathPath,
  switchedOut,
  type Lead,
} from './sensor-parts';

/** ヘッドの種類（透過型の投光器・受光器、反射型） */
export type PzgKind = 'emitter' | 'receiver' | 'reflective';

/**
 * 角型のヘッド（左上 x,y）。kind で表示灯・説明の描き分け。
 * opts.exit: 'cable' はケーブル出口（背面下）を描く、'none' は描かない（M8 コネクタタイプ）。opts.caption は 3 行目の説明。
 */
export function pzgHead(x: number, y: number, model: string, kind: PzgKind, opts: { exit?: 'cable' | 'none'; caption?: string } = {}) {
  const W = 40;
  const H = 62;
  const caption = opts.caption ?? (kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '反射型');
  return `
  <!-- 検出面（正面） -->
  <path d="M${x} ${y + 3} L${x + 9} ${y} V${y + H} L${x} ${y + H + 3} Z" fill="url(#pzface-{{uid}})" stroke="#0b0b0c" stroke-width="0.8"/>
  <rect x="${x + 1.6}" y="${y + 13}" width="5.6" height="31" rx="1" fill="url(#pzlens-{{uid}})" stroke="#3a0b0b" stroke-width="0.5"/>
  <!-- 側面 -->
  <rect x="${x + 9}" y="${y}" width="${W - 9}" height="${H}" rx="2.5" fill="url(#pzbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  <rect x="${x + 11}" y="${y + 2}" width="${W - 13}" height="${H - 4}" rx="2" fill="none" stroke="#3d3f43" stroke-width="0.5"/>
  ${[y + 7, y + H - 7]
    .map(
      (cy) => `<circle cx="${x + 15}" cy="${cy}" r="3.4" fill="#141516" stroke="#55585d" stroke-width="0.6"/><circle cx="${x + 15}" cy="${cy}" r="1.6" fill="#050505"/>`,
    )
    .join('')}
  <!-- 上面の表示灯 -->
  <rect x="${x + 22}" y="${y - 3}" width="12" height="4" rx="1" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  <rect x="${x + 23.5}" y="${y - 2.2}" width="3.6" height="2.4" rx="0.5" fill="#ff9d2e"/>
  ${kind !== 'emitter' ? `<rect x="${x + 28.6}" y="${y - 2.2}" width="3.6" height="2.4" rx="0.5" fill="#45e05f"/>` : ''}
  <!-- 背面のトリマ / 切換スイッチ（側面から見える頭） -->
  <rect x="${x + W - 2}" y="${y + 16}" width="3" height="10" rx="1" fill="#3a3c40" stroke="#0b0b0c" stroke-width="0.4"/>
  <text x="${x + 24}" y="${y + 33}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#c9ccd0" letter-spacing="0.2">KEYENCE</text>
  <text x="${x + 24}" y="${y + 39}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#9a9ea3">${model}</text>
  <text x="${x + 24}" y="${y + 45}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#8a8e93">${caption}</text>
  ${
    (opts.exit ?? 'cable') === 'cable'
      ? `<!-- ケーブル出口 -->
  <path d="M${x + W - 9} ${y + H - 2} l5 2 l-2 6 l-6 -1 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`
      : ''
  }`;
}

/**
 * ナット型のヘッド（左上 x,y、長さ 89 × 高さ 62）。前側 30px が M18 ネジの鼻部、後ろが本体。
 * opts.exit: 'cable' は背面下のケーブル出口を描く、'none' は描かない（M12 コネクタタイプ）。
 */
export function pzgNutHead(x: number, y: number, model: string, kind: PzgKind, opts: { exit?: 'cable' | 'none'; caption?: string } = {}) {
  const L = 89;
  const H = 62;
  const nose = 30;
  const cy = y + 31;
  const nh = 44;
  const caption = opts.caption ?? (kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '反射型');
  const threads = Array.from({ length: 12 }, (_, i) => {
    const tx = +(x + 6 + i * 2).toFixed(2);
    return `<line x1="${tx}" y1="${cy - nh / 2}" x2="${tx + 1}" y2="${cy - nh / 2 + 3.5}" stroke="#55585d" stroke-width="0.6"/>
  <line x1="${tx}" y1="${cy + nh / 2}" x2="${tx + 1}" y2="${cy + nh / 2 - 3.5}" stroke="#55585d" stroke-width="0.6"/>`;
  }).join('');
  const slot = (sy: number) =>
    `<rect x="${x + 46}" y="${sy}" width="13" height="6.4" rx="3.2" fill="#141516" stroke="#55585d" stroke-width="0.6"/><rect x="${x + 48.5}" y="${sy + 1.8}" width="8" height="2.8" rx="1.4" fill="#050505"/>`;
  return `
  <!-- 鼻部（M18 ネジ） -->
  <rect x="${x + 2}" y="${cy - nh / 2}" width="${nose}" height="${nh}" rx="5" fill="url(#pzbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.8"/>
  ${threads}
  <rect x="${x}" y="${cy - 16}" width="6" height="32" rx="1.5" fill="url(#pzlens-{{uid}})" stroke="#3a0b0b" stroke-width="0.5"/>
  <!-- 本体 -->
  <rect x="${x + nose}" y="${y}" width="${L - nose}" height="${H}" rx="3" fill="url(#pzbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  <rect x="${x + nose + 2}" y="${y + 2}" width="${L - nose - 4}" height="${H - 4}" rx="2.4" fill="none" stroke="#3d3f43" stroke-width="0.5"/>
  ${slot(y + 4)}${slot(y + H - 10.4)}
  <!-- 上面の表示灯 -->
  <rect x="${x + 33}" y="${y - 3}" width="12" height="4" rx="1" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  <rect x="${x + 34.5}" y="${y - 2.2}" width="3.6" height="2.4" rx="0.5" fill="#ff9d2e"/>
  ${kind !== 'emitter' ? `<rect x="${x + 39.6}" y="${y - 2.2}" width="3.6" height="2.4" rx="0.5" fill="#45e05f"/>` : ''}
  <!-- 背面のトリマ -->
  <rect x="${x + L - 1}" y="${y + 14}" width="3" height="10" rx="1" fill="#3a3c40" stroke="#0b0b0c" stroke-width="0.4"/>
  <text x="${x + 60}" y="${y + 27}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#c9ccd0" letter-spacing="0.2">KEYENCE</text>
  <text x="${x + 60}" y="${y + 33.5}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#9a9ea3">${model}</text>
  <text x="${x + 60}" y="${y + 39.5}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#8a8e93">${caption}</text>
  ${
    (opts.exit ?? 'cable') === 'cable'
      ? `<path d="M${x + L - 12} ${y + H - 2} l6 0 l3 6 l-5 3 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`
      : ''
  }`;
}

export const pzgDefs = `
  <defs>
    <linearGradient id="pzbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#1f2023"/>
    </linearGradient>
    <linearGradient id="pzface-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#18191b"/>
      <stop offset="1" stop-color="#2c2e31"/>
    </linearGradient>
    <linearGradient id="pzlens-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d23a3a"/>
      <stop offset="0.5" stop-color="#7a1414"/>
      <stop offset="1" stop-color="#3f0808"/>
    </linearGradient>
  </defs>`;

/** 反射型（回帰反射・拡散反射）の PZ-G（受光器だけの 1 ヘッド、3 線） */
export function buildPzgReflective(s: { series: 'PZ-G41' | 'PZ-G61'; kindName: string; range: string; description: string }): DeviceDefinition {
  const W = 70;
  const H = 168;
  const leads: Lead[] = [
    { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut },
  ];
  const cable = sensorCable({ cx: 46, y0: 78, yFan: 132, yEnd: 164, pitch: 11, centerX: 35, leads, vmin: 10, vmax: 30 });
  return {
    type: `keyence.${s.series.toLowerCase()}`,
    name: `光電センサ（${s.kindName}）`,
    model: `${s.series}N / ${s.series}P`,
    maker: 'KEYENCE',
    category: 'sensor',
    description: s.description,
    labelPrefix: 'PH',
    width: W,
    height: H,
    svg: (p: ParamValues) => `${pzgDefs}${cable.svg}${pzgHead(15, 12, `${s.series}${p.output === 'P' ? 'P' : 'N'}`, 'reflective', { caption: s.kindName })}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">${s.kindName} ${s.range}・${outName(p)}</text>`,
    terminals: cable.terminals,
    // 制御出力（オープンコレクタ 30V 100mA）は ON で NPN なら 0V、PNP なら +V と導通する
    links: sensorOutputLinks(['BK'], 0.1),
    params: [OUTPUT_PARAM],
    loadCurrent: 0.03,
  };
}

/* ------------------------------------------------------------------ */
/* PZ-G シリーズ全体（種類・接続形態をパラメータ／機器で選ぶ）            */
/* ------------------------------------------------------------------ */

export interface PzgType {
  /** 型式の数字部分（PZ-G41 なら '41'） */
  code: string;
  kind: string;
  range: string;
}

/** 反射型（拡散反射・狭視界・限定反射・回帰反射）の種類 */
export const PZG_REFLECTIVE_TYPES: PzgType[] = [
  { code: '41', kind: '拡散反射型 長距離', range: '1m' },
  { code: '42', kind: '拡散反射型 近距離', range: '300mm' },
  { code: '101', kind: '狭視界反射型', range: '200mm' },
  { code: '102', kind: '限定反射型', range: '5〜45mm' },
  { code: '61', kind: '回帰反射型 P.R.O.', range: '0.1〜4.2m' },
  { code: '62', kind: '回帰反射型 透明体', range: '0.1〜1m' },
];

/** 透過型の種類 */
export const PZG_THROUGH_TYPES: PzgType[] = [
  { code: '51', kind: '透過型 標準', range: '20m' },
  { code: '52', kind: '透過型 ハイパワー', range: '40m' },
];

const modelParam = (list: PzgType[]): ParamDef => ({
  key: 'model',
  label: '種類（型式）',
  options: list.map((m) => ({ value: m.code, label: `PZ-G${m.code}（${m.kind} ${m.range}）` })),
  default: list[0].code,
});

/** 接続形態: cable = ケーブル 2m、m8 = M8 コネクタ、m12 = ケーブル付 M12 コネクタ（0.3m） */
export type PzgConn = 'cable' | 'm8' | 'm12';

const PLUS: Lead = { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT: Lead = { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut };
const OUT_PNP: Lead = { color: 'BK', label: 'PNP 出力', role: 'out', signal: { dir: 'out', kind: 'pnp' } };
const OUT_NPN: Lead = { color: 'WH', label: 'NPN 出力', role: 'out', signal: { dir: 'out', kind: 'npn' } };
const NC: Lead = { color: 'WH', label: '未使用', role: 'nc' };

/** M8 / M12 のピン 1〜4 の順の芯線 */
function connectorLeads(kind: PzgKind, bipolar: boolean): Lead[] {
  if (kind === 'emitter') return [PLUS, NC, MINUS, { ...NC, color: 'BK' }];
  if (bipolar) return [PLUS, OUT_NPN, MINUS, OUT_PNP];
  return [PLUS, NC, MINUS, OUT];
}

/** ケーブルの芯線（表示順） */
function cableLeads(kind: PzgKind, bipolar: boolean): Lead[] {
  if (kind === 'emitter') return [PLUS, MINUS];
  if (bipolar) return [PLUS, MINUS, OUT_PNP, OUT_NPN];
  return [PLUS, MINUS, OUT];
}

const KIND_NAMES: Record<PzgKind, string> = { emitter: '透過型 投光器', receiver: '透過型 受光器', reflective: '反射型' };

/** 型式の表示（例: PZ-G41CN、PZ-G51CB）。投光器は出力がないので N/P を付けない */
function modelName(code: string, form: 'square' | 'nut', conn: PzgConn, kind: PzgKind, p: ParamValues) {
  if (form === 'nut') return `PZ-G${code}${conn === 'm12' ? 'CB' : 'B'}`;
  const c = conn === 'm8' ? 'C' : conn === 'm12' ? 'E' : '';
  return `PZ-G${code}${c}${kind === 'emitter' ? '' : p.output === 'P' ? 'P' : 'N'}`;
}

/**
 * PZ-G の機器定義を組み立てる。
 * - form: 'square'（角型。出力は NPN / PNP を params の output で選ぶ）/ 'nut'（ナット型。Bipolar 出力）
 * - kind: 反射型・透過型の投光器・受光器（透過型は投光器と受光器を別々の機器として置き、それぞれ配線する）
 * - conn: ケーブル / M8 コネクタ（角型のみ）/ M12 コネクタ（角型はケーブル付、ナット型は本体直付け）
 */
export function buildPzg(form: 'square' | 'nut', kind: PzgKind, conn: PzgConn): DeviceDefinition {
  const types = kind === 'reflective' ? PZG_REFLECTIVE_TYPES : PZG_THROUGH_TYPES;
  const bipolar = form === 'nut';
  const hasOutput = kind !== 'emitter';
  const outParam = hasOutput && !bipolar;
  const params: ParamDef[] = [modelParam(types), ...(outParam ? [OUTPUT_PARAM] : [])];
  const typeId = `keyence.pz-g${form === 'nut' ? '.nut' : ''}.${kind}${conn === 'cable' ? '' : `.${conn}`}`;
  const t = (p: ParamValues) => pick(types, p.model);

  // ---- 見た目と端子 ----
  let W: number;
  let H: number;
  let body: (p: ParamValues) => string;
  let terminals: (p: ParamValues) => TerminalDef[];
  let pins: ((p: ParamValues) => PinDef[]) | undefined;
  const power = conn === 'cable' ? { plus: 'BN', minus: 'BU' } : { plus: 'CN#1', minus: 'CN#3' };
  const cnSpec = (size: 'M8' | 'M12') => roundConnector(size);
  const head = (p: ParamValues, exit: 'cable' | 'none') => {
    const m = modelName(t(p).code, form, conn, kind, p);
    const caption = kind === 'reflective' ? t(p).kind : undefined;
    return form === 'square' ? pzgHead(15, 12, m, kind, { exit, caption }) : pzgNutHead(8, 14, m, kind, { exit, caption });
  };

  if (conn === 'cable') {
    const leads = cableLeads(kind, bipolar);
    const cable =
      form === 'square'
        ? sensorCable({ cx: 46, y0: 78, yFan: 132, yEnd: 164, pitch: 11, centerX: 35, leads, vmin: 10, vmax: 30 })
        : sensorCable({ cx: 88, y0: 81, yFan: 132, yEnd: 164, pitch: 11, centerX: 64, leads, vmin: 10, vmax: 30 });
    W = form === 'square' ? 70 : 106;
    H = 168;
    body = (p) => `${cable.svg}${head(p, 'cable')}`;
    terminals = cable.terminals;
  } else {
    const leads = connectorLeads(kind, bipolar);
    const size = conn === 'm8' ? 'M8' : 'M12';
    let svg: string;
    let tip: { x: number; y: number };
    let side: TerminalDef['side'] = 'bottom';
    if (form === 'nut') {
      // 背面下の M12 オスコネクタ（後ろ向き）
      const m = roundMale(97, 59, 'M12', 'right');
      svg = m.svg;
      tip = m.tip;
      side = 'right';
      W = 118;
      H = 84;
    } else if (conn === 'm8') {
      // 底面の後ろ寄りの M8 オスコネクタ
      const m = roundMale(48, 74, 'M8');
      svg = m.svg;
      tip = m.tip;
      W = 70;
      H = 92;
    } else {
      // 0.3m のケーブルの先の M12 オスコネクタ
      const m = pigtailMale(35, 112, 'M12');
      svg = `${sheathPath(46, 78, 35, 113)}${m.svg}<text x="47" y="104" font-family="sans-serif" font-size="3.2" fill="#555">0.3m</text>`;
      tip = m.tip;
      W = 70;
      H = 156;
    }
    const exit = conn === 'm12' && form === 'square' ? 'cable' : 'none';
    body = (p) => `${svg}${head(p, exit)}`;
    const label = `${size} 4ピン コネクタ（オス）`;
    terminals = () => [{ id: 'CN', label, x: tip.x, y: tip.y, side, role: 'connector', connector: cnSpec(size) }];
    pins = leadPins('CN', leads, 10, 30);
  }

  // ---- 出力の内部経路 ----
  let links: ((p: ParamValues) => InternalLink[]) | undefined;
  if (hasOutput) {
    const at = (color: 'BK' | 'WH') => (conn === 'cable' ? color : color === 'BK' ? 'CN#4' : 'CN#2');
    links = bipolar
      ? () => [
          { from: at('BK'), to: power.plus, switch: 'output', ratedCurrent: 0.1 },
          { from: at('WH'), to: power.minus, switch: 'output', ratedCurrent: 0.1 },
        ]
      : sensorOutputLinks([at('BK')], 0.1, power);
  }

  // ---- 説明 ----
  const formName = form === 'square' ? '角型' : 'ナット型（M18）';
  const connName =
    conn === 'cable' ? 'ケーブル 2m' : conn === 'm8' ? 'M8 4ピン コネクタ' : form === 'nut' ? 'M12 4ピン コネクタ' : 'ケーブル付 M12 4ピン コネクタ（ケーブル 0.3m）';
  const typesText = types.map((m) => `PZ-G${m.code}（${m.kind} ${m.range}）`).join('、');
  const suffix =
    form === 'nut' ? (conn === 'm12' ? 'CB' : 'B') : `${conn === 'm8' ? 'C' : conn === 'm12' ? 'E' : ''}${kind === 'emitter' ? 'N/P の投光器' : 'N / P'}`;
  const wiring =
    conn === 'cable'
      ? kind === 'emitter'
        ? '芯線は茶 = +24V、青 = 0V の 2 本（出力なし）。'
        : bipolar
          ? '芯線は茶 = +24V、青 = 0V、黒 = PNP 出力、白 = NPN 出力（Bipolar。使う方を PLC の入力につなぎ、使わない方は絶縁する）。'
          : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力。NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V）、PNP は黒が +V になる（COM を 0V）。'
      : kind === 'emitter'
        ? `${conn === 'm8' ? 'M8' : 'M12'} のピン 1 = +24V、3 = 0V（2・4 は未使用）。センサーケーブル（generic.${conn === 'm8' ? 'm8' : 'm12'}-4p-cable など）でつなぐ。`
        : bipolar
          ? 'M12 のピン 1 = +24V、3 = 0V、4 = PNP 出力、2 = NPN 出力（Bipolar）。センサーケーブル（generic.m12-4p-cable など）でつなぐと茶・青・黒・白の芯線になる。'
          : `${conn === 'm8' ? 'M8' : 'M12'} のピン 1 = +24V、3 = 0V、4 = 制御出力（2 は未使用）。センサーケーブル（generic.${conn === 'm8' ? 'm8' : 'm12'}-4p-cable など）でつなぐと茶・青・黒の芯線になる。`;
  const consumption =
    kind === 'emitter' ? '消費電流 20mA（PZ-G51）/ 25mA（PZ-G52）以下' : kind === 'receiver' ? '消費電流 28mA 以下' : '消費電流 34mA 以下';
  const description =
    `KEYENCE のアンプ内蔵型光電センサ PZ-G シリーズ ${KIND_NAMES[kind]}（${formName}・${connName}、型式 PZ-G□${suffix}）。` +
    `種類は params の model で選ぶ: ${typesText}。` +
    (outParam ? '出力形式は params の output で NPN / PNP を選ぶ。' : '') +
    (kind === 'emitter' ? '透過型は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（受光器は別の機器 ' + typeId.replace('emitter', 'receiver') + '）。' : '') +
    (kind === 'receiver' ? '投光器（' + typeId.replace('receiver', 'emitter') + '）と組で使う。' : '') +
    wiring +
    (hasOutput ? '制御出力はオープンコレクタ 30V 以下・100mA 以下、応答時間 500µs、入光時 ON / 遮光時 ON はトリマで切換。' : '') +
    `電源 DC10〜30V、${consumption}。` +
    (types === PZG_REFLECTIVE_TYPES ? '回帰反射型（PZ-G61/62）はリフレクタ（R-2L など）が別売。' : '');

  return {
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `PZ-G${types.map((m) => m.code).join('/')} ${formName} ${connName}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}`,
    maker: 'KEYENCE',
    category: 'sensor',
    description,
    labelPrefix: 'PH',
    width: W,
    height: H,
    svg: (p) => `${pzgDefs}${body(p)}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">${t(p).kind} ${t(p).range}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}${hasOutput ? `・${bipolar ? 'NPN+PNP' : outName(p)}` : ''}</text>`,
    terminals,
    ...(pins ? { pins } : {}),
    ...(links ? { links } : {}),
    params,
    loadCurrent: kind === 'emitter' ? 0.025 : kind === 'receiver' ? 0.028 : 0.034,
  };
}
