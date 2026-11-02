import { IQR_BUS } from '../mitsubishi/melsec';
import { IQR_H, IQR_W, iqrBody, iqrDefs, tb18, tb18Svg } from '../mitsubishi/iqr-parts';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ ディジタル-アナログ変換ユニット R60DA4（アナログ出力 4ch、18 点ネジ端子台）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。上部に RUN・ERR・ALM の LED、その下に 18 点ネジ端子台（M3）。
 *
 * 端子（1 チャネル 4 端子。並びは推定）:
 *   1 CH1 V+ / 2 CH1 COM / 3 CH1 I+ / 4 空き / 5 CH2 V+ / … / 16 空き / 17 +24V / 18 24G
 * 電圧出力は V+ と COM、電流出力は I+ と COM の間に負荷（受信側の機器）をつなぐ。
 * アナログ出力の回路用に外部から DC24V（+20% / −15%、0.14A）を +24V・24G に入れる。
 *
 * 入出力番号を 16 点占有する（インテリジェント機能ユニット）。外部端子は X/Y ではない。
 */

const CH = [1, 2, 3, 4];

const marks: Record<number, string> = { 17: '+24V', 18: '24G' };
for (const c of CH) {
  const n = (c - 1) * 4;
  marks[n + 1] = 'V+';
  marks[n + 2] = 'COM';
  marks[n + 3] = 'I+';
}

const svg = `
  ${iqrDefs()}
  ${iqrBody('R60DA4', [{ t: 'RUN', on: 'g' }, { t: 'ERR' }, { t: 'ALM' }], 44, 'D/A 4ch ±10V 0〜20mA')}
  ${tb18Svg(marks, ['CH1', 'CH2', 'CH3', 'CH4'])}
`;

const at = (no: number) => ({ x: tb18.x(no), y: tb18.y(no), side: tb18.side(no) });

const terminals: TerminalDef[] = [
  ...CH.flatMap((c): TerminalDef[] => {
    const n = (c - 1) * 4;
    const com = `CH${c}COM`;
    return [
      { id: `CH${c}V+`, label: `CH${c} V+`, note: `端子台 ${n + 1}番・電圧出力 +（推定の並び）`, ...at(n + 1), role: 'signal', signal: { dir: 'out', kind: 'analog-v', ref: com }, optional: true },
      { id: com, label: `CH${c} COM`, note: `端子台 ${n + 2}番・電圧/電流出力の −（推定の並び）`, hint: `CH${c} COM`, ...at(n + 2), role: 'signal', optional: true },
      { id: `CH${c}I+`, label: `CH${c} I+`, note: `端子台 ${n + 3}番・電流出力 +（推定の並び）`, ...at(n + 3), role: 'signal', signal: { dir: 'out', kind: 'analog-i', ref: com }, optional: true },
    ];
  }),
  {
    id: '+24V',
    label: '+24V',
    note: '端子台 17番・外部供給電源 DC24V（推定の並び）',
    ...at(17),
    role: 'input',
    accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+'] },
  },
  { id: '24G', label: '24G', note: '端子台 18番・外部供給電源 0V（推定の並び）', ...at(18), role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['-'] } },
];

const def: DeviceDefinition = {
  type: 'mitsubishi.r60da4',
  name: 'PLC アナログ出力ユニット',
  model: 'R60DA4',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズのディジタル-アナログ変換ユニット（アナログ出力 4ch、18 点ネジ端子台 M3）。出力は電圧 DC−10〜10V・電流 DC0〜20mA（チャネルごとにレンジを設定）。電圧出力は Vn+ と COM、電流出力は In+ と COM の間に受信側の機器（インバーターの周波数設定入力など）をつなぐ。アナログ出力の回路用に外部供給電源 DC24V（+20% / −15%、0.14A）を +24V・24G に入れる。ベースユニットの入出力スロットに装着し、入出力番号を 16 点占有する（外部端子は X/Y ではない。出力値はバッファメモリに書く）。内部消費電流 DC5V 0.16A。端子台の並び（1 チャネル V+・COM・I+・空きの 4 端子、17・18 が外部供給電源）は推定。',
  estimated: '端子台の並び（1 チャネル 4 端子の順と、外部供給電源の端子位置）',
  labelPrefix: 'DA',
  width: IQR_W,
  height: IQR_H,
  svg,
  terminals,
  loadCurrent: 0.14,
  bus: { kind: IQR_BUS, load: { '5V': 0.16 }, io: { reserve: 16, format: 'hex' } },
};

export default def;
