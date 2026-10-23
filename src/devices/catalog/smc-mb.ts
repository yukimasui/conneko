import { buildCylinder } from '../smc/cylinder';

/**
 * SMC エアシリンダ MB シリーズ（標準形・タイロッド形、φ32〜100、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: M[D]B[支持形式][内径]-[ストローク]Z[-オートスイッチ][リード線][個数]
 *   D はマグネット内蔵。例: MDBB32-100Z-M9BW。エアクッションは両側に標準で付く
 */
export default buildCylinder({
  type: 'smc.mb',
  series: 'MB',
  name: 'エアシリンダ（標準形・タイロッド）',
  look: 'tierod',
  scale: 0.9,
  bores: [
    { bore: 32, rod: 12, thread: 'Rc1/8', cover: 45, tube: 36, head: 26, rodCover: 26, tubeBase: 30, rodOut: 34, minPressure: 0.05 },
    { bore: 40, rod: 16, thread: 'Rc1/4', cover: 52, tube: 44, head: 30, rodCover: 30, tubeBase: 32, rodOut: 40, minPressure: 0.05 },
    { bore: 50, rod: 20, thread: 'Rc1/4', cover: 65, tube: 55, head: 32, rodCover: 32, tubeBase: 34, rodOut: 46, minPressure: 0.05 },
    { bore: 63, rod: 20, thread: 'Rc3/8', cover: 75, tube: 68, head: 32, rodCover: 32, tubeBase: 36, rodOut: 46, minPressure: 0.05 },
    { bore: 80, rod: 25, thread: 'Rc3/8', cover: 95, tube: 86, head: 38, rodCover: 38, tubeBase: 40, rodOut: 56, minPressure: 0.05 },
    { bore: 100, rod: 30, thread: 'Rc1/2', cover: 114, tube: 106, head: 38, rodCover: 38, tubeBase: 40, rodOut: 56, minPressure: 0.05 },
  ],
  defaultBore: 40,
  strokes: [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500],
  defaultStroke: 100,
  mounts: [
    { code: 'B', label: '基本形' },
    { code: 'L', label: '軸方向フート形' },
    { code: 'F', label: 'ロッド側フランジ形' },
    { code: 'G', label: 'ヘッド側フランジ形' },
    { code: 'C', label: '1 山クレビス形' },
    { code: 'D', label: '2 山クレビス形' },
    { code: 'T', label: 'センタトラニオン形' },
  ],
  maxPressure: 1.0,
  defaultFitting: 8,
  model: (p, b, sw) => `M${p.switch === 'none' ? '' : 'D'}B${p.mount}${b.bore}-${p.stroke}Z${sw}`,
  representative: 'MB / MDB（φ32〜100）',
  description: 'SMC のエアシリンダ MB シリーズ（標準形・タイロッド形・複動・片ロッド・エアクッション付き、φ32〜100）。',
  estimated: '外形寸法（カバー・チューブの長さと径）は推定',
});
