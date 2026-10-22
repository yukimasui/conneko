import { buildFaBreaker } from '../mitsubishi/fa-breaker';

/**
 * 三菱電機 制御盤用漏電遮断器 NV30-FA 2P（FA シリーズ、1φ2W）。
 * 外形 W40 × H72 mm（1mm = 2px）、極間ピッチ 20mm、主端子ネジの上下間隔 60mm（カタログ Y-0660 p.7・p.11）。
 * ハンドル右側に漏電表示ボタンとテストボタンがある。
 */
export default buildFaBreaker({
  type: 'mitsubishi.nv30-fa.2p',
  poles: 2,
  earthLeakage: true,
  description:
    '三菱電機の制御盤用の小形漏電遮断器（FA シリーズ）30A フレーム 2 極（単相 2 線、AC100〜200V、定格感度電流 15/30mA 高速形）。' +
    '過電流・短絡に加えて地絡（漏電）も検出して遮断する。制御盤内のコンセント・照明・単相の制御電源の保護に使う。上側が電源側（1/3）、下側が負荷側（2/4）。',
  estimated: '2 極品の端子記号（1/3・2/4）は 3 極品（1/3/5・2/4/6）の写真からの推定',
});
