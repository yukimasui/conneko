/**
 * KEYENCE 超小型アンプ内蔵型光電センサ PR-M / PR-F シリーズ（ステンレス SUS316L ケース）。
 *
 * 外形（KEYENCE 外形寸法図より）:
 * - PR-M（ミニスリム）: 側面 13 × 26.9 mm、厚さ 7.5 mm。後ろ側に ø3.2 の取付穴 2 個（ピッチ 15）、底面に赤いコードプロテクタ
 * - PR-F（フラット）: 正面 14 × 27 mm、厚さ 4.5 mm。正面に検出窓、下側に ø3.2 の取付穴 2 個、底面にコードプロテクタ
 * 実物が小さいため 1mm ≒ 3px に拡大して描く。PR-M は側面（検出面を左）、PR-F は検出面（正面）を描く。
 * ケーブル: 受光器・反射型 ø2.6 4芯（茶/青/黒/白 0.08mm²）、投光器 2芯（茶/青）。M8 コネクタタイプはプロテクタの先に M8 オスコネクタ。
 *
 * 配線（KEYENCE PR-M/F カタログの入出力回路図より）:
 * - 受光器・反射型: 茶（ピン1）= DC10〜30V、黒（ピン4）= 制御出力1、白（ピン2）= 制御出力2、青（ピン3）= 0V
 * - 透過型の投光器: 茶（ピン1）、青（ピン3）だけ（投光停止入力はない）
 * 出力動作: 透過型は出力1 = 遮光時 ON・出力2 = 入光時 ON、BGS 反射型は出力1 = 入光時 ON・出力2 = 遮光時 ON。
 * 制御出力は NPN / PNP オープンコレクタ DC30V 以下・50mA 以下。感度調整・外部入力はない。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pr-m_f/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pr-m_f/models/pr-mb15n1/dimensions/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pr-m_f/models/pr-f51n1/dimensions/
 *       PR-M/F カタログ（第三者の転載）: https://www.plc-sensors.com/wp-content/uploads/2020/08/Keyence-Photoelectric-Sensor-PR-M-Datasheet.pdf
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildPhoto, cableHint } from './photo';
import { OUTPUT_PARAM, outName, pick, switchedOut, type Lead } from './sensor-parts';

export type PrmfKind = 'emitter' | 'receiver' | 'reflective';

interface PrmfType {
  code: string;
  kind: string;
  range: string;
  shape: 'M' | 'F';
}

const REFLECTIVE: PrmfType[] = [
  { code: 'MB15', kind: 'ミニスリム BGS反射型', range: '1〜15mm', shape: 'M' },
  { code: 'MB30', kind: 'ミニスリム BGS反射型', range: '1〜30mm', shape: 'M' },
  { code: 'FB15', kind: 'フラット BGS反射型', range: '1〜15mm', shape: 'F' },
  { code: 'FB30', kind: 'フラット BGS反射型', range: '1〜30mm', shape: 'F' },
];
const THROUGH: PrmfType[] = [
  { code: 'M51', kind: 'ミニスリム 透過型', range: '1.2m', shape: 'M' },
  { code: 'F51', kind: 'フラット 透過型', range: '0.6m', shape: 'F' },
];

const defs = `
  <defs>
    <linearGradient id="prmsus-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef0f2"/>
      <stop offset="0.45" stop-color="#b9bec4"/>
      <stop offset="0.7" stop-color="#d9dde1"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <linearGradient id="prmlens-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e04848"/>
      <stop offset="0.55" stop-color="#8a1616"/>
      <stop offset="1" stop-color="#4a0909"/>
    </linearGradient>
  </defs>`;

/** 底面のコードプロテクタ（赤いリングと黒い蛇腹）。cx は中心、y は上端。下端の Y を返す */
function protector(cx: number, y: number) {
  const ridges = [4, 7, 10, 13].map((d) => `<rect x="${cx - 6}" y="${y + d}" width="12" height="1.6" rx="0.8" fill="#3a3c3f"/>`).join('');
  return {
    svg: `
  <rect x="${cx - 7}" y="${y}" width="14" height="3.4" rx="1" fill="#d42a2a" stroke="#8a1414" stroke-width="0.4"/>
  <path d="M${cx - 5.5} ${y + 3.4} H${cx + 5.5} V${y + 15} L${cx + 3.5} ${y + 18} H${cx - 3.5} L${cx - 5.5} ${y + 15} Z" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.4"/>
  ${ridges}`,
    y1: y + 18,
  };
}

