/**
 * KEYENCE アンプ内蔵型光電センサ PZ-V / PZ-M シリーズ（角型、黒い樹脂ケース）。
 *
 * 外形（KEYENCE 外形寸法図より）:
 * - PZ-M11/M31/M51/M61: 側面 18.6〜20 × 34.8 mm（上面の表示灯カバー +2.7 mm）、厚さ 10.8 mm、M3 取付穴 2 個
 * - PZ-V11/V31: 側面 21.1 × 36.5 mm、背面にデジタル表示と ▲▼ ボタン（設定ボタンは上面）
 * - PZ-M71/V71: 側面 26 × 46.4 mm、厚さ 15 mm、M4 取付穴 2 個
 * ケーブルは背面下から斜めに出る（ø3.7 4芯 2m）。コネクタタイプは 0.3m のケーブル付 M12（型式末尾 3）と
 * 0.13m のケーブル付 M8（型式末尾 2）。図は側面（検出面を左）、PZ-V は背面も並べて描く（1mm ≒ 2px）。
 *
 * 配線（KEYENCE 入出力回路図より。NPN・PNP とも同じ並び）:
 * - 受光器・反射型: 茶（ピン1）= DC12〜24V、黒（ピン4）= 制御出力、桃（ピン2）= 出力動作の切換（+V につなぐと遮光時 ON、
 *   0V につなぐと入光時 ON。必ずどちらかにつなぐ）、青（ピン3）= 0V
 * - 透過型の投光器（PZ-M51）: 茶（ピン1）、青（ピン3）だけ（ピン 2・4 は未使用）
 * 制御出力は NPN / PNP オープンコレクタ 最大 100mA（24V 以下）、残留電圧 1V 以下。電源 DC12〜24V ±10%。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m51/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m11p/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m31/dimensions/（ほか M51・M61・M71・V31 の dimensions）
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildPhoto, cableHint, type PhotoConn } from './photo';
import { OUTPUT_PARAM, outName, pick, switchedOut, type Lead } from './sensor-parts';

export type PzvmKind = 'emitter' | 'receiver' | 'reflective';
type Conn = Extract<PhotoConn, 'cable' | 'M12-pigtail' | 'M8-pigtail'>;

interface PzvmType {
  code: string;
  kind: string;
  range: string;
  /** 'small' = PZ-M 標準、'digital' = PZ-V（背面表示）、'large' = M71/V71 */
  form: 'small' | 'digital' | 'large';
}

const REFLECTIVE: PzvmType[] = [
  { code: 'M11', kind: '拡散反射型', range: '5〜100mm', form: 'small' },
  { code: 'M31', kind: '拡散反射型', range: '5〜300mm', form: 'small' },
  { code: 'M71', kind: 'マルチ反射型', range: '20〜900mm', form: 'large' },
  { code: 'M61', kind: '回帰反射型 P.R.O.', range: '0.1〜1.5m', form: 'small' },
  { code: 'V11', kind: 'デジタル 拡散反射型', range: '5〜100mm', form: 'digital' },
  { code: 'V31', kind: 'デジタル 拡散反射型', range: '5〜300mm', form: 'digital' },
  { code: 'V71', kind: 'デジタル マルチ反射型', range: '20〜900mm', form: 'large' },
];
const THROUGH: PzvmType[] = [{ code: 'M51', kind: '透過型', range: '10m', form: 'small' }];

const defs = `
  <defs>
    <linearGradient id="pzmbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b3d41"/>
      <stop offset="1" stop-color="#1a1b1d"/>
    </linearGradient>
    <linearGradient id="pzmlens-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d23a3a"/>
      <stop offset="0.5" stop-color="#7a1414"/>
      <stop offset="1" stop-color="#3f0808"/>
    </linearGradient>
  </defs>`;

/**
 * 側面（下端の中心付近がケーブル出口）。x は左端、yb は下端。w, h は本体の幅・高さ[px]。
 * 側面に芯線の色と機能の表示（実物の印字）を描く。
 */
