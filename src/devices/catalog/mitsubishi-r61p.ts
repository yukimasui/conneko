import { IQR_BUS } from '../mitsubishi/melsec';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 電源ユニット R61P（AC100〜240V 入力、DC5V 6.5A 出力）。
 * 外形 W54.6 × H106 × D110 mm（1mm ≒ 2px）。上部がダークグレーで三菱電機ロゴ・POWER LED・型式・定格表示、
 * 下部は iQ-R の電源ユニット特有の赤い端子カバー。端子カバーを開けた状態で描く。
 * 端子台（M4 ネジ）は上から ERR・ERR・FG・LG・N・L の 6 端子で、左側に「ERR」「(FG)」「(LG)」
 * 「INPUT 100-240VAC」の表示がある。
 *
 * DC5V はベースユニット経由で CPU・I/O ユニットへ供給されるため外部端子はない。
 * ERR 接点はシステム正常時に閉じる（電源断・CPU 停止エラー・ヒューズ断で開く）。動作中（正常時）に閉じる接点なので switch: 'NO' とする。
 * ベースユニットの電源スロット（図面の装着位置 1）に装着し、bus.supply で DC5V の供給能力を表す。
 * R62P（DC24V サービス電源付き）は外形・端子台が共通なので、定義の生成は buildRPowerSupply にまとめている。
 */

export interface RPowerSupplyOptions {
  type: string;
  model: string;
  description: string;
  /** 前面の定格表示（3 行） */
  ratingLines: string[];
  /** 最大入力皮相電力[VA]（入力電流の目安の計算に使う） */
  maxVA: number;
  /** DC24V サービス電源出力（+24V / 24G、R62P のみ）の定格電流[A] */
  serviceOutputA?: number;
  /** DC5V 出力（ベースユニット経由で供給）の定格電流[A] */
  output5V: number;
}

const W = 109;
const H = 212;

/** 主端子（M4）の X 座標と、上から ERR・ERR・FG・LG・N・L の Y 座標（ピッチ 10mm） */
const MAIN_X = 79;
const MAIN_Y = [82, 102, 122, 142, 162, 182];
/** DC24V 出力端子（M3.5、R62P のみ） */
const SVC_X = 18;
const SVC_Y = [91, 109];
/** 赤い端子部の上端 */
const RED_TOP = 64;

