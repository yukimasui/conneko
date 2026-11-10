import { looseCable } from '../generic/robot-cable';
import { RS_USER_KIND, RS_USER_PINS } from '../kawasaki/parts';
import type { DeviceDefinition } from '../types';

/**
 * 川崎重工業 RS007N のアプリケーション用の信号線のコネクター（ベース側 UB・アーム側 UA）に差すケーブル（片側バラ線）。
 * ロボットの UB・UA に合う相手コネクターを付けて用意するケーブルを表す。芯線はピン番号と同じ番号の端子（1〜10）にした。
 * 芯数・芯線の色・相手コネクターの型式は資料で確かめられなかった（推定）。
 */

const parts = looseCable(
  'ksc',
  Array.from({ length: RS_USER_PINS }, (_, i) => ({ pin: i + 1, id: String(i + 1), note: `信号線 ${i + 1}（ロボットの中で反対側のコネクターの ${i + 1} とつながる）` })),
  { kind: RS_USER_KIND, pins: RS_USER_PINS, width: 9, style: 'round' },
  'CN（信号線 10 ピン）',
  'SIGNAL',
);

const def: DeviceDefinition = {
  type: 'kawasaki.rs007n-user-cable',
  name: '信号線ケーブル（片側バラ線）',
  model: '信号線ケーブル（RS007N 用、10 芯）',
  maker: '川崎重工業',
  category: 'terminal',
  labelPrefix: 'CBL',
  ...parts,
  estimated: '芯数（10）・芯線の色・相手コネクターの型式は推定',
  description:
    '川崎重工業 RS007N のアプリケーション用の信号線のコネクター（ベース側 UB・アーム側 UA）に差す、片側がバラ線のケーブル。' +
    'アーム側に差してハンドのセンサー・電磁弁へ、ベース側に差してコントローラーの汎用入出力・端子台へ配線する。両端の同じ番号の芯線がロボットの中でつながる。',
};

export default def;
