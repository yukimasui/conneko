import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF125-SV 3P（WS-V シリーズ 汎用品 NF-S）。
 * 外形 W90 × H130 mm（1mm = 2px）。極間ピッチ 30mm、主端子ネジ（M8）の上下間隔 112mm（新旧比較資料 Y-0694 p.26）。
 * 定格電流 15〜125A（100A フレームは 15〜100A、125A は 125A フレーム。General Catalog Y-0720 p.21）。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nf125-sv.3p',
  name: 'ノーヒューズ遮断器',
  modelName: 'NF125-SV',
  poles: 3,
  pitch: 30,
  widthMm: 90,
  ratings: [15, 16, 20, 30, 32, 40, 50, 60, 63, 75, 80, 100, 125],
  defaultRating: 100,
  voltageText: 'AC 690V',
  screwR: 8.5,
  description:
    '三菱電機 WS-V シリーズの汎用の配線用遮断器（MCCB）100A/125A フレーム 3 極（AC/DC 共用、AC200V 50kA・AC400V 30kA）。' +
    '容量の大きい制御盤の主幹ブレーカーに使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。主端子は M8 ねじ。',
});
