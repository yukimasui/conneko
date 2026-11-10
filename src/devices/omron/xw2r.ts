/**
 * オムロン コネクタ端子台変換ユニット XW2R（汎用タイプ、プラススクリュー、MIL コネクタ）の機器定義を作る。
 *
 * PLC の I/O ユニット（KEYENCE KV-C32XC / KV-C32TC の MIL 34 極、三菱電機 FX5UC の MIL 20 極、MIL 40 極の I/O ユニットなど）のコネクタから
 * MIL のフラットケーブル（またはオムロンの接続ケーブル）でつなぎ、ピン 1 本ずつを M3 のネジ端子に出す中継端子台。
 * 電子部品は載っていない（ピン n とネジ端子 n が導通するだけ）。
 *
 * 出典: オムロン XW2R（汎用タイプ）形式一覧（XW2R-J34G-T: プラススクリュータイプ、34 極、MIL コネクタ。XW2R-J40G-T: 40 極、XW2R-J20GD-T: 20 極）、
 *   定格・性能（定格電流 1A、定格電圧 AC125V / DC24V、適合電線 AWG22-16（丸形・Y 形圧着端子）・AWG26-16（より線・単線）、
 *   ストリップ長 9mm、締付けトルク 0.5N･m）、販売店の仕様表（端子間ピッチ 7mm、XW2R-J34GD-T の A 寸法 130.7mm）。
 * 推定: ネジ端子の番号（コネクタのピン番号と同じ 1〜34 とし、奥段が奇数・手前段が偶数）と並び、外形（長さ・奥行）、コネクタの位置。
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef, WireAcceptSpec } from '../types';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

export interface Xw2rSpec {
  type: string;
  modelName: string;
  poles: 20 | 34 | 40;
  /** 本体の長さ[mm] */
  lengthMm: number;
  description: string;
  estimated: string;
}

/** 端子間ピッチ 7mm（1mm ≒ 2px） */
const PITCH = 14;
const H = 96;
const ODD_Y = 52;
const EVEN_Y = 76;
const CN_Y = 20;

/** 適合電線: AWG22-16（丸形・Y 形圧着端子）、AWG26-16（より線・単線）≒ 0.14〜1.25㎟ */
const WIRE: WireAcceptSpec = { methods: ['ring', 'fork', 'bare', 'ferrule'], minSq: 0.14, maxSq: 1.25 };

