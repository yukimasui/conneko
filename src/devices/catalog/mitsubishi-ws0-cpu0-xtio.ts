import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC-WS 安全コントローラ（CPU ユニット WS0-CPU0 ＋ メモリプラグ WS0-MPL0 ＋ 安全入出力複合ユニット WS0-XTIO）。
 * CPU ユニット単体では安全入出力を持たないため、最小構成の 2 ユニットを 1 つの機器として描く。
 * 外形は各 幅22.5mm、高さ CPU0 96.5mm（上にメモリプラグが 15.5mm 出る）・XTIO 106.5mm、奥行 120.8mm（1mm ≒ 2px）。
 * 濃いグレーの筐体で、XTIO の上下には 2 段重ねの 4 極スプリング式プラグ端子が付く。
 *
 * 端子（安全コントローラ ユーザーズマニュアル SH-080855ENG）:
 *   WS0-MPL0（CPU の上）: A1(+24V) A2(GND) … CPU・全ユニットの入力回路とテスト出力の電源
 *   WS0-XTIO 上 内側: X1 X2 A1 A2（テスト出力 1/2、出力 Q1〜Q4 用電源）/ 上 外側: I1〜I4
 *   WS0-XTIO 下 内側: Q1〜Q4（安全出力）/ 下 外側: I5〜I8
 *   ※ どちらのプラグが内側（手前）かはマニュアルの図からの推定。
 */

const W = 94;
const H = 226;

/** CPU ユニット・XTIO の左端 */
const CPU_X = 1;
const IO_X = 48;
const MOD_W = 45;

const CPU_Y0 = 32;
const IO_Y0 = 13;
const Y1 = 224;

/** メモリプラグの端子 */
const MPL_Y = 14;
const MPL_XS = [CPU_X + 14, CPU_X + 31];

/** XTIO の端子 */
const IO_XS = [IO_X + 7, IO_X + 17.5, IO_X + 28, IO_X + 38.5];
const Y_TOP_OUT = 18;
const Y_TOP_IN = 41;
const Y_BOT_IN = 196;
const Y_BOT_OUT = 219;

const TOP_OUT = ['I1', 'I2', 'I3', 'I4'];
const TOP_IN = ['X1', 'X2', 'A1', 'A2'];
const BOT_IN = ['Q1', 'Q2', 'Q3', 'Q4'];
const BOT_OUT = ['I5', 'I6', 'I7', 'I8'];

