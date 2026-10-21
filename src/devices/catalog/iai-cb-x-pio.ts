import { buildPioCable, type PioLead } from '../iai/pio-cable';

/**
 * IAI PIO ケーブル CB-X-PIO□□□（□□□ はケーブル長。020 = 2m、最長 10m）。
 * XSEL（P/Q/R/S/RA/SA など）の PIO ボード（入力 32 / 出力 16、入力 16 / 出力 32）の 50 極 MIL コネクターに差す
 * ソケット（オムロン XG4M-5030-T、ストレインリリーフ付き）と 50 芯フラットケーブル（KFX-50(S)）。反対側は切りっぱなし。
 *
 * 線色（取扱説明書 MJ0359「3.5.3 PIO ケーブル」）: ピン 1〜10 が 茶-1〜黒-1、11〜20 が 茶-2〜黒-2、… 41〜50 が 茶-5〜黒-5。
 * ピン 1（茶-1）は外部 DC24V の +24V、ピン 50（黒-5）は 0V。端子ID はピン番号（'1'〜'50'）。
 */
const leads: PioLead[] = Array.from({ length: 50 }, (_, i) => ({ id: String(i + 1), pin: i + 1, colorIndex: i }));

export default buildPioCable({
  type: 'iai.cb-x-pio',
  model: 'CB-X-PIO',
  name: 'PIO ケーブル（片側バラ線）',
  kind: 'MIL50',
  poles: 50,
  plugW: 80,
  plugText: 'MIL 50P（XG4M-5030）',
  leads,
  description:
    'IAI の PIO ケーブル CB-X-PIO（50 極 MIL ソケット - バラ線、標準 2m）。XSEL の PIO ボード（N1/P1/N2/P2）の 50 極コネクターとケーブルでつなぎ、反対側の芯線（端子 1〜50）を PLC・センサー・電磁弁・端子台へ配線する。' +
    '線色はピン 1〜10 が 茶-1〜黒-1、11〜20 が 茶-2〜黒-2、21〜30 が 茶-3〜黒-3、31〜40 が 茶-4〜黒-4、41〜50 が 茶-5〜黒-5。ピン 1（茶-1）に +24V、ピン 50（黒-5）に 0V。' +
    'MIL 50 極のコネクターなので、MIL 50 極の変換端子台（generic.mil-terminal-block.50p）に市販のフラットケーブルでつなぐこともできる。',
});
