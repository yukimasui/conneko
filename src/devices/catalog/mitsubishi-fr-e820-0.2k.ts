import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820-0.2K-1（FR-E800 シリーズ 標準品、三相 200V 0.2kW、FM 出力タイプ）。
 * 外形 W68 × H128 × D80.5mm（1mm = 2px）。ND 定格出力電流 1.5A、定格入力電流 2.3A（ND・DC リアクトルなし）。
 * 0.2K はブレーキ抵抗器を接続できない（取扱説明書（接続編）の注記）。
 * 出典: 三菱電機 FA サイト「仕様から探す」の仕様表、取扱説明書（接続編）IB-0600865。共通の作りは src/devices/mitsubishi/fr-e800.ts。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820-0.2k',
  series: 'FR-E820',
  capacity: '0.2K',
  kw: 0.2,
  outputCurrent: 1.5,
  inputCurrent: 2.3,
  widthMm: 68,
  noBrakeResistor: true,
  estimated: FR_E800_LAYOUT_NOTE,
});
