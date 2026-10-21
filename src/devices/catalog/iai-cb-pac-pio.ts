import { buildPioCable, type PioLead } from '../iai/pio-cable';
import { hif40No } from '../iai/pio';

/**
 * IAI PIO ケーブル CB-PAC-PIO□□□（□□□ はケーブル長。020 = 2m、最長 10m）。
 * PCON-CB/CFB・ACON-CB・DCON-CB・PCON-CA・MSEL・RCON の PIO ユニットなどの 40 極 PIO コネクター
 * （ヒロセ HIF6-40PA-1.27DS）に差すハーフピッチ MIL ソケット HIF6-40D-1.27R と、20 芯フラットケーブル 2 本（A・B）。
 * 反対側は切りっぱなし（バラ線）で、PLC の入出力や端子台へ自由に配線する。
 *
 * 線色（取扱説明書 MJ0342「3.3.3 PIO の接続」）: 1A〜10A 茶-1〜黒-1、11A〜20A 茶-2〜黒-2、
 * 1B〜10B 茶-3〜黒-3、11B〜20B 茶-4〜黒-4（色の後ろの数字はドットマークの数）。
 * 端子ID はピン番号の表記（'1A'〜'20B'）。コネクターのピンID は nA → CN#(2n−1)、nB → CN#2n（コントローラー側と同じ）。
 */
const leads: PioLead[] = [
  ...Array.from({ length: 20 }, (_, i): PioLead => ({ id: `${i + 1}A`, pin: hif40No('A', i + 1), colorIndex: i })),
  ...Array.from({ length: 20 }, (_, i): PioLead => ({ id: `${i + 1}B`, pin: hif40No('B', i + 1), colorIndex: 20 + i })),
];

export default buildPioCable({
  type: 'iai.cb-pac-pio',
  model: 'CB-PAC-PIO',
  name: 'PIO ケーブル（片側バラ線）',
  kind: 'HIF6-40',
  poles: 40,
  plugW: 50,
  plugText: 'HIF6 40P',
  leads,
  ribbons: 2,
  description:
    'IAI の PIO ケーブル CB-PAC-PIO（40 極、片側バラ線。標準 2m）。PCON-CB/CFB・ACON-CB・DCON-CB・MSEL・RCON の PIO ユニットなどの PIO コネクター（HIF6 40 極）とケーブルでつなぎ、' +
    '反対側の芯線（端子 1A〜20A・1B〜20B）を PLC の入出力・端子台へ配線する。線色は 1A〜10A が 茶-1〜黒-1、11A〜20A が 茶-2〜黒-2、1B〜10B が 茶-3〜黒-3、11B〜20B が 茶-4〜黒-4。' +
    'ポジショナーでは 1A・2A が I/O 用 +24V、19B・20B が 0V、5A〜20A が入力 IN0〜IN15、1B〜16B が出力 OUT0〜OUT15。',
});
