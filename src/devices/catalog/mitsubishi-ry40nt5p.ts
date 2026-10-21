import type { AcceptSpec, DeviceDefinition } from '../types';
import { buildR18PointModule } from './mitsubishi-rx40c7';

/**
 * 三菱電機 MELSEC iQ-R シリーズ トランジスタ出力ユニット RY40NT5P（16点シンクタイプ、18点ネジ端子台）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。外形・端子台は RX40C7 と共通（buildR18PointModule）。
 *
 * 端子: 1〜16 = Y00〜Y0F、17 = +V（外部供給電源 DC12/24V の +）、18 = COM（同 0V）。
 * シンク出力のため、出力 ON で負荷電流が出力端子から COM（0V）へ流れる。負荷のもう一端は +24V につなぐ。
 * チェックでは出力を ON（導通）とみなし、Y00〜Y0F と COM を links でつなぐ。
 */

const HEX = '0123456789ABCDEF';

/** 外部供給電源 DC12/24V（許容範囲 10.2〜28.8V） */
const PLUS: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['+'] };
const ZERO: AcceptSpec = { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['-'] };

const def: DeviceDefinition = buildR18PointModule({
  type: 'mitsubishi.ry40nt5p',
  model: 'RY40NT5P',
  name: 'PLC 出力ユニット（トランジスタ・シンク）',
  labelPrefix: 'OUT',
  ioLetter: 'Y',
  rating: '12/24VDC 0.5A',
  accent: 'gray',
  description:
    '三菱電機 MELSEC iQ-R シリーズのトランジスタ出力ユニット（16点、シンクタイプ、18点ネジ端子台 M3）。定格負荷電圧 DC12/24V（10.2〜28.8V）、最大負荷電流 0.5A/点・5A/コモン、過負荷・過熱保護機能付き。16点1コモン。端子17 = +V（外部供給電源 DC12/24V の +、消費 24V 時 4mA TYP.）、端子18 = COM（0V）。出力 ON で負荷電流が出力端子から COM へ流れるので、負荷は +24V と出力端子の間につなぐ（チェックでは出力を ON とみなし Y00〜Y0F と COM を導通扱い）。内部消費電流 DC5V 140mA。端子ID の Y00〜Y0F は信号名で、実際の出力番号はユニットの先頭入出力番号を加えたもの。Q シリーズ QY40P と端子台互換。',
  points: [
    ...Array.from({ length: 16 }, (_, i) => ({ no: i + 1, id: `Y0${HEX[i]}`, mark: HEX[i], optional: true })),
    { no: 17, id: '+V', mark: '+V', role: 'input' as const, accepts: PLUS },
    { no: 18, id: 'COM', mark: 'COM', role: 'input' as const, accepts: ZERO },
  ],
  links: Array.from({ length: 16 }, (_, i) => ({ from: `Y0${HEX[i]}`, to: 'COM' })),
});

export default def;
