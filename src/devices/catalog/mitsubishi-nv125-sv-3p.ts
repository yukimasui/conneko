import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 漏電遮断器 NV125-SV 3P（WS-V シリーズ 汎用品 NV-S、高調波・サージ対応形）。
 * 外形は NF125-SV と同じ W90 × H130 mm（1mm = 2px）。極間ピッチ 30mm、主端子ネジ（M8）の上下間隔 112mm。
 * 定格電流 15〜100A（100A フレーム）・125A（125A フレーム）。定格感度電流は 30mA（固定）か 100・200・500mA 切換を注文時に選ぶ。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nv125-sv.3p',
  name: '漏電遮断器',
  modelName: 'NV125-SV',
  poles: 3,
  pitch: 30,
  widthMm: 90,
  earthLeakage: true,
  ratings: [15, 20, 30, 40, 50, 60, 75, 100, 125],
  defaultRating: 100,
  sensitivity: [
    { value: 30, label: '30mA' },
    { value: '100/200/500', label: '100/200/500mA 切換' },
  ],
  defaultSensitivity: '100/200/500',
  voltageText: 'Ue 100-440V',
  screwR: 8.5,
  description:
    '三菱電機 WS-V シリーズの汎用の漏電遮断器（ELB）100A/125A フレーム 3 極（3φ3W・1φ3W・1φ2W、AC100〜440V）。' +
    '過電流・短絡に加えて地絡（漏電）も検出して遮断する。容量の大きい制御盤の主幹に使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。主端子は M8 ねじ。',
});
