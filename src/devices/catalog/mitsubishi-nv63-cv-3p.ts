import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 漏電遮断器 NV63-CV 3P（WS-V シリーズ 経済品 NV-C、高調波・サージ対応形）。
 * 外形は NV32-SV と同じ W75 × H130 mm（1mm = 2px）。極間ピッチ 25mm、主端子ネジの上下間隔 112mm
 * （新旧比較資料 Y-0694 p.24）。ハンドル右側にテストボタン・漏電表示ボタンがある。
 * 定格電流 5〜63A、定格感度電流 30mA または 100/200/500mA 切換（General Catalog Y-0720 p.28）。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nv63-cv.3p',
  name: '漏電遮断器',
  modelName: 'NV63-CV',
  poles: 3,
  pitch: 25,
  widthMm: 75,
  earthLeakage: true,
  ratings: [5, 10, 15, 16, 20, 25, 30, 32, 40, 50, 60, 63],
  defaultRating: 30,
  sensitivity: [
    { value: 30, label: '30mA' },
    { value: '100/200/500', label: '100/200/500mA 切換' },
  ],
  defaultSensitivity: 30,
  voltageText: 'Ue 100-440V',
  description:
    '三菱電機 WS-V シリーズの経済形の漏電遮断器（ELB）50A フレーム 3 極（3φ3W・1φ3W・1φ2W、AC100〜440V）。' +
    '過電流・短絡に加えて地絡（漏電）も検出して遮断する。制御盤の主幹に使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。',
});