const text = (x: number, y: number, t: string, size: number, fill = '#e6e8ea', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 4.2) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="1" stroke-linecap="round"/>`;

/** 4 極スプリング式プラグ（電線差込口は端面側 = y、解除用の四角い穴は内側） */
const plug = (y: number, upward: boolean) => {
  const top = upward ? y - 5 : y - 16;
  return `
  <rect x="${IO_X + 1.5}" y="${top}" width="${MOD_W - 3}" height="21" rx="1.2" fill="url(#plug-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${IO_XS.map(
    (x) => `
  <circle cx="${x}" cy="${y}" r="2.6" fill="#050505" stroke="#6c6f73" stroke-width="0.5"/>
  <rect x="${x - 3.6}" y="${upward ? y + 4.5 : y - 12}" width="7.2" height="7.5" rx="0.8" fill="#151617" stroke="#f2c500" stroke-width="0.7"/>`,
  ).join('')}`;
};

const led = (x: number, y: number, color: string) =>
  `<rect x="${x - 2}" y="${y}" width="4" height="5" rx="0.5" fill="${color}" stroke="#000" stroke-width="0.3"/>`;

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2c2f33"/>
      <stop offset="0.12" stop-color="#43474c"/>
      <stop offset="0.88" stop-color="#3f4348"/>
      <stop offset="1" stop-color="#2a2d31"/>
    </linearGradient>
    <linearGradient id="plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2b2d"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- ===== WS0-CPU0 ＋ メモリプラグ WS0-MPL0 ===== -->
  <rect x="${CPU_X + 4}" y="2" width="${MOD_W - 8}" height="32" rx="2" fill="#1a1b1d" stroke="#000" stroke-width="0.6"/>
  ${MPL_XS.map((x) => `<rect x="${x - 6}" y="${MPL_Y - 6}" width="12" height="12" rx="1" fill="#0d0d0e"/>${screw(x, MPL_Y)}`).join('')}
  ${text(MPL_XS[0], 27, 'A1', 4, '#f0f0f0', 'middle', 'bold')}
  ${text(MPL_XS[1], 27, 'A2', 4, '#f0f0f0', 'middle', 'bold')}
  <rect x="${CPU_X}" y="${CPU_Y0}" width="${MOD_W}" height="${Y1 - CPU_Y0}" rx="2" fill="url(#case-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <rect x="${CPU_X + 3}" y="${CPU_Y0 + 4}" width="${MOD_W - 6}" height="36" rx="1" fill="#f3f3f3"/>
  <g transform="translate(${CPU_X + 7} ${CPU_Y0 + 9})">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#d01c1f"/>
  </g>
  ${text(CPU_X + 26, CPU_Y0 + 14, 'MITSUBISHI', 3.4, '#222', 'middle', 'bold')}
  ${text(CPU_X + 26, CPU_Y0 + 18.5, 'ELECTRIC', 3.4, '#222', 'middle', 'bold')}
  ${text(CPU_X + 22.5, CPU_Y0 + 31, 'MELSEC-WS', 4.4, '#222', 'middle', 'bold')}
  ${led(CPU_X + 13, CPU_Y0 + 52, '#36d655')}
  ${text(CPU_X + 13, CPU_Y0 + 63, 'MS', 3.6)}
  ${led(CPU_X + 31, CPU_Y0 + 52, '#f2c500')}
  ${text(CPU_X + 31, CPU_Y0 + 63, 'CV', 3.6)}
  <!-- RS-232 ポート（丸形 4 ピン） -->
  <circle cx="${CPU_X + 22.5}" cy="${CPU_Y0 + 92}" r="8" fill="#16171a" stroke="#777b80" stroke-width="0.8"/>
  ${[
    [-3, -3],
    [3, -3],
    [-3, 3],
    [3, 3],
  ]
    .map(([dx, dy]) => `<circle cx="${CPU_X + 22.5 + dx}" cy="${CPU_Y0 + 92 + dy}" r="1" fill="#c9a43a"/>`)
    .join('')}
  ${text(CPU_X + 22.5, CPU_Y0 + 108, 'RS-232', 3.4)}
  ${text(CPU_X + 22.5, CPU_Y0 + 150, 'CPU0', 6, '#e6e8ea', 'middle', 'bold')}

  <!-- ===== WS0-XTIO ===== -->
  <rect x="${IO_X}" y="${IO_Y0}" width="${MOD_W}" height="${Y1 - IO_Y0}" rx="2" fill="url(#case-{{uid}})" stroke="#111" stroke-width="0.8"/>
  ${plug(Y_TOP_OUT, true)}
  ${plug(Y_TOP_IN, true)}
  <path d="M${IO_X + 3} 61 V58 H${IO_X + MOD_W - 3} V61" fill="none" stroke="#e6e8ea" stroke-width="0.6"/>
  ${TOP_IN.map((n, i) => text(IO_XS[i], 64.5, n, 4, '#f0f0f0', 'middle', 'bold')).join('')}
  ${IO_XS.map((x) => led(x, 68, '#2c5a35')).join('')}
  ${TOP_OUT.map((n, i) => text(IO_XS[i], 78, n, 3.6)).join('')}
  <path d="M${IO_X + 1} 83 H${IO_X + MOD_W - 1}" stroke="#15171a" stroke-width="0.8"/>
  ${led(IO_XS[0], 90, '#36d655')}
  ${text(IO_XS[0], 87.5, 'MS', 3.4)}
  ${text(IO_X + 22.5, 138, 'XTIO', 6, '#e6e8ea', 'middle', 'bold')}
  ${IO_XS.map((x) => led(x, 148, '#2c5a35')).join('')}
  ${BOT_OUT.map((n, i) => text(IO_XS[i], 158, n, 3.6)).join('')}
  <path d="M${IO_X + 3} 162 V165 M${IO_X + 3} 177 V180 H${IO_X + MOD_W - 3} V177 M${IO_X + MOD_W - 3} 165 V162" fill="none" stroke="#e6e8ea" stroke-width="0.6"/>
  ${IO_XS.map((x) => led(x, 164, '#2c5a35')).join('')}
  ${BOT_IN.map((n, i) => text(IO_XS[i], 176, n, 4, '#f0f0f0', 'middle', 'bold')).join('')}
  ${plug(Y_BOT_IN, false)}
  ${plug(Y_BOT_OUT, false)}
`;

