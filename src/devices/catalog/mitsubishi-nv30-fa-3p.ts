import { buildFaBreaker } from '../mitsubishi/fa-breaker';

/**
 * 三菱電機 制御盤用漏電遮断器 NV30-FA 3P（FA シリーズ、3φ3W・1φ2W・1φ3W）。
 * 外形 W60 × H72 mm（1mm = 2px）、極間ピッチ 20mm、主端子ネジの上下間隔 60mm（カタログ Y-0660 p.7・p.11）。
 * ハンドル右側に漏電表示ボタンとテストボタンがある。
 */
export default buildFaBreaker({
  type: 'mitsubishi.nv30-fa.3p',
  poles: 3,
  earthLeakage: true,
  description:
    '三菱電機の制御盤用の小形漏電遮断器（FA シリーズ）30A フレーム 3 極（3φ3W・1φ2W・1φ3W、AC100〜200V、定格感度電流 15/30mA 高速形）。' +
    '過電流・短絡に加えて地絡（漏電）も検出して遮断する。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。単相 2 線で使う場合の結線（どの極を使うか）は取扱説明書に従う。',
});
