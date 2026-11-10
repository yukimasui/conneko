/**
 * SMC のプラグイン形マニホールド用 D サブコネクタケーブル AXT100-DS25-□□□（片側 D サブ 25 ピンのソケット・片側バラ線）。
 * マニホールドの D サブコネクタ（F キット）に差し、反対側の芯線を PLC の出力・端子台・電源へつなぐ。
 *
 * 出典: SMC VQ1000/2000・VQC1000/2000 シリーズ カタログ（「D-sub Connector Cable Assembly」AXT100-DS25-015 / 030 / 050 = 1.5 / 3 / 5m）、
 *   SMC USA の製品ページ「VQ1000/2000, D-sub Connector Cable Assembly」。
 *   芯線の色（ドットマーク付き）は、検索結果の要約で確かめられたのは 13（橙・赤のドット）と 14（黄・黒のドット）だけで、ほかは推定。
 *
 * Conneko では、コネクタ（CN）と芯線の先ごとの端子（ピン番号 '1'〜'25'）を持つ機器として定義し、ピンと端子を links でつなぐ
 * （MIL の片側バラ線のハーネスと同じ考え方）。
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { text } from '../generic/parts';

const COLORS: Record<string, { name: string; hex: string }> = {
  BK: { name: '黒', hex: '#1d1d1d' },
  BN: { name: '茶', hex: '#8b4f24' },
  RD: { name: '赤', hex: '#d6302c' },
  OG: { name: '橙', hex: '#f57c00' },
  YE: { name: '黄', hex: '#f2d21b' },
  PK: { name: '桃', hex: '#f39abb' },
  BU: { name: '青', hex: '#1f5fd6' },
  VT: { name: '紫', hex: '#8040b8' },
  GY: { name: '灰', hex: '#8f969e' },
  WH: { name: '白', hex: '#f4f4f4' },
};

/** ピン 1〜25 の芯線の色とドットマークの色（推定。13・14 は資料の要約で確かめた） */
const LEADS: [string, string?][] = [
  ['BK'], ['BN'], ['RD'], ['OG'], ['YE'], ['PK'], ['BU'], ['VT', 'WH'], ['GY', 'BK'], ['WH', 'BK'], ['WH', 'RD'], ['YE', 'RD'], ['OG', 'RD'],
  ['YE', 'BK'], ['PK', 'BK'], ['BU', 'WH'], ['VT'], ['GY'], ['OG', 'BK'], ['RD', 'WH'], ['BN', 'WH'], ['PK', 'RD'], ['GY', 'RD'], ['BK', 'WH'], ['WH'],
];

const colorName = (c: [string, string?]) => `${COLORS[c[0]].name}${c[1] ? `/${COLORS[c[1]].name}点` : ''}`;

export const DSUB_CABLE_LENGTHS: Record<string, string> = { '015': '1.5m', '030': '3m', '050': '5m' };

