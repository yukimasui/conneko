import type { DeviceDefinition } from '../types';
import { buildR18PointModule } from './mitsubishi-rx40c7';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 接点出力ユニット RY10R2（16点リレー出力、18点ネジ端子台）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。外形・端子台は RX40C7 と共通（buildR18PointModule）で、
 * AC 回路を扱えるため信号名の表示板が赤く、LED 表示部に感電注意マークと「24VDC 240VAC 2A」の表示がある。
 *
 * 端子: 1〜16 = Y00〜Y0F、17 = COM、18 = 空き。リレー接点は閉とみなし、各出力と COM を links でつなぐ
 * （出力 ON 時に COM に入れた電源が出力端子から負荷へ出ていく）。
 */

const HEX = '0123456789ABCDEF';

const def: DeviceDefinition = buildR18PointModule({
  type: 'mitsubishi.ry10r2',
  model: 'RY10R2',
  name: 'PLC 出力ユニット（リレー）',
  labelPrefix: 'OUT',
  ioLetter: 'Y',
  rating: '24VDC 240VAC 2A',
  accent: 'red',
  warning: true,
  description:
    '三菱電機 MELSEC iQ-R シリーズの接点出力ユニット（16点リレー出力、18点ネジ端子台 M3）。定格開閉電圧・電流 DC24V 2A / AC240V 2A（抵抗負荷）/点、8A/コモン、最小開閉負荷 DC5V 1mA。16点1コモン（COM = 端子17）、端子18 は空き。COM に負荷電源（AC100/200V または DC24V）を入れ、出力 ON で各出力端子から負荷へ電源が出る（チェックでは接点を閉とみなし、Y00〜Y0F と COM を導通扱い）。サージ吸収素子・ヒューズなし。内部消費電流 DC5V 450mA。端子ID の Y00〜Y0F は信号名で、実際の出力番号はユニットの先頭入出力番号を加えたもの。Q シリーズ QY10 と端子台互換。',
  points: [
    ...Array.from({ length: 16 }, (_, i) => ({ no: i + 1, id: `Y0${HEX[i]}`, mark: HEX[i], optional: true })),
    { no: 17, id: 'COM', mark: 'COM', optional: true },
    { no: 18, id: 'NC', mark: 'NC', vacant: true },
  ],
  links: Array.from({ length: 16 }, (_, i) => ({ from: `Y0${HEX[i]}`, to: 'COM' })),
});

export default def;
