import { buildCylinder } from '../smc/cylinder';

/**
 * SMC エアシリンダ CJ2 シリーズ（ステンレスシリンダ、φ6〜16、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: C[D]J2[支持形式][内径]-[ストローク][作動]Z[-オートスイッチ][リード線][個数][-スイッチ取付金具]
 *   D はマグネット内蔵、作動は無記号 複動 / S 単動押出し（スプリングリターン）/ T 単動引込み（スプリングエクステンド）。
 *   マグネット内蔵はオートスイッチの取付金具（A レール取付 / B バンド取付。φ6 はバンドのみ）を末尾に付ける。例: CDJ2B16-60Z-M9BW-B
 * 出典: SMC CJ2-Z カタログ（static.smc.eu の CJ2-Z-D_EU.pdf）
 *   ポート: 全内径 M5×0.8。ロッド径: 3・4・5mm。最高使用圧力 0.7MPa
 *   最低使用圧力: 複動 φ6 0.12MPa、φ10・16 0.06MPa（ラバークッション）。単動 押出し φ6 0.2・φ10/16 0.15MPa、引込み φ6 0.25・φ10/16 0.15MPa
 *   標準ストローク（複動）: φ6 15〜60、φ10 15〜150、φ16 15〜200。単動は φ6・10 が 60 まで、φ16 が 150 まで
 */
export default buildCylinder({
  type: 'smc.cj2',
  series: 'CJ2',
  name: 'エアシリンダ（小形・ステンレス）',
  look: 'round',
  scale: 2.2,
  bores: [
    { bore: 6, rod: 3, thread: 'M5', cover: 10, tube: 8, head: 9, rodCover: 11, tubeBase: 10, rodOut: 15, minPressure: 0.12, minPressureSingle: 0.2, minPressurePull: 0.25, strokes: [15, 30, 45, 60] },
    { bore: 10, rod: 4, thread: 'M5', cover: 14, tube: 12, head: 9, rodCover: 12, tubeBase: 10, rodOut: 18, minPressure: 0.06, minPressureSingle: 0.15, strokes: [15, 30, 45, 60, 75, 100, 125, 150] },
    { bore: 16, rod: 5, thread: 'M5', cover: 20, tube: 18, head: 10, rodCover: 13, tubeBase: 10, rodOut: 20, minPressure: 0.06, minPressureSingle: 0.15 },
  ],
  defaultBore: 16,
  strokes: [15, 30, 45, 60, 75, 100, 125, 150, 175, 200],
  defaultStroke: 60,
  mounts: [
    { code: 'B', label: '基本形', shape: 'basic' },
    { code: 'L', label: '片側フート形', shape: 'foot' },
    { code: 'M', label: '両側フート形', shape: 'foot' },
    { code: 'F', label: 'ロッド側フランジ形', shape: 'flange-rod' },
    { code: 'G', label: 'ヘッド側フランジ形', shape: 'flange-head' },
    { code: 'D', label: '2 山クレビス形（φ10・16）', shape: 'clevis2' },
  ],
  maxPressure: 0.7,
  single: true,
  defaultFitting: 4,
  extraParams: [
    {
      key: 'switchMount',
      label: 'スイッチの取付金具（マグネット内蔵）',
      options: [
        { value: 'B', label: 'バンド取付（B）' },
        { value: 'A', label: 'レール取付（A。φ10・16）' },
      ],
      default: 'B',
    },
  ],
  model: (p, b, sw) => {
    const magnet = p.switch !== 'none';
    const bracket = magnet ? `-${b.bore === 6 ? 'B' : p.switchMount}` : '';
    return `C${magnet ? 'D' : ''}J2${p.mount}${b.bore}-${p.stroke}${p.action === 'D' ? '' : p.action}Z${sw}${bracket}`;
  },
  representative: 'CJ2 / CDJ2（φ6〜16）',
  description: 'SMC のエアシリンダ CJ2 シリーズ（ステンレスシリンダ・複動または単動・片ロッド、φ6〜16）。',
  estimated: '外形寸法（カバー・チューブの長さと径）は推定',
});