/** PR-M（ミニスリム）の側面。x, y は本体の左上（39 × 81 px、3px/mm） */
function prmSide(x: number, y: number, model: string, caption: string) {
  const ear = (cy: number) => `<circle cx="${x + 30}" cy="${cy}" r="7.4" fill="url(#prmsus-{{uid}})" stroke="#6d7277" stroke-width="0.7"/>
  <circle cx="${x + 30}" cy="${cy}" r="4.8" fill="#f4f5f6" stroke="#6d7277" stroke-width="0.6"/>`;
  const p = protector(x + 14.4, y + 81);
  return {
    svg: `
  ${ear(y + 12.6)}${ear(y + 57.6)}
  <rect x="${x + 27}" y="${y + 20}" width="8" height="30" fill="#c3c8cd" stroke="#6d7277" stroke-width="0.5"/>
  <!-- 本体 -->
  <path d="M${x} ${y + 9} Q${x} ${y} ${x + 9} ${y} H${x + 28} V${y + 81} H${x + 4} Q${x} ${y + 81} ${x} ${y + 77} Z" fill="url(#prmsus-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  <!-- 表示灯（上面） -->
  <rect x="${x + 6}" y="${y - 2.4}" width="14" height="3.6" rx="1.4" fill="#f5b52a" stroke="#9a6a00" stroke-width="0.4"/>
  <!-- 検出面（左端）のレンズ -->
  <rect x="${x - 1.6}" y="${y + 20}" width="4.4" height="34" rx="1.6" fill="url(#prmlens-{{uid}})" stroke="#4a0909" stroke-width="0.4"/>
  <text x="${x + 15}" y="${y + 30}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#1d2a3a" transform="rotate(-90 ${x + 15} ${y + 30})">KEYENCE</text>
  <text x="${x + 21}" y="${y + 30}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#333" transform="rotate(-90 ${x + 21} ${y + 30})">${model}</text>
  <text x="${x + 15}" y="${y + 72}" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#444">${caption}</text>
  ${p.svg}`,
    exit: { x: x + 14.4, y: p.y1 },
  };
}

/** PR-F（フラット）の正面。x, y は本体の左上（42 × 81 px、3px/mm） */
function prfFront(x: number, y: number, model: string, caption: string) {
  const p = protector(x + 21, y + 81);
  return {
    svg: `
  <!-- 本体（正面） -->
  <path d="M${x + 4} ${y} H${x + 38} Q${x + 42} ${y} ${x + 42} ${y + 4} V${y + 64} L${x + 36} ${y + 66} Q${x + 42} ${y + 70} ${x + 40} ${y + 76} Q${x + 36} ${y + 81} ${x + 30} ${y + 81} H${x + 12} Q${x + 6} ${y + 81} ${x + 2} ${y + 76} Q${x} ${y + 70} ${x + 6} ${y + 66} L${x} ${y + 64} V${y + 4} Q${x} ${y} ${x + 4} ${y} Z" fill="url(#prmsus-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  ${[x + 9, x + 33].map((cx) => `<circle cx="${cx}" cy="${y + 72}" r="4.8" fill="#f4f5f6" stroke="#6d7277" stroke-width="0.6"/>`).join('')}
  <!-- 表示灯（上面の両端） -->
  <rect x="${x + 4}" y="${y - 2}" width="9" height="3.4" rx="1.2" fill="#f5b52a" stroke="#9a6a00" stroke-width="0.4"/>
  <rect x="${x + 29}" y="${y - 2}" width="9" height="3.4" rx="1.2" fill="#45e05f" stroke="#17611f" stroke-width="0.4"/>
  <!-- 検出窓 -->
  <rect x="${x + 15}" y="${y + 9}" width="12" height="24" rx="6" fill="#2a2b2e" stroke="#0a0a0b" stroke-width="0.5"/>
  <rect x="${x + 17.5}" y="${y + 12}" width="7" height="18" rx="3.5" fill="url(#prmlens-{{uid}})"/>
  <text x="${x + 21}" y="${y + 42}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#1d2a3a">KEYENCE</text>
  <text x="${x + 21}" y="${y + 48}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#333">${model}</text>
  <text x="${x + 21}" y="${y + 54}" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#444">${caption}</text>
  ${p.svg}`,
    exit: { x: x + 21, y: p.y1 },
  };
}

