import { buildPsel } from '../iai/psel';

/**
 * IAI 小型プログラムコントローラー ASEL（ロボシリンダー RCA/RCA2/RCL などの DC24V サーボ 2 軸まで）。
 * 外形・PIO・電源コネクターは PSEL と同じ。作りは iai/psel.ts（出典: 取扱説明書 MJ0165「ASEL」）。
 */
export default buildPsel({
  type: 'iai.asel',
  series: 'ASEL',
  name: 'プログラムコントローラー（DC24V サーボ 2 軸、旧世代）',
  mpPerAxis: 5.1,
  actuators: 'ロボシリンダー RCA/RCA2/RCL（DC24V サーボモーター）',
  description:
    'IAI の小型プログラムコントローラー ASEL（ロボシリンダー RCA/RCA2/RCL などの DC24V サーボモーター用、最大 2 軸。現行は MSEL）。外形・PIO・電源の作りは PSEL と同じ。' +
    '電源: 下面の CP（24V・0V）に制御電源 DC24V（最大 1.2A）、MP（24V・0V）にモーター電源 DC24V（最大 5.1A/軸）。' +
    '非常停止・イネーブルは B 接点の内部給電型: EMG+ → 非常停止スイッチ → EMG−、ENB+ → イネーブルスイッチ → ENB−。' +
    'PIO（34 極）: 入力 24 点（ポート 016〜023・000〜015）、出力 8 点（300〜307）。1A に +24V、17B に 0V。付属のフラットケーブル CB-DS-PIO でつなぐ。',
});
