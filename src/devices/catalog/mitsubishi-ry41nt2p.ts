import type { AcceptSpec, DeviceDefinition } from '../types';
import { buildR40PinModule, r32SignalPins } from './mitsubishi-rx41c4';

/**
 * 三菱電機 MELSEC iQ-R シリーズ トランジスタ出力ユニット RY41NT2P（32点シンクタイプ、40ピンコネクタ）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。外形・コネクタは RX41C4 と共通（buildR40PinModule）。
 *
 * ピン配置（三菱のピン番号）: B20〜B05 = Y00〜Y0F、A20〜A05 = Y10〜Y1F、
 * B02・B01 = 12/24VDC（外部供給電源の +）、A02・A01 = COM（0V）、A03・A04・B03・B04 = 空き。
 * ピンID は RX41C4 と同じく MIL 標準の千鳥番号に合わせる（B_k → CN1#(41−2k)、A_k → CN1#(42−2k)）。
 * シンク出力のため出力 ON で負荷電流が出力ピンから COM（0V）へ流れる（各出力ピンから COM への switch: 'output'）。
 */

const PLUS: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['+'] };
const ZERO: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['-'] };

const signals = r32SignalPins('Y', { dir: 'out', kind: 'npn' });

const def: DeviceDefinition = buildR40PinModule({
  type: 'mitsubishi.ry41nt2p',
  model: 'RY41NT2P',
  name: 'PLC 出力ユニット（トランジスタ・シンク）',
  labelPrefix: 'OUT',
  ioLetter: 'Y',
  rating: '12/24VDC 0.2A',
  load5V: 0.18,
  outputs: { common: 'A01', ratedCurrent: 0.2, commonLimit: 2 },
  description:
    '三菱電機 MELSEC iQ-R シリーズのトランジスタ出力ユニット（32点、シンクタイプ、40ピンコネクタ）。定格負荷電圧 DC12/24V（10.2〜28.8V）、最大負荷電流 0.2A/点・2A/コモン、過負荷・過熱保護機能付き。32点1コモン。ピン配置（三菱のピン番号）: B20〜B05 = Y00〜Y0F、A20〜A05 = Y10〜Y1F、B02・B01 = 12/24VDC（外部供給電源の +、内部で共通）、A02・A01 = COM（0V、内部で共通）、A03・A04・B03・B04 = 空き。出力 ON で負荷電流が出力ピンから COM へ流れるので、負荷は +24V と出力の間につなぐ。外部配線用コネクタ A6CON1〜A6CON4（FCN 系 40ピン、別売）。ピンID は FCN40P−MIL40P 変換ケーブルで MIL 側と同じ番号になる千鳥番号（B_k → CN1#(41−2k)、A_k → CN1#(42−2k)）。信号名 Y00〜Y1F に先頭入出力番号を加えたものが実際の出力番号（ベースユニットに装着するとピンのラベルに反映される）。MIL 40極の変換端子台へは FCN40P−MIL40P 変換ケーブルでつなぐ。内部消費電流 DC5V 180mA。Q シリーズ QY41P とピン配置互換。',
  pins: [
    ...signals,
    { row: 'B', n: 2, signal: '12/24VDC', role: 'input', accepts: PLUS },
    { row: 'B', n: 1, signal: '12/24VDC', role: 'input', accepts: PLUS },
    { row: 'A', n: 2, signal: 'COM (0V)', role: 'input', accepts: ZERO },
    { row: 'A', n: 1, signal: 'COM (0V)', role: 'input', accepts: ZERO },
    { row: 'B', n: 4, signal: '空き' },
    { row: 'B', n: 3, signal: '空き' },
    { row: 'A', n: 4, signal: '空き' },
    { row: 'A', n: 3, signal: '空き' },
  ],
  links: [
    ['B01', 'B02'],
    ['A01', 'A02'],
  ],
});

export default def;
