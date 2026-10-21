import type { DeviceDefinition } from '../types';
import { kvDefs, led, rj45, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE EtherCAT 通信ユニット（EtherCAT カプラ）KV-EC01。
 * KV-X シリーズ CPU の EtherCAT ポート（PORT3）からつなぎ、右側に KV-NC□□E などの拡張ユニットを連結してリモート I/O にする。
 * 外形 W26.7 × H90 × D80.4 mm（KEYENCE 外形寸法図より、1mm ≒ 2px）。正面上部に KEYENCE ロゴと RUN/ERR/BUS LED、
 * その下に EtherCAT の IN / OUT ポート（RJ-45）、底面に電源用のプラグイン端子（約 13.6mm 下に突き出す）。
 *
 * 電源端子の並び（左から +24V・0V・FG）は公開資料で確認できなかったため推定。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-ec01/
 */

const W = 54;
const BODY_H = 180;
const H = 206;
const IN = { x: 22, y: 88 };
const OUT = { x: 22, y: 124 };
const PWR_Y = 196;
const PWR = [
  { id: '24V+', label: '+', x: 18 },
  { id: '24V-', label: '−', x: 27 },
  { id: 'FG', label: 'FG', x: 36 },
];

const svg = `
  ${kvDefs()}
  <!-- 電源プラグ（底面） -->
  <rect x="11" y="${BODY_H - 3}" width="32" height="${H - BODY_H + 1}" rx="2" fill="#2a2c2f" stroke="#0e0e0f" stroke-width="0.8"/>
  ${PWR.map((t) => `<rect x="${t.x - 3.8}" y="${PWR_Y - 4.6}" width="7.6" height="9.2" rx="1" fill="#0e0f10"/>${screw(t.x, PWR_Y, 3)}`).join('')}
  ${PWR.map((t) => text(t.x, BODY_H + 5, t.label, 3.2, '#e2e5e8')).join('')}
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${BODY_H - 2}" rx="2" fill="url(#kvbody-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <rect x="4" y="4" width="${W - 10}" height="${BODY_H - 8}" rx="1.5" fill="#26282b" stroke="#111" stroke-width="0.5"/>
  <text x="7" y="13" font-family="sans-serif" font-size="5" font-weight="bold" fill="#f2f3f4" letter-spacing="0.3">KEYENCE</text>
  ${text(7, 18.5, 'KV-EC01', 3, '#c9ccd0', 'start', 'normal')}
  <rect x="7" y="20.5" width="30" height="0.9" fill="#d22b2b"/>
  ${led(43, 12, 'g')}${text(43, 17, 'RUN', 2.2, '#b9bcc1', 'middle', 'normal')}
  ${led(43, 26, 'off')}${text(43, 31, 'ERR', 2.2, '#b9bcc1', 'middle', 'normal')}
  ${led(43, 40, 'g')}${text(43, 45, 'BUS', 2.2, '#b9bcc1', 'middle', 'normal')}
  ${text(43, IN.y - 6, 'IN', 2.6, '#d0d3d6', 'middle', 'normal')}
  ${led(43, IN.y, 'g')}${text(43, IN.y + 4.6, 'L/A', 2.2, '#b9bcc1', 'middle', 'normal')}
  ${rj45(IN.x, IN.y)}
  ${text(43, OUT.y - 6, 'OUT', 2.6, '#d0d3d6', 'middle', 'normal')}
  ${led(43, OUT.y, 'off')}${text(43, OUT.y + 4.6, 'L/A', 2.2, '#b9bcc1', 'middle', 'normal')}
  ${rj45(OUT.x, OUT.y)}
  <text x="8" y="166" font-family="sans-serif" font-size="5" font-style="italic" font-weight="bold" fill="#e6e7e9">EtherCAT</text>
  ${text(8, 171, 'Communication Unit', 2.2, '#9a9da2', 'start', 'normal')}
  <rect x="${W - 4}" y="8" width="1.6" height="${BODY_H - 14}" fill="#000" opacity="0.25"/>
`;

const accepts = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4, conductors: [c] });

const def: DeviceDefinition = {
  type: 'keyence.kv-ec01',
  name: 'EtherCAT 通信ユニット（カプラ）',
  model: 'KV-EC01',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE の EtherCAT 通信ユニット（EtherCAT スレーブのカプラ）。KV-X シリーズ CPU の EtherCAT ポート（PORT3）や KV-XH16EC から IN ポートへ LAN ケーブル（STP）でつなぎ、OUT ポートから次の EtherCAT 機器へデイジーチェーンする。右側に KV-NC16EXE などの拡張ユニットを連結してリモート I/O にする。電源は DC24V（−15%/+10%）を底面の電源端子に入れる（並びは +・−・FG と推定）。内部消費電流 120mA（連結した拡張ユニット込みで最大 1.8A）。',
  labelPrefix: 'EC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '24V+', label: '+ (DC24V)', x: PWR[0].x, y: PWR_Y, side: 'bottom', role: 'input', accepts: accepts('+') },
    { id: '24V-', label: '− (0V)', x: PWR[1].x, y: PWR_Y, side: 'bottom', role: 'input', accepts: accepts('-') },
    { id: 'FG', label: 'FG', x: PWR[2].x, y: PWR_Y, side: 'bottom', role: 'ground' },
    { id: 'IN', label: 'EtherCAT IN (RJ45)', x: IN.x, y: IN.y, side: 'left', role: 'connector', connector: { kind: 'RJ45', pins: 0, width: 22 }, optional: true },
    { id: 'OUT', label: 'EtherCAT OUT (RJ45)', x: OUT.x, y: OUT.y, side: 'left', role: 'connector', connector: { kind: 'RJ45', pins: 0, width: 22 }, optional: true },
  ],
  params: [
    {
      key: 'consumption',
      label: '消費電流（連結ユニット込み）',
      unit: 'A',
      options: [
        { value: 0.12, label: '0.12A（単体）' },
        { value: 0.3, label: '0.3A' },
        { value: 0.6, label: '0.6A' },
        { value: 1.8, label: '1.8A（最大）' },
      ],
      default: 0.3,
    },
  ],
  loadCurrent: { param: 'consumption' },
};

export default def;
