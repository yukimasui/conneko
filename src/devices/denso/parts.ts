/**
 * デンソーウェーブ（DENSO）のロボット・ロボットコントローラーを描くための共通部品と、コネクターの種類（connector.kind）・ピンの割付け。
 *
 * catalog/ 配下の各機器ファイル（1 機器 1 ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * ロボットとコントローラーの組み合わせ（ファナック・安川電機と同じ考え方。src/devices/fanuc/parts.ts）:
 * - コントローラー側のロボット接続コネクター（MOTOR: モーター動力・ブレーキ、ENCODER: エンコーダー・ハンド I/O）は
 *   コントローラーごとの種類（'DENSO-RC8A-MOTOR' など）にする。
 * - ロボット側はロボットごとの種類（'DENSO-VS060-MOTOR' など）にし、`mates` に適合するコントローラーの種類を書く。
 * - ロボット接続ケーブル（ロボットに付属するケーブル）は src/data/cables.ts の CableSpec（両端の種類の組）で表し、
 *   ロボット側のコネクターの `defaultCable` で選ぶ。部品表にケーブルが 1 本ずつ載る。
 */
import type { PinDef } from '../types';

/** 数値を SVG 用に丸める */
export const n2 = (v: number) => +v.toFixed(2);

export const text = (
  x: number,
  y: number,
  t: string,
  size = 6,
  fill = '#1d1f22',
  anchor: 'start' | 'middle' | 'end' = 'middle',
  weight: 'normal' | 'bold' = 'normal',
  extra = '',
) =>
  `<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${t}</text>`;

/** デンソーのロゴの赤 */
export const DENSO_RED = '#dc0032';

/** DENSO のロゴ（赤い太字。x は anchor の位置、y はベースライン） */
export const densoLogo = (x: number, y: number, size: number, anchor: 'start' | 'middle' | 'end' = 'middle', extra = '') =>
  text(x, y, 'DENSO', size, DENSO_RED, anchor, 'bold', ` letter-spacing="${n2(size * 0.08)}"${extra}`);

/** ロボットの塗装（白。デンソーの VS シリーズの標準色） */
export const DENSO_WHITE = { light: '#ffffff', base: '#eef0f1', dark: '#c3c8cc', edge: '#868c92' } as const;

/* ------------------------------------------------------------------ */
/* コネクターの種類                                                     */
/* ------------------------------------------------------------------ */

/** コントローラー側のロボット接続コネクター */
export const DENSO_CTRL_KIND = {
  rc8a: { motor: 'DENSO-RC8A-MOTOR', encoder: 'DENSO-RC8A-ENC' },
} as const;

/** ロボット側のロボット接続コネクター */
export const DENSO_ROBOT_KIND = {
  vs060: { motor: 'DENSO-VS060-MOTOR', encoder: 'DENSO-VS060-ENC' },
} as const;

/** ティーチングペンダントのコネクター（RC8 / RC8A） */
export const DENSO_TP_KIND = 'DENSO-RC8-TP';

/** VS シリーズのハンド I/O コネクター（第 4 軸の付け根。Conneko では 20 ピン。推定） */
export const DENSO_HAND_KIND = 'DENSO-VS-HANDIO';
export const HAND_PINS = 20;

/* ------------------------------------------------------------------ */
/* ハンド I/O（手先の入出力）                                            */
/* ------------------------------------------------------------------ */

/**
 * エンコーダーケーブル（ロボット接続ケーブル ENCODER）のピン（Conneko の中の番号。推定）。
 * RC8A のハンド I/O（入力 8 点・出力 8 点）はロボットの中の配線とこのケーブルを通ってコントローラーへ戻る。
 * 1〜8 ハンド入力 HI0〜HI7、9〜16 ハンド出力 HO0〜HO7、17・18 +24V、19・20 0V、21〜24 エンコーダーの信号・電源（扱わない）。
 */
export const ENC_MAP = {
  hi: (n: number) => n + 1,
  ho: (n: number) => n + 9,
  p24: [17, 18],
  m0v: [19, 20],
  encoder: [21, 22, 23, 24],
} as const;
export const ENC_PINS = 24;

/**
 * ハンド I/O コネクターの割付け（Conneko の中の番号。推定）: 1〜8 HI0〜HI7、9〜16 HO0〜HO7、17・18 +24V、19・20 0V。
 * ピン番号はエンコーダーケーブルの番号と同じ（ロボットの中の配線で同じ番号のピンへ通じる）。
 */
export const HAND_IO: { pin: number; name: string; note: string }[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ pin: ENC_MAP.hi(i), name: `HI${i}`, note: `ハンド入力 HI${i}（コントローラーのハンド入力へ）` })),
  ...Array.from({ length: 8 }, (_, i) => ({ pin: ENC_MAP.ho(i), name: `HO${i}`, note: `ハンド出力 HO${i}（NPN。負荷を +24V と出力の間につなぐ）` })),
  { pin: 17, name: '+24V', note: 'ハンド用の +24V（コントローラーから）' },
  { pin: 18, name: '+24V', note: 'ハンド用の +24V（コントローラーから）' },
  { pin: 19, name: '0V', note: 'ハンド用の 0V（コントローラーから）' },
  { pin: 20, name: '0V', note: 'ハンド用の 0V（コントローラーから）' },
];

/** ロボット側のエンコーダーコネクターのピン（向きのない中継。ロボットの中の配線でハンド I/O コネクターへ通じる） */
export function robotEncoderPins(cn: string): PinDef[] {
  const pins: PinDef[] = HAND_IO.map((h) => ({ id: `${cn}#${h.pin}`, label: h.name, note: h.note, role: 'pass', optional: true }));
  ENC_MAP.encoder.forEach((p, i) => pins.push({ id: `${cn}#${p}`, label: `ENC${i + 1}`, note: 'エンコーダーの信号・電源（Conneko では扱わない）', role: 'signal', optional: true }));
  return pins;
}
