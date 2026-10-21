import { buildXcHarness } from '../keyence/xc-harness';

/**
 * KEYENCE ハーネスケーブル XC-H40D（MIL 40極 - バラ線、5m の XC-H40D-05 など）。
 * MIL 40極のユニット（KV-SIR32XT / KV-SH04PL / KV-SSC02 など）に差し、反対側のバラ線を端子台などへ直接つなぐ。
 * 芯線の色・マークは公開資料で未確認のため、端子ID は MIL 標準のピン番号にした。
 * 出典: https://www.keyence.com/products/controls/other-controls/xc/models/xc-h40d-05/
 */

export default buildXcHarness({
  type: 'keyence.xc-h40d',
  model: 'XC-H40D',
  poles: 40,
  description:
    'KEYENCE の MIL 40極 - バラ線のハーネスケーブル（XC-H40D-05 は 5m）。MIL 40極のユニット（KV-SIR32XT / KV-SH04PL / KV-SSC02 など）のコネクタにケーブルでつなぎ、反対側の芯線を端子台・機器へ直接配線する。端子ID は MIL 標準のピン番号（1〜40）で、コネクタのピン n と芯線 n が導通する。芯線の色・マークは未確認。',
});
