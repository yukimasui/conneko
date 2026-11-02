import { buildCylinder } from '../smc/cylinder';
import { CKD_CYLINDER_ESTIMATED, CKD_LOGO, ckdCylinderModel } from '../ckd/cylinder';

/**
 * CKD 薄形シリンダ（スーパーコンパクトシリンダ）SSD2（複動・片ロッド、φ12〜63）。作りは src/devices/smc/cylinder.ts、CKD 共通は src/devices/ckd/cylinder.ts。
 *
 * 角形のアルミ本体の側面にポートがあり、ロッド先端はめねじ。
 * 推定（資料で確かめられなかった値）: ポートのねじ（φ12〜25 M5、φ32・40 Rc1/8、φ50・63 Rc1/4）、ロッド径、
 *   最低使用圧力（φ12・16 0.1MPa、φ20 以上 0.05MPa）、最高使用圧力 1.0MPa、標準ストローク、外形寸法、支持形式の記号
 */
export default buildCylinder({
  type: 'ckd.ssd2',
  series: 'SSD2',
  name: 'エアシリンダ（薄形）',
  look: 'compact',
  scale: 1.5,
  bores: [
    { bore: 12, rod: 6, thread: 'M5', cover: 25, tube: 25, head: 0, rodCover: 0, tubeBase: 18, rodOut: 3.5, minPressure: 0.1, strokes: [5, 10, 15, 20, 25, 30] },
    { bore: 16, rod: 8, thread: 'M5', cover: 29, tube: 29, head: 0, rodCover: 0, tubeBase: 19, rodOut: 3.5, minPressure: 0.1, strokes: [5, 10, 15, 20, 25, 30] },
    { bore: 20, rod: 10, thread: 'M5', cover: 36, tube: 36, head: 0, rodCover: 0, tubeBase: 20, rodOut: 4.5, minPressure: 0.05, strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { bore: 25, rod: 12, thread: 'M5', cover: 40, tube: 40, head: 0, rodCover: 0, tubeBase: 22, rodOut: 5, minPressure: 0.05, strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { bore: 32, rod: 16, thread: 'Rc1/8', cover: 45, tube: 45, head: 0, rodCover: 0, tubeBase: 24, rodOut: 7, minPressure: 0.05 },
    { bore: 40, rod: 16, thread: 'Rc1/8', cover: 52, tube: 52, head: 0, rodCover: 0, tubeBase: 30, rodOut: 7, minPressure: 0.05 },
    { bore: 50, rod: 20, thread: 'Rc1/4', cover: 64, tube: 64, head: 0, rodCover: 0, tubeBase: 31, rodOut: 8, minPressure: 0.05, strokes: [10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100] },
    { bore: 63, rod: 20, thread: 'Rc1/4', cover: 77, tube: 77, head: 0, rodCover: 0, tubeBase: 36, rodOut: 8, minPressure: 0.05, strokes: [10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100] },
  ],
  defaultBore: 25,
  strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100],
  defaultStroke: 20,
  mounts: [
    { code: '00', label: '基本形（両端タップ）', shape: 'tapped' },
    { code: 'LB', label: '軸方向フート形', shape: 'foot' },
    { code: 'FA', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'FB', label: 'ヘッド側フランジ形', shape: 'flange-head' },
    { code: 'CB', label: '2 山クレビス形', shape: 'clevis2' },
  ],
  maxPressure: 1.0,
  maker: 'CKD',
  logo: CKD_LOGO,
  switchMaker: 'ckd',
  speedController: false,
  model: (p, b, sw) => ckdCylinderModel('SSD2', p, b, sw),
  representative: 'SSD2（φ12〜63）',
  description: 'CKD の薄形シリンダ（スーパーコンパクトシリンダ）SSD2（複動・片ロッド、φ12〜63）。全長が短く、治具のクランプ・押し・位置決めに使う。',
  estimated: CKD_CYLINDER_ESTIMATED + '。ポートのねじ・ロッド径・最低使用圧力・最高使用圧力（1.0MPa）・標準ストロークも推定',
});
