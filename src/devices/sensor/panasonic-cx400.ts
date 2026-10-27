/**
 * パナソニック 小型ビームセンサ（アンプ内蔵）CX-400 シリーズ Ver.2 の共通描画と機器定義の組み立て。
 *
 * 外形: 幅 11.2 × 高さ 31 × 奥行 20 mm 前後の角型（黒い樹脂ケース）。図は「検出面を左に向けた側面」（1mm ≒ 2px）。
 * 上面に動作表示灯（橙）・安定表示灯（緑）、感度調整ボリュームと動作モード切換スイッチ（L-ON / D-ON）。背面下からケーブル（2m）。
 *
 * 型式（パナソニック CX-400 シリーズ Ver.2 カタログ・各型式の製品ページ）:
 *   透過型 10m: CX-411（投光器＋受光器の組）、PNP 出力は CX-411-P
 *   拡散反射型 300mm: CX-421 / CX-421-P、800mm: CX-422 / CX-422-P
 *   回帰反射型（偏光フィルタ付）3m: CX-491 / CX-491-P（リフレクタ RF-230 を使用）
 *   M8 コネクタタイプは末尾に -Z（このリポジトリではケーブルタイプだけを定義する）
 * 定格:
 *   電源電圧 DC12〜24V ±10%（リップル P-P 10% 以下）
 *   消費電流: CX-411 投光器 15mA 以下・受光器 10mA 以下、CX-421 13mA 以下（CX-422・CX-491 は確認できず、CX-421 と同じとした = 推定）
 *   出力: NPN オープンコレクタ（最大流入電流 100mA、印加電圧 DC30V 以下（出力と 0V 間）、残留電圧 2V 以下（流入 100mA 時）・1V 以下（16mA 時））。
 *         PNP（-P）は最大流出電流 100mA、残留電圧 2V 以下。入光時 ON / 遮光時 ON 切換、短絡保護付
 * 配線: 茶 = +V、青 = 0V、黒 = 出力。透過型の投光器は黒がない（茶・青の 2 本）。
 *   桃（モード切換）は距離設定型 CX-44□ だけにあり、ここで定義する型式にはない。
 * 出典: https://industry.panasonic.com/global/en/products/fasys/sensor/photoelectric/number/cx-421
 *       https://industry.panasonic.com/global/en/products/fasys/sensor/photoelectric/number/cx-411
 *       https://industry.panasonic.com/global/en/products/fasys/sensor/photoelectric/cx-400
 *       CX-400 取扱説明書（industry.panasonic.eu の mn_cx400_user_pid_en.pdf）の入出力回路図・線色
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { buildPhoto } from '../keyence/photo';
import { OUTPUT_PARAM, outName, pick, switchedOut, type Lead } from '../keyence/sensor-parts';
import { withMaker } from './parts';

export type Cx400Kind = 'emitter' | 'receiver' | 'reflective';

interface CxType {
  code: string;
  kind: string;
  range: string;
}

const REFLECTIVE: CxType[] = [
  { code: '421', kind: '拡散反射型', range: '300mm' },
  { code: '422', kind: '拡散反射型', range: '800mm' },
  { code: '491', kind: '回帰反射型 偏光フィルタ付', range: '3m' },
];

const defs = `
  <defs>
    <linearGradient id="cxbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b3d41"/>
      <stop offset="1" stop-color="#151617"/>
    </linearGradient>
    <linearGradient id="cxlens-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5b1212"/>
      <stop offset="0.5" stop-color="#a42a2a"/>
      <stop offset="1" stop-color="#3a0909"/>
    </linearGradient>
  </defs>`;

/** 側面（左上 x,y、40 × 62）。上面の後ろ寄りに表示灯・ボリューム・切換スイッチ */
function cxSide(x: number, y: number, model: string, caption: string, kind: Cx400Kind) {
  const W = 40;
  const H = 62;
  return `
  <!-- 本体（側面）。上面の後ろが一段高い -->
  <path d="M${x + 2} ${y + 4} H${x + 20} V${y} H${x + W - 2} Q${x + W} ${y} ${x + W} ${y + 2} V${y + H - 2} Q${x + W} ${y + H} ${x + W - 2} ${y + H} H${x + 2} Q${x} ${y + H} ${x} ${y + H - 2} V${y + 6} Q${x} ${y + 4} ${x + 2} ${y + 4} Z" fill="url(#cxbody-{{uid}})" stroke="#050505" stroke-width="0.9"/>
  <!-- 検出面のレンズ（左端） -->
  <rect x="${x - 1.4}" y="${y + 12}" width="4.4" height="${kind === 'reflective' ? 34 : 30}" rx="1.2" fill="url(#cxlens-{{uid}})" stroke="#2a0606" stroke-width="0.4"/>
  ${kind === 'reflective' ? `<line x1="${x - 1.4}" y1="${y + 29}" x2="${x + 3}" y2="${y + 29}" stroke="#1a0303" stroke-width="0.8"/>` : ''}
  <!-- 取付穴（M3） -->
  ${[y + 10, y + H - 8]
    .map((cy) => `<circle cx="${x + 9}" cy="${cy}" r="3" fill="#0b0b0c" stroke="#56595e" stroke-width="0.6"/><circle cx="${x + 9}" cy="${cy}" r="1.4" fill="#000"/>`)
    .join('')}
  <!-- 上面の表示灯・ボリューム・切換スイッチ（側面から見える頭） -->
  ${kind === 'emitter' ? '' : `<rect x="${x + 22}" y="${y - 2.4}" width="5" height="3" rx="0.6" fill="#ff8c1a"/>`}
  <rect x="${x + 28.5}" y="${y - 2.4}" width="5" height="3" rx="0.6" fill="#3fd55b"/>
  ${kind === 'emitter' ? '' : `<rect x="${x + 34.5}" y="${y - 3}" width="4" height="3.6" rx="1.4" fill="#9aa0a6" stroke="#3d4045" stroke-width="0.4"/>`}
  <!-- 印字 -->
  <text x="${x + 24}" y="${y + 20}" text-anchor="middle" font-family="sans-serif" font-size="4.1" font-weight="bold" fill="#e8e8e8">Panasonic</text>
  <text x="${x + 24}" y="${y + 28}" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#d0d3d6">${model}</text>
  <text x="${x + 24}" y="${y + 34}" text-anchor="middle" font-family="sans-serif" font-size="2.7" fill="#a6aaae">${caption}</text>
  <text x="${x + 24}" y="${y + 42}" text-anchor="middle" font-family="sans-serif" font-size="2.5" fill="#8e9296">12-24V DC</text>
  <!-- ケーブル出口（背面下） -->
  <path d="M${x + 28} ${y + H - 1} h8 l1 6 h-10 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`;
}

