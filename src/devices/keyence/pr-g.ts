/**
 * KEYENCE アンプ内蔵型光電センサ PR-G シリーズ（角型、ステンレス SUS316L ケース）。
 *
 * 外形（KEYENCE 外形寸法図より）: 側面 21 × 33.9 mm、厚さ 10.8 mm。側面に M3 取付穴 2 個（前寄り）、
 * 正面（検出面）に赤いレンズ窓、上面後ろ寄りに表示灯（黄）、反射型は背面に 7 セグ表示（0〜999）と感度調整トリマ。
 * ケーブルタイプは背面下から斜めにケーブル（受光器・反射型 ø4.4 4芯、投光器 ø3.9 3芯）、M8 コネクタタイプは底面に M8 オスコネクタ。
 * 図は側面（検出面を左）と、反射型は背面を並べて描く（1mm ≒ 2px）。
 *
 * 配線（KEYENCE PR-G 取扱説明書 96M17817 の入出力回路図より）:
 * - 受光器・反射型: 茶（ピン1）= DC10〜30V、黒（ピン4）= 制御出力1、白（ピン2）= 制御出力2、青（ピン3）= 0V
 * - 透過型の投光器: 茶（ピン1）、黒（ピン4）= 投光停止入力（無電圧入力。黒と 0V の間を閉じると投光停止）、青（ピン3）
 * 出力動作: 透過型・回帰反射型は出力1 = 遮光時 ON・出力2 = 入光時 ON、拡散反射型は出力1 = 入光時 ON・出力2 = 遮光時 ON。
 * 制御出力は NPN / PNP オープンコレクタ DC30V 以下・100mA 以下。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/specs/
 *       https://www.keyence.com/products/sensor/photoelectric/pr-g/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/models/pr-g51n/dimensions/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/models/pr-g41n/dimensions/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/models/pr-g51cn/dimensions/
 *       取扱説明書（96M17817）: https://ventionavatars.s3.amazonaws.com/uploads/part_document/file/760/PR-G_Instruction_Manual.pdf
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildPhoto, cableHint, type PhotoConn } from './photo';
import { OUTPUT_PARAM, outName, pick, sensorInput, switchedOut, type Lead } from './sensor-parts';

export type PrgKind = 'emitter' | 'receiver' | 'reflective';

interface PrgType {
  code: string;
  kind: string;
  range: string;
  /** 出力1 の動作 */
  out1: '遮光時ON' | '入光時ON';
}

const REFLECTIVE: PrgType[] = [
  { code: '41', kind: '拡散反射型 長距離', range: '500mm', out1: '入光時ON' },
  { code: '42', kind: '拡散反射型 近距離', range: '120mm', out1: '入光時ON' },
  { code: '61', kind: '回帰反射型', range: '0.1〜4.2m', out1: '遮光時ON' },
];
const THROUGH: PrgType[] = [
  { code: '51', kind: '透過型', range: '30m', out1: '遮光時ON' },
  { code: '56', kind: '透過型 スリット内蔵', range: '600mm', out1: '遮光時ON' },
];

const defs = `
  <defs>
    <linearGradient id="prgsus-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9ecef"/>
      <stop offset="0.45" stop-color="#b9bec4"/>
      <stop offset="0.7" stop-color="#d6dade"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <linearGradient id="prglens-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e04848"/>
      <stop offset="0.55" stop-color="#8a1616"/>
      <stop offset="1" stop-color="#4a0909"/>
    </linearGradient>
  </defs>`;

