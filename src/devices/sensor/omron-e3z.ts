/**
 * オムロン 小型アンプ内蔵形光電センサ E3Z（標準タイプ）の共通描画と機器定義の組み立て。
 *
 * 外形: 幅 10.8 × 高さ 31 × 奥行 20 mm の角型。図は「検出面を左に向けた側面」（1mm ≒ 2px）。
 * 側面に M3 の取付穴 2 個、上面に動作表示灯（橙）と安定表示灯（緑）、背面に感度調整と動作切換（L・ON / D・ON）。
 * コード引出しタイプは背面下からケーブル（2m）、コネクタタイプは底面に M8 4 ピンのオスコネクタ。
 *
 * 型式（オムロン E3Z 形式/種類、データシート CSM_E3Z_DS_J）:
 *   透過形 15m（赤外光）: E3Z-T61（NPN）/ E3Z-T81（PNP）、M8 コネクタ E3Z-T66 / E3Z-T86（投光器＋受光器の組）
 *   回帰反射形（M.S.R. 機能付）4m（赤色光、リフレクタ E39-R1 使用時）: E3Z-R61 / E3Z-R81、コネクタ E3Z-R66 / E3Z-R86
 *   拡散反射形 5〜100mm（広視野、赤外光）: E3Z-D61 / E3Z-D81、コネクタ E3Z-D66 / E3Z-D86
 *   拡散反射形 1m（赤外光）: E3Z-D62 / E3Z-D82、コネクタ E3Z-D67 / E3Z-D87
 * 定格（同データシート）:
 *   電源電圧 DC12〜24V ±10%（リップル 10% 以下）、消費電流 透過形 35mA 以下（投光器 15mA・受光器 20mA）、反射形 30mA 以下
 *   制御出力: NPN / PNP オープンコレクタ、負荷電源電圧 DC26.4V 以下、負荷電流 100mA 以下、
 *             残留電圧 1V 以下（負荷電流 10mA 未満）/ 2V 以下（10〜100mA）、ライトON / ダークON 切換
 *   応答時間 1ms 以下
 * 配線: 茶 = +V、青 = 0V、黒 = 制御出力（NPN は負荷を茶と黒の間、PNP は黒と青の間）。透過形の投光器は茶・青の 2 本。
 *   M8 コネクタ: ピン 1 = +V、3 = 0V、4 = 出力、2 は未使用（投光器は 2・4 とも未使用）。
 * 出典: https://www.fa.omron.co.jp/products/family/407/specification/（定格/性能）
 *       https://www.fa.omron.co.jp/products/family/407/lineup/（形式/種類）
 *       E3Z データシート（英文 E88I-E-01 / CSM_E3Z_DS_E）の入出力段回路図・コネクタピン配置
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { buildPhoto, cableHint } from '../keyence/photo';
import { OUTPUT_PARAM, outName, pick, switchedOut, type Lead } from '../keyence/sensor-parts';
import { withMaker } from './parts';

export type E3zKind = 'emitter' | 'receiver' | 'reflective';
export type E3zConn = 'cable' | 'M8';

interface E3zType {
  /** NPN・コード引出しの型式の記号（'D61' など） */
  code: string;
  kind: string;
  range: string;
  /** コネクタタイプの末尾の数字（D61 → 6、D62 → 7） */
  conn: string;
}

const REFLECTIVE: E3zType[] = [
  { code: 'D61', kind: '拡散反射形 広視野', range: '5〜100mm', conn: '6' },
  { code: 'D62', kind: '拡散反射形', range: '1m', conn: '7' },
  { code: 'R61', kind: '回帰反射形 M.S.R.', range: '4m', conn: '6' },
];
const THROUGH: E3zType = { code: 'T61', kind: '透過形', range: '15m', conn: '6' };

/** 型式（NPN は 6、PNP は 8。例: E3Z-D61、E3Z-D87、E3Z-T66） */
export function e3zModel(t: E3zType, conn: E3zConn, output: 'N' | 'P') {
  const [letter, , last] = t.code;
  return `E3Z-${letter}${output === 'P' ? '8' : '6'}${conn === 'M8' ? t.conn : last}`;
}

const defs = `
  <defs>
    <linearGradient id="e3zbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#26282b"/>
    </linearGradient>
    <linearGradient id="e3zlens-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#101113"/>
      <stop offset="0.6" stop-color="#2c2f33"/>
      <stop offset="1" stop-color="#17181a"/>
    </linearGradient>
  </defs>`;