const text = (x: number, y: number, t: string, size = 4, fill = '#ffffff', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 端子ネジ（角座金付き） */
const screw = (x: number, y: number, s = 1) => `
  <rect x="${x - 7.6 * s}" y="${y - 7.6 * s}" width="${15.2 * s}" height="${15.2 * s}" rx="1" fill="url(#washer-{{uid}})" stroke="#5d5f62" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="${6 * s}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M${x - 3.8 * s} ${y} H${x + 3.8 * s} M${x} ${y - 3.8 * s} V${y + 3.8 * s}" stroke="#444" stroke-width="${1.3 * s}" stroke-linecap="round"/>`;

/** 接地記号 */
const groundMark = (x: number, y: number) =>
  `<path d="M${x} ${y - 4} V${y} M${x - 3} ${y} H${x + 3} M${x - 2} ${y + 1.4} H${x + 2} M${x - 1} ${y + 2.8} H${x + 1}" stroke="#ffffff" stroke-width="0.7" fill="none"/>`;

/** 三菱電機のスリーダイヤマーク（中心で頂点が接する 3 つのひし形） */
const logo = (x: number, y: number, s: number) => {
  const w = +(s * 0.577).toFixed(2);
  const d = `M0 0 L${-w} ${-s} L0 ${-2 * s} L${w} ${-s} Z`;
  return [0, 120, 240]
    .map((r) => `<path d="${d}" fill="#ffffff" transform="translate(${x} ${y}) rotate(${r})"/>`)
    .join('');
};

/** iQ-R 電源ユニットの機器定義を生成する */
export function buildRPowerSupply(o: RPowerSupplyOptions): DeviceDefinition {
  const svc = o.serviceOutputA !== undefined;
  /** 入力表示（警告マーク・INPUT・電圧）の上端 */
  const inY = svc ? 140 : 112;

  const svg = `
  <defs>
    <linearGradient id="top-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#232427"/>
      <stop offset="1" stop-color="#0d0d0f"/>
    </linearGradient>
    <linearGradient id="red-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b3142b"/>
      <stop offset="0.5" stop-color="#d81d38"/>
      <stop offset="1" stop-color="#a81228"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1d"/>
      <stop offset="0.5" stop-color="#26272a"/>
      <stop offset="1" stop-color="#141516"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2e3e5"/>
      <stop offset="1" stop-color="#8e9093"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="led-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>

  <!-- 本体上部（ダークグレー） -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2" fill="url(#top-{{uid}})" stroke="#111214" stroke-width="1"/>
  ${logo(11, 10.5, 4.2)}
  ${text(19, 10.2, 'MITSUBISHI', 4.4, '#ffffff', 'start')}
  ${text(19, 15, 'ELECTRIC', 4.4, '#ffffff', 'start')}
  ${text(90, 9, 'POWER', 3.6)}
  <circle cx="90" cy="14.5" r="2.2" fill="url(#led-{{uid}})" stroke="#0e2a10" stroke-width="0.4"/>
  ${text(6, 27, o.model, 5.4, '#ffffff', 'start')}
  ${o.ratingLines.map((l, i) => text(6, 34 + i * 4, l, 3, '#e3e4e6', 'start')).join('')}
  <!-- 端子カバーのヒンジ部 -->
  <rect x="4" y="50" width="${W - 8}" height="12" rx="1" fill="#1d1e21" stroke="#0b0b0c" stroke-width="0.5"/>
  <rect x="8" y="52" width="${W - 16}" height="2" fill="#3a3c40"/>

  <!-- 端子部（赤） -->
  <rect x="1" y="${RED_TOP}" width="${W - 2}" height="${H - RED_TOP - 1}" rx="1.5" fill="url(#red-{{uid}})"/>
  <!-- 主端子台（M4 × 6） -->
  <rect x="64" y="70" width="30" height="124" rx="1.5" fill="url(#tb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>
  ${MAIN_Y.slice(0, -1)
    .map((y) => `<line x1="65" y1="${y + 10}" x2="93" y2="${y + 10}" stroke="#3e4044" stroke-width="1"/>`)
    .join('')}
  ${MAIN_Y.map((y) => screw(MAIN_X, y)).join('')}
  <!-- 右側の仕切り -->
  ${MAIN_Y.map((y) => `<rect x="96" y="${y - 6}" width="3" height="12" rx="0.8" fill="#8c1222"/>`).join('')}

  <!-- 端子の表示 -->
  ${text(60, 79, 'ERR', 3.8, '#ffffff', 'end')}
  <path d="M61.5 76 V108 M61.5 76 H63 M61.5 108 H63" stroke="#ffffff" stroke-width="0.6" fill="none"/>
  ${text(58, 124, '(FG)', 3.6, '#ffffff', 'end')}
  ${groundMark(60.5, 121)}
  ${text(58, 144, '(LG)', 3.6, '#ffffff', 'end')}
  ${groundMark(60.5, 141)}
  ${text(59, 164, 'N', 4.4, '#ffffff', 'end')}
  ${text(59, 186, 'L', 4.4, '#ffffff', 'end')}
  <circle cx="55" cy="173" r="3.2" fill="none" stroke="#ffffff" stroke-width="0.6"/>
  <path d="M52.8 173 q1.1 -1.8 2.2 0 t2.2 0" fill="none" stroke="#ffffff" stroke-width="0.6"/>
  <path d="M55 165.5 V169.8 M55 176.2 V180.5" stroke="#ffffff" stroke-width="0.6"/>

  ${
    svc
      ? `<!-- DC24V サービス電源出力（+24V / 24G、M3.5） -->
  <rect x="7" y="81" width="22" height="38" rx="1.2" fill="url(#tb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>
  <line x1="8" y1="100" x2="28" y2="100" stroke="#3e4044" stroke-width="1"/>
  ${SVC_Y.map((y) => screw(SVC_X, y, 0.75)).join('')}
  ${text(31, 93, '+24V', 3.4, '#ffffff', 'start')}
  ${text(31, 111, '24G', 3.4, '#ffffff', 'start')}
  ${text(44, 100, '24VDC', 2.8, '#ffffff', 'start')}
  ${text(44, 104, `${o.serviceOutputA}A`, 2.8, '#ffffff', 'start')}
  ${text(7, 126, 'OUTPUT', 3.4, '#ffffff', 'start')}
  <rect x="6.5" y="128" width="20" height="6" rx="0.6" fill="#ffffff"/>
  ${text(16.5, 132.8, '24VDC', 3.6, '#c8102e')}`
      : ''
  }

  <!-- 入力の表示 -->
  <path d="M${14} ${inY + 12} L${20} ${inY} L${26} ${inY + 12} Z" fill="none" stroke="#ffffff" stroke-width="0.9"/>
  <path d="M20.6 ${inY + 3.2} L18.6 ${inY + 7.2} H21 L19.2 ${inY + 10.6}" fill="none" stroke="#ffffff" stroke-width="0.7"/>
  ${text(7, inY + 19, 'INPUT', 4.6, '#ffffff', 'start')}
  <rect x="6.5" y="${inY + 21}" width="26" height="15" rx="0.8" fill="#ffffff"/>
  ${text(19.5, inY + 27.6, '100-240', 4.4, '#c8102e')}
  ${text(19.5, inY + 33.6, 'VAC', 4.4, '#c8102e')}
  ${text(7, 199, o.model, 4.6, '#ffffff', 'start')}
  <!-- 下端の製造情報表示と固定フック -->
  <rect x="30" y="${H - 5}" width="40" height="4" rx="1" fill="#7d0f1e" stroke="#4d0812" stroke-width="0.5"/>
`;

  const ac = { system: 'AC' as const, minVoltage: 85, maxVoltage: 264 };
  const side = 'right' as const;
  const terminals: TerminalDef[] = [
    { id: 'ERR1', label: 'ERR', hint: '正常時に閉', note: 'ERR 接点（正常時に閉）', x: MAIN_X, y: MAIN_Y[0], side, role: 'signal', optional: true },
    { id: 'ERR2', label: 'ERR', hint: '正常時に閉', note: 'ERR 接点（正常時に閉）', x: MAIN_X, y: MAIN_Y[1], side, role: 'signal', optional: true },
    { id: 'FG', label: 'FG', hint: '機能接地', x: MAIN_X, y: MAIN_Y[2], side, role: 'ground' },
    { id: 'LG', label: 'LG', hint: 'フィルタ接地', x: MAIN_X, y: MAIN_Y[3], side, role: 'ground' },
    { id: 'N', label: 'INPUT N', hint: 'AC入力', x: MAIN_X, y: MAIN_Y[4], side, role: 'input', accepts: ac },
    { id: 'L', label: 'INPUT L', hint: 'AC入力', x: MAIN_X, y: MAIN_Y[5], side, role: 'input', accepts: ac },
  ];
  if (svc) {
    terminals.push(
      {
        id: '+24V',
        hint: 'サービス出力',
        x: SVC_X,
        y: SVC_Y[0],
        side: 'left',
        role: 'supply',
        supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: o.serviceOutputA },
      },
      {
        id: '24G',
        hint: 'サービス出力',
        x: SVC_X,
        y: SVC_Y[1],
        side: 'left',
        role: 'supply',
        supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: o.serviceOutputA },
      },
    );
  }

  const i100 = +(o.maxVA / 100).toFixed(2);
  const i200 = +(o.maxVA / 200).toFixed(2);
  return {
    type: o.type,
    name: 'PLC 電源ユニット',
    model: o.model,
    maker: '三菱電機',
    category: 'power-supply',
    description: o.description,
    labelPrefix: 'PS',
    width: W,
    height: H,
    svg,
    terminals,
    // ERR 接点: DC24V 0.5A。システム正常時（動作中）に閉
    links: [{ from: 'ERR1', to: 'ERR2', switch: 'NO', ratedCurrent: 0.5 }],
    params: [
      {
        // 最大入力皮相電力から求めた入力電流の目安（上流のブレーカー・電線の確認用）
        key: 'inputCurrent',
        label: '入力電流（最大入力皮相電力から）',
        unit: 'A',
        options: [
          { value: i100, label: `${i100}A（AC100V）` },
          { value: i200, label: `${i200}A（AC200V）` },
        ],
        default: i100,
      },
    ],
    loadCurrent: { param: 'inputCurrent' },
    distinctGroups: [['L', 'N']],
    bus: { kind: IQR_BUS, role: 'power', supply: { '5V': o.output5V } },
  };
}

const def: DeviceDefinition = buildRPowerSupply({
  type: 'mitsubishi.r61p',
  model: 'R61P',
  ratingLines: ['INPUT 100-240VAC 50/60Hz 130VA', 'OUTPUT 5VDC 6.5A'],
  maxVA: 130,
  output5V: 6.5,
  description:
    '三菱電機 MELSEC iQ-R シリーズの電源ユニット（AC 入力）。入力 AC100〜240V（85〜264V）50/60Hz、最大入力皮相電力 130VA、突入電流 20A 8ms 以下。出力 DC5V 6.5A（ベースユニット経由で CPU・I/O ユニットへ供給するため外部端子はない）。端子台（M4、上から）: ERR・ERR（ERR 接点 DC24V 0.5A、システム正常時に閉）、FG（機能接地）、LG（電源入力フィルタの接地。AC 入力時は入力電圧の 1/2 の電位）、N・L（INPUT）。FG・LG はそれぞれ接地抵抗 100Ω 以下で接地する。ベースユニットの一番左（電源スロット、図面の装着位置 1）に装着する。',
});

export default def;
