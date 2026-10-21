import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { NC_H, NC_W, ncBody } from '../keyence/kv-nc';
import { KV_NANO_BUS, ioProps, kvDefs, kvUnitBus, text } from '../keyence/kv-parts';

/**
 * KEYENCE 拡張入力ユニット KV-NC32EXE（32点、DC24V、ヨーロピアン端子台＝プッシュイン式）。
 * KV-X シリーズの EtherCAT カプラ KV-EC01（リモート I/O）や KV Nano シリーズ CPU に連結する。
 *
 * 端子（KEYENCE 入出力回路図より）: 上の端子台 16 極（左列 = 奇数ピン、右列 = 偶数ピン）、下の端子台 18 極。
 *   上: 1,3,…,15 = IN 000〜007、2,4,…,16 = IN 100〜107
 *   下: 1,3,…,15 = IN 008〜015、2,4,…,16 = IN 108〜115、17 = COM0、18 = COM1（COM は内部で短絡）
 * 端子ID は信号名（'000'〜'015'、'100'〜'115'）と 'COM0' / 'COM1'。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32ex/io-circuit/（KV-NC32EXE の図を含む）
 */

const XL = 14;
const XR = 24;
const P = 6.6;
const Y_UP = 58;
const Y_LO = Y_UP + 8 * P + 7;
const rowY = (i: number) => +(i < 8 ? Y_UP + i * P : Y_LO + (i - 8) * P).toFixed(2);

interface Row {
  left: string;
  right: string;
  lpin: string;
  rpin: string;
}
const rows: Row[] = [];
for (let i = 0; i < 16; i++) {
  const blk = i < 8 ? '上' : '下';
  const pin = (i % 8) * 2 + 1;
  rows.push({ left: String(i).padStart(3, '0'), right: String(100 + i), lpin: `${blk}端子台 No.${pin}`, rpin: `${blk}端子台 No.${pin + 1}` });
}

const block = (y0: number, n: number) => `<rect x="4" y="${y0 - 4}" width="30" height="${n * P + 1.6}" rx="1" fill="#151617" stroke="#3a3c40" stroke-width="0.6"/>`;
const cell = (y: number) => `
  <rect x="5" y="${y - 2.2}" width="3.4" height="4.4" rx="0.5" fill="url(#kvorange-{{uid}})"/>
  <rect x="29.6" y="${y - 2.2}" width="3.4" height="4.4" rx="0.5" fill="url(#kvorange-{{uid}})"/>
  <circle cx="${XL}" cy="${y}" r="2.4" fill="#050505" stroke="#5c5f63" stroke-width="0.4"/>
  <circle cx="${XR}" cy="${y}" r="2.4" fill="#050505" stroke="#5c5f63" stroke-width="0.4"/>`;

const COM_Y = rowY(16);

const svg = `
  ${kvDefs()}
  ${ncBody('KV-NC32EXE', Array.from({ length: 16 }, (_, i) => String(i)))}
  ${text(XL, Y_UP - 6, 'IN', 2.6, '#d0d3d6')}
  ${block(Y_UP, 8)}
  ${block(Y_LO, 9)}
  ${Array.from({ length: 17 }, (_, i) => cell(rowY(i))).join('')}
  ${rows.map((_, i) => text(38.5, rowY(i) + 1, String(i), 2.4, i < 8 ? '#e6e7e9' : '#ff8a80', 'middle', 'normal')).join('')}
  ${text(38.5, COM_Y + 1, 'C', 2.4, '#e6e7e9', 'middle', 'normal')}
`;

/** 端子（ラベルはリレー番号。左列 = 先頭チャネル、右列 = 次のチャネル） */
const terminals = (p: ParamValues): TerminalDef[] => [
  ...rows.flatMap((r, i): TerminalDef[] => [
    { id: r.left, x: XL, y: rowY(i), side: 'left', ...ioProps({ id: r.left, kind: 'in', index: i, common: 'COM0', suffix: `（${r.lpin}）` }, p) },
    { id: r.right, x: XR, y: rowY(i), side: 'right', ...ioProps({ id: r.right, kind: 'in', index: 16 + i, common: 'COM0', suffix: `（${r.rpin}）` }, p) },
  ]),
  { id: 'COM0', x: XL, y: COM_Y, side: 'left', ...ioProps({ id: 'COM0', kind: 'com-in', label: 'COM0', suffix: '（下端子台 No.17）', note: '入力のコモン（COM1 と内部で短絡）' }, p) },
  { id: 'COM1', x: XR, y: COM_Y, side: 'right', ...ioProps({ id: 'COM1', kind: 'com-in', label: 'COM1', suffix: '（下端子台 No.18）', note: '入力のコモン（COM0 と内部で短絡）' }, p) },
];

const def: DeviceDefinition = {
  type: 'keyence.kv-nc32exe',
  name: 'PLC 拡張入力ユニット',
  model: 'KV-NC32EXE',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE の 32点 DC 入力ユニット（DC24V、3.7mA、ヨーロピアン端子台＝プッシュイン式）。KV-X シリーズの EtherCAT カプラ KV-EC01 に連結するリモート I/O、または KV Nano シリーズの増設として使う。上の端子台が IN 000〜007（左列）と IN 100〜107（右列）、下の端子台が IN 008〜015・IN 108〜115 と COM0・COM1（COM は内部で短絡、双方向）。端子ID はユニット内の信号名（000〜015、100〜115）と COM0 / COM1。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。内部消費電流 20mA（KV-NC32EX と同じと仮定）。',
  labelPrefix: 'IN',
  width: NC_W,
  height: NC_H,
  svg,
  terminals,
  links: [{ from: 'COM0', to: 'COM1' }],
  bus: kvUnitBus(20, { inputs: 32 }, KV_NANO_BUS),
};

export default def;
