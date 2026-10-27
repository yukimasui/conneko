import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820-3.7K-1（FR-E800 シリーズ 標準品、三相 200V 3.7kW、FM 出力タイプ）。
 * 外形 W140 × H128 × D142.5mm（1mm = 2px）。ND 定格出力電流 17.5A、定格入力電流 23A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」の仕様表、取扱説明書（接続編）IB-0600865。共通の作りは src/devices/mitsubishi/fr-e800.ts。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820-3.7k',
  series: 'FR-E820',
  capacity: '3.7K',
  kw: 3.7,
  outputCurrent: 17.5,
  inputCurrent: 23,
  widthMm: 140,
  estimated: FR_E800_LAYOUT_NOTE + '。主回路端子の並び（上段 N/-・P1・P/+・PR、下段 R/L1・S/L2・T/L3・U・V・W）は 0.75K 以下と同じとみなした推定',
});