function pzmSide(x: number, yb: number, w: number, h: number, model: string, caption: string, emitter: boolean) {
  const y = yb - h;
  const holeR = w > 45 ? 3.4 : 2.8;
  const label = emitter
    ? [`BN 12-24VDC`, `BU 0V`]
    : [`BN 12-24VDC`, `BU 0V`, `BK OUT`, `PK +:D.ON`, `   0V:L.ON`];
  return `
  <!-- 上面の表示灯カバー（透明）・トリマ -->
  <path d="M${x + w * 0.38} ${y} V${y - 4} Q${x + w * 0.38} ${y - 5.4} ${x + w * 0.38 + 1.6} ${y - 5.4} H${x + w - 2} Q${x + w} ${y - 5.4} ${x + w} ${y - 3.6} V${y} Z" fill="#b8c4cc" stroke="#55606a" stroke-width="0.5" opacity="0.9"/>
  <rect x="${x + w * 0.45}" y="${y - 4.2}" width="3.2" height="2.4" rx="0.5" fill="#ff4a3a"/>
  ${emitter ? '' : `<rect x="${x + w * 0.45 + 4.2}" y="${y - 4.2}" width="3.2" height="2.4" rx="0.5" fill="#45e05f"/>`}
  <circle cx="${x + w * 0.8}" cy="${y - 2.8}" r="2" fill="#2f6fd6" stroke="#173d7a" stroke-width="0.4"/>
  <!-- 本体（側面） -->
  <path d="M${x} ${y + 2} Q${x} ${y} ${x + 2} ${y} H${x + w - 2} Q${x + w} ${y} ${x + w} ${y + 2} V${yb - 2} Q${x + w} ${yb} ${x + w - 2} ${yb} H${x + 2} Q${x} ${yb} ${x} ${yb - 2} Z" fill="url(#pzmbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  <!-- 検出面（左端）のレンズ -->
  <rect x="${x - 1.6}" y="${y + h * 0.3}" width="4" height="${h * 0.42}" rx="1" fill="url(#pzmlens-{{uid}})" stroke="#3a0b0b" stroke-width="0.4"/>
  <!-- 取付穴 -->
  ${[y + 6, yb - 6].map((cy) => `<circle cx="${x + 6}" cy="${cy}" r="${holeR}" fill="#141516" stroke="#55585d" stroke-width="0.6"/><circle cx="${x + 6}" cy="${cy}" r="${holeR * 0.45}" fill="#050505"/>`).join('')}
  <!-- 印字 -->
  <text x="${x + w * 0.6}" y="${y + 9}" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#e2e4e6" letter-spacing="0.2">KEYENCE</text>
  ${label.map((t, i) => `<text x="${x + 12}" y="${y + 15.5 + i * 4}" font-family="monospace" font-size="2.9" fill="#c9ccd0">${t}</text>`).join('')}
  <text x="${x + w * 0.6}" y="${yb - 14}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#c9ccd0">${model}</text>
  <text x="${x + w * 0.6}" y="${yb - 9}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#9a9ea3">${caption}</text>
  <!-- ケーブル出口（背面下、斜め） -->
  <path d="M${x + w - 9} ${yb - 1} l6 -1 l3 5 l-6 3 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`;
}

