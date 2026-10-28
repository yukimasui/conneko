import { FX5_BUS, relayCommonAccepts } from '../mitsubishi/melsec';
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, TerminalDef, TerminalRole } from '../types';

/**
 * 三菱電機 MELSEC iQ-F シリーズ CPU ユニット FX5U-32MR/ES（AC 電源、DC 入力 16点、リレー出力 16点）。
 * 外形 W150 × H90 × D83 mm（1mm ≒ 2px）。本体はライトグレー（マンセル 0.6B7.6/0.2）。
 * 上下に着脱式の端子台（M3 ネジ、ピッチ約 8mm の 2 段千鳥配置）があり、端子カバーを開けた状態で描く。
 * 中央はダークグレーのパネル: 左に SD カード・RS-485 の LED と Ethernet ポート、中央に三菱電機ロゴと MELSEC、
 * 右に入力表示 LED（IN 0〜7 / 10〜17）、PWR・ERR・P.RUN・BAT LED、型式「FX5U-32M」、出力表示 LED（OUT）。
 *
 * 端子配列（マニュアル「端子配列」の図と同じ。上段が端子台の外側の列）:
 *   上側端子台 外側: ⏚ S/S 0V X0 2 4 6 X10 12 14 16 •
 *           内側: L N • 24V 1 3 5 7 11 13 15 17
 *   下側端子台 内側: Y0 2 • Y4 6 • Y10 12 • Y14 16 •
 *           外側: COM0 1 3 COM1 5 7 COM2 11 13 COM3 15 17
 * （• は空き端子。外側の列は内側の列に対して半ピッチずれる）
 *
 * 増設ユニット（FX5-16EX/ES など）は右側に増設する（バスの親。図面の mount の位置 1, 2, … の順に右へ並ぶ）。
 * 入出力番号は入力 X・出力 Y を別々に 8 進で数え、本体の X0〜X17 / Y0〜Y17 の後ろ（X20 / Y20）から 8 点単位で割り付ける。
 * 内部電源は DC5V 900mA と DC24V 400mA（サービス電源と共用）を増設ユニットへ供給する。
 *
 * トランジスタ出力（FX5U-32MT/ES）は端子配列・外形が同じなので、定義の生成は buildFx5u32m にまとめている。
 */

export interface Fx5u32mOptions {
  type: string;
  model: string;
  description: string;
  output: 'relay' | 'transistor';
}

const W = 300;
const H = 180;

/** 端子ピッチ（8mm）と各列の先頭 X 座標（外側/内側で半ピッチずれる） */
const PITCH = 16;
const X_INNER_TOP = 88;
const X_OUTER_TOP = X_INNER_TOP + PITCH / 2;
const X_OUTER_BOTTOM = 88;
const X_INNER_BOTTOM = X_OUTER_BOTTOM + PITCH / 2;
/** 各列の Y 座標 */
const Y_TOP_OUTER = 11;
const Y_TOP_INNER = 27;
const Y_BOTTOM_INNER = 153;
const Y_BOTTOM_OUTER = 169;

/** Ethernet ポート（RJ45） */
const ETH = { x: 94, y: 114, w: 24, h: 22 };

/** 端子名（'' は空き端子） */
const TOP_OUTER = ['FG', 'S/S', '0V', 'X0', 'X2', 'X4', 'X6', 'X10', 'X12', 'X14', 'X16', ''];
const TOP_INNER = ['L', 'N', '', '24V', 'X1', 'X3', 'X5', 'X7', 'X11', 'X13', 'X15', 'X17'];
const BOTTOM_INNER = ['Y0', 'Y2', '', 'Y4', 'Y6', '', 'Y10', 'Y12', '', 'Y14', 'Y16', ''];
const BOTTOM_OUTER = ['COM0', 'Y1', 'Y3', 'COM1', 'Y5', 'Y7', 'COM2', 'Y11', 'Y13', 'COM3', 'Y15', 'Y17'];

/** 出力のコモン（4点1コモン） */
const COMMONS: Record<string, string[]> = {
  COM0: ['Y0', 'Y1', 'Y2', 'Y3'],
  COM1: ['Y4', 'Y5', 'Y6', 'Y7'],
  COM2: ['Y10', 'Y11', 'Y12', 'Y13'],
  COM3: ['Y14', 'Y15', 'Y16', 'Y17'],
};

