import type { DeviceDefinition } from '../types';
import { buildFx5Ext16 } from './mitsubishi-fx5-16ex-es';

/**
 * 三菱電機 MELSEC iQ-F シリーズ 出力ユニット FX5-16EYR/ES（増設ケーブルタイプ、リレー出力 16点、端子台 M3）。
 * 外形 W40 × H90 × D83 mm（1mm ≒ 2px）。外形・端子の並びは FX5-16EX/ES と共通（buildFx5Ext16）。
 *
 * 端子配列（マニュアルの図、上から）:
 *   左列: COM0 1 3 5 6 7 Y0 1 3 5 7
 *   右列: Y0 2 4（4 段分なし）2 4 6 COM1
 * COM0 = 下位 Y0〜Y7、COM1 = 上位 Y10〜Y17（8点1コモン）。リレー接点は閉とみなし、各出力とコモンを links でつなぐ。
 */

const def: DeviceDefinition = buildFx5Ext16({
  type: 'mitsubishi.fx5-16eyr-es',
  model: 'FX5-16EYR/ES',
  name: 'PLC 増設出力ユニット（リレー）',
  labelPrefix: 'OUT',
  kind: 'relay',
  description:
    '三菱電機 MELSEC iQ-F シリーズの増設出力ユニット FX5-16EYR/ES（増設ケーブルタイプ、リレー出力 16点、端子台 M3）。AC240V 以下 / DC30V 以下、2A/点、8点1コモン 8A 以下（COM0 = 下位 Y0〜Y7、COM1 = 上位 Y10〜Y17）、最小負荷 DC5V 2mA。COM に負荷電源を入れ、出力 ON で出力端子から負荷へ電源が出る（チェックでは接点を閉とみなし各出力とコモンを導通扱い）。内部電源（DC5V 100mA・DC24V 125mA）は増設ケーブル経由で CPU ユニットから供給される。端子ID は下位 Y0〜Y7・上位 Y10〜Y17 のユニット内の相対番号で、実際の出力番号は割付けの先頭番号を加えたもの（FX5U-32M の右隣 1 台目なら Y20〜Y37）。',
});

export default def;
