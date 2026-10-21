import type { AcceptSpec, DeviceDefinition, InternalLink, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-F シリーズ 入力ユニット FX5-16EX/ES（増設ケーブルタイプ、DC24V 入力 16点、端子台 M3）。
 * 外形 W40 × H90 × D83 mm（1mm ≒ 2px）。本体はライトグレー（マンセル 0.6B7.6/0.2）。
 * 左側面から増設ケーブルが出て CPU ユニット（FX5U）や前段の増設ユニットにつながる。
 * 端子台は縦 2 列の千鳥配置（右列が半ピッチ下）で、端子カバーを外した状態で描く。
 * 左の表示帯に端子名、右端に入力表示 LED（下位 0〜7・上位 0〜7）と POWER LED がある。
 *
 * 端子配列（マニュアルの図、上から）:
 *   左列: S/S 1 3 5 6 7 X0 1 3 5 7（X0 以降が上位番号）
 *   右列: X0 2 4（4 段分なし）2 4 6 •
 * 端子ID は下位 X0〜X7、上位 X10〜X17（ユニット内の相対番号。実際の入力番号は割付けの先頭番号を加える。
 * FX5U-32M の右隣 1 台目なら X20〜X37）。
 *
 * 出力ユニット FX5-16EYR/ES・FX5-16EYT/ES も外形・端子の並びが共通なので、定義の生成は buildFx5Ext16 にまとめている。
 */

export interface Fx5Ext16Options {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  kind: 'input' | 'relay' | 'transistor';
}

const W = 80;
const H = 180;

/** 端子列の X 座標と、段の Y 座標（ピッチ 7.25mm、右列は半ピッチ下） */
const COL_L = 40;
const COL_R = 56;
const ROW0 = 16;
const PITCH = 14.5;
const yL = (r: number) => ROW0 + r * PITCH;
const yR = (r: number) => ROW0 + PITCH / 2 + r * PITCH;

const text = (x: number, y: number, t: string, size = 4, fill = '#232427', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number) => `
  <rect x="${x - 6.6}" y="${y - 6.6}" width="13.2" height="13.2" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <rect x="${x - 5.4}" y="${y - 5.4}" width="10.8" height="10.8" rx="0.6" fill="url(#washer-{{uid}})"/>
  <circle cx="${x}" cy="${y}" r="4.3" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - 2.7} ${y} H${x + 2.7} M${x} ${y - 2.7} V${y + 2.7}" stroke="#444" stroke-width="1" stroke-linecap="round"/>`;

const vacant = (x: number, y: number) => `
  <rect x="${x - 6.6}" y="${y - 6.6}" width="13.2" height="13.2" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="1.2" fill="#55585c"/>`;

interface Slot {
  /** 端子ID（'' は空き端子） */
  id: string;
  /** 表示帯の印字 */
  print: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

/** 16点ユニットの端子配置。first/last は先頭（S/S・COM0）と末尾（空き・COM1）の端子 */
function slots(letter: 'X' | 'Y', first: string, last: string): Slot[] {
  const L = (r: number, id: string, print: string): Slot => ({ id, print, x: COL_L, y: yL(r), side: 'left' });
  const R = (r: number, id: string, print: string): Slot => ({ id, print, x: COL_R, y: yR(r), side: 'right' });
  const n = (k: number) => `${letter}${k}`;
  return [
    L(0, first, first),
    L(1, n(1), '1'),
    L(2, n(3), '3'),
    L(3, n(5), '5'),
    L(4, n(6), '6'),
    L(5, n(7), '7'),
    L(6, n(10), `${letter}0`),
    L(7, n(11), '1'),
    L(8, n(13), '3'),
    L(9, n(15), '5'),
    L(10, n(17), '7'),
    R(0, n(0), `${letter}0`),
    R(1, n(2), '2'),
    R(2, n(4), '4'),
    R(7, n(12), '2'),
    R(8, n(14), '4'),
    R(9, n(16), '6'),
    R(10, last, last === '' ? '•' : last),
  ];
}

/** FX5 の 16点増設ユニット（増設ケーブルタイプ・端子台）の機器定義を生成する */
export function buildFx5Ext16(o: Fx5Ext16Options): DeviceDefinition {
  const letter = o.kind === 'input' ? 'X' : 'Y';
  const first = o.kind === 'input' ? 'S/S' : 'COM0';
  const last = o.kind === 'input' ? '' : 'COM1';
  const list = slots(letter, first, last);

  /** 表示帯の印字（左列の端子名は左寄り、右列は右寄り） */
  const prints = list
    .map((s) => {
      const x = s.side === 'left' ? 13 : 24;
      const t = s.print;
      if (t.length >= 3) {
        // S/S・COM0 などは縦書き風に 2 行で
        const [a, b] = t === 'S/S' ? ['S', 'S'] : [t.slice(0, 3), t.slice(3)];
        return text(x, s.y - 0.8, a, t === 'S/S' ? 3.2 : 2.6) + text(x, s.y + 2.8, b, t === 'S/S' ? 3.2 : 2.8);
      }
      return text(x, s.y + 1.4, t, 3.8);
    })
    .join('');

  const leds = (y0: number) =>
    Array.from({ length: 8 }, (_, i) => {
      const y = y0 + i * 4.4;
      return `<circle cx="70.5" cy="${y}" r="1.3" fill="#3b4a36"/>${text(75.5, y + 1.1, String(i), 2.8)}`;
    }).join('');

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c3c6c9"/>
      <stop offset="0.15" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#c7cacd"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="1" y2="0">
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
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2.5" fill="url(#body-{{uid}})" stroke="#7c8085" stroke-width="1"/>
  ${text(3, 6.4, o.model, 3.6, '#2f3134', 'start')}
  <!-- 増設ケーブルの引出しタブ（左側面） -->
  <rect x="0" y="78" width="4" height="24" rx="1" fill="#a7abaf" stroke="#7c8085" stroke-width="0.5"/>

  <!-- 端子名の表示帯 -->
  <rect x="6" y="9" width="24" height="${H - 13}" rx="1" fill="#eef0f1" stroke="#b5b8bc" stroke-width="0.4"/>
  ${prints}
  <!-- 下位/上位の区切り -->
  <line x1="6" y1="${(yL(5) + yL(6)) / 2}" x2="30" y2="${(yL(5) + yL(6)) / 2}" stroke="#232427" stroke-width="0.8"/>

  <!-- 端子台 -->
  <rect x="31" y="8" width="33" height="${H - 11}" rx="1.2" fill="url(#tb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>
  <rect x="${COL_R - 7}" y="${yR(2) + 8}" width="14" height="${yR(7) - yR(2) - 16}" rx="1" fill="#2e3033"/>
  ${list.map((s) => (s.id ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}

  <!-- 入出力表示 LED（下位・上位）と POWER LED -->
  ${text(72.5, 8, o.kind === 'input' ? 'IN' : 'OUT', 3, '#232427')}
  ${leds(13)}
  <circle cx="72.5" cy="90" r="1.8" fill="url(#green-{{uid}})"/>
  ${text(72.5, 96.4, 'POW', 2.5)}
  ${text(72.5, 99.6, 'ER', 2.5)}
  ${text(72.5, 136, o.kind === 'input' ? 'IN' : 'OUT', 3, '#232427')}
  ${leds(141)}
`;

  const in24: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+', '-'] };
  const outCom: AcceptSpec = { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['-'] };

  const terminals: TerminalDef[] = list
    .filter((s) => s.id !== '')
    .map((s): TerminalDef => {
      const base = { id: s.id, x: s.x, y: s.y, side: s.side, optional: true };
      if (s.id === 'S/S') return { ...base, label: 'S/S（入力コモン）', role: 'input', accepts: in24 };
      if (s.id.startsWith('COM')) {
        return o.kind === 'transistor' ? { ...base, role: 'input', accepts: outCom } : { ...base, role: 'signal' };
      }
      return { ...base, role: 'signal' };
    });

  // 出力は ON（リレー接点は閉、トランジスタは導通）とみなし、各出力とコモンをつなぐ
  const links: InternalLink[] =
    o.kind === 'input'
      ? []
      : [0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [
          { from: `Y${k}`, to: 'COM0' },
          { from: `Y${10 + k}`, to: 'COM1' },
        ]);

  return {
    type: o.type,
    name: o.name,
    model: o.model,
    maker: '三菱電機',
    category: 'plc',
    description: o.description,
    labelPrefix: o.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals,
    ...(links.length ? { links } : {}),
  };
}

const def: DeviceDefinition = buildFx5Ext16({
  type: 'mitsubishi.fx5-16ex-es',
  model: 'FX5-16EX/ES',
  name: 'PLC 増設入力ユニット',
  labelPrefix: 'IN',
  kind: 'input',
  description:
    '三菱電機 MELSEC iQ-F シリーズの増設入力ユニット FX5-16EX/ES（増設ケーブルタイプ、DC24V 入力 16点、端子台 M3）。入力 DC24V +20%/−15%、4.0mA、シンク/ソース共用（S/S を 24V につなぐとシンク入力、0V につなぐとソース入力）。16点1コモン（S/S）。内部電源（DC5V 100mA・DC24V 85mA）は増設ケーブル経由で CPU ユニットから供給される。端子ID は下位 X0〜X7・上位 X10〜X17 のユニット内の相対番号で、実際の入力番号は割付けの先頭番号を加えたもの（FX5U-32M の右隣 1 台目なら X20〜X37）。右列の最下段は空き端子。',
});

export default def;
