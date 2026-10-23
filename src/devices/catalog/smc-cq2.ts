import { buildCylinder } from '../smc/cylinder';

/**
 * SMC 薄形シリンダ CQ2 シリーズ（標準形、φ12〜63、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: C[D]Q2[支持形式][内径]-[ストローク][作動]Z[-オートスイッチ][リード線][個数]
 *   D はマグネット内蔵、作動は D 複動 / S 単動押出し / T 単動引込み。例: CDQ2B25-20DZ-M9BW
 * 角形のアルミ本体の側面にポートがあり、ロッド先端はめねじ（標準）。
 * 出典: SMC CQ2-Z カタログ（static.smc.eu の CQ2-Z-B_EU.pdf）
 *   ポート: φ12〜25 M5×0.8、φ32・40 Rc1/8（φ32 のストローク 5 は M5）、φ50・63 Rc1/4。ロッド径: 6・8・10・12・16・16・20・20mm
 *   使用圧力: 最低 φ12・16 0.07MPa、φ20 以上 0.05MPa、最高 1.0MPa
 *   標準ストローク: φ12・16 5〜30、φ20・25 5〜50、φ32・40 5〜50・75・100、φ50・63 10〜50・75・100
 */
export default buildCylinder({
  type: 'smc.cq2',
  series: 'CQ2',
  name: 'エアシリンダ（薄形）',
  look: 'compact',
  scale: 1.5,
  bores: [
    { bore: 12, rod: 6, thread: 'M5', cover: 25, tube: 25, head: 0, rodCover: 0, tubeBase: 17, rodOut: 3.5, minPressure: 0.07, minPressureSingle: 0.15, strokes: [5, 10, 15, 20, 25, 30] },
    { bore: 16, rod: 8, thread: 'M5', cover: 29, tube: 29, head: 0, rodCover: 0, tubeBase: 18.5, rodOut: 3.5, minPressure: 0.07, minPressureSingle: 0.15, strokes: [5, 10, 15, 20, 25, 30] },
    { bore: 20, rod: 10, thread: 'M5', cover: 36, tube: 36, head: 0, rodCover: 0, tubeBase: 19.5, rodOut: 4.5, minPressure: 0.05, minPressureSingle: 0.15, strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { bore: 25, rod: 12, thread: 'M5', cover: 40, tube: 40, head: 0, rodCover: 0, tubeBase: 22.5, rodOut: 5, minPressure: 0.05, minPressureSingle: 0.15, strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { bore: 32, rod: 16, thread: 'Rc1/8', cover: 45, tube: 45, head: 0, rodCover: 0, tubeBase: 23, rodOut: 7, minPressure: 0.05, minPressureSingle: 0.15 },
    { bore: 40, rod: 16, thread: 'Rc1/8', cover: 52, tube: 52, head: 0, rodCover: 0, tubeBase: 29.5, rodOut: 7, minPressure: 0.05, minPressureSingle: 0.15 },
    { bore: 50, rod: 20, thread: 'Rc1/4', cover: 64, tube: 64, head: 0, rodCover: 0, tubeBase: 30.5, rodOut: 8, minPressure: 0.05, minPressureSingle: 0.15, strokes: [10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100] },
    { bore: 63, rod: 20, thread: 'Rc1/4', cover: 77, tube: 77, head: 0, rodCover: 0, tubeBase: 36, rodOut: 8, minPressure: 0.05, minPressureSingle: 0.15, strokes: [10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100] },
  ],
  defaultBore: 25,
  strokes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100],
  defaultStroke: 20,
  mounts: [
    { code: 'B', label: '通しタイプ', shape: 'through' },
    { code: 'A', label: '両端タップ', shape: 'tapped' },
    { code: 'L', label: '軸方向フート形', shape: 'foot' },
    { code: 'F', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'G', label: 'ヘッド側フランジ形', shape: 'flange-head' },
    { code: 'D', label: '2 山クレビス形', shape: 'clevis2' },
  ],
  maxPressure: 1.0,
  single: true,
  model: (p, b, sw) => `C${p.switch === 'none' ? '' : 'D'}Q2${p.mount}${b.bore}-${p.stroke}${p.action}Z${sw}`,
  representative: 'CQ2 / CDQ2（φ12〜63）',
  description: 'SMC の薄形シリンダ CQ2 シリーズ（標準形・複動または単動・片ロッド、φ12〜63）。全長が短く、狭い所の押し・クランプに使う。',
  estimated: '外形寸法（本体の長さ・一辺）、単動の最低使用圧力（0.15MPa）、型式の Z（φ12〜25 のスイッチなしは Z が付かない例がある）は推定',
});
