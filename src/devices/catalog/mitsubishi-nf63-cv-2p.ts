import { buildWsvBreaker } from '../mitsubishi/wsv-breaker';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF63-CV 2P（WS-V シリーズ 経済品 NF-C）。
 * 外形は NF32-SV 2P と同じ W50 × H130 mm（1mm = 2px）。極間ピッチ 25mm、主端子ネジの上下間隔 112mm
 * （新旧比較資料 Y-0694 p.22）。ハンドルは左寄り、トリップボタンは右側。
 */
export default buildWsvBreaker({
  type: 'mitsubishi.nf63-cv.2p',
  name: 'ノーヒューズ遮断器',
  modelName: 'NF63-CV',
  poles: 2,
  pitch: 25,
  widthMm: 50,
  ratings: [3, 4, 5, 6, 10, 15, 16, 20, 25, 30, 32, 40, 50, 60, 63],
  defaultRating: 20,
  voltageText: 'AC 500V  DC 250V',
  description:
    '三菱電機 WS-V シリーズの経済形の配線用遮断器（MCCB）50A フレーム 2 極（AC/DC 共用）。' +
    '単相 AC200V/100V の電源や DC 回路の両極を同時に開閉・保護する。上側が電源側（1/3）、下側が負荷側（2/4）。',
});
