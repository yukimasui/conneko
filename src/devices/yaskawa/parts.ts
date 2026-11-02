/**
 * 安川電機（YASKAWA）の機器を描くための共通部品と、コネクタの種類（connector.kind）。
 *
 * catalog/ 配下の各機器ファイル（1 機器 1 ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * ロボットとコントローラーの組み合わせ（ファナックと同じ考え方。src/devices/fanuc/parts.ts）:
 * - コントローラー側のマニピュレータケーブルのコネクタは、コントローラーごとの種類（'YASKAWA-YRC1000MICRO-X1'）にする。
 * - ロボット側のコネクタはロボットごとの種類（'YASKAWA-GP7-X1'）にし、`mates` に適合するコントローラーの種類を書く。
 * - マニピュレータケーブル（ロボットに付属する専用ケーブル）は src/data/cables.ts の CableSpec（両端の種類の組）で表し、
 *   ロボット側のコネクタの `defaultCable` で選ぶ。部品表にケーブルが 1 本載る。
 */

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

/** 安川電機のコーポレートカラー（ロゴの青） */
export const YASKAWA_BLUE = '#0068b7';

/** YASKAWA のロゴ（文字だけ。x は左端、y はベースライン） */
export const yaskawaLogo = (x: number, y: number, size: number, fill = YASKAWA_BLUE, anchor: 'start' | 'middle' | 'end' = 'start', extra = '') =>
  text(x, y, 'YASKAWA', size, fill, anchor, 'bold', ` font-style="italic" letter-spacing="${n2(size * 0.06)}"${extra}`);

/* ------------------------------------------------------------------ */
/* コネクタの種類                                                       */
/* ------------------------------------------------------------------ */

/** Σ-7 のサーボパックの CN2 とサーボモーター SGM7J のエンコーダーのコネクタ（専用のエンコーダーケーブル） */
export const SIGMA7_ENCODER = 'YASKAWA-SIGMA7-ENC';

/** コントローラー側のマニピュレータケーブルのコネクタ */
export const YRC_CTRL_KIND = {
  /** YRC1000micro（動力・エンコーダーを 1 本のケーブルで） */
  micro: 'YASKAWA-YRC1000MICRO-X1',
} as const;

/** ロボット側のマニピュレータケーブルのコネクタ */
export const YRC_ROBOT_KIND = {
  gp7: 'YASKAWA-GP7-X1',
} as const;

/** プログラミングペンダントのコネクタ（YRC1000micro） */
export const YRC_PP_KIND = 'YASKAWA-YRC1000MICRO-PP';

/** GP7 の内部ユーザ配線のコネクタ（ベース側・U アーム側。同じ形の相手コネクタ付きケーブルで配線する） */
export const GP7_USER_KIND = 'YASKAWA-GP7-USER';
/** 内部ユーザ配線の芯数（推定） */
export const GP7_USER_PINS = 17;