const power = { system: 'DC' as const, minVoltage: 16.8, maxVoltage: 30 };

const LABEL: Record<string, string> = {
  X1: 'X1（テスト出力 1）',
  X2: 'X2（テスト出力 2）',
  Q1: 'Q1（安全出力 PNP 2A）',
  Q2: 'Q2（安全出力 PNP 2A）',
  Q3: 'Q3（安全出力 PNP 2A）',
  Q4: 'Q4（安全出力 PNP 2A）',
};

const ioRow = (ids: string[], y: number, side: 'top' | 'bottom'): TerminalDef[] =>
  ids.map((id, i) => {
    const x = IO_XS[i];
    if (id === 'A1') return { id, label: 'A1（出力 Q1〜Q4 用 +24V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
    if (id === 'A2') return { id, label: 'A2（出力 Q1〜Q4 用 GND）', x, y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
    return { id, label: LABEL[id] ?? `${id}（安全入力）`, x, y, side, role: 'signal', optional: true };
  });

const def: DeviceDefinition = {
  type: 'mitsubishi.ws0-cpu0-xtio',
  name: '安全コントローラ',
  model: 'MELSEC-WS WS0-CPU0 + WS0-XTIO',
  maker: '三菱電機',
  category: 'safety',
  description:
    '三菱電機 MELSEC-WS 安全コントローラの最小構成（CPU ユニット WS0-CPU0、メモリプラグ WS0-MPL0、安全入出力複合ユニット WS0-XTIO）。SIL3 / PL e / カテゴリ4。' +
    '電源は 2 系統で、メモリプラグの CPU-A1(+)/CPU-A2(GND) が CPU と入力回路・テスト出力用、XTIO の A1/A2 が安全出力 Q1〜Q4 用（いずれも DC24V、16.8〜30V）。' +
    'XTIO は安全入力 I1〜I8、テスト出力 X1/X2（別々のパルス発生器、各 120mA）、安全出力 Q1〜Q4（PNP 各 2A）。' +
    '配線例: 非常停止の b 接点 1 回路目を X1→I1、2 回路目を X2→I2（入力は設定ツールで 2 チャンネルに割り付け）。Q1→K1、Q2→K2 のコイルを駆動して GND に戻す。EDM は K1・K2 の b 接点（ミラー接点）を直列にして任意の入力に入れ、EDM ファンクションブロックで監視する。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'CPU-A1', label: 'A1（メモリプラグ。CPU・入力回路用 +24V）', x: MPL_XS[0], y: MPL_Y, side: 'top', role: 'input', accepts: { ...power, conductors: ['+'] } },
    { id: 'CPU-A2', label: 'A2（メモリプラグ。CPU・入力回路用 GND）', x: MPL_XS[1], y: MPL_Y, side: 'top', role: 'input', accepts: { ...power, conductors: ['-'] } },
    ...ioRow(TOP_OUT, Y_TOP_OUT, 'top'),
    ...ioRow(TOP_IN, Y_TOP_IN, 'top'),
    ...ioRow(BOT_IN, Y_BOT_IN, 'bottom'),
    ...ioRow(BOT_OUT, Y_BOT_OUT, 'bottom'),
  ],
  // CPU 2.5W + XTIO 内部 1W / 24V（出力負荷は別途）
  loadCurrent: 0.15,
};

export default def;