export function buildAxt100Ds25(type: string): DeviceDefinition {
  const PITCH = 7;
  const n = LEADS.length;
  const W = n * PITCH + 16;
  const H = 170;
  const CX = W / 2;
  const yEnd = H - 4;
  const xs = LEADS.map((_, i) => +(CX + (i - (n - 1) / 2) * PITCH).toFixed(2));
  const PLUG = { w: 66, h: 20, y: 6 };

  const wires = LEADS.map((c, i) => {
    const col = COLORS[c[0]];
    const x0 = +(CX - 5 + (i * 10) / (n - 1)).toFixed(2);
    const d = `M${x0} 70 C${x0} 96 ${xs[i]} ${yEnd - 46} ${xs[i]} ${yEnd - 12}`;
    const dot = c[1] ? `<circle cx="${xs[i]}" cy="${yEnd - 33}" r="0.9" fill="${COLORS[c[1]].hex}" stroke="#555" stroke-width="0.2"/><circle cx="${xs[i]}" cy="${yEnd - 38}" r="0.9" fill="${COLORS[c[1]].hex}" stroke="#555" stroke-width="0.2"/>` : '';
    return `<path d="${d}" fill="none" stroke="#3a3c40" stroke-width="2.5" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${col.hex}" stroke-width="1.8" stroke-linecap="round"/>
  ${dot}
  <rect x="${xs[i] - 1.2}" y="${yEnd - 12}" width="2.4" height="12" rx="0.4" fill="#c7cacd" stroke="#7d8287" stroke-width="0.3"/>
  ${text(xs[i], yEnd - 15, String(i + 1), 2.8, '#222', 'normal')}`;
  }).join('');

  const svg = `
  <defs>
    <linearGradient id="dsc-shell-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="1" stop-color="#a9aeb3"/>
    </linearGradient>
  </defs>
  ${wires}
  <!-- 黒いシースの丸形ケーブル -->
  <rect x="${CX - 6}" y="${PLUG.y + PLUG.h + 8}" width="12" height="${70 - PLUG.y - PLUG.h - 8}" rx="2" fill="#26282b" stroke="#060607" stroke-width="0.5"/>
  <rect x="${CX - 7}" y="68" width="14" height="3" rx="1" fill="#111"/>
  <!-- D サブ 25 ピンのソケット（フード付き） -->
  <path d="M${CX - 16} ${PLUG.y + PLUG.h} L${CX - 8} ${PLUG.y + PLUG.h + 9} H${CX + 8} L${CX + 16} ${PLUG.y + PLUG.h} Z" fill="#3a3c40" stroke="#111" stroke-width="0.5"/>
  <rect x="${CX - PLUG.w / 2}" y="${PLUG.y}" width="${PLUG.w}" height="${PLUG.h}" rx="2" fill="url(#dsc-shell-{{uid}})" stroke="#5f666c" stroke-width="0.7"/>
  <circle cx="${CX - PLUG.w / 2 + 5}" cy="${PLUG.y + PLUG.h / 2}" r="2.6" fill="#8d9297" stroke="#55595e" stroke-width="0.4"/>
  <circle cx="${CX + PLUG.w / 2 - 5}" cy="${PLUG.y + PLUG.h / 2}" r="2.6" fill="#8d9297" stroke="#55595e" stroke-width="0.4"/>
  <path d="M${CX - 22} ${PLUG.y + 4} H${CX + 22} L${CX + 20} ${PLUG.y + PLUG.h - 4} H${CX - 20} Z" fill="#2a2c30"/>
  ${text(CX, PLUG.y + 12.4, 'D-sub 25P', 4, '#e6e7e9')}
  ${text(CX + 30, 50, 'AXT100-DS25', 4, '#333', 'bold', 'start')}`;

  const terminals: TerminalDef[] = [
    {
      id: 'CN',
      label: 'D サブ 25 ピン（ソケット）',
      x: CX,
      y: PLUG.y,
      side: 'top',
      role: 'connector',
      connector: { kind: 'DSUB25', pins: 25, width: PLUG.w - 10 },
    },
    ...LEADS.map(
      (c, i): TerminalDef => ({
        id: String(i + 1),
        label: `${i + 1} ${colorName(c)}`,
        note: `D サブのピン ${i + 1} につながる芯線（${colorName(c)}）`,
        x: xs[i],
        y: yEnd,
        side: 'bottom',
        role: 'pass',
        optional: true,
      }),
    ),
  ];
  const pins: PinDef[] = LEADS.map((c, i) => ({ id: `CN#${i + 1}`, label: `${i + 1} ${colorName(c)}`, role: 'pass', optional: true }));
  const links: InternalLink[] = LEADS.map((_, i) => ({ from: `CN#${i + 1}`, to: String(i + 1) }));

  return {
    type,
    name: 'D サブコネクタケーブル（片側バラ線）',
    model: 'AXT100-DS25-030',
    modelOf: (p) => `AXT100-DS25-${p.length}`,
    maker: 'SMC',
    category: 'terminal',
    cable: true,
    description:
      'SMC のプラグイン形マニホールド（VQC1000 の VV5QC11-□□□FD0 など）用の D サブコネクタケーブル（25 芯、片側バラ線）。' +
      'マニホールドの D サブコネクタ（CN）とケーブルでつなぎ、反対側の芯線（端子 1〜25 = D サブのピン番号）を PLC の出力・端子台・電源へつなぐ。' +
      `芯線の色: ${LEADS.map((c, i) => `${i + 1} ${colorName(c)}`).join('、')}。`,
    estimated: '芯線の色とドットマーク（13 橙/赤点・14 黄/黒点のほか）は推定',
    labelPrefix: 'CBL',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
    params: [
      {
        key: 'length',
        label: 'ケーブル長',
        options: Object.entries(DSUB_CABLE_LENGTHS).map(([value, l]) => ({ value, label: `${value}（${l}）` })),
        default: '030',
      },
    ],
  };
}
