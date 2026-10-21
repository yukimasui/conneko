/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G シリーズ（角型・ケーブルタイプ）の共通描画。
 *
 * 外形（KEYENCE 外形寸法図より）: 側面 20 × 31 mm、厚さ 13.1 mm。側面に M3 取付穴 2 個、正面（検出面）に赤いレンズ、
 * 上面に表示灯（橙/緑）、背面に感度調整トリマ・動作モード切換スイッチ、ケーブルは背面下から斜めに出る。
 * 図は「検出面を左に向けた側面」と「検出面」を少し立体的に描く（1mm ≒ 2px）。
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { OUTPUT_PARAM, outName, sensorCable, type Lead } from './sensor-parts';

/** ヘッド（左上 x,y）。kind で表示灯・トリマの描き分け */
export function pzgHead(x: number, y: number, model: string, kind: 'emitter' | 'receiver') {
  const W = 40;
  const H = 62;
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
  ${kind === 'receiver' ? `<rect x="${x + 28.6}" y="${y - 2.2}" width="3.6" height="2.4" rx="0.5" fill="#45e05f"/>` : ''}
  <!-- 背面のトリマ / 切換スイッチ（側面から見える頭） -->
  <rect x="${x + W - 2}" y="${y + 16}" width="3" height="10" rx="1" fill="#3a3c40" stroke="#0b0b0c" stroke-width="0.4"/>
  <text x="${x + 24}" y="${y + 33}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#c9ccd0" letter-spacing="0.2">KEYENCE</text>
  <text x="${x + 24}" y="${y + 39}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#9a9ea3">${model}</text>
  <text x="${x + 24}" y="${y + 45}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#8a8e93">${kind === 'emitter' ? '投光器' : '受光器'}</text>
  <!-- ケーブル出口 -->
  <path d="M${x + W - 9} ${y + H - 2} l5 2 l-2 6 l-6 -1 z" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>`;
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
    { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out' },
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
    svg: (p: ParamValues) => `${pzgDefs}${cable.svg}${pzgHead(15, 12, `${s.series}${p.output === 'P' ? 'P' : 'N'}`, 'receiver')}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">${s.kindName} ${s.range}・${outName(p)}</text>`,
    terminals: cable.terminals,
    params: [OUTPUT_PARAM],
    loadCurrent: 0.03,
  };
}
