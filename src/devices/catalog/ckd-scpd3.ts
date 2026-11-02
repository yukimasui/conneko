import { buildCylinder } from '../smc/cylinder';
import { CKD_CYLINDER_ESTIMATED, CKD_LOGO, ckdCylinderModel } from '../ckd/cylinder';

/**
 * CKD ペンシル形シリンダ SCPD3（複動・片ロッド、φ6・10・16）。作りは src/devices/smc/cylinder.ts、CKD 共通は src/devices/ckd/cylinder.ts。
 *
 * 出典: CKD「Pencil shaped cylinder SCPD3」（ckd.co.jp/kiki/en/file/17424）・製品ページ
 *   内径 φ6・10・16、ポート M5（φ6・10 のねじ深さ 3.8mm）、耐圧 1.6MPa、複動・片ロッド
 * 推定: ロッド径（3・4・5mm）、最低使用圧力（φ6 0.15MPa、φ10・16 0.1MPa）、最高使用圧力 0.7MPa、標準ストローク、外形寸法、支持形式の記号
 */
export default buildCylinder({
  type: 'ckd.scpd3',
  series: 'SCPD3',
  name: 'エアシリンダ（ペンシル形）',
  look: 'round',
  scale: 2.2,
  bores: [
    { bore: 6, rod: 3, thread: 'M5', cover: 10, tube: 8, head: 9, rodCover: 11, tubeBase: 10, rodOut: 15, minPressure: 0.15, strokes: [5, 10, 15, 20, 25, 30, 40, 45, 50, 60] },
    { bore: 10, rod: 4, thread: 'M5', cover: 14, tube: 12, head: 9, rodCover: 12, tubeBase: 10, rodOut: 18, minPressure: 0.1, strokes: [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 100, 125, 150] },
    { bore: 16, rod: 5, thread: 'M5', cover: 20, tube: 18, head: 10, rodCover: 13, tubeBase: 10, rodOut: 20, minPressure: 0.1 },
  ],
  defaultBore: 16,
  strokes: [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 100, 125, 150, 175, 200],
  defaultStroke: 50,
  mounts: [
    { code: '00', label: '基本形', shape: 'basic' },
    { code: 'LB', label: '軸方向フート形', shape: 'foot' },
    { code: 'FA', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'CB', label: '2 山クレビス形', shape: 'clevis2' },
  ],
  maxPressure: 0.7,
  defaultFitting: 4,
  maker: 'CKD',
  logo: CKD_LOGO,
  switchMaker: 'ckd',
  speedController: false,
  model: (p, b, sw) => ckdCylinderModel('SCPD3', p, b, sw),
  representative: 'SCPD3（φ6〜16）',
  description: 'CKD のペンシル形シリンダ SCPD3（ステンレスの細いチューブ、複動・片ロッド、φ6・10・16）。小さな押し・送り・ストッパに使う。ポートは M5。',
  estimated: CKD_CYLINDER_ESTIMATED + '。ロッド径・最低使用圧力・最高使用圧力（0.7MPa）・標準ストロークも推定',
});
