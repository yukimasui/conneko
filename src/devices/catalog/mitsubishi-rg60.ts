import { IQR_BUS } from '../mitsubishi/melsec';
import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ ブランクカバーユニット RG60（空きスロット用）。
 * 外形 W27.8 × H106 mm（1mm ≒ 2px）。ダークグレーの無地のカバーで、外部接続はない。
 *
 * 図面では空きスロットを表すために使う。ベースユニットへの装着は位置の順に詰めて描き、
 * 入出力番号も詰めて割り付けるため、空きスロットの位置にこのユニットを装着すると、
 * 実機の初期設定（空きスロットは 16 点を占有）と同じ入出力番号になる。
 * そのため bus.io は 16 点（入力として数えるが、実際の入力はない）とする。
 */

const W = 56;
const H = 212;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#262833"/>
      <stop offset="0.12" stop-color="#3d4150"/>
      <stop offset="0.88" stop-color="#383b49"/>
      <stop offset="1" stop-color="#23252f"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="1.5" fill="url(#body-{{uid}})" stroke="#111214" stroke-width="1"/>
  <rect x="4" y="5" width="${W - 8}" height="${H - 14}" rx="1.5" fill="none" stroke="#2a2c35" stroke-width="1"/>
  <text x="${W / 2}" y="14" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#c9ccd2">RG60</text>
  <path d="M${W / 2 - 10} 100 H${W / 2 + 10} M${W / 2 - 10} 106 H${W / 2 + 10} M${W / 2 - 10} 112 H${W / 2 + 10}" stroke="#2a2c35" stroke-width="1.6"/>
  <rect x="16" y="${H - 5}" width="24" height="4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.rg60',
  name: 'PLC ブランクカバー',
  model: 'RG60',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズのブランクカバーユニット（空きスロットにほこりが入らないよう装着するカバー。外部接続・内部消費電流なし）。図面では空きスロットの位置に装着し、入出力番号を 16 点分あける（iQ-R の空きスロットは初期設定で 16 点を占有する）。',
  labelPrefix: 'BLANK',
  width: W,
  height: H,
  svg,
  terminals: [],
  bus: { kind: IQR_BUS, io: { inputs: 16, format: 'hex' } },
};

export default def;
