import type { DeviceDefinition } from '../types';
import { buildFx5u32m } from './mitsubishi-fx5u-32mr-es';

/**
 * 三菱電機 MELSEC iQ-F シリーズ CPU ユニット FX5U-32MT/ES（AC 電源、DC 入力 16点、トランジスタ出力 16点 シンク）。
 * 外形 W150 × H90 × D83 mm（1mm ≒ 2px）。外形・端子配列は FX5U-32MR/ES と共通（buildFx5u32m）。
 * 出力はシンクタイプのため、COM0〜COM3 に負荷電源（DC5〜30V）の 0V（−）をつなぎ、
 * 負荷は +V と出力端子の間に入れる。ソースタイプ（FX5U-32MT/ESS）はコモンが +V0〜+V3 になる別機種。
 */

const def: DeviceDefinition = buildFx5u32m({
  type: 'mitsubishi.fx5u-32mt-es',
  model: 'FX5U-32MT/ES',
  output: 'transistor',
  description:
    '三菱電機 MELSEC iQ-F シリーズの CPU ユニット FX5U-32MT/ES（AC 電源、DC24V 入力 16点、トランジスタ出力 16点 シンク、端子台 M3）。電源 AC100〜240V（85〜264V）50/60Hz、消費電力 30W。DC24V サービス電源（24V / 0V 端子）400mA（入力回路に使う場合）。入力 X0〜X17: DC24V 5.3mA、シンク/ソース共用（S/S を 24V につなぐとシンク入力、0V につなぐとソース入力）。出力 Y0〜Y17: トランジスタ（シンク）DC5〜30V 0.5A/点、4点1コモン 0.8A 以下（COM0 = Y0〜Y3、COM1 = Y4〜Y7、COM2 = Y10〜Y13、COM3 = Y14〜Y17。各 COM に負荷電源の 0V をつなぐ）。Y0〜Y3 は高速パルス出力にも使える。増設 I/O は右側に接続し（最大 16 台）、入出力番号は X20・Y20 から 8 進で続く。内部電源 DC5V 900mA・DC24V 400mA を増設ユニットへ供給する。⏚ は機能接地。Ethernet ポート（CC-Link IE フィールドネットワーク Basic 対応）付き。',
});

export default def;