const typeParam = (list: PrmfType[]): ParamDef => ({
  key: 'model',
  label: '種類（型式）',
  options: list.map((m) => ({ value: m.code, label: `PR-${m.code}（${m.kind} ${m.range}）` })),
  default: list[0].code,
});

const PLUS: Lead = { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT1: Lead = { color: 'BK', label: '制御出力1（透過は遮光時ON、BGS 反射は入光時ON）', role: 'out', signal: switchedOut };
const OUT2: Lead = { color: 'WH', label: '制御出力2（出力1 の反対の動作）', role: 'out', signal: switchedOut };
const NC: Lead = { color: 'WH', label: '未使用', role: 'nc' };

export function buildPrmf(kind: PrmfKind, conn: 'cable' | 'M8'): DeviceDefinition {
  const list = kind === 'reflective' ? REFLECTIVE : THROUGH;
  const t = (p: ParamValues) => pick(list, p.model);
  const hasOut = kind !== 'emitter';
  const X = 16;
  const Y = 16;
  const name = (p: ParamValues) =>
    `PR-${t(p).code}${hasOut ? (conn === 'M8' ? (p.output === 'P' ? 'CP' : 'CN') : p.output === 'P' ? 'P3' : 'N1') : conn === 'M8' ? 'C' : ''}`;
  const caption = kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : 'BGS反射';
  // 本体の形（ミニスリム / フラット）は種類で変わるが、ケーブル出口は同じ位置（X + 18）にそろえる
  const draw = (p: ParamValues) =>
    t(p).shape === 'M' ? prmSide(X + 3.6, Y, name(p), caption) : prfFront(X - 3, Y, name(p), caption);
  const typeId = `keyence.pr-mf.${kind}${conn === 'M8' ? '.m8' : ''}`;
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const description =
    `KEYENCE の超小型アンプ内蔵型光電センサ PR-M / PR-F シリーズ ${kind === 'emitter' ? '透過型 投光器' : kind === 'receiver' ? '透過型 受光器' : 'BGS 反射型'}（ステンレスケース、${conn === 'M8' ? 'M8 4ピン コネクタ' : 'ケーブル 1m / 3m'}）。` +
    `種類は params の model で選ぶ: ${list.map((m) => `PR-${m.code}（${m.kind} ${m.range}）`).join('、')}。` +
    (hasOut ? '出力形式は params の output で NPN / PNP を選ぶ。' : '') +
    (kind !== 'reflective' ? `透過型は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}）。` : '') +
    (kind === 'emitter'
      ? `${conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V（2・4 は未使用）' : '芯線は茶 = +24V、青 = 0V の 2 本'}。投光停止入力はない。`
      : `${conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力1、2（白）= 制御出力2' : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力1、白 = 制御出力2'}。` +
        '出力1 と出力2 は逆の動作（透過型は出力1 = 遮光時 ON、BGS 反射型は出力1 = 入光時 ON）。制御出力はオープンコレクタ DC30V 以下・50mA 以下。') +
    cableHint(conn) +
    `電源 DC10〜30V、消費電流 ${kind === 'emitter' ? '11mA' : kind === 'receiver' ? '16mA' : '19mA'}。感度調整はない。`;
  return buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（超小型 透過型 投光器）' : kind === 'receiver' ? '光電センサ（超小型 透過型 受光器）' : '光電センサ（超小型 BGS 反射型）',
    model: `PR-${list.map((m) => m.code).join('/')} ${conn === 'M8' ? 'M8 コネクタ' : 'ケーブル'}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}`,
    description,
    width: 76,
    body: (p) => `${defs}${draw(p).svg}`,
    exit: { x: X + 18, y: Y + 99 },
    conn,
    cableLeads: kind === 'emitter' ? [PLUS, MINUS] : [PLUS, MINUS, OUT1, OUT2],
    pinLeads: kind === 'emitter' ? [PLUS, NC, MINUS, { ...NC, color: 'BK' }] : [PLUS, OUT2, MINUS, OUT1],
    vmin: 10,
    vmax: 30,
    rated: 0.05,
    params: [typeParam(list), ...(hasOut ? [OUTPUT_PARAM] : [])],
    loadCurrent: kind === 'emitter' ? 0.011 : kind === 'receiver' ? 0.016 : 0.019,
    title: (p) => `${t(p).kind} ${t(p).range}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}${hasOut ? `・${outName(p)}` : ''}`,
  });
}
