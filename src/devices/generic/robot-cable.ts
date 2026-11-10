/**
 * ロボット・ロボットコントローラーのコネクターに差す、片側がバラ線のケーブル（ハンド I/O ケーブル・I/O ケーブル）を作る共通部品。
 *
 * ファナックの EE ケーブル（src/devices/catalog/fanuc-ee-cable.ts）と同じ考え方: コネクター（CN）と芯線の先端ごとの端子を持つ機器にし、
 * ピンと端子を links でつなぐ。芯線の色は確かめられないことが多いため、図では灰色の芯線に信号名を付けて描く。
 */
import type { ConnectorSpec, InternalLink, PinDef, TerminalDef } from '../types';

const r1 = (v: number) => Math.round(v * 100) / 100;

export interface CableLead {
  /** コネクターのピン番号 */
  pin: number;
  /** 芯線の端子 ID（信号名など。機器の中で一意） */
  id: string;
  /** 端子の説明 */
  note: string;
}

export interface LooseCableParts {
  width: number;
  height: number;
  svg: string;
  terminals: TerminalDef[];
  pins: PinDef[];
  links: InternalLink[];
}

/**
 * @param p id の接頭辞
 * @param leads 芯線（ピンの順）
 * @param connector コネクターの仕様（CN）
 * @param plugLabel プラグの横に書く文字
 * @param plug 'round'（丸形のナット）/ 'dsub'（D-sub の台形のシェル）
 */
export function looseCable(p: string, leads: CableLead[], connector: ConnectorSpec, cnLabel: string, plugLabel: string, plug: 'round' | 'dsub' = 'round'): LooseCableParts {
  const PITCH = 7.5;
  const n = leads.length;
  const W = Math.ceil(n * PITCH + 18);
  const H = 150;
  const CX = W / 2;
  const Y_END = H - 4;
  const xs = leads.map((_, i) => r1(CX + (i - (n - 1) / 2) * PITCH));
  const fan = Math.min(1.6, 22 / n);
  const wires = leads
    .map((e, i) => {
      const x0 = r1(CX + (i - (n - 1) / 2) * fan);
      const d = `M${x0} 66 C${x0} 92 ${xs[i]} ${Y_END - 46} ${xs[i]} ${Y_END - 12}`;
      return `<path d="${d}" fill="none" stroke="#3a3c40" stroke-width="2.4" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#9aa0a6" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="${r1(xs[i] - 1.2)}" y="${Y_END - 12}" width="2.4" height="12" rx="0.4" fill="#c7cacd" stroke="#7d8287" stroke-width="0.3"/>
  <rect x="${r1(xs[i] - 2.6)}" y="${Y_END - 34}" width="5.2" height="20" rx="0.8" fill="#f6f6f2" stroke="#9a9d9f" stroke-width="0.3"/>
  <text x="${r1(xs[i] + 1)}" y="${Y_END - 31}" text-anchor="start" font-family="sans-serif" font-size="3.2" fill="#222" transform="rotate(90 ${r1(xs[i] - 1)} ${Y_END - 31})">${e.id}</text>`;
    })
    .join('');
  const sheathW = Math.min(16, 6 + n * 0.25);
  const plugSvg =
    plug === 'round'
      ? `
  <rect x="${r1(CX - 9)}" y="4" width="18" height="12" rx="2" fill="url(#${p}-nut-{{uid}})" stroke="#4d5156" stroke-width="0.6"/>
  ${Array.from({ length: 6 }, (_, i) => `<line x1="${r1(CX - 7.5 + i * 3)}" y1="5" x2="${r1(CX - 7.5 + i * 3)}" y2="15" stroke="#6b7076" stroke-width="0.5"/>`).join('')}
  <rect x="${r1(CX - 7)}" y="16" width="14" height="11" rx="1.5" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>`
      : `
  <path d="M${r1(CX - 26)} 4 H${r1(CX + 26)} L${r1(CX + 22)} 13 H${r1(CX - 22)} Z" fill="url(#${p}-nut-{{uid}})" stroke="#4d5156" stroke-width="0.6"/>
  ${[-30, 30].map((dx) => `<circle cx="${r1(CX + dx)}" cy="8" r="2.4" fill="url(#${p}-nut-{{uid}})" stroke="#4d5156" stroke-width="0.5"/>`).join('')}
  <path d="M${r1(CX - 22)} 13 H${r1(CX + 22)} L${r1(CX + 10)} 28 H${r1(CX - 10)} Z" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>`;
  const svg = `
  <defs>
    <linearGradient id="${p}-nut-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d8287"/>
      <stop offset="0.45" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="${p}-sheath-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121315"/>
      <stop offset="0.45" stop-color="#3b3e43"/>
      <stop offset="1" stop-color="#0f1012"/>
    </linearGradient>
  </defs>
  ${wires}
  <!-- シース（黒い丸形ケーブル） -->
  <rect x="${r1(CX - sheathW / 2)}" y="26" width="${r1(sheathW)}" height="42" rx="2" fill="url(#${p}-sheath-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${plugSvg}
  <text x="${r1(CX + (plug === 'dsub' ? 34 : 12))}" y="13" text-anchor="start" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#33363a">${plugLabel}</text>`;

  const terminals: TerminalDef[] = [
    { id: 'CN', label: cnLabel, hint: 'プラグ', note: `${cnLabel} に差すプラグ`, x: CX, y: 4, side: 'top', role: 'connector', connector },
    ...leads.map((e, i): TerminalDef => ({ id: e.id, label: `${e.id}（ピン ${e.pin}）`, note: e.note, x: xs[i], y: Y_END, side: 'bottom', role: 'pass', optional: true })),
  ];
  const pins: PinDef[] = leads.map((e) => ({ id: `CN#${e.pin}`, label: `ピン ${e.pin} ${e.id}`, role: 'pass', optional: true }));
  const links: InternalLink[] = leads.map((e) => ({ from: `CN#${e.pin}`, to: e.id }));
  return { width: W, height: H, svg, terminals, pins, links };
}
