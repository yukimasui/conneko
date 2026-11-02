import { GP7_USER_KIND, GP7_USER_PINS, n2, text } from '../yaskawa/parts';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * MOTOMAN-GP7 の内部ユーザ配線のコネクタ（ベース側 BC・U アーム側 UC）に差すケーブル（片側バラ線）。
 * ハンドのセンサー・電磁弁や、コントローラーの入出力・中継の端子台へ配線するために、相手コネクタを付けて用意するケーブルを表す。
 *
 * 芯線はピン番号と同じ番号（1〜17。芯数は推定）。芯線の色と相手コネクタの型式は資料で確認できなかったため、端子 ID を番号にした。
 * ロボットの中で BC と UC の同じ番号のピンがつながっているので、U アーム側のケーブルの芯線 n と、ベース側のケーブルの芯線 n が導通する。
 * Conneko では、コネクタ（CN）と芯線の先端ごとの端子を持つ機器として定義し、ピンと端子を links でつなぐ（ファナックの EE ケーブルと同じ考え方）。
 */

const PITCH = 7;
const n = GP7_USER_PINS;
const W = n * PITCH + 18;
const H = 140;
const CX = W / 2;
const Y_END = H - 4;
const xs = Array.from({ length: n }, (_, i) => n2(CX + (i - (n - 1) / 2) * PITCH));

const wires = xs
  .map((x, i) => {
    const x0 = n2(CX + (i - (n - 1) / 2) * 1.2);
    const d = `M${x0} 62 C${x0} 86 ${x} ${Y_END - 44} ${x} ${Y_END - 12}`;
    return `<path d="${d}" fill="none" stroke="#3a3c40" stroke-width="2.3" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#9aa0a6" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="${n2(x - 1.2)}" y="${Y_END - 12}" width="2.4" height="12" rx="0.4" fill="#c7cacd" stroke="#7d8287" stroke-width="0.3"/>
  <rect x="${n2(x - 2.6)}" y="${Y_END - 26}" width="5.2" height="12" rx="0.8" fill="#f6f6f2" stroke="#9a9d9f" stroke-width="0.3"/>
  ${text(x, Y_END - 18, String(i + 1), 3.2, '#222', 'middle', 'bold')}`;
  })
  .join('');

const svg = `
  <defs>
    <linearGradient id="ucb-nut-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d8287"/>
      <stop offset="0.45" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="ucb-sheath-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121315"/>
      <stop offset="0.45" stop-color="#3b3e43"/>
      <stop offset="1" stop-color="#0f1012"/>
    </linearGradient>
  </defs>
  ${wires}
  <!-- シース（黒い丸形ケーブル） -->
  <rect x="${n2(CX - 6)}" y="26" width="12" height="38" rx="2" fill="url(#ucb-sheath-{{uid}})" stroke="#000" stroke-width="0.5"/>
  <!-- 丸形のプラグ -->
  <rect x="${n2(CX - 10)}" y="4" width="20" height="12" rx="2" fill="url(#ucb-nut-{{uid}})" stroke="#4d5156" stroke-width="0.6"/>
  ${Array.from({ length: 7 }, (_, i) => `<line x1="${n2(CX - 8.5 + i * 2.8)}" y1="5" x2="${n2(CX - 8.5 + i * 2.8)}" y2="15" stroke="#6b7076" stroke-width="0.5"/>`).join('')}
  <rect x="${n2(CX - 8)}" y="16" width="16" height="11" rx="1.5" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>
  ${text(CX + 13, 13, `USER ${n}P`, 4.4, '#33363a', 'start', 'bold')}`;

const terminals: TerminalDef[] = [
  {
    id: 'CN',
    label: `CN（内部ユーザ配線 ${n} ピン）`,
    hint: 'ユーザプラグ',
    note: 'MOTOMAN-GP7 の内部ユーザ配線のコネクタ（ベース側 BC または U アーム側 UC）に差すプラグ',
    x: CX,
    y: 4,
    side: 'top',
    role: 'connector',
    connector: { kind: GP7_USER_KIND, pins: n, width: 10, style: 'round' },
  },
  ...xs.map((x, i): TerminalDef => ({
    id: String(i + 1),
    label: `${i + 1}（ピン ${i + 1}）`,
    note: `内部ユーザ配線のピン ${i + 1}`,
    x,
    y: Y_END,
    side: 'bottom',
    role: 'pass',
    optional: true,
  })),
];

const pins: PinDef[] = xs.map((_, i) => ({ id: `CN#${i + 1}`, label: `ピン ${i + 1}`, role: 'pass', optional: true }));
const links: InternalLink[] = xs.map((_, i) => ({ from: `CN#${i + 1}`, to: String(i + 1) }));

const def: DeviceDefinition = {
  type: 'yaskawa.gp7-user-cable',
  name: 'ユーザケーブル（片側バラ線）',
  model: `内部ユーザ配線用ケーブル（${n} 芯）`,
  maker: '安川電機',
  category: 'terminal',
  labelPrefix: 'CBL',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  estimated: '芯数（17）・芯線の色・相手コネクタの型式は未確認（GP7 の内部ユーザ配線のコネクタに合う相手コネクタを付けて用意するケーブルとして表した）',
  description:
    'MOTOMAN-GP7 の内部ユーザ配線のコネクタ（ベース側 BC・U アーム側 UC）に差す、片側がバラ線のケーブル。' +
    'U アーム側ではハンドのセンサー・電磁弁へ、ベース側ではコントローラーの入出力・PLC・中継の端子台へ配線する。' +
    'ロボットの中で BC と UC の同じ番号のピンがつながっているので、両側のケーブルの同じ番号の芯線が導通する（つないだ機器はコントローラー・PLC の I/O 表に出る）。',
};

export default def;
