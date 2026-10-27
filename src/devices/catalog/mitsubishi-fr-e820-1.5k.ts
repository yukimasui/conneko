import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820-1.5K-1（FR-E800 シリーズ 標準品、三相 200V 1.5kW、FM 出力タイプ）。
 * 外形 W108 × H128 × D135.5mm（1mm = 2px）。ND 定格出力電流 8.0A、定格入力電流 11A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」の仕様表、取扱説明書（接続編）IB-0600865。共通の作りは src/devices/mitsubishi/fr-e800.ts。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820-1.5k',
  series: 'FR-E820',
  capacity: '1.5K',
  kw: 1.5,
  outputCurrent: 8.0,
  inputCurrent: 11,
  widthMm: 108,
  estimated: FR_E800_LAYOUT_NOTE + '。主回路端子の並び（上段 N/-・P1・P/+・PR、下段 R/L1・S/L2・T/L3・U・V・W）は 0.75K 以下と同じとみなした推定',
});
