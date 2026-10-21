/**
 * KEYENCE 端子台変換ユニット XC シリーズのハーネスケーブル（MIL コネクタ - バラ線、XC-H34D / XC-H40D）の共通描画。
 *
 * 片側が MIL 規格のメスコネクタ（I/O ユニットの MIL ボックスヘッダに差す）、もう片側がバラ線。
 * コネクタを上にした姿で描き、黒いシースが下で芯線に分かれ、先端（棒端子）が端子になる。
 *
 * 端子ID は MIL 標準のピン番号（'1'〜'34' / '1'〜'40'）で、コネクタのピン n と芯線 n が導通する。
 * 芯線の色・マーク（印字）は公開資料で確認できなかったため、図では灰色の芯線に番号を付けて描く。
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { text } from './kv-parts';

export function buildXcHarness(s: { type: string; model: string; poles: 34 | 40; description: string }): DeviceDefinition {
  const n = s.poles;
  const PITCH = 6;
  const W = n * PITCH + 16;
  const H = 150;
  const CX = W / 2;
  /** コネクタ（メス、ケーブル側のプラグ）の外形 */
  const plugW = (n / 2) * 5.08 + 14;
  const PLUG = { x: CX - plugW / 2, y: 6, w: plugW, h: 20 };
  const sheath = { y0: PLUG.y + PLUG.h, y1: 70, w: 16 };
  const yEnd = H - 4;
  const xs = Array.from({ length: n }, (_, i) => +(CX + (i - (n - 1) / 2) * PITCH).toFixed(2));

  const wires = xs
    .map((x, i) => {
      const off = +((i - (n - 1) / 2) * (sheath.w / n)).toFixed(2);
      const d = `M${+(CX + off).toFixed(2)} ${sheath.y1 - 1} C${+(CX + off).toFixed(2)} ${sheath.y1 + 24} ${x} ${yEnd - 40} ${x} ${yEnd - 8}`;
      return `<path d="${d}" fill="none" stroke="#6c7075" stroke-width="2.2" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#c9ccd0" stroke-width="1.4" stroke-linecap="round"/>
  <rect x="${x - 1.3}" y="${yEnd - 8}" width="2.6" height="8" rx="0.5" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.3"/>
  ${text(x, yEnd - 10, String(i + 1), 2.4, '#333', 'middle', 'normal')}`;
    })
    .join('');

  const svg = `
  <defs>
    <linearGradient id="xch-plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#16171a"/>
    </linearGradient>
    <linearGradient id="xch-sheath-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111"/>
      <stop offset="0.45" stop-color="#3a3b3e"/>
      <stop offset="1" stop-color="#0c0c0d"/>
    </linearGradient>
  </defs>
  ${wires}
  <path d="M${CX - plugW * 0.3} ${sheath.y0} L${CX - sheath.w / 2} ${sheath.y0 + 14} V${sheath.y1} H${CX + sheath.w / 2} V${sheath.y0 + 14} L${CX + plugW * 0.3} ${sheath.y0} Z" fill="url(#xch-sheath-{{uid}})"/>
  <rect x="${CX - sheath.w / 2 - 0.6}" y="${sheath.y1 - 3}" width="${sheath.w + 1.2}" height="3" rx="0.8" fill="#1a1b1c"/>
  <rect x="${PLUG.x}" y="${PLUG.y}" width="${PLUG.w}" height="${PLUG.h}" rx="2" fill="url(#xch-plug-{{uid}})" stroke="#060607" stroke-width="0.8"/>
  <rect x="${PLUG.x - 5}" y="${PLUG.y + 4}" width="6" height="${PLUG.h - 8}" rx="1" fill="#2a2c30" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${PLUG.x + PLUG.w - 1}" y="${PLUG.y + 4}" width="6" height="${PLUG.h - 8}" rx="1" fill="#2a2c30" stroke="#0a0a0a" stroke-width="0.5"/>
  <path d="M${PLUG.x + 4} ${PLUG.y + 4} l2 -2.6 l2 2.6 z" fill="#e8e9eb"/>
  ${text(CX, PLUG.y + 12.5, s.model, 4.4, '#e6e7e9')}
  ${text(CX, PLUG.y + 17.5, `MIL ${n}P`, 3.2, '#b9bcc1', 'middle', 'normal')}`;

  const terminals: TerminalDef[] = [
    { id: 'CN', label: `CN（MIL ${n}P メス）`, x: CX, y: PLUG.y, side: 'top', role: 'connector', connector: { kind: `MIL${n}`, pins: n, width: +PLUG.w.toFixed(2) } },
    ...xs.map(
      (x, i): TerminalDef => ({
        id: String(i + 1),
        label: `芯線 ${i + 1}`,
        note: `コネクタの MIL 標準ピン ${i + 1} につながる芯線（線色・マークは未確認）`,
        x,
        y: yEnd,
        side: 'bottom',
        role: 'pass',
        optional: true,
      }),
    ),
  ];
  const pins: PinDef[] = xs.map((_, i) => ({ id: `CN#${i + 1}`, label: `MIL ピン ${i + 1}`, role: 'pass', optional: true }));
  const links: InternalLink[] = xs.map((_, i) => ({ from: `CN#${i + 1}`, to: String(i + 1) }));

  return {
    type: s.type,
    name: 'MIL ハーネスケーブル（片側バラ線）',
    model: s.model,
    maker: 'KEYENCE',
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
