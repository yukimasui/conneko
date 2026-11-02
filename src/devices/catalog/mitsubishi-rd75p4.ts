import { IQR_BUS } from '../mitsubishi/melsec';
import { IQR_H, IQR_W, fcn40Svg, fcnPin, iqrBody, iqrDefs } from '../mitsubishi/iqr-parts';
import type { AcceptSpec, DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 位置決めユニット RD75P4（4 軸、パルス列出力・オープンコレクタ）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。上部に RUN・ERR と AX1〜AX4 の LED、
 * その下に 40 ピンコネクタが 2 個（左 CN1 = 軸 1・軸 2、右 CN2 = 軸 3・軸 4。相手側 A6CON1・2・4）。
 *
 * 1 個のコネクタの A 列が奇数軸（軸 1・3）、B 列が偶数軸（軸 2・4）。行（三菱のピン番号 01〜20）は Q シリーズ QD75P と同じ並びとし、
 * 12 RDY COM / 13 CLEAR / 14 CLEAR COM / 15 PULSE F / 16 PULSE COM / 17 PULSE R / 18 PULSE COM は QD75P のマニュアルで確かめた。
 * 01〜11（外部入力・零点信号・READY）の並びと 19・20 は推定。手動パルサの入力は描かない。
 *
 * パルス列出力（PULSE F = 正転・PULSE R = 逆転、またはパルス・方向）はオープンコレクタ（シンク）で、サーボアンプの
 * パルス入力（オープンコレクタ用）へつなぐ。入出力番号を 32 点占有する。
 */

const IN_COM: AcceptSpec = { system: 'DC', minVoltage: 4.75, maxVoltage: 26.4, conductors: ['+', '-'] };
const OUT_COM: AcceptSpec = { system: 'DC', minVoltage: 4.75, maxVoltage: 26.4, conductors: ['-'] };

const pad2 = (n: number) => String(n).padStart(2, '0');

const pins: PinDef[] = [];
const links: InternalLink[] = [];

for (const [cn, axes] of [
  ['CN1', [1, 2]],
  ['CN2', [3, 4]],
] as const) {
  axes.forEach((ax, i) => {
    const row = i === 0 ? 'A' : 'B';
    const name = (n: number) => `${row}${pad2(n)}`;
    const id = (n: number) => fcnPin(cn, name(n));
    const lbl = (sig: string, n: number) => `AX${ax}-${sig} (${cn === 'CN1' ? 1 : 2}${name(n)})`;
    const input = (n: number, sig: string, note: string, common: number): PinDef => ({
      id: id(n),
      label: lbl(sig, n),
      note,
      role: 'signal',
      signal: { dir: 'in', kind: 'dc', common: id(common) },
      optional: true,
    });
    pins.push(
      input(1, 'FLS', '上限リミット信号（推定の位置）', 6),
      input(2, 'RLS', '下限リミット信号（推定の位置）', 6),
      input(3, 'DOG', '近点ドグ信号（推定の位置）', 6),
      input(4, 'STOP', '停止信号（推定の位置）', 6),
      input(5, 'CHG', '外部指令信号（推定の位置）', 6),
      { id: id(6), label: lbl('COM', 6), note: '外部入力（FLS・RLS・DOG・STOP・CHG）のコモン（+/− 共用。推定の位置）', role: 'input', accepts: IN_COM, optional: true },
      { id: id(7), label: lbl('COM', 7), note: '外部入力のコモン（06 と内部で共通。推定の位置）', role: 'input', accepts: IN_COM, optional: true },
      { id: id(8), label: lbl('PG0 5V', 8), note: '零点信号（DC5V 用のピン。推定の位置）', role: 'signal', optional: true },
      input(9, 'PG0', '零点信号（DC24V 用のピン。サーボアンプのエンコーダー Z 相出力。推定の位置）', 10),
      { id: id(10), label: lbl('PG0 COM', 10), note: '零点信号のコモン（推定の位置）', role: 'input', accepts: IN_COM, optional: true },
      input(11, 'READY', 'ドライブユニットのレディ信号（推定の位置）', 12),
      { id: id(12), label: lbl('RDY COM', 12), note: 'レディ信号のコモン', role: 'input', accepts: IN_COM, optional: true },
      { id: id(13), label: lbl('CLEAR', 13), note: '偏差カウンタクリア出力（オープンコレクタ）', role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true },
      { id: id(14), label: lbl('CLEAR COM', 14), note: '偏差カウンタクリア出力のコモン（0V）', role: 'input', accepts: OUT_COM, optional: true },
      { id: id(15), label: lbl('PULSE F', 15), note: 'パルス出力 F（正転パルス / パルス。オープンコレクタ）', role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true },
      { id: id(16), label: lbl('PULSE COM', 16), note: 'パルス出力のコモン（0V）', role: 'input', accepts: OUT_COM, optional: true },
      { id: id(17), label: lbl('PULSE R', 17), note: 'パルス出力 R（逆転パルス / 方向。オープンコレクタ）', role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true },
      { id: id(18), label: lbl('PULSE COM', 18), note: 'パルス出力のコモン（0V。16 と内部で共通）', role: 'input', accepts: OUT_COM, optional: true },
      { id: id(19), label: `空き (${cn === 'CN1' ? 1 : 2}${name(19)})`, role: 'signal', optional: true },
      { id: id(20), label: `空き (${cn === 'CN1' ? 1 : 2}${name(20)})`, role: 'signal', optional: true },
    );
    links.push(
      { from: id(6), to: id(7) },
      { from: id(16), to: id(18) },
      { from: id(15), to: id(16), switch: 'output', ratedCurrent: 0.05 },
      { from: id(17), to: id(16), switch: 'output', ratedCurrent: 0.05 },
      { from: id(13), to: id(14), switch: 'output', ratedCurrent: 0.1 },
    );
  });
}
pins.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

const CN1 = { x: 15.5, y: 140 };
const CN2 = { x: 40.5, y: 140 };

const svg = `
  ${iqrDefs()}
  ${iqrBody('RD75P4', [{ t: 'RUN', on: 'g' }, { t: 'ERR' }, { t: 'AX1', on: 'g' }, { t: 'AX2' }, { t: 'AX3' }, { t: 'AX4' }], 42, '4軸 パルス列 オープンコレクタ')}
  ${fcn40Svg(CN1.x, CN1.y, 'AX1・AX2', true)}
  ${fcn40Svg(CN2.x, CN2.y, 'AX3・AX4', true)}
`;

const connector = (id: 'CN1' | 'CN2', at: { x: number; y: number }, axes: string): TerminalDef => ({
  id,
  label: `${id} (40ピン FCN、${axes})`,
  x: at.x,
  y: at.y,
  side: 'bottom',
  role: 'connector',
  connector: { kind: 'FCN40', pins: 40, width: 15, mates: ['MIL40'], facing: 'front', length: 108 },
  optional: true,
});

const def: DeviceDefinition = {
  type: 'mitsubishi.rd75p4',
  name: 'PLC 位置決めユニット',
  model: 'RD75P4',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズの位置決めユニット（4 軸、パルス列出力・オープンコレクタ、最大 200kpulse/s）。サーボアンプ（MR-J5-A など）・ステッピングモータードライバーのパルス入力へ PULSE F / PULSE R をつなぎ、偏差カウンタクリア（CLEAR）、ドライブユニットのレディ（READY）、零点信号（PG0）、上下限リミット（FLS・RLS）・近点ドグ（DOG）・停止（STOP）・外部指令（CHG）を配線する。40 ピンコネクタ 2 個（CN1 = 軸 1・2、CN2 = 軸 3・4、外部配線用コネクタ A6CON1・A6CON2・A6CON4 は別売）。ベースユニットの入出力スロットに装着し、入出力番号を 32 点占有する。ピン配置のうち 01〜11 番（外部入力・零点信号・READY）の並びと内部消費電流 DC5V 0.6A は推定（12〜18 番のパルス出力・CLEAR・RDY COM は Q シリーズ QD75P と同じ並び）。',
  estimated: 'コネクタの 01〜11 番（外部入力・零点信号・READY）の並び、内部消費電流 DC5V 0.6A',
  labelPrefix: 'POS',
  width: IQR_W,
  height: IQR_H,
  svg,
  terminals: [connector('CN1', CN1, '軸 1・2'), connector('CN2', CN2, '軸 3・4')],
  pins,
  links,
  bus: { kind: IQR_BUS, load: { '5V': 0.6 }, io: { reserve: 32, format: 'hex' } },
};

export default def;
