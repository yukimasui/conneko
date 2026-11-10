import { FX5_BUS } from '../mitsubishi/melsec';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-F シリーズ アナログ出力ユニット FX5-4DA（4ch、増設ケーブルタイプ、端子台）。
 * 外形 W40 × H90 mm（FX5-4AD と同じ外形として描いた。1mm ≒ 2px）。本体はライトグレー。左側面から増設ケーブルが出て
 * CPU ユニット（FX5U）や前段の増設ユニットにつながる。端子台は縦 2 列の千鳥配置（右列が半ピッチ下）。
 *
 * 端子: 外部供給電源 24+・24−（DC24V +20%/−15%、150mA）と、1 チャネルごとに V+（電圧出力）・I+（電流出力）・COM（共通）・空き。
 * 電圧出力は V+ と COM、電流出力は I+ と COM の間に負荷（インバータのアナログ入力など）をつなぐ。
 * 端子台の上での並び（左列が 24+・CH1・CH2、右列が 24−・CH3・CH4）は推定。
 *
 * FX5 のインテリジェント機能ユニットは入出力番号（X/Y）を割り付けない（増設のバスにはつなぐが、入出力の番号は消費しない）。
 * 出典: FX5-4DA の仕様（4ch、80µs/ch、電圧 DC−10〜+10V（負荷 1kΩ〜1MΩ）、電流 DC0〜20mA（負荷 0〜500Ω）、
 *       外部供給 DC24V 150mA、内部 DC5V 100mA、フォトカプラ絶縁）。三菱電機の製品ページ・販売店のデータシート
 */

const W = 80;
const H = 180;
const COL_L = 40;
const COL_R = 56;
const ROW0 = 16;
const PITCH = 16.5;
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
  ch: number;
  /** 'V+' / 'I+' / 'COM'、'' は空き */
  sig: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

const SIGS = ['V+', 'I+', 'COM', ''];
/** 1 行目は外部供給電源（左列 24+、右列 24−）。2 行目からチャネル */
const SLOTS: Slot[] = [
  { ch: 0, sig: '24+', x: COL_L, y: yL(0), side: 'left' },
  { ch: 0, sig: '24-', x: COL_R, y: yR(0), side: 'right' },
  ...[1, 2, 3, 4].flatMap((ch) =>
    SIGS.map((sig, i) => {
      const left = ch <= 2;
      const r = 1 + ((ch - 1) % 2 === 0 ? i : 4 + i);
      return { ch, sig, x: left ? COL_L : COL_R, y: left ? yL(r) : yR(r), side: left ? ('left' as const) : ('right' as const) };
    }),
  ),
];

const id = (ch: number, sig: string) => (ch === 0 ? sig : `CH${ch}${sig}`);

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
  ${text(3, 6.4, 'FX5-4DA', 3.6, '#2f3134', 'start')}
  <rect x="0" y="78" width="4" height="24" rx="1" fill="#a7abaf" stroke="#7c8085" stroke-width="0.5"/>

  <!-- 端子名の表示帯 -->
  <rect x="6" y="9" width="24" height="${H - 13}" rx="1" fill="#eef0f1" stroke="#b5b8bc" stroke-width="0.4"/>
  ${SLOTS.map((s) => text(s.side === 'left' ? 13 : 24, s.y + 1.2, s.sig ? s.sig.replace('-', '−') : '•', s.sig.length === 3 ? 2.8 : 3.4)).join('')}
  ${[1, 2, 3, 4]
    .map((ch) => {
      const s = SLOTS.find((x) => x.ch === ch && x.sig === 'V+')!;
      return text(s.side === 'left' ? 13 : 24, s.y - 6.6, `CH${ch}`, 2.6, '#c22a37');
    })
    .join('')}

  <!-- 端子台 -->
  <rect x="31" y="8" width="33" height="${H - 11}" rx="1.2" fill="url(#tb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>
  ${SLOTS.map((s) => (s.sig ? screw(s.x, s.y) : vacant(s.x, s.y))).join('')}

  <!-- 表示 LED -->
  <circle cx="72.5" cy="16" r="1.8" fill="url(#green-{{uid}})"/>
  ${text(72.5, 22.4, 'POW', 2.5)}
  <circle cx="72.5" cy="30" r="1.8" fill="#4a2a2a"/>
  ${text(72.5, 36.4, 'ERR', 2.5)}
  <circle cx="72.5" cy="44" r="1.8" fill="#4a2a2a"/>
  ${text(72.5, 50.4, 'ALM', 2.5)}
  <text transform="translate(74 120) rotate(90)" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#5a5d62">D/A 4ch</text>
`;

/** 外部供給電源 DC24V（+20%/−15%） */
const ext = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: [c] });

const terminals: TerminalDef[] = SLOTS.filter((s) => s.sig).map((s): TerminalDef => {
  const base = { id: id(s.ch, s.sig), label: s.ch === 0 ? s.sig.replace('-', '−') : `CH${s.ch} ${s.sig}`, x: s.x, y: s.y, side: s.side, optional: true };
  if (s.sig === '24+') return { ...base, role: 'input', optional: false, note: '外部供給電源 DC24V +（150mA）', hint: '外部電源+', accepts: ext('+') };
  if (s.sig === '24-') return { ...base, role: 'input', optional: false, note: '外部供給電源 DC24V −（0V）', hint: '外部電源−', accepts: ext('-') };
  if (s.sig === 'V+') return { ...base, role: 'signal', note: '電圧出力 +（COM との間に負荷 1kΩ〜1MΩ）', signal: { dir: 'out', kind: 'analog-v', ref: id(s.ch, 'COM') } };
  if (s.sig === 'I+') return { ...base, role: 'signal', note: '電流出力 +（COM との間に負荷 0〜500Ω）', signal: { dir: 'out', kind: 'analog-i', ref: id(s.ch, 'COM') } };
  return { ...base, role: 'signal', note: '電圧/電流出力の共通（−）', hint: `CH${s.ch} −` };
});

const def: DeviceDefinition = {
  type: 'mitsubishi.fx5-4da',
  name: 'PLC アナログ出力ユニット',
  model: 'FX5-4DA',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-F シリーズのアナログ出力ユニット FX5-4DA（4ch、増設ケーブルタイプ）。出力は電圧 DC−10〜+10V（外部負荷 1kΩ〜1MΩ）・電流 DC0〜20mA（外部負荷 0〜500Ω）、チャネルごとにレンジ（0〜10V・0〜5V・1〜5V・4〜20mA など）を設定する。変換速度 80µs/ch。出力端子と PLC の間はフォトカプラ絶縁、チャネル間は非絶縁。電圧出力は CHn V+ と COM、電流出力は I+ と COM の間にインバータ・バルブなどのアナログ入力をつなぐ（シールド線を使う）。外部供給電源として DC24V（+20%/−15%、150mA）を 24+・24− に入れる。CPU ユニット（FX5U）の右側に増設ケーブルでつなぎ、内部電源 DC5V 100mA を CPU から受ける。インテリジェント機能ユニットなので入出力番号（X/Y）は割り付けない。端子台の上での並び（左列 24+・CH1・CH2、右列 24−・CH3・CH4）は推定。',
  estimated: '端子台の上での端子の並び（1 チャネル V+・I+・COM・空きの順と、外部供給電源 24+・24− の端子は資料による）',
  labelPrefix: 'DA',
  width: W,
  height: H,
  svg,
  terminals,
  // 外部供給電源 DC24V の消費電流
  loadCurrent: 0.15,
  bus: { kind: FX5_BUS, load: { '5V': 0.1 } },
};

export default def;
