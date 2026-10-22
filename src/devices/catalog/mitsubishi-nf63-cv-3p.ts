import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF63-CV 3P（WS-V シリーズ 経済品 NF-C）。
 * 外形は NF32-SV と同じ W75 × H130 mm（1mm = 2px）。極間ピッチ 25mm、主端子ネジの上下間隔 112mm
 * （新旧比較資料 Y-0694 p.22）。主端子ネジは M5（60A・63A は M8）。
 * 定格電流 3〜63A（50A フレームは 3〜50A、60・63A は 60/63A フレーム。General Catalog Y-0720 p.18）。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nf63-cv.3p',
  name: 'ノーヒューズ遮断器',
  modelName: 'NF63-CV',
  poles: 3,
  pitch: 25,
  widthMm: 75,
  ratings: [3, 4, 5, 6, 10, 15, 16, 20, 25, 30, 32, 40, 50, 60, 63],
  defaultRating: 30,
  voltageText: 'AC 500V',
  description:
    '三菱電機 WS-V シリーズの経済形の配線用遮断器（MCCB）50A フレーム 3 極（AC/DC 共用、AC200V 7.5kA・AC400V 5kA）。' +
    '制御盤の主幹や動力回路の分岐の過電流・短絡保護に使う。外形・端子位置は NF32-SV 3P と同じ。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。',
});
