import { IQR_BUS } from '../mitsubishi/melsec';
import { IQR_H, IQR_W, iqrBody, iqrDefs, tb18, tb18Svg } from '../mitsubishi/iqr-parts';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ アナログ-ディジタル変換ユニット R60AD4（アナログ入力 4ch、18 点ネジ端子台）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。上部に RUN・ERR・ALM の LED、その下に 18 点ネジ端子台（M3）。
 *
 * 端子（マニュアル「端子台の信号名」。1 チャネル 4 端子）:
 *   1 CH1 V+ / 2 CH1 V− / 3 CH1 I+ / 4 SLD / 5 CH2 V+ / … / 16 SLD / 17 A.G. / 18 FG
 * 電圧入力は V+ と V− の間、電流入力は V+ と I+ を短絡して V− との間に入れる。シールド線のシールドは SLD へ。
 * A.G. はアナログ GND（相手機器の GND と電位差があるときにつなぐ）。FG は接地。
 *
 * 入出力番号を 16 点占有する（インテリジェント機能ユニット）。外部端子は X/Y ではないので、端子のラベルはチャネル名にする。
 */

const CH = [1, 2, 3, 4];
const ID = (c: number, s: 'V+' | 'V-' | 'I+' | 'SLD') => (s === 'SLD' ? `SLD${c}` : `CH${c}${s}`);

const marks: Record<number, string> = { 17: 'A.G.', 18: 'FG' };
for (const c of CH) {
  const n = (c - 1) * 4;
  marks[n + 1] = 'V+';
  marks[n + 2] = 'V-';
  marks[n + 3] = 'I+';
  marks[n + 4] = 'SLD';
}

const svg = `
  ${iqrDefs()}
  ${iqrBody('R60AD4', [{ t: 'RUN', on: 'g' }, { t: 'ERR' }, { t: 'ALM' }], 44, 'A/D 4ch ±10V 0〜20mA')}
  ${tb18Svg(marks, ['CH1', 'CH2', 'CH3', 'CH4'])}
`;

const terminals: TerminalDef[] = [
  ...CH.flatMap((c): TerminalDef[] => {
    const n = (c - 1) * 4;
    const t = (no: number, id: string, label: string, extra: Partial<TerminalDef>): TerminalDef => ({
      id,
      label,
      x: tb18.x(no),
      y: tb18.y(no),
      side: tb18.side(no),
      role: 'signal',
      optional: true,
      ...extra,
    });
    return [
      t(n + 1, ID(c, 'V+'), `CH${c} V+`, { note: `端子台 ${n + 1}番・電圧入力 +（電流入力のときは I+ と短絡）`, signal: { dir: 'in', kind: 'analog-v', ref: ID(c, 'V-') } }),
      t(n + 2, ID(c, 'V-'), `CH${c} V-`, { note: `端子台 ${n + 2}番・電圧/電流入力 −`, hint: `CH${c} −` }),
      t(n + 3, ID(c, 'I+'), `CH${c} I+`, { note: `端子台 ${n + 3}番・電流入力 +（V+ と短絡して使う）`, signal: { dir: 'in', kind: 'analog-i', ref: ID(c, 'V-') } }),
      t(n + 4, ID(c, 'SLD'), 'SLD', { note: `端子台 ${n + 4}番・CH${c} のシールド線`, hint: 'シールド' }),
    ];
  }),
  { id: 'AG', label: 'A.G.', note: '端子台 17番・アナログ GND', hint: 'アナログGND', x: tb18.x(17), y: tb18.y(17), side: tb18.side(17), role: 'signal', optional: true },
  { id: 'FG', label: 'FG', note: '端子台 18番・接地', x: tb18.x(18), y: tb18.y(18), side: tb18.side(18), role: 'ground', optional: true },
];

const def: DeviceDefinition = {
  type: 'mitsubishi.r60ad4',
  name: 'PLC アナログ入力ユニット',
  model: 'R60AD4',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズのアナログ-ディジタル変換ユニット（アナログ入力 4ch、18 点ネジ端子台 M3）。入力は電圧 DC−10〜10V・電流 DC0〜20mA（チャネルごとにレンジを設定。4〜20mA・1〜5V なども選べる）、変換速度 80µs/ch。入力端子と内部の間はフォトカプラ絶縁、チャネル間は非絶縁。電圧入力は Vn+ と Vn− の間、電流入力は Vn+ と In+ を短絡して Vn− との間に配線する。シールド線を使い、シールドは各チャネルの SLD へ、FG は接地する。相手機器の GND と電位差があるときは A.G. と相手の GND をつなぐ。ベースユニットの入出力スロットに装着し、入出力番号を 16 点占有する（外部端子は X/Y ではない。変換値はバッファメモリで読む）。内部消費電流 DC5V 0.23A（推定）。Q シリーズ Q64AD と同じ端子の並び。',
  estimated: '内部消費電流 DC5V 0.23A（資料で確かめられなかった）',
  labelPrefix: 'AD',
  width: IQR_W,
  height: IQR_H,
  svg,
  terminals,
  bus: { kind: IQR_BUS, load: { '5V': 0.23 }, io: { reserve: 16, format: 'hex' } },
};

export default def;
