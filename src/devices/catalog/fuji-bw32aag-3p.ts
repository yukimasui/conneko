import { buildGTwin } from '../fuji/g-twin';

/**
 * 富士電機 オートブレーカ（配線用遮断器）BW32AAG-3P（G-TWIN シリーズ 一般配線用 32AF、3 極、表面形）。
 * 出典: 富士電機の新旧比較表（外形 75 × 100 × 84mm）、販売店の仕様表（端子ねじ M5×14、定格電流 3〜32A）。
 */
export default buildGTwin({
  type: 'fuji.bw32aag.3p',
  modelName: 'BW32AAG-3P',
  ratings: [3, 5, 10, 15, 20, 30, 32],
  defaultRating: 20,
  description:
    '富士電機のオートブレーカ（配線用遮断器）BW32AAG-3P（G-TWIN シリーズ 32AF・3 極 3 素子）。盤の主幹・分岐の過電流・短絡保護に使う。上が電源側（1・3・5）、下が負荷側（2・4・6）。',
  estimated: '極間ピッチ 25mm と主端子ネジの位置（上下の端から 9mm）は推定。',
});
