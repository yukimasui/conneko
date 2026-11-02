/**
 * パナソニック 超小型・極薄型ビームセンサ（アンプ内蔵）EX-10 Ver.2 / EX-20 Ver.2 シリーズの共通描画と機器定義の組み立て。
 *
 * 外形: EX-10 は厚さ 3.5mm 前後の極薄型、EX-20 はひとまわり大きい角型（どちらも黒い樹脂ケース）。
 * 図は検出面を上に向けた正面（広い面）で、1mm ≒ 2.4px（極薄・小型のため少し大きめに描く）。下端からケーブル。
 * 前面検出タイプは上端に、側面検出タイプは正面に投受光の窓がある。受光器・反射型には動作表示灯（橙）、投光器には電源表示灯（緑）。
 *
 * 型式（パナソニック EX-10 / EX-20 Ver.2 の型式ページ・カタログ）:
 *   透過型（投光器＋受光器の組）: EX-11EA（EX-10、側面検出、150mm）、EX-21A（EX-20、前面検出、1m）、EX-23（EX-20、前面検出、2m）
 *   反射型: EX-14A（EX-10、限定反射型 2〜25mm）、EX-26A（EX-20、限定反射型 6〜14mm）、EX-28A（EX-20、反射型 115mm）
 *   末尾の A は入光時 ON、B は遮光時 ON（動作モードは型式で決まり、スイッチでは切り換えない）。PNP 出力は末尾に -PN。
 * 定格:
 *   電源電圧 DC12〜24V ±10%（リップル P-P 10% 以下）
 *   消費電流: 透過型 投光器 10mA 以下・受光器 10mA 以下、EX-14A 13mA 以下、EX-28A 15mA 以下（EX-26A は EX-28A と同じとした = 推定）
 *   出力: NPN オープンコレクタ（最大流入電流 50mA、印加電圧 DC30V 以下（出力と 0V 間）、残留電圧 2V 以下（流入 50mA 時）・1V 以下（16mA 時））。
 *         PNP（-PN）は最大流出電流 50mA。EX-10 の残留電圧は EX-20 Ver.2 と同じとした（推定）
 * 配線: 茶 = +V、青 = 0V、黒 = 出力。透過型の投光器は茶・青の 2 本。
 * 出典: https://industry.panasonic.com/jp/ja/products/fasys/sensor/photoelectric/number/ex-11ea（EX-10 Ver.2、150mm・NPN/PNP）
 *       EX-10 シリーズ取扱説明書（入出力回路: 茶 +V・黒 出力・青 0V、NPN 最大流入 50mA・DC30V 以下）
 *       https://device.panasonic.cn/ac/e/fasys/sensor/photoelectric/ex-20/spec/index.jsp（EX-20 Ver.2 仕様: 50mA、残留電圧 2V / 1V、投受光器 10mA 以下）
 *       販売店の型式表（EX-14A 13mA 以下、EX-28A 115mm・15mA 以下、EX-26A 6〜14mm）
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { buildPhoto } from '../keyence/photo';
import { OUTPUT_PARAM, outName, pick, switchedOut, type Lead } from '../keyence/sensor-parts';
import { withMaker } from './parts';

export type ExKind = 'emitter' | 'receiver' | 'reflective';

interface ExType {
  /** 型式（入光時 ON の A 付き。EX-23 は A/B がない） */
  code: string;
  series: '10' | '20';
  kind: string;
  range: string;
  /** 側面検出（正面に窓） */
  side?: boolean;
  /** 入光時 ON（A）・遮光時 ON（B）を型式で選ぶ */
  ab: boolean;
  /** 消費電流[A] */
  current: number;
}

const THROUGH: ExType[] = [
  { code: 'EX-11E', series: '10', kind: '透過型 側面検出', range: '150mm', side: true, ab: true, current: 0.01 },
  { code: 'EX-21', series: '20', kind: '透過型 前面検出', range: '1m', ab: true, current: 0.01 },
  { code: 'EX-23', series: '20', kind: '透過型 前面検出', range: '2m', ab: false, current: 0.01 },
];
const REFLECTIVE: ExType[] = [
  { code: 'EX-14', series: '10', kind: '限定反射型', range: '2〜25mm', ab: true, current: 0.013 },
  { code: 'EX-26', series: '20', kind: '限定反射型', range: '6〜14mm', ab: true, current: 0.015 },
  { code: 'EX-28', series: '20', kind: '反射型', range: '115mm', ab: true, current: 0.015 },
];

