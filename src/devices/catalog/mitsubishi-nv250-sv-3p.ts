import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 漏電遮断器 NV250-SV 3P（WS-V シリーズ 汎用品 NV-S、高調波・サージ対応形）。
 * 外形は NF250-SV と同じ W105 × H165 mm（1mm = 2px。販売店の仕様表の寸法）。定格電流 125〜225A（225A フレーム）・250A（250A フレーム）。
 * 定格感度電流は 30mA か 100・200・500mA 切換。極間ピッチ 35mm、主端子ネジの位置は推定。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nv250-sv.3p',
  name: '漏電遮断器',
  modelName: 'NV250-SV',
  poles: 3,
  pitch: 35,
  widthMm: 105,
  heightMm: 165,
  earthLeakage: true,
  ratings: [125, 150, 175, 200, 225, 250],
  defaultRating: 225,
  sensitivity: [
    { value: 30, label: '30mA' },
    { value: '100/200/500', label: '100/200/500mA 切換' },
  ],
  defaultSensitivity: '100/200/500',
  voltageText: 'Ue 100-440V',
  screwR: 9.5,
  description:
    '三菱電機 WS-V シリーズの汎用の漏電遮断器（ELB）225A/250A フレーム 3 極（AC100〜440V）。' +
    '過電流・短絡に加えて地絡（漏電）も検出して遮断する。大きな設備の主幹に使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。',
  estimated: '極間ピッチ（35mm）と主端子ネジの位置（上下の端から 9mm）は推定',
});
