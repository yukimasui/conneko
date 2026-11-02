import { IQR_BUS } from '../mitsubishi/melsec';
import { IQR_H, IQR_W, fcn40Svg, fcnPin, iqrBody, iqrDefs, text } from '../mitsubishi/iqr-parts';
import type { AcceptSpec, DeviceDefinition, InternalLink, PinDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 高速カウンタユニット RD62P2（2ch、DC 入力・トランジスタ出力（シンク）、40 ピンコネクタ）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。上部に RUN・ERR と各チャネルの ΦA・ΦB・DEC・FUNC・EQU の LED、
 * その下に 40 ピンコネクタ（FCN 系、相手側 A6CON1〜4）。
 *
 * ピン配置は Q シリーズ QD62 と互換（CH1 が B 列、CH2 が A 列）として、QD62 の並びから推定した:
 *   20 ΦA 24V / 19 ΦA 12V / 18 ΦA 5V / 17 ABCOM / 16 ΦB 24V / 15 ΦB 12V / 14 ΦB 5V /
 *   13 プリセット 24V / 12 12V / 11 5V / 10 CTRLCOM / 09 ファンクションスタート 24V / 08 12V / 07 5V /
 *   06 EQU1 / 05 EQU2 / 04・03 空き / 02 12/24V（出力の外部電源）/ 01 0V
 * ピンID は RX41C4 と同じく、変換ケーブルで MIL 40 極と同じ番号になる千鳥番号（三菱の B_k → CN1#(41−2k)、A_k → CN1#(42−2k)）。
 *
 * パルス入力は 24V・12V・5V の 3 ピンから入力電圧に合うものを使う。I/O 表に出す入力点（signal）は 24V のピンだけに付けた。
 * 入出力番号を 16 点占有する（インテリジェント機能ユニット）。
 */

const COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 4.5, maxVoltage: 26.4, conductors: ['+', '-'] };
const OUT_V: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 30, conductors: ['+'] };
const OUT_0V: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 30, conductors: ['-'] };