const PLUS: Lead = { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT: Lead = { color: 'BK', label: '出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut };

/** CX-400 の機器定義を組み立てる（ケーブル 2m）。反射型は種類を params の model で選ぶ。透過型は投光器・受光器を別々に置く */
export function buildCx400(kind: Cx400Kind): DeviceDefinition {
  const reflective = kind === 'reflective';
  const hasOut = kind !== 'emitter';
  const t = (p: ParamValues) => pick(REFLECTIVE, p.model);
  const unit = kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '';
  const code = (p: ParamValues) => (reflective ? t(p).code : '411');
  const modelName = (p: ParamValues) => `CX-${code(p)}${hasOut && p.output === 'P' ? '-P' : ''}`;
  const typeId = `panasonic.cx-400.${kind}`;
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const description =
    `パナソニックの小型ビームセンサ（アンプ内蔵）CX-400 シリーズ ${reflective ? '反射型' : `透過型 ${unit}`}（ケーブル 2m）。` +
    (reflective ? `種類は params の model で選ぶ: ${REFLECTIVE.map((m) => `CX-${m.code}（${m.kind} ${m.range}）`).join('、')}。回帰反射型はリフレクタ RF-230 を向かい合わせに付ける。` : '') +
    (hasOut ? '出力形式は params の output で NPN / PNP を選ぶ（PNP は型式の末尾に -P）。' : '') +
    (!reflective ? `透過型（CX-411、10m）は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}）。` : '') +
    (kind === 'emitter'
      ? '芯線は茶 = +24V、青 = 0V の 2 本（投光器には黒の出力線がない）。'
      : '芯線は茶 = +24V、青 = 0V、黒 = 出力。NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V）、PNP は黒が +V になる（COM を 0V）。' +
        '出力はオープンコレクタ 最大 100mA・DC30V 以下、残留電圧 2V 以下（100mA 時。16mA 時 1V 以下）、入光時 ON / 遮光時 ON は上面のスイッチで切り換える。') +
    `電源 DC12〜24V ±10%、消費電流 ${kind === 'emitter' ? '15mA' : kind === 'receiver' ? '10mA' : '13mA（CX-421）'} 以下。` +
    (reflective ? 'CX-422・CX-491 の消費電流は資料で確かめられず、CX-421 と同じ 13mA とした（推定）。' : '');

  const def = buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `CX-${reflective ? REFLECTIVE.map((m) => m.code).join('/') : '411'} ケーブル${unit ? ` ${unit}` : ''}`,
    description,
    width: 70,
    body: (p) => `${defs}${cxSide(14, 16, modelName(p), reflective ? `${t(p).kind}` : unit, kind)}`,
    exit: { x: 46, y: 83 },
    leadCenterX: 35,
    conn: 'cable',
    cableLeads: kind === 'emitter' ? [PLUS, MINUS] : [PLUS, MINUS, OUT],
    vmin: 10.8,
    vmax: 26.4,
    rated: 0.1,
    params: [
      ...(reflective ? [{ key: 'model', label: '種類（型式）', options: REFLECTIVE.map((m) => ({ value: m.code, label: `CX-${m.code}（${m.kind} ${m.range}）` })), default: '421' }] : []),
      ...(hasOut ? [OUTPUT_PARAM] : []),
    ],
    loadCurrent: kind === 'emitter' ? 0.015 : kind === 'receiver' ? 0.01 : 0.013,
    title: (p) => `CX-400 ${reflective ? `${t(p).kind} ${t(p).range}` : `透過型 10m ${unit}`}${hasOut ? `・${outName(p)}` : ''}`,
  });
  return withMaker(def, 'パナソニック', {
    modelOf: (p) => (unit ? `${modelName(p)}（${unit}）` : modelName(p)),
    ...(reflective ? { estimated: 'CX-422・CX-491 の消費電流（CX-421 と同じ 13mA 以下とした）' } : {}),
  });
}
