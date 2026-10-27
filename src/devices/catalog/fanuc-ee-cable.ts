import { EE12_KIND, EE12_PINS, n2, text } from '../fanuc/parts';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * LR Mate のエンドエフェクタ用 I/O コネクター（EE、12 ピン丸形）に差すケーブル（片側バラ線）。
 * ハンドのセンサー・電磁弁へ配線するために、ロボットの EE に合う相手コネクター（丸形 12 ピン）を付けて用意するケーブルを表す。
 *
 * 芯線の割付け（ピン番号と同じ順）: 1〜6 RI1〜RI6、7 RO7、8 RO8、9・10 +24V、11・12 0V（src/devices/fanuc/parts.ts の EE12_PINS）。
 * 芯線の色と相手コネクターの型式は資料で確認できなかったため、端子 ID を信号名にし、図では灰色の芯線に信号名を付けて描く。
 *
 * Conneko では、コネクター（CN）と芯線の先端ごとの端子を持つ機器として定義し、ピンと端子を links でつなぐ
 * （IAI の PIO ケーブルと同じ考え方）。芯線をセンサー・電磁弁につなぐと、ロボットの中の配線とロボット接続ケーブル RP1 を通って
 * コントローラーのロボット I/O（RI・RO）とつながり、I/O 表に出る。
 */

const PITCH = 7.5;
const n = EE12_PINS.length;
const W = n * PITCH + 18;
const H = 150;
const CX = W / 2;
const Y_END = H - 4;

/** 端子 ID（信号名。+24V・0V は 2 本あるのでピン番号を付ける） */
const leadId = (e: (typeof EE12_PINS)[number]) => (e.name === '24V' || e.name === '0V' ? `${e.name}-${e.pin}` : e.name);
const xs = EE12_PINS.map((_, i) => n2(CX + (i - (n - 1) / 2) * PITCH));

const wires = EE12_PINS.map((e, i) => {
  const x0 = n2(CX + (i - (n - 1) / 2) * 1.6);
  const d = `M${x0} 66 C${x0} 92 ${xs[i]} ${Y_END - 46} ${xs[i]} ${Y_END - 12}`;
  return `<path d="${d}" fill="none" stroke="#3a3c40" stroke-width="2.4" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#9aa0a6" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="${n2(xs[i] - 1.2)}" y="${Y_END - 12}" width="2.4" height="12" rx="0.4" fill="#c7cacd" stroke="#7d8287" stroke-width="0.3"/>
  <rect x="${n2(xs[i] - 2.6)}" y="${Y_END - 34}" width="5.2" height="20" rx="0.8" fill="#f6f6f2" stroke="#9a9d9f" stroke-width="0.3"/>
  ${text(xs[i] + 1, Y_END - 31, leadId(e), 3.2, '#222', 'start', 'normal', ` transform="rotate(90 ${n2(xs[i] - 1)} ${Y_END - 31})"`)}`;
}).join('');

const svg = `
  <defs>
    <linearGradient id="ee-nut-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d8287"/>
      <stop offset="0.45" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="ee-sheath-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121315"/>
      <stop offset="0.45" stop-color="#3b3e43"/>
      <stop offset="1" stop-color="#0f1012"/>
    </linearGradient>
  </defs>
  ${wires}
  <!-- シース（黒い丸形ケーブル） -->
  <rect x="${n2(CX - 5)}" y="26" width="10" height="42" rx="2" fill="url(#ee-sheath-{{uid}})" stroke="#000" stroke-width="0.5"/>
  <!-- 丸形 12 ピンのプラグ（ローレットのナット） -->
  <rect x="${n2(CX - 9)}" y="4" width="18" height="12" rx="2" fill="url(#ee-nut-{{uid}})" stroke="#4d5156" stroke-width="0.6"/>
  ${Array.from({ length: 6 }, (_, i) => `<line x1="${n2(CX - 7.5 + i * 3)}" y1="5" x2="${n2(CX - 7.5 + i * 3)}" y2="15" stroke="#6b7076" stroke-width="0.5"/>`).join('')}
  <rect x="${n2(CX - 7)}" y="16" width="14" height="11" rx="1.5" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>
  ${text(CX + 12, 13, 'EE 12P', 4.4, '#33363a', 'start', 'bold')}`;

const terminals: TerminalDef[] = [
  {
    id: 'CN',
    label: 'CN（EE 12 ピン）',
    hint: 'EE プラグ',
    note: 'ロボットのエンドエフェクタ用 I/O コネクター EE に差すプラグ',
    x: CX,
    y: 4,
    side: 'top',
    role: 'connector',
    connector: { kind: EE12_KIND, pins: 12, width: 10, style: 'round' },
  },
  ...EE12_PINS.map((e, i): TerminalDef => ({
    id: leadId(e),
    label: `${leadId(e)}（ピン ${e.pin}）`,
    note: `EE のピン ${e.pin}: ${e.note}`,
    x: xs[i],
    y: Y_END,
    side: 'bottom',
    role: 'pass',
    optional: true,
  })),
];

const pins: PinDef[] = EE12_PINS.map((e) => ({ id: `CN#${e.pin}`, label: `ピン ${e.pin} ${e.name}`, role: 'pass', optional: true }));
const links: InternalLink[] = EE12_PINS.map((e) => ({ from: `CN#${e.pin}`, to: leadId(e) }));

const def: DeviceDefinition = {
  type: 'fanuc.ee-cable',
  name: 'エンドエフェクタ用ケーブル（片側バラ線）',
  model: 'EE ケーブル（12 ピン）',
  maker: 'ファナック',
  category: 'terminal',
  labelPrefix: 'CBL',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  estimated: '芯線の色と相手コネクターの型式は未確認（EE に合う相手コネクターを付けて用意するケーブルとして表した）。ピンの割付けは販売店の掲載による',
  description:
    'LR Mate 200iD のエンドエフェクタ用 I/O コネクター EE（丸形 12 ピン）に差す、片側がバラ線のケーブル。ハンドのセンサー・電磁弁への配線に使う。' +
    '芯線: RI1〜RI6（ロボット入力。センサーの出力をつなぐ）、RO7・RO8（ロボット出力。+24V を出すので電磁弁の + 側へ、− 側は 0V へ）、24V-9・24V-10（+24V）、0V-11・0V-12（0V）。' +
    'ロボットの中の配線とロボット接続ケーブル RP1 を通ってコントローラーの RI・RO につながるので、つないだ機器はコントローラーの I/O 表に出る。',
};

export default def;