/** PZ-V の背面（デジタル表示と ▲▼ ボタン）。x は左端、yb は下端 */
function pzvRear(x: number, yb: number, h: number) {
  const y = yb - h;
  const w = 22;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#pzmbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.8"/>
  <rect x="${x + 4}" y="${y - 5}" width="${w - 8}" height="5" rx="1.5" fill="#b8c4cc" stroke="#55606a" stroke-width="0.5"/>
  <circle cx="${x + w / 2}" cy="${y + 8}" r="2.8" fill="#2c2e31" stroke="#6d7277" stroke-width="0.5"/>
  <text x="${x + w / 2}" y="${y + 9.3}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#c9ccd0">▲</text>
  <rect x="${x + 4}" y="${y + 14}" width="${w - 8}" height="${h * 0.42}" rx="1" fill="#0b0b0c" stroke="#55585c" stroke-width="0.5"/>
  <text x="${x + w / 2}" y="${y + 14 + h * 0.3}" text-anchor="middle" font-family="monospace" font-size="6.5" font-weight="bold" fill="#ff3b30">553</text>
  <circle cx="${x + w / 2}" cy="${yb - 8}" r="2.8" fill="#2c2e31" stroke="#6d7277" stroke-width="0.5"/>
  <text x="${x + w / 2}" y="${yb - 6.7}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#c9ccd0">▼</text>`;
}

const SIZES: Record<PzvmType['form'], { w: number; h: number }> = {
  small: { w: 40, h: 70 },
  digital: { w: 42, h: 73 },
  large: { w: 52, h: 93 },
};

const typeParam = (list: PzvmType[]): ParamDef => ({
  key: 'model',
  label: '種類（型式）',
  options: list.map((m) => ({ value: m.code, label: `PZ-${m.code}（${m.kind} ${m.range}）` })),
  default: list[0].code,
});

const PLUS: Lead = { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT: Lead = { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut };
const MODE: Lead = {
  color: 'PK',
  label: '出力動作の切換（+V で遮光時ON、0V で入光時ON）',
  role: 'select',
  note: '+V（茶と同じ）か 0V（青と同じ）のどちらかに必ずつなぐ',
};
const NC: Lead = { color: 'WH', label: '未使用', role: 'nc' };

/** 型式の末尾（ケーブル = 1、M12 = 3、M8 = 2）を接続形態に合わせる */
const connCode = (code: string, conn: Conn) => code.slice(0, -1) + (conn === 'M12-pigtail' ? '3' : conn === 'M8-pigtail' ? '2' : code.slice(-1));

export function buildPzvm(kind: PzvmKind, conn: Conn): DeviceDefinition {
  const list = kind === 'reflective' ? REFLECTIVE : THROUGH;
  const t = (p: ParamValues) => pick(list, p.model);
  const hasOut = kind !== 'emitter';
  const width = kind === 'reflective' ? 96 : 66;
  const X = kind === 'reflective' ? 16 : 12;
  const YB = 112;
  const typeId = `keyence.pz-m.${kind}${conn === 'cable' ? '' : conn === 'M12-pigtail' ? '.m12' : '.m8'}`;
  const name = (p: ParamValues) => `PZ-${connCode(t(p).code, conn)}${hasOut && p.output === 'P' ? 'P' : ''}`;
  const caption = (p: ParamValues) => (kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : t(p).kind);
  const body = (p: ParamValues) => {
    const s = SIZES[t(p).form];
    // ケーブル出口（本体の右下）の位置をそろえるため、本体の右端を X + 40 に合わせる
    const side = pzmSide(X + 40 - s.w, YB, s.w, s.h, name(p), caption(p), kind === 'emitter');
    const rear = t(p).code.startsWith('V') ? pzvRear(X + 48, YB, s.h) : '';
    return `${defs}${side}${rear}`;
  };
  const connName = conn === 'cable' ? 'ケーブル 2m' : conn === 'M12-pigtail' ? 'ケーブル付 M12 4ピン コネクタ（0.3m）' : 'ケーブル付 M8 4ピン コネクタ（0.13m）';
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const description =
    `KEYENCE のアンプ内蔵型光電センサ PZ-V / PZ-M シリーズ ${kind === 'emitter' ? '透過型 投光器' : kind === 'receiver' ? '透過型 受光器' : '反射型'}（${connName}）。` +
    (kind === 'reflective'
      ? `種類は params の model で選ぶ: ${list.map((m) => `PZ-${m.code}（${m.kind} ${m.range}）`).join('、')}（PZ-V はデジタル表示付き）。`
      : `PZ-M51（透過型 10m）の${kind === 'emitter' ? '投光器' : '受光器'}。投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}）。`) +
    (hasOut ? '出力形式は params の output で NPN / PNP（型式末尾 P）を選ぶ。' : '') +
    (kind === 'emitter'
      ? `${conn === 'cable' ? '茶 = +24V、青 = 0V' : 'ピン 1（茶）= +24V、3（青）= 0V（2・4 は未使用）'}。`
      : `${conn === 'cable' ? '芯線は' : 'ピン 1〜4 は'} 茶（1）= +24V、青（3）= 0V、黒（4）= 制御出力、桃（2）= 出力動作の切換。` +
        '桃は +V につなぐと遮光時 ON、0V につなぐと入光時 ON になる（未接続にしない）。NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V）、PNP は黒が +V になる（COM を 0V）。' +
        '制御出力はオープンコレクタ 最大 100mA（24V 以下）。') +
    (conn !== 'cable' ? cableHint(conn) + '標準のセンサーケーブルではピン 2（桃）は白の芯線になる。' : '') +
    '電源 DC12〜24V ±10%。' +
    (kind === 'reflective' ? '回帰反射型（PZ-M61）はリフレクタ（R-5 など）が別売。' : '');

  const cableLeads = kind === 'emitter' ? [PLUS, MINUS] : [PLUS, MINUS, OUT, MODE];
  const pinLeads = kind === 'emitter' ? [PLUS, NC, MINUS, { ...NC, color: 'BK' as const }] : [PLUS, MODE, MINUS, OUT];
  return buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `PZ-${list.map((m) => connCode(m.code, conn)).join('/')}${hasOut ? '（P）' : ''}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}`,
    description,
    width,
    body,
    exit: { x: X + 34, y: YB + 6 },
    leadCenterX: X + 26,
    conn,
    cableLeads,
    pinLeads,
    vmin: 10.8,
    vmax: 26.4,
    rated: 0.1,
    params: [...(kind === 'reflective' ? [typeParam(list)] : []), ...(hasOut ? [OUTPUT_PARAM] : [])],
    loadCurrent: 0.03,
    title: (p) => `${kind === 'reflective' ? `PZ-${t(p).code} ` : ''}${t(p).kind} ${t(p).range}${kind === 'emitter' ? ' 投光器' : kind === 'receiver' ? ' 受光器' : ''}${hasOut ? `・${outName(p)}` : ''}`,
    pigtailLength: conn === 'M12-pigtail' ? '0.3m' : conn === 'M8-pigtail' ? '0.13m' : undefined,
  });
}