/** 側面（左上 x,y、42 × 68）。kind で表示灯・説明を描き分ける */
function prgSide(x: number, y: number, model: string, caption: string, exit: 'cable' | 'm8') {
  const W = 42;
  const H = 68;
  // ヘアライン（ステンレスの筋目）
  const hair = Array.from({ length: 9 }, (_, i) => `<line x1="${x + 6}" y1="${y + 8 + i * 6.5}" x2="${x + W - 3}" y2="${y + 8 + i * 6.5}" stroke="#ffffff" stroke-width="0.35" opacity="0.5"/>`).join('');
  return `
  <!-- 本体（側面、ステンレス） -->
  <path d="M${x} ${y + 5} Q${x} ${y + 2} ${x + 3} ${y + 2} H${x + 22} L${x + 26} ${y} H${x + W - 3} Q${x + W} ${y} ${x + W} ${y + 3} V${y + H - 2} Q${x + W} ${y + H} ${x + W - 2} ${y + H} H${x + 2} Q${x} ${y + H} ${x} ${y + H - 2} Z" fill="url(#prgsus-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  ${hair}
  <!-- 検出面（左端）とレンズ窓 -->
  <rect x="${x - 1.5}" y="${y + 18}" width="4" height="30" rx="1.2" fill="url(#prglens-{{uid}})" stroke="#4a0909" stroke-width="0.4"/>
  <!-- 上面の表示灯（黄） -->
  <path d="M${x + 25} ${y + 0.5} H${x + W - 4} Q${x + W - 1} ${y + 0.5} ${x + W - 1} ${y + 3.5} V${y + 6} H${x + 25} Z" fill="#f5b52a" stroke="#9a6a00" stroke-width="0.4" opacity="0.95"/>
  <!-- M3 取付穴 -->
  ${[y + 5.6, y + H - 5.6].map((cy) => `<circle cx="${x + 6}" cy="${cy}" r="2.8" fill="#d9dcdf" stroke="#6d7277" stroke-width="0.6"/><circle cx="${x + 6}" cy="${cy}" r="1.3" fill="#3a3c40"/>`).join('')}
  <!-- 銘板の印字 -->
  <text x="${x + 23}" y="${y + 16}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#1d2a3a" letter-spacing="0.2">KEYENCE</text>
  <text x="${x + 23}" y="${y + 23}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">${model}</text>
  <text x="${x + 23}" y="${y + 29}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#444">${caption}</text>
  <text x="${x + 23}" y="${y + 40}" text-anchor="middle" font-family="sans-serif" font-size="2.6" fill="#555">DC10-30V</text>
  <circle cx="${x + 33}" cy="${y + 56}" r="2.4" fill="none" stroke="#555" stroke-width="0.5"/>
  <text x="${x + 33}" y="${y + 57.1}" text-anchor="middle" font-family="sans-serif" font-size="2.4" fill="#555">CE</text>
  ${
    exit === 'cable'
      ? `<!-- ケーブル出口（背面下、斜め） -->
  <path d="M${x + 30} ${y + H - 1} l8 -2 l3 5 l-7 4 z" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>`
      : `<!-- M8 コネクタの根元（赤いリング） -->
  <rect x="${x + 24}" y="${y + H - 0.5}" width="12" height="2.2" rx="0.6" fill="#d42a2a"/>`
  }`;
}

/** 背面（反射型。7 セグ表示とトリマ）。左上 x,y、22 × 68 */
function prgRear(x: number, y: number) {
  return `
  <rect x="${x}" y="${y}" width="22" height="68" rx="2" fill="url(#prgsus-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  <rect x="${x + 2}" y="${y + 0.5}" width="18" height="6" rx="1.5" fill="#f5b52a" stroke="#9a6a00" stroke-width="0.4"/>
  <circle cx="${x + 11}" cy="${y + 13}" r="3.6" fill="#c9ccd0" stroke="#6d7277" stroke-width="0.5"/>
  <line x1="${x + 9}" y1="${y + 13}" x2="${x + 13}" y2="${y + 13}" stroke="#555" stroke-width="0.7"/>
  <rect x="${x + 3}" y="${y + 22}" width="16" height="28" rx="1.2" fill="#0b0b0c" stroke="#55585c" stroke-width="0.5"/>
  <text x="${x + 11}" y="${y + 39}" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" fill="#ff3b30">120</text>
  <text x="${x + 11}" y="${y + 58}" text-anchor="middle" font-family="sans-serif" font-size="2.6" fill="#444">背面</text>`;
}

const typeParam = (list: PrgType[]): ParamDef => ({
  key: 'model',
  label: '種類（型式）',
  options: list.map((m) => ({ value: m.code, label: `PR-G${m.code}（${m.kind} ${m.range}）` })),
  default: list[0].code,
});

