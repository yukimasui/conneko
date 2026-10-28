import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF250-SV 3P（WS-V シリーズ 汎用品 NF-S）。
 * 外形 W105 × H165 mm（1mm = 2px。販売店の仕様表の寸法）。定格電流 125〜225A（225A フレーム）・250A（250A フレーム）。
 * 極間ピッチ 35mm、主端子ネジの位置（上下の端から 9mm）は推定。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nf250-sv.3p',
  name: 'ノーヒューズ遮断器',
  modelName: 'NF250-SV',
  poles: 3,
  pitch: 35,
  widthMm: 105,
  heightMm: 165,
  ratings: [125, 150, 175, 200, 225, 250],
  defaultRating: 225,
  voltageText: 'AC 690V',
  screwR: 9.5,
  description:
    '三菱電機 WS-V シリーズの汎用の配線用遮断器（MCCB）225A/250A フレーム 3 極（AC/DC 共用）。' +
    '大きな設備の制御盤・動力盤の主幹ブレーカーに使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。',
  estimated: '極間ピッチ（35mm）と主端子ネジの位置（上下の端から 9mm）は推定',
});
