import { buildXcHarness } from '../keyence/xc-harness';

/**
 * KEYENCE ハーネスケーブル XC-H34D（MIL 34極 - バラ線、5m の XC-H34D-05 など）。
 * MIL 34極の I/O ユニット（KV-C32XC / KV-C32TD / KV-NC32EX など）に差し、反対側のバラ線を端子台などへ直接つなぐ。
 * 芯線の色・マークは公開資料で未確認のため、端子ID は MIL 標準のピン番号にした。
 * 出典: https://www.keyence.com/products/controls/other-controls/xc/models/xc-h34d-05/
 */

export default buildXcHarness({
  type: 'keyence.xc-h34d',
  model: 'XC-H34D',
  poles: 34,
  description:
    'KEYENCE の MIL 34極 - バラ線のハーネスケーブル（XC-H34D-05 は 5m）。MIL 34極の I/O ユニット（KV-C32XC / KV-C32TD / KV-C64XC / KV-NC32EX など）のコネクタにケーブルでつなぎ、反対側の芯線を端子台・機器へ直接配線する。端子ID は MIL 標準のピン番号（1〜34）で、コネクタのピン n と芯線 n が導通する。KEYENCE の KV-8000 用 I/O ユニットのピン No.k は MIL 標準ピン 2k−1（k ≤ 17）/ 2(k−17)（k ≥ 18）に当たる。芯線の色・マークは未確認。',
});
