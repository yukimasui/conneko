import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820-0.4K-1（FR-E800 シリーズ 標準品、三相 200V 0.4kW、FM 出力タイプ）。
 * 外形 W68 × H128mm（1mm = 2px）。ND 定格出力電流 3.0A、定格入力電流 4.5A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」の仕様表、取扱説明書（接続編）IB-0600865。共通の作りは src/devices/mitsubishi/fr-e800.ts。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820-0.4k',
  series: 'FR-E820',
  capacity: '0.4K',
  kw: 0.4,
  outputCurrent: 3.0,
  inputCurrent: 4.5,
  widthMm: 68,
  estimated: FR_E800_LAYOUT_NOTE,
});
