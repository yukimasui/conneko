import { buildPioCable, type PioLead } from '../iai/pio-cable';

/**
 * IAI PIO ケーブル CB-PAD-PIO□□□（□□□ はケーブル長。020 = 2m）。PCON/ACON/DCON-CYB の 20 極 PIO コネクター
 * （ハウジング モレックス 51353-2000）に差し、20 芯フラットケーブルの反対側は切りっぱなし。
 * 線色（取扱説明書 MJ0353「2.3.3 PIO の接続」）: 1〜10 が 茶-1〜黒-1、11〜20 が 茶-2〜黒-2。
 * ピン 1〜4 はパルス列入力（PLB/POB のみ。PLB/POB にはシールド付きの CB-PAD-PIOS を使う）、5〜12 が入力 IN0〜7、13〜20 が出力 OUT0〜7。
 */
const leads: PioLead[] = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), pin: i + 1, colorIndex: i }));

export default buildPioCable({
  type: 'iai.cb-pad-pio',
  model: 'CB-PAD-PIO',
  name: 'PIO ケーブル（片側バラ線）',
  kind: 'IAI-PIO20',
  poles: 20,
  plugW: 50,
  plugText: '20P（51353）',
  leads,
  description:
    'IAI の PIO ケーブル CB-PAD-PIO（20 極 - バラ線、標準 2m）。PCON/ACON/DCON-CYB の PIO コネクターとケーブルでつなぎ、反対側の芯線（端子 1〜20）を PLC の入出力・端子台へ配線する。' +
    '線色は 1〜10 が 茶-1〜黒-1、11〜20 が 茶-2〜黒-2。5〜12 が入力 IN0〜IN7、13〜20 が出力 OUT0〜OUT7（I/O 電源はコントローラーの電源コネクターから）。',
});
