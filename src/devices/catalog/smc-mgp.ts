import { buildCylinder } from '../smc/cylinder';

/**
 * SMC ガイド付き薄形シリンダ MGP シリーズ（φ12〜63、-Z）。作りは src/devices/smc/cylinder.ts。
 *
 * 型式: MGP[軸受][内径]-[ストローク]Z[-オートスイッチ][リード線][個数]
 *   軸受は M すべり軸受 / L ボールブッシュ軸受。例: MGPM20-50Z-M9BW。マグネットは標準で内蔵
 * 本体に 2 本のガイドロッドとプレートが付き、横荷重・回り止めに強い。
 * 出典: SMC MGP-Z カタログ（static.smc.eu の MGP-Z_EU.pdf）
 *   ポート: φ12・16 M5×0.8、φ20〜40 Rc1/8、φ50・63 Rc1/4。ロッド径: 6・8・10・10・14・14・18・18mm
 *   使用圧力: 最低 φ12 0.12MPa、それ以外 0.1MPa、最高 1.0MPa
 *   標準ストローク: φ12・16 10〜250、φ20・25 20〜400、φ32〜63 25〜400
 */
/** 標準ストローク（φ12・16 / φ20・25 / φ32〜63） */
const S12 = [10, 20, 30, 40, 50, 75, 100, 125, 150, 175, 200, 225, 250];
const S20 = [20, 30, 40, 50, 75, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400];
const S32 = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400];

export default buildCylinder({
  type: 'smc.mgp',
  series: 'MGP',
  name: 'ガイド付きシリンダ',
  look: 'guided',
  scale: 1.2,
  bores: [
    { bore: 12, rod: 6, thread: 'M5', cover: 42, tube: 42, head: 0, rodCover: 0, tubeBase: 32, rodOut: 18, minPressure: 0.12, strokes: S12 },
    { bore: 16, rod: 8, thread: 'M5', cover: 46, tube: 46, head: 0, rodCover: 0, tubeBase: 32, rodOut: 18, minPressure: 0.1, strokes: S12 },
    { bore: 20, rod: 10, thread: 'Rc1/8', cover: 54, tube: 54, head: 0, rodCover: 0, tubeBase: 34, rodOut: 20, minPressure: 0.1, strokes: S20 },
    { bore: 25, rod: 10, thread: 'Rc1/8', cover: 64, tube: 64, head: 0, rodCover: 0, tubeBase: 36, rodOut: 20, minPressure: 0.1, strokes: S20 },
    { bore: 32, rod: 14, thread: 'Rc1/8', cover: 78, tube: 78, head: 0, rodCover: 0, tubeBase: 40, rodOut: 24, minPressure: 0.1, strokes: S32 },
    { bore: 40, rod: 14, thread: 'Rc1/8', cover: 86, tube: 86, head: 0, rodCover: 0, tubeBase: 46, rodOut: 24, minPressure: 0.1, strokes: S32 },
    { bore: 50, rod: 18, thread: 'Rc1/4', cover: 110, tube: 110, head: 0, rodCover: 0, tubeBase: 48, rodOut: 28, minPressure: 0.1, strokes: S32 },
    { bore: 63, rod: 18, thread: 'Rc1/4', cover: 124, tube: 124, head: 0, rodCover: 0, tubeBase: 52, rodOut: 28, minPressure: 0.1, strokes: S32 },
  ],
  defaultBore: 20,
  strokes: [10, 20, 25, 30, 40, 50, 75, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400],
  defaultStroke: 50,
  mounts: [],
  maxPressure: 1.0,
  magnetStandard: true,
  extraParams: [
    {
      key: 'bearing',
      label: '軸受',
      options: [
        { value: 'M', label: 'すべり軸受（M）' },
        { value: 'L', label: 'ボールブッシュ軸受（L）' },
      ],
      default: 'M',
    },
  ],
  model: (p, b, sw) => `MGP${p.bearing}${b.bore}-${p.stroke}Z${sw}`,
  representative: 'MGPM / MGPL（φ12〜63）',
  description: 'SMC のガイド付き薄形シリンダ MGP シリーズ（複動、φ12〜63）。2 本のガイドロッドとプレートで回り止めされ、横荷重に強い。',
  estimated: '外形寸法（本体の高さ・長さ、プレートの厚さ）は推定',
});
