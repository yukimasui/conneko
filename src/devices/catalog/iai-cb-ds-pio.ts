import { buildPioCable, type PioLead } from '../iai/pio-cable';
import { hif40No } from '../iai/pio';

/**
 * IAI の I/O フラットケーブル CB-DS-PIO□□□（34 芯、片側バラ線。PSEL / ASEL の付属品、標準 2m）。
 * 線色（取扱説明書 MJ0172「6.4 PIO ケーブルの接続」）: 1A 茶1、1B 赤1、2A 橙1 … 5B 黒1、6A 茶2 … 17A 橙4、17B 黄4
 * （ピン番号の順に IAI の 10 色を繰り返し、数字はドットマークの数）。
 * 端子ID はピン番号の表記（'1A'〜'17B'）。コネクターのピンID は nA → CN#(2n−1)、nB → CN#2n（コントローラー側と同じ）。
 */
const leads: PioLead[] = [];
for (let n = 1; n <= 17; n++) {
  for (const row of ['A', 'B'] as const) {
    const pin = hif40No(row, n);
    leads.push({ id: `${n}${row}`, pin, colorIndex: pin - 1 });
  }
}

export default buildPioCable({
  type: 'iai.cb-ds-pio',
  model: 'CB-DS-PIO',
  name: 'I/O フラットケーブル（34 芯、片側バラ線）',
  kind: 'IAI-DS-IO34',
  poles: 34,
  plugW: 44,
  plugText: 'I/O 34P',
  leads,
  description:
    'IAI の I/O フラットケーブル CB-DS-PIO（34 芯、片側バラ線。PSEL / ASEL に付属、標準 2m）。コントローラーの PIO コネクター（I/O）に差し、' +
    '反対側の芯線（端子 1A〜17A・1B〜17B）を PLC の入出力・端子台へ配線する。1A（茶1）が +24V、17B（黄4）が 0V、1B〜13A が入力、13B〜17A が出力。',
});
