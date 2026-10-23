/**
 * エア配管のチューブ（種類・外径・色）のデータ。
 *
 * チューブは図面の wires に電線と同じ形で入れ、wireType にチューブの種類ID（'TU' など）、tubeOD に外径[mm]を書く。
 * color はチューブの色ID（TUBE_COLORS）。
 *
 * 出典: SMC ポリウレタンチューブ TU シリーズ・ナイロンチューブ T シリーズ カタログ
 *   TU: 外径 4/6/8/10/12mm（内径 2.5/4/5/6.5/8mm）、最高使用圧力 0.8MPa（20℃）
 *   T : 外径 4/6/8/10/12mm（内径 2.5/4/6/7.5/9mm）、最高使用圧力 1.0MPa（20℃。サイズにより 1.5MPa まで）
 */

export interface TubeTypeSpec {
  /** 種類ID（図面の wireType） */
  id: string;
  name: string;
  /** 型式の接頭辞（SMC の TU / T） */
  series: string;
  /** 最高使用圧力[MPa]（20℃） */
  maxPressure: number;
  /** 外径[mm] → 内径[mm] */
  sizes: Record<number, number>;
}

export const TUBE_TYPES: TubeTypeSpec[] = [
  { id: 'TU', name: 'ポリウレタンチューブ', series: 'TU', maxPressure: 0.8, sizes: { 4: 2.5, 6: 4, 8: 5, 10: 6.5, 12: 8 } },
  { id: 'T', name: 'ナイロンチューブ', series: 'T', maxPressure: 1.0, sizes: { 4: 2.5, 6: 4, 8: 6, 10: 7.5, 12: 9 } },
];

/** チューブの外径の選択肢[mm] */
export const TUBE_ODS = [4, 6, 8, 10, 12];

export interface TubeColorSpec {
  id: string;
  name: string;
  /** 型式の色記号（SMC: BU・B・W・C など） */
  code: string;
  hex: string;
  /** 透明・半透明のチューブ（描くときに中を透かす） */
  clear?: boolean;
}

export const TUBE_COLORS: TubeColorSpec[] = [
  { id: 'blue', name: '青', code: 'BU', hex: '#2f7fd8' },
  { id: 'black', name: '黒', code: 'B', hex: '#2a2a2a' },
  { id: 'white', name: '白', code: 'W', hex: '#f1f1ec' },
  { id: 'clear', name: '透明', code: 'C', hex: '#cfe3ea', clear: true },
  { id: 'red', name: '赤', code: 'R', hex: '#d33b32' },
  { id: 'yellow', name: '黄', code: 'Y', hex: '#e8c22c' },
  { id: 'green', name: '緑', code: 'G', hex: '#3f9b4a' },
  { id: 'orange', name: 'オレンジ', code: 'YR', hex: '#ea7d24' },
];

/** 新しく引くチューブの既定 */
export const DEFAULT_TUBE = { wireType: 'TU', color: 'blue', tubeOD: 6 } as const;

export function getTubeType(id: string): TubeTypeSpec | undefined {
  return TUBE_TYPES.find((t) => t.id === id);
}

export function getTubeColor(id: string): TubeColorSpec | undefined {
  return TUBE_COLORS.find((c) => c.id === id);
}

/** wireType がチューブの種類か */
export function isTubeType(wireType: string): boolean {
  return TUBE_TYPES.some((t) => t.id === wireType);
}

/** チューブの型式（例: TU0604BU）。外径・色が表にないときは分かる範囲で組み立てる */
export function tubeModel(wireType: string, od: number, color: string): string {
  const t = getTubeType(wireType);
  const id = t?.sizes[od];
  const size = id !== undefined ? `${String(od).padStart(2, '0')}${String(id).replace('.', '').padStart(2, '0')}` : `${od}mm`;
  return `${t?.series ?? wireType}${size}${getTubeColor(color)?.code ?? ''}`;
}
