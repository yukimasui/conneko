import { buildPsel } from '../iai/psel';

/**
 * IAI 小型プログラムコントローラー PSEL（ロボシリンダー RCP2/RCP3 などのパルスモーター 2 軸まで、DC24V）。
 * 作りは iai/psel.ts（出典: 取扱説明書 MJ0172「PSEL」）。
 */
export default buildPsel({
  type: 'iai.psel',
  series: 'PSEL',
  name: 'プログラムコントローラー（パルスモーター 2 軸、DC24V、旧世代）',
  mpPerAxis: 2,
  actuators: 'ロボシリンダー RCP2/RCP3（パルスモーター）',
  description:
    'IAI の小型プログラムコントローラー PSEL（ロボシリンダー RCP2/RCP3 などのパルスモーター用、最大 2 軸。現行は MSEL）。SEL 言語で 64 プログラム・1500 ポジション、ポジショナーモードもある。' +
    '電源: 下面の CP（24V・0V）に制御電源 DC24V（最大 1.2A）、MP（24V・0V）にモーター電源 DC24V（最大 2A/軸）。' +
    '非常停止・イネーブルは B 接点の内部給電型: EMG+ → 非常停止スイッチ → EMG−、ENB+ → イネーブルスイッチ → ENB−。' +
    'PIO（34 極）: 入力 24 点（1B〜5A がポート 016〜023、5B〜13A が 000〜015。出荷時 000 = プログラムスタート、016〜022 = プログラム番号指定）、出力 8 点（13B〜17A がポート 300〜307。300 = アラーム、301 = レディー）。1A に +24V、17B に 0V。NPN / PNP は型式で選ぶ。付属のフラットケーブル CB-DS-PIO でつなぐ。',
});
