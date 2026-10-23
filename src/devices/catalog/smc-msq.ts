import { buildRotary } from '../smc/rotary';

/**
 * SMC ロータリテーブル MSQ シリーズ（ラック＆ピニオン形、基本形 MSQB）。作りは src/devices/smc/rotary.ts。
 *
 * 型式: MSQB[サイズ][角度調整][-オートスイッチ][リード線][個数]
 *   角度調整は A 調整ボルト / R ショックアブソーバ内蔵（サイズ 10 以上）。例: MSQB20A-M9BW。回転角度は 0〜190° で調整できる
 */
export default buildRotary({
  type: 'smc.msq',
  sizes: [
    { size: 1, thread: 'M3', minPressure: 0.1, maxPressure: 0.7, absorber: false, bodyL: 44, bodyH: 22, table: 22 },
    { size: 2, thread: 'M3', minPressure: 0.1, maxPressure: 0.7, absorber: false, bodyL: 50, bodyH: 24, table: 26 },
    { size: 3, thread: 'M3', minPressure: 0.1, maxPressure: 0.7, absorber: false, bodyL: 56, bodyH: 26, table: 30 },
    { size: 7, thread: 'M5', minPressure: 0.1, maxPressure: 0.7, absorber: false, bodyL: 66, bodyH: 30, table: 36 },
    { size: 10, thread: 'M5', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 76, bodyH: 32, table: 45 },
    { size: 20, thread: 'M5', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 94, bodyH: 38, table: 55 },
    { size: 30, thread: 'M5', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 104, bodyH: 42, table: 63 },
    { size: 50, thread: 'M5', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 128, bodyH: 48, table: 78 },
    { size: 70, thread: 'Rc1/8', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 140, bodyH: 54, table: 87 },
    { size: 100, thread: 'Rc1/8', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 156, bodyH: 60, table: 100 },
    { size: 200, thread: 'Rc1/8', minPressure: 0.1, maxPressure: 1.0, absorber: true, bodyL: 190, bodyH: 72, table: 126 },
  ],
  defaultSize: 20,
  model: (p, sw) => `MSQB${p.size}${p.adjust === 'R' && Number(p.size) >= 10 ? 'R' : 'A'}${sw}`,
  description: 'SMC のロータリテーブル MSQ シリーズ（ラック＆ピニオン形、基本形 MSQB）。テーブルが 0〜190° の範囲で往復回転する。',
  estimated: '外形寸法、サイズ 1〜7 の使用圧力範囲、ポートのねじは推定',
});
