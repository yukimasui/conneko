import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody, kvDefs, led, plugBlockV, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000 シリーズ DeviceNet ユニット KV-DN20（マスタ/スレーブ）。
 * 外形 W35 × H90 × D80 mm（1mm ≒ 2px）。上部に MS/NS LED と終端スイッチ、中央に DeviceNet 用の 5 極プラグ（緑、付属）、
 * 下部に FG 端子（ネジ）。
 *
 * DeviceNet コネクタ（KEYENCE 入出力回路図より、上から 1〜5）:
 *   1 赤 = V+（通信電源 DC24V 入力）、2 白 = CAN_H、3 裸線 = SHIELD、4 青 = CAN_L、5 黒 = V−（通信電源 0V）
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-dn20/io-circuit/
 */

const W = 70;
const H = 180;
const IDS = ['V+', 'CAN_H', 'SHIELD', 'CAN_L', 'V-'];
const COLORS = ['#d6302c', '#f4f4f4', '#c9c9c9', '#1f5fd6', '#1d1d1d'];
const block = plugBlockV({ x: 22, y: 56, ids: IDS, pitch: 10, w: 14, color: 'green', labels: Object.fromEntries(IDS.map((id) => [id, ''])) });
const FG = { x: 35, y: 150 };

const svg = `
  ${kvDefs()}
  ${kvBody(W, H, 'KV-DN20')}
  ${led(16, 26, 'g')}${text(16, 32, 'MS', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${led(30, 26, 'g')}${text(30, 32, 'NS', 2.8, '#b9bcc1', 'middle', 'normal')}
  <rect x="48" y="22" width="8" height="12" rx="0.8" fill="#0d0e0f" stroke="#4a4d52" stroke-width="0.4"/>
  <rect x="48.8" y="22.8" width="6.4" height="5" rx="0.6" fill="#d9dadc"/>
  ${text(52, 39, 'TERM', 2.6, '#b9bcc1', 'middle', 'normal')}
  <rect x="19" y="50" width="20" height="62" rx="1" fill="#1e5a2c" stroke="#123c1c" stroke-width="0.6"/>
  ${screw(29, 53, 2.2)}
  ${screw(29, 109, 2.2)}
  ${block.svg}
  ${IDS.map((id, i) => `<rect x="14" y="${block.pos[id].y - 2}" width="5" height="4" rx="0.6" fill="${COLORS[i]}" stroke="#555" stroke-width="0.3"/>`).join('')}
  <rect x="${FG.x - 9}" y="${FG.y - 9}" width="18" height="18" rx="1" fill="#141516" stroke="#3a3c40" stroke-width="0.5"/>
  ${screw(FG.x, FG.y, 4.6)}
  <path d="M${FG.x - 14} ${FG.y - 3} v3 M${FG.x - 16.5} ${FG.y} h5 M${FG.x - 15.7} ${FG.y + 1.2} h3.4 M${FG.x - 14.9} ${FG.y + 2.4} h1.8" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const LABELS: Record<string, string> = {
  'V+': '1 赤 V+（通信電源 DC24V 入力）',
  CAN_H: '2 白 CAN_H',
  SHIELD: '3 裸線 SHIELD',
  CAN_L: '4 青 CAN_L',
  'V-': '5 黒 V−（通信電源 0V）',
};

const terminals: TerminalDef[] = [
  ...IDS.map((id): TerminalDef => {
    const base = { id, label: LABELS[id], x: block.pos[id].x, y: block.pos[id].y, side: 'right' as const };
    if (id === 'V+') return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['+'] }, optional: true };
    if (id === 'V-') return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['-'] }, optional: true };
    return { ...base, role: 'signal', optional: true };
  }),
  { id: 'FG', label: 'FG', x: FG.x, y: FG.y, side: 'bottom', role: 'ground', optional: true },
];

const def: DeviceDefinition = {
  type: 'keyence.kv-dn20',
  name: 'PLC DeviceNet ユニット',
  model: 'KV-DN20',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-8000/7000 シリーズの DeviceNet ユニット（マスタ/スレーブ、500/250/125 kbps、最大 64 ノード）。付属の 5 極 DeviceNet コネクタに DeviceNet ケーブルの線色どおり 赤 = V+（通信電源 DC24V）、白 = CAN_H、裸線 = SHIELD、青 = CAN_L、黒 = V−（0V）をつなぐ（通信電源は DeviceNet 用の電源から供給する。許容範囲は DeviceNet 規格の DC11〜25V としてチェック）。伝送路の両端だけ終端（TERM）を ON にする。FG 端子は盤の接地へ。',
  labelPrefix: 'DN',
  width: W,
  height: H,
  svg,
  terminals,
};

export default def;
