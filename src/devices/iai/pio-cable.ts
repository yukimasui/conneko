/**
 * IAI の PIO ケーブル（コントローラー側がフラットケーブル用コネクター、反対側が切りっぱなしのバラ線）の共通の作り。
 *
 * IAI の PIO ケーブルは、フラットケーブルの芯線を 10 色（茶・赤・橙・黄・緑・青・紫・灰・白・黒）の順に並べ、
 * 10 本ごとに色の後ろの番号（茶-1、茶-2 …。被覆のドットマークの数）で区別する。
 * 例: CB-PAC-PIO（40 極）は 1A〜10A が 茶-1〜黒-1、11A〜20A が 茶-2〜黒-2、1B〜10B が 茶-3〜黒-3、11B〜20B が 茶-4〜黒-4。
 *
 * Conneko では、コネクター（CN）とバラ線の先端ごとの端子を持つ機器として定義し、ピンと端子を links でつなぐ
 * （KEYENCE の XC-H34D と同じ考え方）。バラ線の端子を MIL 変換端子台や PLC の端子台へ電線でつなぐと、
 * コントローラーの PIO のピンと PLC の入出力がつながり、NPN/PNP の極性や I/O 電源がチェックされる。
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { n2, text } from './parts';

/** IAI の線色の順（10 色） */
export const IAI_COLORS = [
  { name: '茶', hex: '#7b4a2a' },
  { name: '赤', hex: '#d32f2f' },
  { name: '橙', hex: '#f08c1a' },
  { name: '黄', hex: '#f2c81b' },
  { name: '緑', hex: '#2e9d3a' },
  { name: '青', hex: '#1e5bd8' },
  { name: '紫', hex: '#8e44ad' },
  { name: '灰', hex: '#8a8f98' },
  { name: '白', hex: '#f5f5f5' },
  { name: '黒', hex: '#1a1a1a' },
];

/** k 本目（0 から）の線色（'茶-1' など） */
export const leadColor = (k: number) => (k < 0 ? { name: '', hex: '#c9ccd0', mark: 0 } : { ...IAI_COLORS[k % 10], mark: Math.floor(k / 10) + 1 });

/** 線色の表記（'茶-1'。色が不明な芯線は空） */
const colorName = (c: ReturnType<typeof leadColor>) => (c.name ? `${c.name}-${c.mark}` : '');

export interface PioLead {
  /** 端子ID（マニュアルのピン番号の表記。'1A'、'25' など） */
  id: string;
  /** つながるコネクターのピン番号（ピンID '<CN>#<番号>' の番号） */
  pin: number;
  /** 線色（IAI_COLORS の順の何本目か。線色が公開資料で確認できない場合は −1 で灰色に描く） */
  colorIndex: number;
  /** 芯線の印字（省略時は id と線色） */
  label?: string;
  /** 補足（どのコントローラーで何の信号か） */
  note?: string;
}

export interface PioCableSpec {
  type: string;
  model: string;
  name: string;
  description: string;
  /** コネクターの種類（connector.kind）とピン数 */
  kind: string;
  poles: number;
  /** コネクターの外形（幅[px]） */
  plugW: number;
  /** コネクターの印字 */
  plugText: string;
  leads: PioLead[];
  /** フラットケーブルの本数（CB-PAC-PIO は 20 芯 × 2 本）。省略時は 1 */
  ribbons?: number;
}

