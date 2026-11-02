import { buildCylinder } from '../smc/cylinder';
import { CKD_CYLINDER_ESTIMATED, CKD_LOGO, ckdCylinderModel } from '../ckd/cylinder';

/**
 * CKD コンパクトシリンダ（丸形の標準シリンダ）CMK2（複動・片ロッド、φ20〜40）。作りは src/devices/smc/cylinder.ts、CKD 共通は src/devices/ckd/cylinder.ts。
 *
 * 推定（資料で確かめられなかった値）: ポートのねじ（φ20〜32 Rc1/8、φ40 Rc1/4）、ロッド径（8・10・12・16mm）、
 *   最低使用圧力 0.05MPa、最高使用圧力 1.0MPa、標準ストローク、外形寸法、支持形式の記号
 */
export default buildCylinder({
  type: 'ckd.cmk2',
  series: 'CMK2',
  name: 'エアシリンダ（標準形）',
  look: 'round',
  scale: 1.3,
  bores: [
    { bore: 20, rod: 8, thread: 'Rc1/8', cover: 26, tube: 22, head: 15, rodCover: 15, tubeBase: 14, rodOut: 30, minPressure: 0.05 },
    { bore: 25, rod: 10, thread: 'Rc1/8', cover: 31, tube: 27, head: 15, rodCover: 15, tubeBase: 14, rodOut: 32, minPressure: 0.05 },
    { bore: 32, rod: 12, thread: 'Rc1/8', cover: 38, tube: 34, head: 16, rodCover: 16, tubeBase: 14, rodOut: 34, minPressure: 0.05 },
    { bore: 40, rod: 16, thread: 'Rc1/4', cover: 47, tube: 42, head: 20, rodCover: 20, tubeBase: 16, rodOut: 40, minPressure: 0.05 },
  ],
  defaultBore: 25,
  strokes: [25, 50, 75, 100, 125, 150, 200, 250, 300],
  defaultStroke: 100,
  mounts: [
    { code: '00', label: '基本形', shape: 'basic' },
    { code: 'LB', label: '軸方向フート形', shape: 'foot' },
    { code: 'FA', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'FB', label: 'ヘッド側フランジ形', shape: 'flange-head' },
    { code: 'CA', label: '1 山クレビス形', shape: 'clevis1' },
    { code: 'CB', label: '2 山クレビス形', shape: 'clevis2' },
    { code: 'TC', label: '中間トラニオン形', shape: 'trunnion-center' },
  ],
  maxPressure: 1.0,
  maker: 'CKD',
  logo: CKD_LOGO,
  switchMaker: 'ckd',
  speedController: false,
  model: (p, b, sw) => ckdCylinderModel('CMK2', p, b, sw),
  representative: 'CMK2（φ20〜40）',
  description: 'CKD のコンパクトシリンダ CMK2（丸形の標準シリンダ、複動・片ロッド、φ20〜40）。送り・押し出し・持ち上げなど汎用に使う。',
  estimated: CKD_CYLINDER_ESTIMATED + '。ポートのねじ・ロッド径・使用圧力範囲・標準ストロークも推定',
});
