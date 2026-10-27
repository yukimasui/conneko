import type { DeviceDefinition, ParamValues } from '../types';
import { outName, sensorCable, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * パナソニック 角型近接センサ（アンプ内蔵）GX-F / GX-H シリーズ（DC 3 線式、ケーブル 1m）。
 * 前面検出の GX-F と上面検出の GX-H、サイズ 6・8・12・15、a 接点（A）/ b 接点（B）、NPN / PNP（-P）を params で選ぶ。
 * 型式は GX-{F|H}{サイズ}{A|B}{-P}（例: GX-F8A、GX-H12B-P）。
 *
 * 出典:
 *   https://industry.panasonic.com/global/en/products/fasys/sensor/proximity/gx-8（GX-F/H シリーズ）
 *   https://industry.panasonic.com/global/en/products/fasys/sensor/proximity/number/gx-f12a、gx-h12a、gx-f8a-p、gx-f6a
 *   SUNX GX-F/H 取扱説明書（MJE-GXFH8）の入出力回路図: NPN・PNP とも 茶 = +V、黒 = 出力、青 = 0V
 * 定格: 電源 DC12〜24V（+10% / −15%、リップル P-P 10% 以下）、消費電流 15mA 以下。
 *   NPN: オープンコレクタ 最大流入電流 100mA、印加電圧 DC30V 以下（出力と 0V 間）、残留電圧 2V 以下（100mA 時）
 *   PNP: オープンコレクタ 最大流出電流 100mA
 *   最大動作距離: 6 = 1.6mm、8 = 2.5mm、12 = 4.0mm、15 = 5.0mm（±8%、鉄の標準検出物体）。8 の最大応答周波数 500Hz
 * 外形は小さすぎて見えにくいので、1mm ≒ 3px で描く。本体の長さは見やすさ優先の目安。
 */

const W = 70;
const H = 168;

const SIZES: Record<number, { dist: string; len: number }> = {
  6: { dist: '1.6mm', len: 25 },
  8: { dist: '2.5mm', len: 25 },
  12: { dist: '4.0mm', len: 27 },
  15: { dist: '5.0mm', len: 30 },
};

const modelOf = (p: ParamValues) => `GX-${p.face}${p.size}${p.contact}${p.output === 'P' ? '-P' : ''}`;

const cable = sensorCable({
  cx: 35,
  y0: 110,
  yFan: 136,
  yEnd: 164,
  pitch: 11,
  vmin: 10.2,
  vmax: 26.4,
  leads: [
    { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' },
    { color: 'BK', label: '出力（NPN/PNP は出力形式、a/b は動作による）', role: 'out', signal: switchedOut },
    { color: 'BU', label: '0V', role: 'minus' },
  ],
});

function svg(p: ParamValues) {
  const s = SIZES[Number(p.size)] ?? SIZES[8];
  const bw = Number(p.size) * 3;
  const bl = s.len * 3;
  const x = 35 - bw / 2;
  const y = 104 - bl;
  const front = p.face === 'F';
  // 前面検出（F）は上の端面、上面検出（H）は手前の面の上寄りが検出面
  const face = front
    ? `<rect x="${x}" y="${y}" width="${bw}" height="7" rx="1" fill="#e2a33b" stroke="#7a4f0c" stroke-width="0.6"/>`
    : `<rect x="${x + 1.5}" y="${y + 2}" width="${bw - 3}" height="${Math.min(bw - 3, bl * 0.42)}" rx="1.2" fill="#e2a33b" stroke="#7a4f0c" stroke-width="0.6"/>`;
  const holeY = front ? y + bl * 0.55 : y + bl * 0.66;
  const hole = bw >= 24 ? `<circle cx="35" cy="${holeY}" r="${Math.min(4, bw * 0.12)}" fill="#0d0e10" stroke="#6b7076" stroke-width="0.6"/>` : '';
  return `
  <defs>
    <linearGradient id="gxbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f3238"/>
      <stop offset="0.45" stop-color="#5b6068"/>
      <stop offset="1" stop-color="#25272b"/>
    </linearGradient>
  </defs>
  ${cable.svg}
  <!-- 本体（樹脂の角型） -->
  <rect x="${x}" y="${y}" width="${bw}" height="${bl}" rx="1.5" fill="url(#gxbody-{{uid}})" stroke="#0b0c0d" stroke-width="0.8"/>
  ${face}
  ${hole}
  <!-- 動作表示灯（赤）とケーブルの根元 -->
  <rect x="${35 - Math.min(5, bw * 0.3)}" y="${y + bl - 9}" width="${Math.min(10, bw * 0.6)}" height="3.4" rx="1" fill="#ff3b30" stroke="#7a0c08" stroke-width="0.4"/>
  <rect x="31" y="${y + bl}" width="8" height="6" rx="1.2" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  ${
    bw <= 30
      ? `<text x="${35 + bw / 2 + 2}" y="${y + 10}" font-family="sans-serif" font-size="3.4" fill="#555">${front ? '前面検出' : '上面検出'}</text>
  <text x="${35 + bw / 2 + 2}" y="${y + 15}" font-family="sans-serif" font-size="3.4" fill="#555">${p.size}mm角</text>`
      : `<text x="35" y="${holeY - 8}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#d6d9dc">${front ? '前面検出' : '上面検出'} ${p.size}mm角</text>`
  }
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">${modelOf(p)}・検出 ${s.dist}</text>
  <text x="${W / 2}" y="12.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#555">${p.contact === 'B' ? 'b接点（NC）' : 'a接点（NO）'}・${outName(p)}</text>`;
}

const def: DeviceDefinition = {
  type: 'panasonic.gx-f-h',
  name: '近接センサ（DC3線式）',
  model: 'GX-F / GX-H（角型、ケーブル 1m）',
  modelOf,
  maker: 'パナソニック',
  category: 'sensor',
  description:
    'パナソニックの角型近接センサ（アンプ内蔵）GX-F / GX-H シリーズ（DC 3 線式、ケーブル 1m）。金属が近づくと出力が切り換わる。' +
    'params で、検出面（F: 前面検出 / H: 上面検出）、サイズ（6・8・12・15。最大動作距離 1.6・2.5・4.0・5.0mm）、' +
    '出力動作（A: a 接点 = 検出時 ON / B: b 接点 = 検出時 OFF）、出力形式（NPN / PNP。PNP は型式の末尾に -P）を選ぶ。型式は GX-{F|H}{サイズ}{A|B}{-P}。' +
    '茶を +24V、青を 0V、黒（出力）を PLC の入力につなぐ（NPN はプラスコモン、PNP はマイナスコモンの入力）。' +
    '電源 DC12〜24V（+10% / −15%）、消費電流 15mA 以下、出力はオープンコレクタ 最大 100mA・DC30V 以下（NPN の残留電圧 2V 以下）。' +
    '実在する組み合わせ（サイズと検出面・接点・出力形式）はカタログで確かめること。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // 出力（a 接点は検出時、b 接点は非検出時に ON）。NPN は黒 → 0V、PNP は黒 → +V
  links: sensorOutputLinks(['BK'], 0.1),
  params: [
    {
      key: 'face',
      label: '検出面',
      options: [
        { value: 'F', label: 'F（前面検出）' },
        { value: 'H', label: 'H（上面検出）' },
      ],
      default: 'F',
    },
    {
      key: 'size',
      label: 'サイズ',
      options: [6, 8, 12, 15].map((n) => ({ value: n, label: `${n}（最大動作距離 ${SIZES[n].dist}）` })),
      default: 8,
    },
    {
      key: 'contact',
      label: '出力動作',
      options: [
        { value: 'A', label: 'A（a 接点 / ノーマルオープン）' },
        { value: 'B', label: 'B（b 接点 / ノーマルクローズ）' },
      ],
      default: 'A',
    },
    {
      key: 'output',
      label: '出力形式',
      options: [
        { value: 'N', label: 'NPN' },
        { value: 'P', label: 'PNP（-P）' },
      ],
      default: 'N',
    },
  ],
  loadCurrent: 0.015,
};

export default def;