const MODE_PARAM = {
  key: 'mode',
  label: '動作モード',
  options: [
    { value: 'A', label: 'A: 入光時 ON' },
    { value: 'B', label: 'B: 遮光時 ON' },
  ],
  default: 'A',
};

const defs = `
  <defs>
    <linearGradient id="exbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#43464b"/>
      <stop offset="1" stop-color="#17181a"/>
    </linearGradient>
    <linearGradient id="exlens-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4d0f0f"/>
      <stop offset="0.5" stop-color="#9c2626"/>
      <stop offset="1" stop-color="#3a0909"/>
    </linearGradient>
  </defs>`;

/** 正面（cx は中心、y は上端）。返り値の exitY はケーブルの出口 */
function exFront(cx: number, y: number, t: ExType, model: string, caption: string, kind: ExKind) {
  const big = t.series === '20';
  const w = big ? 30 : 24;
  const h = big ? 52 : 40;
  const x = cx - w / 2;
  // 窓: 前面検出は上端、側面検出は正面の上寄り。反射型は投光・受光の 2 つ
  const win = t.side
    ? `<circle cx="${cx}" cy="${y + 9}" r="4" fill="url(#exlens-{{uid}})" stroke="#2a0606" stroke-width="0.5"/>`
    : kind === 'reflective'
      ? `<rect x="${x + 3}" y="${y - 1.6}" width="${w / 2 - 4}" height="3.6" rx="1" fill="url(#exlens-{{uid}})" stroke="#2a0606" stroke-width="0.4"/>
  <rect x="${cx + 1}" y="${y - 1.6}" width="${w / 2 - 4}" height="3.6" rx="1" fill="#2a0e0e" stroke="#000" stroke-width="0.4"/>`
      : `<rect x="${x + 4}" y="${y - 1.6}" width="${w - 8}" height="3.6" rx="1" fill="url(#exlens-{{uid}})" stroke="#2a0606" stroke-width="0.4"/>`;
  const led = kind === 'emitter' ? '#45e05f' : '#ff9d2e';
  return {
    svg: `
  <!-- 本体（正面） -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.4" fill="url(#exbody-{{uid}})" stroke="#050505" stroke-width="0.9"/>
  ${win}
  <!-- 取付穴（M2 / M3） -->
  ${[y + (t.side ? 18 : 10), y + h - 9]
    .map((cy) => `<circle cx="${cx}" cy="${cy}" r="${big ? 2.6 : 2}" fill="#0b0b0c" stroke="#56595e" stroke-width="0.6"/>`)
    .join('')}
  <!-- 表示灯（受光器・反射型は動作 橙、投光器は電源 緑） -->
  <rect x="${x + w - 7}" y="${y + (t.side ? 14 : 5)}" width="4" height="2.6" rx="0.6" fill="${led}"/>
  <text x="${cx}" y="${y + h * 0.5}" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold" fill="#e8e8e8">Panasonic</text>
  <text x="${cx}" y="${y + h * 0.5 + 5}" text-anchor="middle" font-family="sans-serif" font-size="3.3" font-weight="bold" fill="#d0d3d6">${model}</text>
  <text x="${cx}" y="${y + h * 0.5 + 9.5}" text-anchor="middle" font-family="sans-serif" font-size="2.5" fill="#a6aaae">${caption}</text>
  <!-- ケーブル出口 -->
  <path d="M${cx - 3.5} ${y + h - 0.5} h7 l-0.6 5 h-5.8 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`,
    exitY: y + h + 4,
  };
}

