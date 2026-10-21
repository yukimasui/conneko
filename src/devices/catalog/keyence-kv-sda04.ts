import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody2, kvDefs, plugBlockV, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 高速アナログ出力ユニット KV-SDA04（4ch）。
 * 外形 W22.6 × H92.5 × D95 mm（1mm ≒ 2px）。上部に表示部、正面右寄りに 16極のプラグイン端子台（黒、プッシュイン）。
 *
 * 端子（KEYENCE 入出力回路図より、上から 1〜16）:
 *   1 V0 / 2 I0 / 3 COM / 4 NC / 5 V1 / 6 I1 / 7 COM / 8 NC / 9 V2 / 10 I2 / 11 COM / 12 NC / 13 V3 / 14 I3 / 15 COM / 16 NC
 * 電圧出力は Vn と COM、電流出力は In と COM の間に負荷（入力機器）をつなぐ。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sda04/io-circuit/
 */

const W = 46;
const H = 185;

const IDS: string[] = [];
const LABELS: Record<string, string> = {};
const PRINT: Record<string, string> = {};
for (const c of [0, 1, 2, 3]) {
  IDS.push(`V${c}`, `I${c}`, `COM${c}`, `NC${c}`);
  LABELS[`V${c}`] = `ch${c} 電圧出力`;
  LABELS[`I${c}`] = `ch${c} 電流出力`;
  LABELS[`COM${c}`] = `ch${c} アナログ出力 GND`;
  LABELS[`NC${c}`] = 'NC（未使用）';
  PRINT[`COM${c}`] = 'COM';
  PRINT[`NC${c}`] = 'NC';
}

const block = plugBlockV({ x: 22, y: 56, ids: IDS, pitch: 7.4, labels: PRINT, w: 11 });

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-SDA04', { headerH: 30 })}
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
  optional: true,
}));

const def: DeviceDefinition = {
  type: 'keyence.kv-sda04',
  name: 'PLC 高速アナログ出力ユニット',
  model: 'KV-SDA04',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの高速アナログ出力ユニット（4ch、変換速度 10µs/ch）。出力レンジは ch ごとに ±10V / 0〜10V / 0〜5V / 1〜5V / 0〜20mA / 4〜20mA などを選ぶ。電圧出力は Vn と COM、電流出力は In と COM の間にインバータ・バルブなどのアナログ入力をつなぐ。NC 端子は未使用。内部消費電流 170mA。アナログ信号はシールド線で配線する。',
  labelPrefix: 'DA',
  width: W,
  height: H,
  svg,
  terminals,
};

export default def;
