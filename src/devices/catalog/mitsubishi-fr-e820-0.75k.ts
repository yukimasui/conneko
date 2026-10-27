import { buildFrE800, FR_E800_LAYOUT_NOTE } from '../mitsubishi/fr-e800';

/**
 * 三菱電機 インバーター FR-E820-0.75K-1（FR-E800 シリーズ 標準品、三相 200V 0.75kW、FM 出力タイプ）。
 * 外形 W68 × H128 × D132.5mm（1mm = 2px。取扱説明書（接続編）IB-0600865ENG 4.4.1）。
 *
 * 主回路端子（取扱説明書 2.5.2 の FR-E820-0.1K〜0.75K の端子配列）: 下段に R/L1・S/L2・T/L3・U・V・W、
 * その上の段に N/-・P1・P/+・PR（P1-P/+ 間は出荷時に短絡片）、下に接地端子。
 * 制御回路端子（2.6.5、ばね式）: S1 S2 PC RUN FU SE / MRS RES SD STF STR / RL RM RH SD / SO SOC FM SD / 10 2 5 4 / A B C。
 * 共通の作りは src/devices/mitsubishi/fr-e800.ts（ほかの容量・単相品と共通）。
 */
export default buildFrE800({
  type: 'mitsubishi.fr-e820-0.75k',
  series: 'FR-E820',
  capacity: '0.75K',
  kw: 0.75,
  outputCurrent: 5,
  inputCurrent: 7,
  widthMm: 68,
  estimated: FR_E800_LAYOUT_NOTE,
});