const PLUS: Lead = { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT: Lead = { color: 'BK', label: '出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut };

const CX = 35;
const TOP = 16;
const EXIT_Y = TOP + 56;

/** EX-10 / EX-20 の機器定義を組み立てる（ケーブル引出し）。種類は params の model、透過型は投光器・受光器を別々に置く */
export function buildEx(kind: ExKind): DeviceDefinition {
  const reflective = kind === 'reflective';
  const hasOut = kind !== 'emitter';
  const list = reflective ? REFLECTIVE : THROUGH;
  const t = (p: ParamValues) => pick(list, p.model);
  const unit = kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '';
  // 型式: EX-21A / EX-21B-PN / EX-23 / EX-23-PN
  const modelName = (p: ParamValues) => {
    const m = t(p);
    return `${m.code}${m.ab ? (p.mode === 'B' ? 'B' : 'A') : ''}${hasOut && p.output === 'P' ? '-PN' : ''}`;
  };
  const typeId = `panasonic.ex.${kind}`;
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const name = (m: ExType) => `${m.code}${m.ab ? 'A' : ''}（EX-${m.series} ${m.kind} ${m.range}）`;
  const description =
    `パナソニックの超小型ビームセンサ（アンプ内蔵）EX-10 / EX-20 シリーズ Ver.2 ${reflective ? '反射型' : `透過型 ${unit}`}（ケーブル引出し）。` +
    `種類は params の model で選ぶ: ${list.map(name).join('、')}。` +
    '動作モードは型式で決まる（末尾 A: 入光時 ON、B: 遮光時 ON。EX-23 は A/B なし）。' +
    (hasOut ? '出力形式は params の output で NPN / PNP を選ぶ（PNP は型式の末尾に -PN）。' : '') +
    (!reflective ? `透過型は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}。組で注文する）。` : '') +
    (kind === 'emitter'
      ? '芯線は茶 = +24V、青 = 0V の 2 本（投光器には黒の出力線がない）。'
      : '芯線は茶 = +24V、青 = 0V、黒 = 出力。NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V）、PNP は黒が +V になる（COM を 0V）。' +
        '出力はオープンコレクタ 最大 50mA・DC30V 以下（E3Z・CX-400 の 100mA より小さい）、残留電圧 2V 以下（50mA 時。16mA 時 1V 以下）。') +
    `電源 DC12〜24V ±10%、消費電流 ${kind === 'emitter' ? '10mA' : kind === 'receiver' ? '10mA' : '13mA（EX-14A）・15mA（EX-26A・EX-28A）'} 以下。` +
    (reflective ? 'EX-26A の消費電流は資料で確かめられず EX-28A と同じとした（推定）。' : '') +
    (kind === 'emitter' ? '' : 'EX-10（EX-11EA・EX-14A）の残留電圧は EX-20 Ver.2 と同じとした（推定）。');

  const def = buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `EX-10 / EX-20（${list.map((m) => `${m.code}${m.ab ? 'A' : ''}`).join('/')}） ケーブル${unit ? ` ${unit}` : ''}`,
    description,
    width: 70,
    body: (p) => {
      const f = exFront(CX, TOP, t(p), modelName(p), reflective ? t(p).kind : unit, kind);
      // 本体の出口からケーブルの描き始め（EXIT_Y）までのシース
      return `${defs}<path d="M${CX} ${f.exitY - 1} V${EXIT_Y + 2}" stroke="#2b2c2e" stroke-width="5.6"/>${f.svg}`;
    },
    exit: { x: CX, y: EXIT_Y },
    conn: 'cable',
    cableLeads: kind === 'emitter' ? [PLUS, MINUS] : [PLUS, MINUS, OUT],
    vmin: 10.8,
    vmax: 26.4,
    rated: 0.05,
    params: [
      { key: 'model', label: '種類（型式）', options: list.map((m) => ({ value: m.code, label: name(m) })), default: list[reflective ? 0 : 1].code },
      { ...MODE_PARAM, relevant: (p: ParamValues) => t(p).ab },
      ...(hasOut ? [OUTPUT_PARAM] : []),
    ],
    loadCurrent: 0.01,
    title: (p) => `EX-${t(p).series} ${t(p).kind} ${t(p).range}${unit ? ` ${unit}` : ''}${hasOut ? `・${outName(p)}` : ''}`,
  });
  return withMaker(def, 'パナソニック', {
    // 消費電流は種類で変わる
    loadCurrent: (p: ParamValues) => t(p).current,
    modelOf: (p) => (unit ? `${modelName(p)}（${unit}）` : modelName(p)),
    estimated: reflective
      ? 'EX-26A の消費電流（EX-28A と同じ 15mA 以下とした）、EX-14A（EX-10）の出力の残留電圧（EX-20 Ver.2 と同じとした）'
      : kind === 'receiver'
        ? 'EX-11EA（EX-10）の出力の残留電圧（EX-20 Ver.2 と同じとした）'
        : undefined,
  });
}
