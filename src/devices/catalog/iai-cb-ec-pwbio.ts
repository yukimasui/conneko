import { EC_LEADS, ecPinNo } from '../iai/ec';
import { buildPioCable, type PioLead } from '../iai/pio-cable';

/**
 * IAI エレシリンダーの電源・I/O ケーブル CB-EC-PWBIO□□□-RB（□□□ はケーブル長。010 = 1m、最長 10m。標準でロボットケーブル）。
 * エレシリンダー側がコネクター、反対側が切りっぱなし（バラ線）で、DC24V 電源と PLC の入出力へ配線する。
 *
 * 線色とピン No.（取扱説明書 MJ3816「電源・I/O ケーブル（ユーザー配線仕様）」）:
 *   黒 A1 0V、赤 B1 24V（AWG18）、水 A2（予約。TMD2 は 24V 制御。AWG22）、橙 B3 ST0、黄 B4 ST1、緑 B5 RES、桃 B6（予約）、
 *   青 A3 LS0/PE0、紫 A4 LS1/PE1、灰 A5 *ALM、白 A6（予約）、茶 B2 BKRLS（AWG26）。黄緑と薄灰の電線は未使用（カット済み）。
 * 端子ID はピン番号の表記（'A1'〜'B6'）。コネクターのピンID は An → CN#(2n−1)、Bn → CN#2n（エレシリンダー側と同じ）。
 */
const leads: PioLead[] = EC_LEADS.map((l) => ({
  id: `${l.row}${l.n}`,
  pin: ecPinNo(l.row, l.n),
  colorIndex: -1,
  color: l.color,
  label: `${l.row}${l.n} ${l.color.name} ${l.signal}`,
  note: `エレシリンダーのピン ${l.row}${l.n}（${l.signal}）につながる芯線（${l.color.name}）。${l.note}`,
}));

export default buildPioCable({
  type: 'iai.cb-ec-pwbio',
  model: 'CB-EC-PWBIO',
  name: 'エレシリンダー 電源・I/O ケーブル（片側バラ線）',
  kind: 'IAI-EC-PWRIO',
  poles: 12,
  plugW: 36,
  plugText: 'EC PWR/IO',
  leads,
  sheath: true,
  description:
    'IAI のエレシリンダー（EC シリーズ）の電源・I/O ケーブル CB-EC-PWBIO□□□-RB（片側バラ線、最長 10m、ロボットケーブル）。エレシリンダーの電源・I/O コネクターとケーブルでつなぎ、' +
    '反対側の芯線（端子 A1〜A6・B1〜B6）を DC24V 電源と PLC の入出力へ配線する。黒 A1 0V・赤 B1 24V、入力 橙 B3 ST0（後退）・黄 B4 ST1（前進）・緑 B5 RES（アラーム解除）、' +
    '出力 青 A3 LS0（後退完了）・紫 A4 LS1（前進完了）・灰 A5 *ALM、茶 B2 BKRLS（ブレーキ解除）、水 A2・桃 B6・白 A6 は予約（電源 2 系統仕様 TMD2 では A2 が制御電源 24V）。',
});