export function buildPioCable(s: PioCableSpec): DeviceDefinition {
  const PITCH = 6;
  const n = s.leads.length;
  const W = n * PITCH + 16;
  const H = 160;
  const CX = W / 2;
  const PLUG = { x: CX - s.plugW / 2, y: 6, w: s.plugW, h: 18 };
  const yEnd = H - 4;
  const xs = s.leads.map((_, i) => n2(CX + (i - (n - 1) / 2) * PITCH));
  /** フラットケーブル（帯）の幅と本数（帯ごとの芯線数） */
  const groups = s.ribbons ?? 1;
  const GAP = 3;
  const ribbonW = Math.min(s.plugW - 10, n * 1.6 + (groups - 1) * GAP);
  const per = Math.ceil(n / groups);
  /** 芯線 i の帯の中での x（帯の間に GAP の隙間） */
  const ribbonX = (i: number, frac = 0.5) => {
    const g = Math.floor(i / per);
    const wire = (ribbonW - (groups - 1) * GAP) / n;
    return n2(CX - ribbonW / 2 + g * GAP + wire * (i + frac));
  };

  const wires = s.leads
    .map((l, i) => {
      const c = leadColor(l.colorIndex);
      const x0 = ribbonX(i);
      const d = `M${x0} 62 C${x0} 88 ${xs[i]} ${yEnd - 46} ${xs[i]} ${yEnd - 12}`;
      const dots = Array.from({ length: c.mark }, (_, k) => `<circle cx="${xs[i]}" cy="${n2(yEnd - 33 - k * 2.6)}" r="0.7" fill="${c.name === '黒' ? '#ddd' : '#111'}"/>`).join('');
      return `<path d="${d}" fill="none" stroke="#3a3c40" stroke-width="2.3" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${c.hex}" stroke-width="1.6" stroke-linecap="round"/>
  ${dots}
  <rect x="${n2(xs[i] - 1.2)}" y="${yEnd - 12}" width="2.4" height="12" rx="0.4" fill="#c7cacd" stroke="#7d8287" stroke-width="0.3"/>
  <rect x="${n2(xs[i] - 2.3)}" y="${yEnd - 29}" width="4.6" height="15" rx="0.8" fill="#f6f6f2" stroke="#9a9d9f" stroke-width="0.3"/>
  ${text(xs[i] + 0.9, yEnd - 15.5, l.id, 2.7, '#222', 'start', 'normal', ` transform="rotate(-90 ${n2(xs[i] + 0.9)} ${yEnd - 15.5})"`)}`;
    })
    .join('');

  // 平らな帯（フラットケーブル）。芯線の色を細い縞で描く
  const ribbon = s.leads
    .map((l, i) => {
      const x = ribbonX(i, 0);
      return `<rect x="${x}" y="${PLUG.y + PLUG.h}" width="${n2((ribbonW - (groups - 1) * GAP) / n)}" height="${n2(62 - PLUG.y - PLUG.h)}" fill="${leadColor(l.colorIndex).hex}"/>`;
    })
    .join('');

  const svg = `
  <defs>
    <linearGradient id="iaicbl-plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#16171a"/>
    </linearGradient>
  </defs>
  ${wires}
  ${ribbon}
  ${Array.from({ length: groups }, (_, g) => `<rect x="${ribbonX(g * per, 0)}" y="${PLUG.y + PLUG.h}" width="${n2(ribbonX(Math.min(n, (g + 1) * per) - 1, 1) - ribbonX(g * per, 0))}" height="${n2(62 - PLUG.y - PLUG.h)}" fill="#ffffff" opacity="0.18" stroke="#555" stroke-width="0.3"/>`).join('')}
  <rect x="${PLUG.x}" y="${PLUG.y}" width="${PLUG.w}" height="${PLUG.h}" rx="2" fill="url(#iaicbl-plug-{{uid}})" stroke="#060607" stroke-width="0.8"/>
  <path d="M${PLUG.x + 4} ${PLUG.y + 4} l2 -2.6 l2 2.6 z" fill="#e8e9eb"/>
  ${text(CX, PLUG.y + 11, s.model, 4.2, '#e6e7e9', 'middle', 'bold')}
  ${text(CX, PLUG.y + 16, s.plugText, 3, '#b9bcc1')}`;

  const terminals: TerminalDef[] = [
    {
      id: 'CN',
      label: `CN（${s.plugText}）`,
      x: CX,
      y: PLUG.y,
      side: 'top',
      role: 'connector',
      connector: { kind: s.kind, pins: s.poles, width: n2(PLUG.w) },
    },
    ...s.leads.map((l, i): TerminalDef => {
      const c = leadColor(l.colorIndex);
      return {
        id: l.id,
        label: l.label ?? [l.id, colorName(c)].filter(Boolean).join(' '),
        note: l.note ?? `コネクターのピン ${l.id} につながる芯線${colorName(c) ? `（${colorName(c)}）` : ''}`,
        x: xs[i],
        y: yEnd,
        side: 'bottom',
        role: 'pass',
        optional: true,
      };
    }),
  ];
  const pins: PinDef[] = s.leads.map((l) => ({ id: `CN#${l.pin}`, label: `ピン ${l.id}`, role: 'pass', optional: true }));
  // 芯線のないピン（未使用）
  for (let k = 1; k <= s.poles; k++) {
    if (!s.leads.some((l) => l.pin === k)) pins.push({ id: `CN#${k}`, label: `ピン ${k}（芯線なし）`, role: 'signal', optional: true });
  }
  const links: InternalLink[] = s.leads.map((l) => ({ from: `CN#${l.pin}`, to: l.id }));

  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'IAI',
    category: 'terminal',
    description: s.description,
    labelPrefix: 'CBL',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
  };
}
