import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820S-0.75K-1（FR-E800 シリーズ 標準品、単相 200V 0.75kW、FM 出力タイプ）。
 * 外形 W108 × H128 × D161（推定。1.5K と同じとみなした）mm（1mm = 2px）。ND 定格出力電流 5.0A、定格入力電流 11.2A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」の仕様表、取扱説明書（接続編）IB-0600865。共通の作りは src/devices/mitsubishi/fr-e800.ts。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820s-0.75k',
  series: 'FR-E820S',
  capacity: '0.75K',
  kw: 0.75,
  outputCurrent: 5.0,
  inputCurrent: 11.2,
  widthMm: 108,
  estimated: FR_E800_LAYOUT_NOTE + '。単相品の主回路端子の並び（三相品の T/L3 を除いた並び）と外形の奥行は推定',
  extra: '電源は単相 AC200〜240V（R/L1・S/L2）。出力は三相 200V（U・V・W）。',
});
