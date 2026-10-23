import { buildCylinder } from '../smc/cylinder';

/**
 * SMC エアシリンダ CM2 シリーズ（標準形、φ20〜40、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: C[D]M2[支持形式][内径]-[ストローク][作動]Z[-オートスイッチ][リード線][個数]
 *   D はマグネット内蔵、作動は無記号 複動 / S 単動押出し / T 単動引込み。例: CDM2B25-100Z-M9BW
 * 出典: SMC CM2-Z カタログ（static.smc.eu の CM2-Z-B_EU.pdf）
 *   ポート: φ20・25・32 は Rc1/8、φ40 は Rc1/4。ロッド径: 8・10・12・14mm
 *   使用圧力: 複動 0.05〜1.0MPa。単動の最低使用圧力は押出し 0.18MPa、引込み 0.23MPa
 *   標準ストローク: 複動 25〜300。単動は φ20・25 が 150、φ32 が 200、φ40 が 250 まで
 */
export default buildCylinder({
  type: 'smc.cm2',
  series: 'CM2',
  name: 'エアシリンダ（標準形）',
  look: 'round',
  scale: 1.3,
  bores: [
    { bore: 20, rod: 8, thread: 'Rc1/8', cover: 26, tube: 22, head: 15, rodCover: 15, tubeBase: 14, rodOut: 30, minPressure: 0.05, minPressureSingle: 0.18, minPressurePull: 0.23 },
    { bore: 25, rod: 10, thread: 'Rc1/8', cover: 31, tube: 27, head: 15, rodCover: 15, tubeBase: 14, rodOut: 32, minPressure: 0.05, minPressureSingle: 0.18, minPressurePull: 0.23 },
    { bore: 32, rod: 12, thread: 'Rc1/8', cover: 38, tube: 34, head: 16, rodCover: 16, tubeBase: 14, rodOut: 34, minPressure: 0.05, minPressureSingle: 0.18, minPressurePull: 0.23 },
    { bore: 40, rod: 14, thread: 'Rc1/4', cover: 47, tube: 42, head: 20, rodCover: 20, tubeBase: 16, rodOut: 40, minPressure: 0.05, minPressureSingle: 0.18, minPressurePull: 0.23 },
  ],
  defaultBore: 25,
  strokes: [25, 50, 75, 100, 125, 150, 200, 250, 300],
  defaultStroke: 100,
  mounts: [
    { code: 'B', label: '基本形', shape: 'basic' },
    { code: 'L', label: '軸方向フート形', shape: 'foot' },
    { code: 'F', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'G', label: 'ヘッド側フランジ形', shape: 'flange-head' },
    { code: 'C', label: '1 山クレビス形', shape: 'clevis1' },
    { code: 'D', label: '2 山クレビス形', shape: 'clevis2' },
    { code: 'U', label: 'ロッド側トラニオン形', shape: 'trunnion-rod' },
    { code: 'T', label: 'ヘッド側トラニオン形', shape: 'trunnion-head' },
  ],
  maxPressure: 1.0,
  single: true,
  model: (p, b, sw) => `C${p.switch === 'none' ? '' : 'D'}M2${p.mount}${b.bore}-${p.stroke}${p.action === 'D' ? '' : p.action}Z${sw}`,
  representative: 'CM2 / CDM2（φ20〜40）',
  description: 'SMC のエアシリンダ CM2 シリーズ（標準形・複動または単動・片ロッド、φ20〜40）。',
  estimated: '外形寸法（カバー・チューブの長さと径）は推定',
});
