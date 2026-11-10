import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF400-SW 3P（WS-V シリーズ 汎用品 NF-S、400A フレーム、表面形・バー端子付）。
 * 外形 W140 × H257 × D103mm（ハンドルを含む 155mm）。定格電流 250・300・350・400A（基準周囲温度 40℃）。
 * 出典: 三菱電機 FA の仕様ページ（NF400-SW の外形寸法 a=140・b=257・c=103・ca=155、表面形 バー端子付）、販売店の仕様表（定格電流 250〜400A）。
 * 極間ピッチ 44mm、主端子ネジ（バー端子のボルト）の位置（上下の端から 9mm）は推定。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nf400-sw.3p',
  name: 'ノーヒューズ遮断器',
  modelName: 'NF400-SW',
  poles: 3,
  pitch: 44,
  widthMm: 140,
  heightMm: 257,
  ratings: [250, 300, 350, 400],
  defaultRating: 400,
  voltageText: 'AC 690V',
  screwR: 11,
  description:
    '三菱電機 WS-V シリーズの汎用の配線用遮断器（MCCB）400A フレーム 3 極（表面形・バー端子付）。' +
    '大容量の動力盤・受電盤の主幹ブレーカーに使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。定格電流 250〜400A。',
  estimated: '極間ピッチ（44mm）と主端子ネジ（バー端子のボルト）の位置（上下の端から 9mm）は推定',
});
