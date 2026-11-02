import { buildCylinder } from '../smc/cylinder';
import { KOGANEI_LOGO, koganeiJigModel } from '../koganei/cylinder';

/**
 * コガネイ ジグシリンダ C シリーズ CDA（複動・片ロッド、φ10〜63）。作りは src/devices/smc/cylinder.ts、コガネイ共通は src/devices/koganei/cylinder.ts。
 *
 * 角形のアルミ本体（薄形）で、治具のクランプ・押し・位置決めに使う。側面にポート、ロッド先端はめねじ。
 * 推定（資料で確かめられなかった値）: ポートのねじ（φ10〜25 M5、φ32・40 Rc1/8、φ50・63 Rc1/4）、ロッド径、使用圧力範囲（0.1〜0.9MPa）、
 *   標準ストローク、外形寸法、型式の記号の並び（磁石付きの -B、センサスイッチの記号）、センサスイッチ ZE135A・ZE155A の定格
 */
export default buildCylinder({
  type: 'koganei.cda',
  series: 'CDA',
  name: 'エアシリンダ（ジグシリンダ）',
  look: 'compact',
  scale: 1.5,
  bores: [
    { bore: 10, rod: 5, thread: 'M5', cover: 22, tube: 22, head: 0, rodCover: 0, tubeBase: 18, rodOut: 3.5, minPressure: 0.1, strokes: [5, 10, 15, 20, 25, 30] },
    { bore: 16, rod: 8, thread: 'M5', cover: 28, tube: 28, head: 0, rodCover: 0, tubeBase: 20, rodOut: 3.5, minPressure: 0.1, strokes: [5, 10, 15, 20, 25, 30, 40, 50] },
    { bore: 20, rod: 10, thread: 'M5', cover: 34, tube: 34, head: 0, rodCover: 0, tubeBase: 21, rodOut: 4.5, minPressure: 0.1 },
    { bore: 25, rod: 12, thread: 'M5', cover: 40, tube: 40, head: 0, rodCover: 0, tubeBase: 23, rodOut: 5, minPressure: 0.1 },
    { bore: 32, rod: 16, thread: 'Rc1/8', cover: 46, tube: 46, head: 0, rodCover: 0, tubeBase: 25, rodOut: 7, minPressure: 0.1 },
    { bore: 40, rod: 16, thread: 'Rc1/8', cover: 54, tube: 54, head: 0, rodCover: 0, tubeBase: 30, rodOut: 7, minPressure: 0.1 },
    { bore: 50, rod: 20, thread: 'Rc1/4', cover: 64, tube: 64, head: 0, rodCover: 0, tubeBase: 32, rodOut: 8, minPressure: 0.1 },
    { bore: 63, rod: 20, thread: 'Rc1/4', cover: 78, tube: 78, head: 0, rodCover: 0, tubeBase: 36, rodOut: 8, minPressure: 0.1 },
  ],
  defaultBore: 16,
  strokes: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100],
  defaultStroke: 20,
  mounts: [],
  maxPressure: 0.9,
  maker: 'コガネイ',
  logo: KOGANEI_LOGO,
  switchMaker: 'koganei',
  speedController: false,
  model: (p, b, sw) => koganeiJigModel('CDA', p, b, sw),
  representative: 'CDA（φ10〜63）',
  description: 'コガネイのジグシリンダ C シリーズ CDA（薄形・複動・片ロッド、φ10〜63）。本体の通し穴・タップで治具に直接取り付ける。',
  estimated:
    '外形寸法、ポートのねじ、ロッド径、使用圧力範囲（0.1〜0.9MPa）、標準ストローク、型式の記号の並び（-B・センサスイッチの記号）、センサスイッチ ZE135A・ZE155A の定格は推定',
});
