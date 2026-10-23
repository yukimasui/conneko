import { buildCylinder } from '../smc/cylinder';

/**
 * SMC エアシリンダ CJ2 シリーズ（ステンレスシリンダ、φ6〜16、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: C[D]J2[支持形式][内径]-[ストローク][作動]Z[-オートスイッチ][リード線][個数]
 *   D はマグネット内蔵、作動は無記号 複動 / S 単動押出し / T 単動引込み。例: CDJ2B16-60Z-M9BW
 * ポート: M5×0.8。ロッド径: 3・4・5mm。
 */
export default buildCylinder({
  type: 'smc.cj2',
  series: 'CJ2',
  name: 'エアシリンダ（小形・ステンレス）',
  look: 'round',
  scale: 2.2,
  bores: [
    { bore: 6, rod: 3, thread: 'M5', cover: 10, tube: 8, head: 9, rodCover: 11, tubeBase: 10, rodOut: 15, minPressure: 0.12, minPressureSingle: 0.15, strokes: [15, 30, 45, 60] },
    { bore: 10, rod: 4, thread: 'M5', cover: 14, tube: 12, head: 9, rodCover: 12, tubeBase: 10, rodOut: 18, minPressure: 0.06, minPressureSingle: 0.15 },
    { bore: 16, rod: 5, thread: 'M5', cover: 20, tube: 18, head: 10, rodCover: 13, tubeBase: 10, rodOut: 20, minPressure: 0.06, minPressureSingle: 0.1 },
  ],
  defaultBore: 16,
  strokes: [15, 30, 45, 60, 75, 100, 125, 150],
  defaultStroke: 60,
  mounts: [
    { code: 'B', label: '基本形' },
    { code: 'L', label: '軸方向フート形' },
    { code: 'F', label: 'ロッド側フランジ形' },
    { code: 'D', label: '2 山クレビス形' },
  ],
  maxPressure: 0.7,
  single: true,
  defaultFitting: 4,
  model: (p, b, sw) => `C${p.switch === 'none' ? '' : 'D'}J2${p.mount}${b.bore}-${p.stroke}${p.action === 'D' ? '' : p.action}Z${sw}`,
  representative: 'CJ2 / CDJ2（φ6〜16）',
  description: 'SMC のエアシリンダ CJ2 シリーズ（ステンレスシリンダ・複動または単動・片ロッド、φ6〜16）。',
  estimated: '外形寸法（カバー・チューブの長さと径）、単動の最低使用圧力は推定',
});
