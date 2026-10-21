import type { DeviceDefinition } from '../types';
import { buildFx5Ext16 } from './mitsubishi-fx5-16ex-es';

/**
 * 三菱電機 MELSEC iQ-F シリーズ 出力ユニット FX5-16EYT/ES（増設ケーブルタイプ、トランジスタ出力 16点 シンク、端子台 M3）。
 * 外形 W40 × H90 × D83 mm（1mm ≒ 2px）。外形・端子の並びは FX5-16EYR/ES と同じ（buildFx5Ext16）。
 * シンク出力のため COM0・COM1 に負荷電源（DC5〜30V）の 0V（−）をつなぎ、負荷は +V と出力端子の間に入れる。
 * チェックでは出力を ON とみなし、各出力とコモンを links でつなぐ。
 */

const def: DeviceDefinition = buildFx5Ext16({
  type: 'mitsubishi.fx5-16eyt-es',
  model: 'FX5-16EYT/ES',
  name: 'PLC 増設出力ユニット（トランジスタ・シンク）',
  labelPrefix: 'OUT',
  kind: 'transistor',
  description:
    '三菱電機 MELSEC iQ-F シリーズの増設出力ユニット FX5-16EYT/ES（増設ケーブルタイプ、トランジスタ出力 16点 シンク、端子台 M3）。DC5〜30V、0.5A/点、8点1コモン 1.6A 以下（COM0 = 下位 Y0〜Y7、COM1 = 上位 Y10〜Y17。各 COM に負荷電源の 0V をつなぐ）。出力 ON で負荷電流が出力端子から COM へ流れる（チェックでは出力を ON とみなし各出力とコモンを導通扱い）。内部電源（DC5V 100mA・DC24V 125mA）は増設ケーブル経由で CPU ユニットから供給される。端子ID は下位 Y0〜Y7・上位 Y10〜Y17 のユニット内の相対番号で、実際の出力番号は割付けの先頭番号を加えたもの（FX5U-32M の右隣 1 台目なら Y20〜Y37）。ソースタイプは FX5-16EYT/ESS（コモンが +V0・+V1）。',
});

export default def;