interface Slot {
  name: string;
  x: number;
  y: number;
  side: 'top' | 'bottom';
}

const row = (names: string[], x0: number, y: number, side: 'top' | 'bottom'): Slot[] =>
  names.map((name, i) => ({ name, x: x0 + i * PITCH, y, side }));

const SLOTS: Slot[] = [
  ...row(TOP_OUTER, X_OUTER_TOP, Y_TOP_OUTER, 'top'),
  ...row(TOP_INNER, X_INNER_TOP, Y_TOP_INNER, 'top'),
  ...row(BOTTOM_INNER, X_INNER_BOTTOM, Y_BOTTOM_INNER, 'bottom'),
  ...row(BOTTOM_OUTER, X_OUTER_BOTTOM, Y_BOTTOM_OUTER, 'bottom'),
];

/** 端子台の印字（X0 のように列の先頭だけ記号付き、以降は数字のみ） */
const PRINT: Record<string, string> = {
  X2: '2', X4: '4', X6: '6', X12: '12', X14: '14', X16: '16',
  X1: '1', X3: '3', X5: '5', X7: '7', X11: '11', X13: '13', X15: '15', X17: '17',
  Y2: '2', Y6: '6', Y12: '12', Y16: '16',
  Y1: '1', Y3: '3', Y5: '5', Y7: '7', Y11: '11', Y13: '13', Y15: '15', Y17: '17',
};

