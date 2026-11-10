import { looseCable } from '../generic/robot-cable';
import { DSUB37, IO_PINS } from '../kawasaki/parts';
import type { DeviceDefinition } from '../types';

/**
 * 川崎重工業 E コントローラーの汎用入出力（D-sub 37 ピン）に差す I/O ケーブル（片側バラ線）。
 * 入力のコネクター CN2 にも、出力のコネクター CN4 にも差せる。芯線はピン番号と同じ番号の端子（1〜37）にした。
 * 芯線の色・ケーブルの型式は資料で確かめられなかった。CN2 に差すと 1〜32 が入力 1001〜1032、CN4 に差すと出力 1〜32。33・34 は +24V、35〜37 は 0V（推定）。
 */

const parts = looseCable(
  'kio',
  Array.from({ length: IO_PINS }, (_, i) => {
    const pin = i + 1;
    const note = pin <= 32 ? `ピン ${pin}（CN2 なら入力 ${1000 + pin}、CN4 なら出力 ${pin}）` : pin <= 34 ? `ピン ${pin}（+24V）` : `ピン ${pin}（0V）`;
    return { pin, id: String(pin), note };
  }),
  { kind: DSUB37, pins: IO_PINS, width: 14 },
  'CN（D-sub 37 ピン）',
  'D-sub 37P',
  'dsub',
);

const def: DeviceDefinition = {
  type: 'kawasaki.io-cable-d37',
  name: 'I/O ケーブル（片側バラ線）',
  model: 'I/O ケーブル（D-sub 37 ピン、E コントローラー用）',
  maker: '川崎重工業',
  category: 'terminal',
  labelPrefix: 'CBL',
  ...parts,
  estimated: '芯線の色・ケーブルの型式・ピンの割付け（33・34 +24V、35〜37 0V）は推定',
  description:
    '川崎重工業の E コントローラー（E01 など）の汎用入出力のコネクター（D-sub 37 ピン）に差す、片側がバラ線の I/O ケーブル。' +
    '入力の CN2 に差すと芯線 1〜32 が入力 1001〜1032、出力の CN4 に差すと出力 1〜32 になる。33・34 は +24V、35〜37 は 0V。' +
    '芯線を端子台・PLC・センサー・リレーにつなぐと、コントローラーの I/O 表に出る。',
};

export default def;