export function buildXw2r(spec: Xw2rSpec): DeviceDefinition {
  const { poles } = spec;
  const cols = poles / 2;
  const W = Math.round(spec.lengthMm * 2);
  const cx = W / 2;
  // 奥段（奇数）と手前段（偶数）を半ピッチずらして中央にそろえる
  const oddX0 = +(cx - ((cols - 1) * PITCH + PITCH / 2) / 2).toFixed(1);
  const evenX0 = oddX0 + PITCH / 2;
  const termX = (n: number) => +((n % 2 ? oddX0 : evenX0) + Math.floor((n - 1) / 2) * PITCH).toFixed(1);
  const termY = (n: number) => (n % 2 ? ODD_Y : EVEN_Y);
  const nums = Array.from({ length: poles }, (_, i) => i + 1);

  // MIL コネクタ（2.54mm ピッチ 2 列）
  const pinPitch = 5.08;
  const housingW = Math.round((cols - 1) * pinPitch + 26);
  const pinX0 = cx - ((cols - 1) / 2) * pinPitch;

  const strip = (y: number, x0: number) => `
  <rect x="${x0 - PITCH / 2}" y="${y - 10}" width="${cols * PITCH}" height="20" rx="1.2" fill="url(#xstrip-{{uid}})" stroke="#2a2c2f" stroke-width="0.5"/>
  ${Array.from({ length: cols - 1 }, (_, i) => {
    const x = (x0 + (i + 0.5) * PITCH).toFixed(1);
    return `<rect x="${+x - 0.9}" y="${y - 10}" width="1.8" height="20" fill="#7d8187"/>`;
  }).join('')}`;

  const svg = `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="xbase-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dbdd"/>
      <stop offset="1" stop-color="#b9bcc0"/>
    </linearGradient>
    <linearGradient id="xstrip-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9da1a6"/>
      <stop offset="1" stop-color="#868a90"/>
    </linearGradient>
    <linearGradient id="xplug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#161616"/>
    </linearGradient>
  </defs>
  <!-- ベース（DIN レール取付・ねじ取付の両用） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#xbase-{{uid}})" stroke="#73777c" stroke-width="0.9"/>
  <rect x="4" y="${H - 8}" width="${W - 8}" height="4" rx="1" fill="#a3a7ac"/>
  <circle cx="9" cy="${CN_Y}" r="3.2" fill="#5d6166" stroke="#3a3d41" stroke-width="0.5"/>
  <circle cx="${W - 9}" cy="${CN_Y}" r="3.2" fill="#5d6166" stroke="#3a3d41" stroke-width="0.5"/>
  ${text(18, 11, 'OMRON', 5, '#1a1a1a', 'bold', 'start')}
  ${text(W - 14, 11, spec.modelName, Math.min(4.6, (W / 2 - housingW / 2 - 16) / (spec.modelName.length * 0.62)), '#333', 'bold', 'end')}
  <!-- MIL ${poles} 極 オスコネクタ（ボックスヘッダ） -->
  <rect x="${cx - housingW / 2}" y="${CN_Y - 11}" width="${housingW}" height="22" rx="1.5" fill="url(#xplug-{{uid}})" stroke="#080808" stroke-width="0.8"/>
  <rect x="${cx - housingW / 2 + 9}" y="${CN_Y - 7.5}" width="${housingW - 18}" height="15" rx="0.8" fill="#0b0b0b" stroke="#444" stroke-width="0.5"/>
  ${Array.from({ length: cols }, (_, i) => {
    const x = +(pinX0 + i * pinPitch).toFixed(2);
    return `<rect x="${x - 0.8}" y="${CN_Y - 3.3}" width="1.6" height="1.6" fill="#e0b84a"/><rect x="${x - 0.8}" y="${CN_Y + 1.7}" width="1.6" height="1.6" fill="#e0b84a"/>`;
  }).join('')}
  <path d="M${pinX0} ${CN_Y + 8.6} l-2 3 h4 z" fill="#f2f2f2"/>
  <rect x="${cx - 4.5}" y="${CN_Y + 8}" width="9" height="3" fill="#0b0b0b"/>
  ${text(cx - housingW / 2 - 4, CN_Y + 1.5, `MIL ${poles}P`, 4.2, '#333', 'bold', 'end')}
  <!-- ネジ端子（奥段: 奇数、手前段: 偶数。M3 プラススクリュー、ピッチ 7mm） -->
  ${strip(ODD_Y, oddX0)}
  ${strip(EVEN_Y, evenX0)}
  ${nums.map((n) => screw(termX(n), termY(n), 4.6, '#55595e')).join('')}
  ${nums.map((n) => text(termX(n), termY(n) + (n % 2 ? -12.5 : 15), String(n), 4.2, '#222')).join('')}
`;

  const wireNote = 'M3 プラススクリュー、AWG22-16（丸形・Y 形圧着端子）/ AWG26-16（より線・単線）、1A';
  const terminals: TerminalDef[] = [
    {
      id: 'CN',
      label: `CN（MIL ${poles}P）`,
      note: `PLC の I/O ユニットなどの MIL ${poles} 極コネクタへケーブルでつなぐ`,
      x: cx,
      y: CN_Y,
      side: 'top',
      role: 'connector',
      connector: { kind: `MIL${poles}`, pins: poles, width: housingW - 8 },
    },
    ...nums.map(
      (n): TerminalDef => ({
        id: String(n),
        note: `コネクタのピン ${n}（${wireNote}）`,
        x: termX(n),
        y: termY(n),
        side: 'bottom',
        role: 'pass',
        optional: true,
        wire: WIRE,
        ratedCurrent: 1,
      }),
    ),
  ];
  const pins: PinDef[] = nums.map((n) => ({ id: `CN#${n}`, role: 'pass', optional: true }));
  const links: InternalLink[] = nums.map((n) => ({ from: `CN#${n}`, to: String(n) }));

  return {
    type: spec.type,
    name: 'MILコネクタ変換端子台',
    model: spec.modelName,
    maker: 'オムロン',
    category: 'terminal',
    description: spec.description,
    estimated: spec.estimated,
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
  };
}