/** 1 チャネル分のピン（行は三菱のピン番号の 01〜20） */
const ROWS: { n: number; key: string; text: string; com?: 'AB' | 'CTRL'; volt?: string; out?: boolean }[] = [
  { n: 20, key: 'A24', text: 'ΦA 24V', com: 'AB', volt: '24' },
  { n: 19, key: 'A12', text: 'ΦA 12V', com: 'AB', volt: '12' },
  { n: 18, key: 'A5', text: 'ΦA 5V', com: 'AB', volt: '5' },
  { n: 17, key: 'ABCOM', text: 'ABCOM' },
  { n: 16, key: 'B24', text: 'ΦB 24V', com: 'AB', volt: '24' },
  { n: 15, key: 'B12', text: 'ΦB 12V', com: 'AB', volt: '12' },
  { n: 14, key: 'B5', text: 'ΦB 5V', com: 'AB', volt: '5' },
  { n: 13, key: 'PRST24', text: 'PRST 24V', com: 'CTRL', volt: '24' },
  { n: 12, key: 'PRST12', text: 'PRST 12V', com: 'CTRL', volt: '12' },
  { n: 11, key: 'PRST5', text: 'PRST 5V', com: 'CTRL', volt: '5' },
  { n: 10, key: 'CTRLCOM', text: 'CTRLCOM' },
  { n: 9, key: 'FS24', text: 'F.START 24V', com: 'CTRL', volt: '24' },
  { n: 8, key: 'FS12', text: 'F.START 12V', com: 'CTRL', volt: '12' },
  { n: 7, key: 'FS5', text: 'F.START 5V', com: 'CTRL', volt: '5' },
  { n: 6, key: 'EQU1', text: 'EQU1', out: true },
  { n: 5, key: 'EQU2', text: 'EQU2', out: true },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

const pins: PinDef[] = [];
const links: InternalLink[] = [];
for (const [ch, row] of [
  [1, 'B'],
  [2, 'A'],
] as const) {
  const pid = (n: number) => fcnPin('CN1', `${row}${pad2(n)}`);
  for (const r of ROWS) {
    const name = `${row}${pad2(r.n)}`;
    const id = pid(r.n);
    const label = `CH${ch}-${r.text.replace(/ (24|12|5)V$/, '')}${r.volt ? ` ${r.volt}V` : ''} (${name})`;
    if (r.key === 'ABCOM' || r.key === 'CTRLCOM') {
      pins.push({ id, label: `CH${ch}-${r.text} (${name})`, note: r.key === 'ABCOM' ? 'パルス入力 ΦA・ΦB のコモン（+/− 共用）' : 'プリセット・ファンクションスタート入力のコモン（+/− 共用）', role: 'input', accepts: COM_ACCEPTS, optional: true });
    } else if (r.out) {
      pins.push({ id, label: `CH${ch}-${r.text} (${name})`, note: '一致出力（トランジスタ・シンク）', role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
      links.push({ from: id, to: fcnPin('CN1', 'B01'), switch: 'output', ratedCurrent: 0.5 });
    } else {
      const common = pid(r.com === 'AB' ? 17 : 10);
      pins.push({
        id,
        label,
        note: `${r.com === 'AB' ? 'パルス入力' : r.key.startsWith('PRST') ? 'プリセット入力' : 'ファンクションスタート入力'}（DC${r.volt}V 用のピン）`,
        role: 'signal',
        // I/O 表・展開図に出す入力点は DC24V のピンだけ（同じ入力の 12V・5V 用のピンは電圧違いの入口）
        ...(r.volt === '24' ? { signal: { dir: 'in' as const, kind: 'dc' as const, common } } : {}),
        optional: true,
      });
    }
  }
  for (const n of [4, 3]) pins.push({ id: pid(n), label: `空き (${row}${pad2(n)})`, role: 'signal', optional: true });
}
pins.push(
  { id: fcnPin('CN1', 'B02'), label: '12/24V (B02)', note: '一致出力の外部供給電源 +（A02 と内部で共通）', role: 'input', accepts: OUT_V, optional: true },
  { id: fcnPin('CN1', 'A02'), label: '12/24V (A02)', note: '一致出力の外部供給電源 +（B02 と内部で共通）', role: 'input', accepts: OUT_V, optional: true },
  { id: fcnPin('CN1', 'B01'), label: '0V (B01)', note: '一致出力のコモン（外部供給電源 0V。A01 と内部で共通）', role: 'input', accepts: OUT_0V, optional: true },
  { id: fcnPin('CN1', 'A01'), label: '0V (A01)', note: '一致出力のコモン（外部供給電源 0V。B01 と内部で共通）', role: 'input', accepts: OUT_0V, optional: true },
);
links.push({ from: fcnPin('CN1', 'B02'), to: fcnPin('CN1', 'A02') }, { from: fcnPin('CN1', 'B01'), to: fcnPin('CN1', 'A01') });
pins.sort((a, b) => Number(a.id.split('#')[1]) - Number(b.id.split('#')[1]));

const CN = { x: 32, y: 140 };

const svg = `
  ${iqrDefs()}
  ${iqrBody('RD62P2', [{ t: 'RUN', on: 'g' }, { t: 'ERR' }], 50)}
  ${['CH1', 'CH2']
    .map(
      (c, i) => `${text(4 + i * 26, 25.5, c, 2.8, '#f2f3f4', 'start')}
  ${['ΦA', 'ΦB', 'DEC', 'FUNC', 'EQU']
    .map((l, j) => `<rect x="${4 + i * 26 + (j % 3) * 8}" y="${28 + Math.floor(j / 3) * 9}" width="3.6" height="2.4" rx="0.4" fill="#2a2b2e"/>${text(5.8 + i * 26 + (j % 3) * 8, 34 + Math.floor(j / 3) * 9, l, 2, '#d5d7da')}`)
    .join('')}`,
    )
    .join('')}
  ${text(3.5, 50, 'DC IN 200kpps / TR OUT', 2.4, '#d5d7da', 'start')}
  ${fcn40Svg(CN.x, CN.y, 'CN1')}
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.rd62p2',
  name: 'PLC 高速カウンタユニット',
  model: 'RD62P2',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズの高速カウンタユニット（2ch、最高計数速度 200kpps、DC 入力、一致出力はトランジスタ・シンク、40 ピンコネクタ）。エンコーダーのパルス（A 相・B 相）を ΦA・ΦB に入れ、入力電圧（DC5V・12V・24V）に合うピンを使う。プリセット入力・ファンクションスタート入力、一致出力 EQU1・EQU2（外部供給電源 DC12/24V を 12/24V・0V に入れる）を持つ。外部配線用コネクタ A6CON1〜A6CON4（別売）。ベースユニットの入出力スロットに装着し、入出力番号を 16 点占有する。内部消費電流 DC5V 0.11A。ピン配置（QD62 互換の並び）・一致出力の定格（0.5A/点）は推定。',
  estimated: 'ピン配置（Q シリーズ QD62 の並びから推定）と一致出力の定格（0.5A/点）',
  labelPrefix: 'CNT',
  width: IQR_W,
  height: IQR_H,
  svg,
  terminals: [
    {
      id: 'CN1',
      label: 'CN1 (40ピン FCN)',
      x: CN.x,
      y: CN.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: 'FCN40', pins: 40, width: 17, mates: ['MIL40'], facing: 'front', length: 108 },
      optional: true,
    },
  ],
  pins,
  links,
  bus: { kind: IQR_BUS, load: { '5V': 0.11 }, io: { reserve: 16, format: 'hex' } },
};

export default def;