const PLUS: Lead = { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT1: Lead = { color: 'BK', label: '制御出力1（透過・回帰反射は遮光時ON、拡散反射は入光時ON）', role: 'out', signal: switchedOut };
const OUT2: Lead = { color: 'WH', label: '制御出力2（出力1 の反対の動作）', role: 'out', signal: switchedOut };
/** 投光停止入力は無電圧入力（黒と 0V の間を閉じると投光停止）。PNP タイプの組の投光器も同じとみなす（推定） */
const STOP: Lead = { color: 'BK', label: '投光停止入力（0V と短絡で投光停止）', role: 'in', signal: () => sensorInput({ output: 'N' }) };
const NC: Lead = { color: 'WH', label: '未使用', role: 'nc' };

export function buildPrg(kind: PrgKind, conn: Extract<PhotoConn, 'cable' | 'M8'>): DeviceDefinition {
  const list = kind === 'reflective' ? REFLECTIVE : THROUGH;
  const t = (p: ParamValues) => pick(list, p.model);
  const hasOut = kind !== 'emitter';
  const rear = kind === 'reflective';
  const width = rear ? 90 : 64;
  const name = (p: ParamValues) => `PR-G${t(p).code}${conn === 'M8' ? 'C' : ''}${hasOut ? (p.output === 'P' ? 'P' : 'N') : ''}`;
  const caption = kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '反射型';
  const kindName = kind === 'emitter' ? '透過型 投光器' : kind === 'receiver' ? '透過型 受光器' : '反射型';
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const typeId = `keyence.pr-g.${kind}${conn === 'M8' ? '.m8' : ''}`;
  const description =
    `KEYENCE のアンプ内蔵型光電センサ PR-G シリーズ ${kindName}（角型・ステンレスケース、${conn === 'M8' ? 'M8 4ピン コネクタ' : 'ケーブル 2m'}）。` +
    `種類は params の model で選ぶ: ${list.map((m) => `PR-G${m.code}（${m.kind} ${m.range}）`).join('、')}。` +
    (hasOut ? '出力形式は params の output で NPN / PNP を選ぶ（実在する型式は KEYENCE の仕様表を確認すること）。' : '') +
    (kind !== 'reflective' ? `透過型は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}）。` : '') +
    (kind === 'emitter'
      ? `${conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 投光停止入力（2 は未使用）' : '芯線は茶 = +24V、青 = 0V、黒 = 投光停止入力'}。投光停止入力は無電圧入力で、黒と 0V の間を閉じると投光を止める（動作確認用。使わなければ未接続）。`
      : `${conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力1、2（白）= 制御出力2' : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力1、白 = 制御出力2'}。` +
        '出力1 と出力2 は逆の動作（透過型・回帰反射型は出力1 = 遮光時 ON、拡散反射型は出力1 = 入光時 ON）。NPN は出力 ON で 0V に落ちる（PLC 入力の COM を +24V）、PNP は +V になる（COM を 0V）。' +
        '制御出力はオープンコレクタ DC30V 以下・100mA 以下。') +
    cableHint(conn) +
    `電源 DC10〜30V、消費電流（24V 時）${kind === 'emitter' ? '15mA' : kind === 'receiver' ? '12mA' : '15mA'} 以下。` +
    (kind === 'reflective' ? '回帰反射型はリフレクタ（R-2L など）が別売。背面の 7 セグ表示で受光量を確認できる。' : '');

  const cableLeads = kind === 'emitter' ? [PLUS, MINUS, STOP] : [PLUS, MINUS, OUT1, OUT2];
  const pinLeads = kind === 'emitter' ? [PLUS, NC, MINUS, STOP] : [PLUS, OUT2, MINUS, OUT1];
  const SX = 12;
  const SY = 16;
  return buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `PR-G${list.map((m) => m.code).join('/')} ${conn === 'M8' ? 'M8 コネクタ' : 'ケーブル'}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}`,
    description,
    width,
    body: (p) => `${defs}${prgSide(SX, SY, name(p), kind === 'reflective' ? t(p).kind : caption, conn === 'M8' ? 'm8' : 'cable')}${rear ? prgRear(SX + 50, SY) : ''}`,
    exit: conn === 'M8' ? { x: SX + 30, y: SY + 69.5 } : { x: SX + 36, y: SY + 72 },
    leadCenterX: SX + 25,
    conn,
    cableLeads,
    pinLeads,
    vmin: 10,
    vmax: 30,
    rated: 0.1,
    params: [typeParam(list), ...(hasOut ? [OUTPUT_PARAM] : [])],
    loadCurrent: kind === 'receiver' ? 0.012 : 0.015,
    title: (p) => `${t(p).kind} ${t(p).range}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}${hasOut ? `・${outName(p)}` : ''}`,
  });
}