/** 側面（左上 x,y、40 × 62）。exit は背面下のケーブル出口か M8 コネクタの根元か */
function e3zSide(x: number, y: number, model: string, caption: string, kind: E3zKind, exit: E3zConn) {
  const W = 40;
  const H = 62;
  const lens =
    kind === 'reflective'
      ? // 反射形は投光・受光の 2 つの窓
        `<rect x="${x + 1.2}" y="${y + 12}" width="5" height="15" rx="1" fill="#7a1a1a" stroke="#2a0606" stroke-width="0.4"/>
  <rect x="${x + 1.2}" y="${y + 30}" width="5" height="15" rx="1" fill="#2a0e0e" stroke="#000" stroke-width="0.4"/>`
      : `<rect x="${x + 1.2}" y="${y + 14}" width="5" height="28" rx="1.2" fill="#3a0d0d" stroke="#000" stroke-width="0.4"/>`;
  return `
  <!-- 検出面（正面）のレンズ部 -->
  <path d="M${x} ${y + 2} H${x + 8} V${y + H} H${x} Z" fill="url(#e3zlens-{{uid}})" stroke="#0b0b0c" stroke-width="0.8"/>
  ${lens}
  <!-- 側面 -->
  <rect x="${x + 7}" y="${y}" width="${W - 7}" height="${H}" rx="2" fill="url(#e3zbody-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  ${[y + 6, y + H - 6]
    .map(
      (cy) => `<circle cx="${x + 13}" cy="${cy}" r="3.2" fill="#d4d7da" stroke="#55585d" stroke-width="0.6"/><circle cx="${x + 13}" cy="${cy}" r="1.5" fill="#1a1b1d"/>`,
    )
    .join('')}
  <!-- 銘板 -->
  <rect x="${x + 11}" y="${y + 14}" width="${W - 14}" height="30" rx="1" fill="#d9dcdf" stroke="#8a8f94" stroke-width="0.4"/>
  <text x="${x + 24}" y="${y + 21}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#1b3f8f" letter-spacing="0.2">OMRON</text>
  <text x="${x + 24}" y="${y + 27.5}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#222">${model}</text>
  <text x="${x + 24}" y="${y + 33}" text-anchor="middle" font-family="sans-serif" font-size="2.7" fill="#444">${caption}</text>
  <text x="${x + 24}" y="${y + 39}" text-anchor="middle" font-family="sans-serif" font-size="2.5" fill="#555">12-24VDC</text>
  <!-- 上面の表示灯（動作 橙・安定 緑）。投光器は電源表示（緑）だけ -->
  <rect x="${x + 20}" y="${y - 3}" width="15" height="4" rx="1" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  ${kind === 'emitter' ? '' : `<rect x="${x + 21.5}" y="${y - 2.2}" width="4" height="2.4" rx="0.5" fill="#ff9d2e"/>`}
  <rect x="${x + 28}" y="${y - 2.2}" width="4" height="2.4" rx="0.5" fill="#45e05f"/>
  <!-- 背面の感度調整・動作切換（側面から見える頭） -->
  ${kind === 'emitter' ? '' : `<rect x="${x + W - 1.5}" y="${y + 8}" width="2.8" height="7" rx="1" fill="#c9a227" stroke="#5a4708" stroke-width="0.4"/><rect x="${x + W - 1.5}" y="${y + 18}" width="2.8" height="6" rx="1" fill="#8d9298" stroke="#3d4045" stroke-width="0.4"/>`}
  ${
    exit === 'cable'
      ? `<!-- ケーブル出口（背面下） -->
  <path d="M${x + 27} ${y + H - 1} h9 l1 6 h-11 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`
      : ''
  }`;
}

const PLUS: Lead = { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' };
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const OUT: Lead = { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut };
const NC: Lead = { color: 'WH', label: '未使用', role: 'nc' };

/**
 * E3Z の機器定義を組み立てる。kind は反射形（拡散・回帰反射を params の model で選ぶ）・透過形の投光器・受光器。
 * 透過形は投光器と受光器を別々の機器として置き、それぞれ電源をつなぐ。
 */
export function buildE3z(kind: E3zKind, conn: E3zConn): DeviceDefinition {
  const reflective = kind === 'reflective';
  const hasOut = kind !== 'emitter';
  const list = reflective ? REFLECTIVE : [THROUGH];
  const t = (p: ParamValues) => pick(list, p.model);
  const out = (p: ParamValues): 'N' | 'P' => (p.output === 'P' ? 'P' : 'N');
  const unit = kind === 'emitter' ? '投光器' : kind === 'receiver' ? '受光器' : '';
  const kindName = kind === 'emitter' ? '透過形 投光器' : kind === 'receiver' ? '透過形 受光器' : '反射形';
  const typeId = `omron.e3z.${kind}${conn === 'M8' ? '.m8' : ''}`;
  const other = kind === 'emitter' ? 'receiver' : 'emitter';
  const connName = conn === 'M8' ? 'M8 4ピン コネクタ' : 'ケーブル 2m';

  const modelOf = (p: ParamValues) => {
    const m = e3zModel(t(p), conn, out(p));
    return kind === 'reflective' ? m : `${m}（${unit}）`;
  };
  const series = reflective
    ? REFLECTIVE.map((m) => `${e3zModel(m, conn, 'N')}（${m.kind} ${m.range}）`).join('・')
    : `${e3zModel(THROUGH, conn, 'N')}（透過形 15m）`;

  const description =
    `オムロンの小型アンプ内蔵形光電センサ E3Z ${kindName}（${connName}）。` +
    (reflective ? `種類は params の model で選ぶ: ${series}。回帰反射形はリフレクタ（E39-R1 など）が別売。` : '') +
    (hasOut ? `出力形式は params の output で NPN / PNP を選ぶ（PNP は型式の 6 が 8 になる。例: ${e3zModel(list[0], conn, 'N')} → ${e3zModel(list[0], conn, 'P')}）。` : '') +
    (kind !== 'reflective'
      ? `透過形は投光器と受光器を向かい合わせに置き、どちらにも電源をつなぐ（相手は ${typeId.replace(kind, other)}。組の型式は ${e3zModel(THROUGH, conn, 'N')} / PNP は ${e3zModel(THROUGH, conn, 'P')}）。`
      : '') +
    (kind === 'emitter'
      ? conn === 'M8'
        ? 'M8 のピン 1（茶）= +24V、3（青）= 0V（2・4 は未使用）。'
        : '芯線は茶 = +24V、青 = 0V の 2 本（出力なし）。'
      : (conn === 'M8' ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力（2 は未使用）。' : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力。') +
        'NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V）、PNP は黒が +V になる（COM を 0V）。' +
        '制御出力はオープンコレクタ 負荷電源電圧 DC26.4V 以下・負荷電流 100mA 以下（残留電圧 10mA 未満で 1V 以下、10〜100mA で 2V 以下）、' +
        'ライトON / ダークON は背面のスイッチで切り換える。応答時間 1ms 以下。') +
    cableHint(conn) +
    `電源 DC12〜24V ±10%、消費電流 ${kind === 'emitter' ? '15mA' : kind === 'receiver' ? '20mA' : '30mA'} 以下。`;

  const cableLeads = kind === 'emitter' ? [PLUS, MINUS] : [PLUS, MINUS, OUT];
  const pinLeads = kind === 'emitter' ? [PLUS, NC, MINUS, { ...NC, color: 'BK' as const }] : [PLUS, NC, MINUS, OUT];
  const SX = 14;
  const SY = 16;
  const def = buildPhoto({
    type: typeId,
    name: kind === 'emitter' ? '光電センサ（透過型 投光器）' : kind === 'receiver' ? '光電センサ（透過型 受光器）' : '光電センサ（反射型）',
    model: `E3Z ${reflective ? 'D61/D62/R61' : 'T61'} ${conn === 'M8' ? 'M8 コネクタ' : 'ケーブル'}${unit ? ` ${unit}` : ''}`,
    description,
    width: 70,
    body: (p) => `${defs}${e3zSide(SX, SY, e3zModel(t(p), conn, out(p)), reflective ? t(p).kind : unit, kind, conn)}`,
    exit: conn === 'M8' ? { x: SX + 31, y: SY + 62 } : { x: SX + 32, y: SY + 67 },
    leadCenterX: SX + 21,
    conn,
    cableLeads,
    pinLeads,
    vmin: 10.8,
    vmax: 26.4,
    rated: 0.1,
    params: [...(reflective ? [{ key: 'model', label: '種類（型式）', options: REFLECTIVE.map((m) => ({ value: m.code, label: `${m.code}（${m.kind} ${m.range}）` })), default: 'D61' }] : []), ...(hasOut ? [OUTPUT_PARAM] : [])],
    loadCurrent: kind === 'emitter' ? 0.015 : kind === 'receiver' ? 0.02 : 0.03,
    title: (p) => `E3Z ${reflective ? `${t(p).kind} ${t(p).range}` : `透過形 15m ${unit}`}${hasOut ? `・${outName(p)}` : ''}`,
  });
  return withMaker(def, 'オムロン', { modelOf });
}
