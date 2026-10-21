/**
 * KEYENCE 端子台変換ユニット XC シリーズ（MIL コネクタ → ネジ端子）の共通描画。
 *
 * 外観（KEYENCE 外形寸法図・製品写真より）: 黒い樹脂ベース（DINレール取付）、奥側に MIL オスコネクタ（ボックスヘッダ、
 * 両端にロックレバー）、手前にネジ端子（M3、ピッチ 7mm）が 2段に並ぶ（段どうしは千鳥ではなく縦にそろう）。
 * 端子の上に白いマーカー（端子番号）が付く。
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { keyenceToStd } from './kv-parts';

export interface XcSpec {
  type: string;
  model: string;
  poles: 20 | 34 | 40;
  /** 外形の長さ[mm] */
  lengthMm: number;
  /**
   * 端子番号の付け方。
   * - 'keyence': 奥段が 1〜n/2（左から）、手前段が n/2+1〜n（KEYENCE の I/O ユニットの横並び番号と同じ）
   * - 'std': 奥段が奇数 1,3,…、手前段が偶数 2,4,…（MIL 標準の千鳥番号と同じ）
   */
  numbering: 'keyence' | 'std';
  description: string;
}

export function buildXcTerminal(s: XcSpec): DeviceDefinition {
  const n = s.poles;
  const cols = n / 2;
  const W = Math.round(s.lengthMm * 2);
  const H = 84;
  const PITCH = 14;
  const x0 = +(W / 2 - ((cols - 1) / 2) * PITCH).toFixed(2);
  const ROW_A = 38;
  const ROW_B = 66;
  const CN = { x: W / 2, y: 11, w: cols * 5.08 + 4 };

  /** 端子番号 → 位置 */
  const termPos = (t: number) => {
    if (s.numbering === 'keyence') {
      const top = t <= cols;
      const i = top ? t - 1 : t - cols - 1;
      return { x: +(x0 + i * PITCH).toFixed(2), y: top ? ROW_A : ROW_B };
    }
    const top = t % 2 === 1;
    const i = Math.floor((t - 1) / 2);
    return { x: +(x0 + i * PITCH).toFixed(2), y: top ? ROW_A : ROW_B };
  };
  /** 端子番号 → コネクタの MIL 標準ピン番号 */
  const pinOf = (t: number) => (s.numbering === 'keyence' ? keyenceToStd(t, n) : t);

  const nums = Array.from({ length: n }, (_, i) => i + 1);

  const screw = (x: number, y: number) => `
  <rect x="${+(x - 6).toFixed(2)}" y="${y - 6}" width="12" height="12" rx="1" fill="#0f1011" stroke="#3c3f43" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="4.6" fill="url(#xcscrew-{{uid}})" stroke="#666" stroke-width="0.4"/>
  <path d="M${+(x - 2.8).toFixed(2)} ${y} H${+(x + 2.8).toFixed(2)} M${x} ${y - 2.8} V${y + 2.8}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

  const marker = (y: number, row: number[]) => `
  <rect x="${x0 - 7}" y="${y}" width="${(cols - 1) * PITCH + 14}" height="7" fill="#f4f5f6" stroke="#9da1a6" stroke-width="0.4"/>
  ${row
    .map((t) => {
      const p = termPos(t);
      return `<line x1="${+(p.x + PITCH / 2).toFixed(2)}" y1="${y}" x2="${+(p.x + PITCH / 2).toFixed(2)}" y2="${y + 7}" stroke="#c4c7cb" stroke-width="0.4"/><text x="${p.x}" y="${y + 5.3}" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#222">${t}</text>`;
    })
    .join('')}`;

  const topRow = nums.filter((t) => termPos(t).y === ROW_A);
  const botRow = nums.filter((t) => termPos(t).y === ROW_B);

  const pinPitch = 5.08;
  const px0 = CN.x - ((cols - 1) / 2) * pinPitch;

  const svg = `
  <defs>
    <linearGradient id="xcbase-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2e3134"/>
      <stop offset="1" stop-color="#17181a"/>
    </linearGradient>
    <linearGradient id="xcplug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#121212"/>
    </linearGradient>
    <radialGradient id="xcscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- ベース -->
  <rect x="3" y="1" width="${W - 6}" height="${H - 2}" rx="3" fill="url(#xcbase-{{uid}})" stroke="#0a0a0a" stroke-width="1"/>
  <!-- 取付け穴（上の両角） -->
  <circle cx="11" cy="11" r="3.4" fill="#0a0a0b" stroke="#55585c" stroke-width="0.6"/>
  <circle cx="${W - 11}" cy="11" r="3.4" fill="#0a0a0b" stroke="#55585c" stroke-width="0.6"/>
  <!-- MIL コネクタ（ボックスヘッダ） -->
  <rect x="${+(CN.x - CN.w / 2 - 12).toFixed(2)}" y="2" width="${+(CN.w + 24).toFixed(2)}" height="19" rx="1.5" fill="url(#xcplug-{{uid}})" stroke="#050505" stroke-width="0.7"/>
  <rect x="${+(CN.x - CN.w / 2 - 11).toFixed(2)}" y="3.5" width="7" height="16" rx="1" fill="#2b2b2b" stroke="#555" stroke-width="0.4"/>
  <rect x="${+(CN.x + CN.w / 2 + 4).toFixed(2)}" y="3.5" width="7" height="16" rx="1" fill="#2b2b2b" stroke="#555" stroke-width="0.4"/>
  <rect x="${+(CN.x - CN.w / 2).toFixed(2)}" y="5" width="${+CN.w.toFixed(2)}" height="12" rx="0.6" fill="#0b0b0b" stroke="#444" stroke-width="0.4"/>
  ${Array.from({ length: cols }, (_, i) => {
    const x = +(px0 + i * pinPitch).toFixed(2);
    return `<rect x="${+(x - 0.8).toFixed(2)}" y="7.4" width="1.6" height="1.6" fill="#e0b84a"/><rect x="${+(x - 0.8).toFixed(2)}" y="12.6" width="1.6" height="1.6" fill="#e0b84a"/>`;
  }).join('')}
  <rect x="${CN.x - 4.5}" y="16.2" width="9" height="2.6" fill="#0b0b0b"/>
  <path d="M${px0} 18.4 l-1.8 2.6 h3.6 z" fill="#f2f2f2"/>
  <text x="14" y="${H - 5}" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#c9ccd0">${s.model}</text>
  <text x="${W - 14}" y="${H - 5}" text-anchor="end" font-family="sans-serif" font-size="4" fill="#9a9ea3">KEYENCE</text>
  <!-- ネジ端子 -->
  ${marker(24, topRow)}
  ${marker(51.5, botRow)}
  ${nums.map((t) => screw(termPos(t).x, termPos(t).y)).join('')}
`;

  const terminals: TerminalDef[] = [
    { id: 'CN', label: `CN (MIL ${n}P)`, x: CN.x, y: CN.y, side: 'top', role: 'connector', connector: { kind: `MIL${n}`, pins: n, width: +CN.w.toFixed(2) } },
    ...nums.map((t): TerminalDef => {
      const p = termPos(t);
      // 電線は手前（図の下側）に出す（汎用の MIL 変換端子台と同じ）
      return { id: String(t), label: `${t}（CN ピン ${pinOf(t)}）`, x: p.x, y: p.y, side: 'bottom', role: 'pass', optional: true };
    }),
  ];
  const pins: PinDef[] = nums.map((p) => ({ id: `CN#${p}`, role: 'pass', optional: true }));
  const links: InternalLink[] = nums.map((t) => ({ from: `CN#${pinOf(t)}`, to: String(t) }));

  return {
    type: s.type,
    name: 'MILコネクタ変換端子台',
    model: s.model,
    maker: 'KEYENCE',
    category: 'terminal',
    description: s.description,
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
  };
}
