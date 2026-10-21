import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { KV_NANO_BUS, ioOutputLinks, ioProps, kvDefs, kvUnitBus, plugBlockV, type IoPoint } from '../keyence/kv-parts';
import { NC_H, NC_W, ncBody } from '../keyence/kv-nc';

/**
 * KEYENCE 拡張出力ユニット KV-NC8ER（8点 リレー出力、ヨーロピアン端子台）。
 * KV-X シリーズの EtherCAT カプラ KV-EC01（リモート I/O）や KV Nano シリーズ CPU に連結する。
 * 外形 W22.2 × H90 mm 程度（1mm ≒ 2px）。上部に動作表示 LED、その下に 8極の端子台が上下 2 個。
 *
 * 端子（KEYENCE 入出力回路図より）: 上の端子台 1〜8 = 000, COM0, 001, COM0, 002, COM0, 003, COM0、
 * 下の端子台 1〜8 = 004, COM1, 005, COM1, 006, COM1, 007, COM1。4 つの COM0（COM1）は内部で短絡、COM0 と COM1 は独立。
 * 端子ID は出力が信号番号 '0'〜'7'、COM は隣の出力番号を付けて 'C0'〜'C7'（C0〜C3 が COM0、C4〜C7 が COM1）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc8er/io-circuit/
 */

const IDS: string[] = [];
const PRINT: Record<string, string> = {};
/** 出力 n の接点は端子 n と、その組の COM（C0〜C3 は COM0、C4〜C7 は COM1。代表は C0 / C4） */
const POINTS: IoPoint[] = [];
for (let i = 0; i < 8; i++) {
  const blk = i < 4 ? '上' : '下';
  const pin = (i % 4) * 2 + 1;
  IDS.push(String(i), `C${i}`);
  PRINT[String(i)] = String(i);
  PRINT[`C${i}`] = i < 4 ? 'C0' : 'C1';
  POINTS.push(
    { id: String(i), kind: 'out', index: i, common: i < 4 ? 'C0' : 'C4', suffix: `（${blk}端子台 No.${pin}）` },
    {
      id: `C${i}`,
      kind: 'com-relay',
      label: i < 4 ? 'COM0' : 'COM1',
      suffix: `（${blk}端子台 No.${pin + 1}）`,
      note: i < 4 ? '出力 0〜3 のリレー接点のコモン（COM0 の 4 端子は内部で短絡）' : '出力 4〜7 のリレー接点のコモン（COM1 の 4 端子は内部で短絡）',
    },
  );
}

const top = plugBlockV({ x: 20, y: 40, ids: IDS.slice(0, 8), pitch: 7.4, labels: PRINT, w: 12 });
const bottom = plugBlockV({ x: 20, y: 40 + 8 * 7.4 + 10, ids: IDS.slice(8), pitch: 7.4, labels: PRINT, w: 12 });
const pos = { ...top.pos, ...bottom.pos };

const svg = `
  ${kvDefs()}
  ${ncBody('KV-NC8ER', ['0', '1', '2', '3', '4', '5', '6', '7'])}
  ${top.svg}
  ${bottom.svg}
`;

const terminals = (p: ParamValues): TerminalDef[] =>
  POINTS.map((pt) => ({ id: pt.id, x: pos[pt.id].x, y: pos[pt.id].y, side: pos[pt.id].side, ...ioProps(pt, p, { outSignal: 'contact' }) }));

const def: DeviceDefinition = {
  type: 'keyence.kv-nc8er',
  name: 'PLC 拡張リレー出力ユニット',
  model: 'KV-NC8ER',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE の 8点 リレー出力ユニット（AC250V/DC30V 2A/点、4点 1コモン × 2、ヨーロピアン端子台）。KV-X シリーズの EtherCAT カプラ KV-EC01 に連結するリモート I/O、または KV Nano シリーズの増設として使う。上の端子台が OUT 000〜003 と COM0、下の端子台が OUT 004〜007 と COM1（COM0 と COM1 は独立、各 COM の 4 端子は内部で短絡）。端子ID は出力が 0〜7、隣の COM が C0〜C7。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 信号番号）。内部消費電流 70mA。',
  labelPrefix: 'OUT',
  width: NC_W,
  height: NC_H,
  svg,
  terminals,
  links: [
    ...[1, 2, 3].map((i) => ({ from: 'C0', to: `C${i}` })),
    ...[5, 6, 7].map((i) => ({ from: 'C4', to: `C${i}` })),
    ...ioOutputLinks(POINTS, 2),
  ],
  bus: kvUnitBus(70, { outputs: 8 }, KV_NANO_BUS),
};

export default def;