const text = (x: number, y: number, t: string, size = 4, fill = '#ffffff', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 端子ネジ（M3、角座金付き） */
const screw = (x: number, y: number) => `
  <rect x="${x - 6.2}" y="${y - 6.2}" width="12.4" height="12.4" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <rect x="${x - 5.2}" y="${y - 5.2}" width="10.4" height="10.4" rx="0.6" fill="url(#washer-{{uid}})"/>
  <circle cx="${x}" cy="${y}" r="4.2" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - 2.6} ${y} H${x + 2.6} M${x} ${y - 2.6} V${y + 2.6}" stroke="#444" stroke-width="1" stroke-linecap="round"/>`;

/** 空き端子（ネジなしの穴） */
const vacant = (x: number, y: number) => `
  <rect x="${x - 6.2}" y="${y - 6.2}" width="12.4" height="12.4" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="1.2" fill="#55585c"/>`;

/** 接地記号（端子名の表示用） */
const groundMark = (x: number, y: number, color: string) =>
  `<path d="M${x} ${y - 3.4} V${y - 1} M${x - 2.4} ${y - 1} H${x + 2.4} M${x - 1.6} ${y + 0.2} H${x + 1.6} M${x - 0.8} ${y + 1.4} H${x + 0.8}" stroke="${color}" stroke-width="0.6" fill="none"/>`;

/** 三菱電機のスリーダイヤマーク */
const logo = (x: number, y: number, s: number) => {
  const w = +(s * 0.577).toFixed(2);
  const d = `M0 0 L${-w} ${-s} L0 ${-2 * s} L${w} ${-s} Z`;
  return [0, 120, 240]
    .map((r) => `<path d="${d}" fill="#ffffff" transform="translate(${x} ${y}) rotate(${r})"/>`)
    .join('');
};

/** 入出力表示 LED（0〜7 / 10〜17 の 2 段） */
const ioLeds = (title: string, y: number) => {
  const xs = Array.from({ length: 8 }, (_, i) => 222 + i * 6.8);
  return `
  ${text(208, y + 6.5, title, 3.6, '#f2f3f4', 'start')}
  ${xs.map((x, i) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#3b4a36"/>${text(x, y + 5, String(i), 3, '#f2f3f4')}`).join('')}
  ${xs.map((x, i) => `<circle cx="${x}" cy="${y + 8}" r="1.4" fill="#3b4a36"/>${text(x, y + 13, String(10 + i), 2.5, '#f2f3f4')}`).join('')}`;
};

/** FX5U-32M（AC 電源）の CPU ユニットの機器定義を生成する */
export function buildFx5u32m(o: Fx5u32mOptions): DeviceDefinition {
  const blockTop = (y0: number, h: number) =>
    `<rect x="${X_INNER_TOP - 10}" y="${y0}" width="${11 * PITCH + PITCH / 2 + 20}" height="${h}" rx="1.5" fill="url(#tb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>`;

  /** 端子名の表示帯（端子台の内側。2 段で千鳥に印字） */
  const nameStrip = (y0: number, rows: { slots: Slot[]; y: number }[]) => `
  <rect x="${X_INNER_TOP - 10}" y="${y0}" width="${11 * PITCH + PITCH / 2 + 20}" height="11.5" fill="#eef0f1" stroke="#b5b8bc" stroke-width="0.4"/>
  ${rows
    .map((r) =>
      r.slots
        .map((s) => {
          if (s.name === 'FG') return groundMark(s.x, r.y - 0.4, '#232427');
          const t = s.name === '' ? '•' : (PRINT[s.name] ?? s.name);
          return text(s.x, r.y, t, t.length >= 4 ? 2.6 : 3.2, '#232427');
        })
        .join(''),
    )
    .join('')}
  ${[3, 6, 9]
    .map((i) => {
      // 下側端子台: コモンの区切り（太線）
      if (y0 < 100) return '';
      const x = X_OUTER_BOTTOM + i * PITCH - PITCH / 2;
      return `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + 11.5}" stroke="#232427" stroke-width="0.9"/>`;
    })
    .join('')}`;

  const slotsOf = (y: number) => SLOTS.filter((s) => s.y === y);

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="0.5" stop-color="#cdd0d3"/>
      <stop offset="1" stop-color="#bfc2c5"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55585d"/>
      <stop offset="1" stop-color="#3f4246"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2c2f"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e0e1e3"/>
      <stop offset="1" stop-color="#8e9093"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="green-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>

  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="url(#body-{{uid}})" stroke="#7c8085" stroke-width="1"/>
  <!-- 左側（拡張アダプタ接続部）: 接続用フックと溝 -->
  <rect x="3" y="4" width="7" height="10" rx="1" fill="#b3b6ba" stroke="#8d9196" stroke-width="0.5"/>
  <rect x="3" y="${H - 14}" width="7" height="10" rx="1" fill="#b3b6ba" stroke="#8d9196" stroke-width="0.5"/>
  <line x1="14" y1="8" x2="14" y2="${H - 8}" stroke="#a9adb1" stroke-width="1"/>
  <rect x="20" y="58" width="36" height="64" rx="2" fill="#c7cacd" stroke="#a6aaae" stroke-width="0.6"/>
  ${text(38, 87, o.model, 3.6, '#4a4d52')}
  ${text(38, 93, 'MELSEC iQ-F', 3, '#6a6e73', 'middle', 'normal')}
  <!-- 右側（増設コネクタカバー） -->
  <rect x="${W - 20}" y="44" width="16" height="92" rx="2" fill="#c3c6c9" stroke="#9fa3a7" stroke-width="0.6"/>
  <rect x="${W - 14}" y="70" width="4" height="40" rx="1" fill="#a9adb1"/>

  <!-- 上側端子台（電源・入力） -->
  ${blockTop(1.5, 34)}
  ${slotsOf(Y_TOP_OUTER).map((s) => (s.name ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}
  ${slotsOf(Y_TOP_INNER).map((s) => (s.name ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}
  ${nameStrip(36, [
    { slots: slotsOf(Y_TOP_OUTER), y: 40.6 },
    { slots: slotsOf(Y_TOP_INNER), y: 46 },
  ])}

  <!-- 下側端子台（出力） -->
  ${nameStrip(132.5, [
    { slots: slotsOf(Y_BOTTOM_INNER), y: 137.2 },
    { slots: slotsOf(Y_BOTTOM_OUTER), y: 142.6 },
  ])}
  ${blockTop(144.5, 34)}
  ${slotsOf(Y_BOTTOM_INNER).map((s) => (s.name ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}
  ${slotsOf(Y_BOTTOM_OUTER).map((s) => (s.name ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}

  <!-- 中央パネル: 左（SD カード・RS-485 LED、Ethernet） -->
  <rect x="64" y="50" width="65" height="80" rx="1.5" fill="url(#panel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${['CARD', 'RD', 'SD', 'SD/RD']
    .map((t, i) => `${text(119, 58.5 + i * 6, t, 3, '#f2f3f4', 'end')}<circle cx="123" cy="${57.4 + i * 6}" r="1.4" fill="${t === 'CARD' ? 'url(#green-{{uid}})' : '#3b4a36'}"/>`)
    .join('')}
  ${text(68, 64.5, 'RS-485', 3.2, '#f2f3f4', 'start')}
  <line x1="67" y1="67" x2="${126}" y2="67" stroke="#8d9095" stroke-width="0.4"/>
  ${text(68, 76.5, 'LAN', 3.2, '#f2f3f4', 'start')}
  <text x="68" y="86" font-family="sans-serif" font-size="3.4" font-weight="bold" font-style="italic" fill="#f2f3f4">CC-Link IE<tspan font-size="2.6" font-style="normal"> Field Basic</tspan></text>
  <!-- Ethernet ポート -->
  <rect x="${ETH.x - ETH.w / 2 - 1.5}" y="${ETH.y - ETH.h / 2 - 1.5}" width="${ETH.w + 3}" height="${ETH.h + 3}" rx="1" fill="#b9bdc2" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${ETH.x - ETH.w / 2}" y="${ETH.y - ETH.h / 2}" width="${ETH.w}" height="${ETH.h}" fill="#0b0c0d"/>
  <rect x="${ETH.x - 6}" y="${ETH.y + ETH.h / 2 - 4}" width="12" height="4" fill="#2a2c2f"/>
  <path d="M${ETH.x - 7} ${ETH.y - 5} H${ETH.x + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>

  <!-- 中央パネル: 中（ロゴ） -->
  <rect x="130" y="50" width="74" height="80" rx="1.5" fill="url(#panel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${logo(142, 64, 4.4)}
  ${text(152, 61.5, 'MITSUBISHI', 4.6, '#ffffff', 'start')}
  ${text(152, 66.8, 'ELECTRIC', 4.6, '#ffffff', 'start')}
  <text x="167" y="124" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="none" stroke="#c9ccd0" stroke-width="0.5" letter-spacing="0.6">MELSEC</text>

  <!-- 中央パネル: 右（入出力表示 LED・状態 LED・型式） -->
  <rect x="205" y="50" width="71" height="80" rx="1.5" fill="url(#panel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  <rect x="206.5" y="51.5" width="68" height="23" rx="1" fill="none" stroke="#c9ccd0" stroke-width="0.4" stroke-dasharray="1 0.8"/>
  ${ioLeds('IN', 56)}
  ${[
    { t: 'PWR', on: true },
    { t: 'ERR' },
    { t: 'P.RUN', on: true },
    { t: 'BAT' },
  ]
    .map(
      (l, i) =>
        `${text(208, 82.5 + i * 6, l.t, 3, '#f2f3f4', 'start')}<rect x="219" y="${79.8 + i * 6}" width="5" height="2.6" rx="0.6" fill="${l.on ? 'url(#green-{{uid}})' : '#3b3d40'}"/>`,
    )
    .join('')}
  ${text(250, 93, 'FX5U-32M', 4.8, '#ffffff')}
  <rect x="206.5" y="104.5" width="68" height="23" rx="1" fill="none" stroke="#c9ccd0" stroke-width="0.4" stroke-dasharray="1 0.8"/>
  ${ioLeds('OUT', 109)}
`;

  const accepts24: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+', '-'] };
  const outCom: AcceptSpec = { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['-'] };
  const relay = o.output === 'relay';

  const terminals: TerminalDef[] = SLOTS.filter((s) => s.name !== '').map((s) => {
    const base = { id: s.name, x: s.x, y: s.y, side: s.side };
    switch (s.name) {
      case 'L':
      case 'N':
        return { ...base, role: 'input' as TerminalRole, accepts: { system: 'AC', minVoltage: 85, maxVoltage: 264 } };
      case 'FG':
        return { ...base, label: '⏚ (接地)', role: 'ground' as TerminalRole };
      case '24V':
        return {
          ...base,
          label: '24V', note: 'サービス電源 +24V（400mA。増設ユニットの消費分と共用）',
          role: 'supply' as TerminalRole,
          supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.4, busRail: '24V', isolated: true },
        };
      case '0V':
        return {
          ...base,
          label: '0V', note: 'サービス電源 0V',
          role: 'supply' as TerminalRole,
          supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 0.4, isolated: true },
        };
      case 'S/S':
        return { ...base, label: 'S/S', note: '入力コモン（24V につなぐとシンク入力、0V につなぐとソース入力）', role: 'input' as TerminalRole, accepts: accepts24, optional: true };
      default:
        if (s.name.startsWith('COM')) {
          const note = `出力コモン（${COMMONS[s.name].join('・')}）`;
          return relay
            ? { ...base, note, role: 'input' as TerminalRole, accepts: relayCommonAccepts(240, 30), optional: true }
            : { ...base, note: `${note}・負荷電源の 0V`, role: 'input' as TerminalRole, accepts: outCom, optional: true };
        }
        if (s.name.startsWith('X')) {
          return { ...base, role: 'signal' as TerminalRole, signal: { dir: 'in', kind: 'dc', common: 'S/S' }, optional: true };
        }
        return { ...base, role: 'signal' as TerminalRole, signal: { dir: 'out', kind: relay ? 'contact' : 'npn' }, optional: true };
    }
  });

  // 出力（リレー接点・トランジスタ）: 出力点からコモンへ。1 点 2A（リレー）/ 0.5A（トランジスタ）、4 点 1 コモンで 8A / 0.8A
  const links: InternalLink[] = Object.entries(COMMONS).flatMap(([com, ys]) =>
    ys.map((y) => ({ from: y, to: com, switch: 'output' as const, ratedCurrent: relay ? 2 : 0.5 })),
  );
  const commonLimits: CommonLimit[] = Object.keys(COMMONS).map((common) => ({ common, current: relay ? 8 : 0.8 }));

  return {
    type: o.type,
    name: o.output === 'relay' ? 'PLC CPUユニット（リレー出力）' : 'PLC CPUユニット（トランジスタ出力）',
    model: o.model,
    maker: '三菱電機',
    category: 'plc',
    description: o.description,
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg,
    terminals: [
      ...terminals,
      {
        id: 'ETH',
        label: 'Ethernet',
        x: ETH.x,
        y: ETH.y,
        side: 'left',
        role: 'connector',
        connector: { kind: 'RJ45', pins: 0, width: ETH.h, protocols: ['ethernet', 'slmp', 'cc-link-ie-field-basic'], facing: 'front', length: ETH.w },
        optional: true,
      },
    ],
    links,
    commonLimits,
    // 増設ユニットの親。増設できるのは 16 台まで（拡張ボード・拡張アダプタを除く）
    bus: {
      kind: FX5_BUS,
      host: { slots: 16, numbering: { mode: 'separate', unit: 8 } },
      supply: { '5V': 0.9, '24V': 0.4 },
      io: { inputs: 16, outputs: 16, format: 'octal' },
    },
    // 最大消費電力 30W（サービス電源をフルに使った場合）から求めた AC100V 時の入力電流の目安
    loadCurrent: 0.5,
    distinctGroups: [['L', 'N']],
  };
}

