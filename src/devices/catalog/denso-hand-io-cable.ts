import { DENSO_HAND_KIND, HAND_IO, HAND_PINS } from '../denso/parts';
import { looseCable } from '../generic/robot-cable';
import type { DeviceDefinition } from '../types';

/**
 * デンソーウェーブ VS シリーズのハンド I/O コネクターに差すケーブル（片側バラ線）。
 * ハンドのセンサー・電磁弁へ配線するために、ロボットのハンド I/O コネクターに合う相手コネクターを付けて用意するケーブルを表す。
 *
 * 芯線の割付け（ピン番号と同じ順。src/devices/denso/parts.ts の HAND_IO。推定）:
 * 1〜8 HI0〜HI7、9〜16 HO0〜HO7、17・18 +24V、19・20 0V。芯線の色と相手コネクターの型式は資料で確認できなかった。
 * 芯線をセンサー・電磁弁につなぐと、ロボットの中の配線とロボット接続ケーブル（エンコーダー）を通って、コントローラーのハンド I/O とつながり、I/O 表に出る。
 */

const leadId = (h: (typeof HAND_IO)[number]) => (h.name === '+24V' || h.name === '0V' ? `${h.name}-${h.pin}` : h.name);
const parts = looseCable(
  'dhc',
  HAND_IO.map((h) => ({ pin: h.pin, id: leadId(h), note: `ハンド I/O のピン ${h.pin}: ${h.note}` })),
  { kind: DENSO_HAND_KIND, pins: HAND_PINS, width: 10, style: 'round' },
  'CN（ハンド I/O 20 ピン）',
  'HAND I/O',
);

const def: DeviceDefinition = {
  type: 'denso.hand-io-cable',
  name: 'ハンド I/O ケーブル（片側バラ線）',
  model: 'ハンド I/O ケーブル（VS 用）',
  maker: 'デンソーウェーブ',
  category: 'terminal',
  labelPrefix: 'CBL',
  ...parts,
  estimated: 'ピン数・割付け・芯線の色・相手コネクターの型式は未確認（ハンド I/O コネクターに合う相手コネクターを付けて用意するケーブルとして表した）',
  description:
    'デンソーウェーブの VS シリーズのハンド I/O コネクターに差す、片側がバラ線のケーブル。ハンドのセンサー・電磁弁への配線に使う。' +
    '芯線: HI0〜HI7（ハンド入力。NPN のセンサーの出力をつなぐ）、HO0〜HO7（ハンド出力。NPN なので電磁弁の + 側を +24V へ、− 側を出力へ）、+24V-17・+24V-18、0V-19・0V-20。' +
    'ロボットの中の配線とロボット接続ケーブル（エンコーダー）を通ってコントローラー RC8A のハンド I/O につながるので、つないだ機器はコントローラーの I/O 表に出る。',
};

export default def;
