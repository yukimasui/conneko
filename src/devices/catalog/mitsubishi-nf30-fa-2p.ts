import { buildFaBreaker } from '../mitsubishi/fa-breaker';

/**
 * 三菱電機 制御盤用ノーヒューズ遮断器 NF30-FA 2P（FA シリーズ）。
 * 外形 W40 × H72 mm（1mm = 2px）、極間ピッチ 20mm、主端子ネジの上下間隔 60mm（カタログ Y-0660 p.7・p.11）。
 */
export default buildFaBreaker({
  type: 'mitsubishi.nf30-fa.2p',
  poles: 2,
  description:
    '三菱電機の制御盤用の小形ノーヒューズ遮断器（FA シリーズ）30A フレーム 2 極。AC/DC 共用（AC200V 2.5kA・DC65V 1.5kA、5A 品は AC 1.5kA）。' +
    '高さ 72mm と小さく、IEC 35mm レールに取り付けられるので、制御盤内の制御電源（単相 AC200V/100V、DC24V）の主幹・分岐に使う。上側が電源側（1/3）、下側が負荷側（2/4）。',
  estimated: '2 極品の端子記号（1/3・2/4）は 3 極品（1/3/5・2/4/6）の写真からの推定',
});