const def: DeviceDefinition = buildFx5u32m({
  type: 'mitsubishi.fx5u-32mr-es',
  model: 'FX5U-32MR/ES',
  output: 'relay',
  description:
    '三菱電機 MELSEC iQ-F シリーズの CPU ユニット FX5U-32MR/ES（AC 電源、DC24V 入力 16点、リレー出力 16点、端子台 M3）。電源 AC100〜240V（85〜264V）50/60Hz、消費電力 30W、突入電流 25A 5ms 以下/AC100V。DC24V サービス電源（24V / 0V 端子）400mA（入力回路に使う場合）。入力 X0〜X17: DC24V 5.3mA、シンク/ソース共用（S/S を 24V につなぐとシンク入力、0V につなぐとソース入力）。出力 Y0〜Y17: リレー 2A/点、4点1コモン 8A 以下（COM0 = Y0〜Y3、COM1 = Y4〜Y7、COM2 = Y10〜Y13、COM3 = Y14〜Y17）、AC240V/DC30V 以下。⏚ は機能接地（D 種接地）。Ethernet ポート（CC-Link IE フィールドネットワーク Basic 対応）でタッチパネル（GOT）や PC とつなぐ。増設 I/O（FX5-16EX/ES など）は右側の増設コネクタに接続し（最大 16 台）、入出力番号は X20・Y20 から 8 進で続く。内部電源 DC5V 900mA・DC24V 400mA（サービス電源と共用）を増設ユニットへ供給する。',
});

export default def;
