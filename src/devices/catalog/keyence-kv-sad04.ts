import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody2, kvDefs, kvUnitBus, plugBlockV, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 高速アナログ入力ユニット KV-SAD04（4ch、差動入力）。
 * 外形 W22.6 × H92.5 × D95 mm（1mm ≒ 2px）。上部に表示部、正面右寄りに 16極のプラグイン端子台（黒、プッシュイン）。
 *
 * 端子（KEYENCE 入出力回路図より、上から 1〜16）:
 *   1 V0+ / 2 I0+ / 3 0− / 4 COM / 5 V1+ / 6 I1+ / 7 1− / 8 COM / 9 V2+ / 10 I2+ / 11 2− / 12 COM / 13 V3+ / 14 I3+ / 15 3− / 16 COM
 * 電圧入力は Vn+ と n−、電流入力は Vn+ と In+ を短絡して n− との間に入れる。COM は GND コモン（ch 間は非絶縁）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sad04/io-circuit/
 */

const W = 46;
const H = 185;

const IDS: string[] = [];
const LABELS: Record<string, string> = {};
const PRINT: Record<string, string> = {};
for (const c of [0, 1, 2, 3]) {
  IDS.push(`V${c}+`, `I${c}+`, `${c}-`, `COM${c}`);
  LABELS[`V${c}+`] = `ch${c} 電圧入力 +`;
  LABELS[`I${c}+`] = `ch${c} 電流入力 +`;
  LABELS[`${c}-`] = `ch${c} アナログ入力 GND（−）`;
  LABELS[`COM${c}`] = 'GND コモン';
  PRINT[`COM${c}`] = 'COM';
}

const block = plugBlockV({ x: 22, y: 56, ids: IDS, pitch: 7.4, labels: PRINT, w: 11 });

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-SAD04', { headerH: 30 })}
  <rect x="2" y="34" width="${W - 7}" height="18" rx="1" fill="#26282b"/>
  ${[0, 1, 2, 3].map((c) => text(6, 60 + c * 29.6 + 13, `CH${c}`, 2.8, '#b9bcc1', 'start', 'normal')).join('')}
  ${block.svg}
  <path d="M5 181 l3 -5.2 l3 5.2 z" fill="none" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const terminals: TerminalDef[] = IDS.map((id) => ({
  id,
  label: LABELS[id],
  x: block.pos[id].x,
  y: block.pos[id].y,
  side: 'right',
  role: 'signal',
  // 電圧・電流の + 側の端子にアナログ信号の種類を付ける（GND・COM 側は付けない）
  ...(/^[VI]\d\+$/.test(id) ? { signal: { dir: 'in', kind: id.startsWith('V') ? 'analog-v' : 'analog-i' } as const } : {}),
  optional: true,
}));

const def: DeviceDefinition = {
  type: 'keyence.kv-sad04',
  name: 'PLC 高速アナログ入力ユニット',
  model: 'KV-SAD04',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの高速アナログ入力ユニット（4ch 差動入力、変換速度 10µs/ch）。入力レンジは ch ごとに ±10V / 0〜10V / ±5V / 0〜5V / 1〜5V / 0〜20mA / 4〜20mA などを選ぶ。電圧入力は Vn+ と n−、電流入力は Vn+ と In+ を短絡して n− との間に配線する。COM は GND コモンで、相手機器の GND と電位差がある場合は COM と相手の GND をつなぐ（n− と COM を短絡するとノイズに強くなる）。ch 間は非絶縁。内部消費電流 80mA。アナログ信号はシールド線で配線する。',
  labelPrefix: 'AD',
  width: W,
  height: H,
  svg,
  terminals,
  bus: kvUnitBus(80),
  // GND コモンは内部で共通（ch 間非絶縁）
  links: [1, 2, 3].map((c) => ({ from: 'COM0', to: `COM${c}` })),
};

export default def;
