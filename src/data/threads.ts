/**
 * エア機器のポートのねじと、ワンタッチ管継手（SMC KQ2 シリーズ）の対応。
 *
 * 出典: SMC ワンタッチ管継手 KQ2 シリーズ カタログ（ハーフユニオン KQ2H の接続ねじと適合チューブ外径）
 *   M5: φ3.2〜6 / R1/8（01）: φ4〜10 / R1/4（02）: φ4〜12 / R3/8（03）: φ6〜12 / R1/2（04）: φ8〜16
 *   型式: KQ2H<外径 2 桁>-<ねじ>。R ねじはシール剤付きの S を付ける（例: KQ2H06-01AS）、M5 は KQ2H04-M5A
 */

/** ねじの呼びの大きさ（'Rc1/8'・'R1/8'・'G1/8'・'01' などを '1/8' に、'M5' はそのまま）。分からなければ undefined */
export function threadSize(thread: string | undefined): string | undefined {
  if (!thread) return undefined;
  const t = thread.replace(/\s/g, '');
  if (/^M5/i.test(t)) return 'M5';
  const m = /(\d\/\d)/.exec(t);
  if (m) return m[1];
  const code: Record<string, string> = { '01': '1/8', '02': '1/4', '03': '3/8', '04': '1/2' };
  return code[t];
}

/** ねじの大きさごとに付けられるワンタッチ管継手のチューブ外径[mm] */
const FITTING_ODS: Record<string, number[]> = {
  M5: [3.2, 4, 6],
  '1/8': [4, 6, 8, 10],
  '1/4': [4, 6, 8, 10, 12],
  '3/8': [6, 8, 10, 12],
  '1/2': [8, 10, 12, 16],
};

/** ねじに付けられる継手の外径の一覧（表にないねじは undefined） */
export function fittingODs(thread: string | undefined): number[] | undefined {
  const s = threadSize(thread);
  return s ? FITTING_ODS[s] : undefined;
}

/** ねじのポートに付けるワンタッチ管継手（ハーフユニオン）の型式。例: M5 × φ4 → KQ2H04-M5A、Rc1/8 × φ6 → KQ2H06-01AS */
export function fittingModel(thread: string | undefined, od: number): string | undefined {
  const s = threadSize(thread);
  const code: Record<string, string> = { M5: 'M5A', '1/8': '01AS', '1/4': '02AS', '3/8': '03AS', '1/2': '04AS' };
  if (!s || !code[s]) return undefined;
  const size = od === 3.2 ? '23' : String(od).padStart(2, '0');
  return `KQ2H${size}-${code[s]}`;
}
