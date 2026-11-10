/**
 * 川崎重工業（Kawasaki）のロボット・ロボットコントローラーを描くための共通部品と、コネクターの種類（connector.kind）・入出力のピン定義。
 *
 * catalog/ 配下の各機器ファイル（1 機器 1 ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * ロボットとコントローラーの組み合わせ（ファナック・安川電機と同じ考え方。src/devices/fanuc/parts.ts）:
 * - コントローラー側のロボット接続コネクター（X1: モーター動力・ブレーキ、X2: エンコーダー信号）はコントローラーごとの種類
 *   （'KAWASAKI-E01-X1' など）、ロボット側はロボットごとの種類（'KAWASAKI-RS007N-X1' など）にし、ロボット側の `mates` に適合するコントローラーの種類を書く。
 * - ロボット接続のハーネス（ロボットに付属）は src/data/cables.ts の CableSpec（両端の種類の組）で表し、ロボット側の `defaultCable` で選ぶ。
 */
import type { InternalLink, PinDef } from '../types';

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

/** Kawasaki のロゴ（斜体の太字。x は anchor の位置、y はベースライン） */
export const kawasakiLogo = (x: number, y: number, size: number, fill = '#1b1b1b', anchor: 'start' | 'middle' | 'end' = 'middle', extra = '') =>
  text(x, y, 'Kawasaki', size, fill, anchor, 'bold', ` font-style="italic" letter-spacing="${n2(size * 0.02)}"${extra}`);

/** ロボットの塗装（橙） */
export const KAWASAKI_ORANGE = { light: '#ffbe5c', base: '#f39200', dark: '#c26c00', edge: '#7e4700' } as const;

/* ------------------------------------------------------------------ */
/* コネクターの種類                                                     */
/* ------------------------------------------------------------------ */

export const KAWASAKI_CTRL_KIND = {
  e01: { x1: 'KAWASAKI-E01-X1', x2: 'KAWASAKI-E01-X2' },
} as const;

export const KAWASAKI_ROBOT_KIND = {
  rs007n: { x1: 'KAWASAKI-RS007N-X1', x2: 'KAWASAKI-RS007N-X2' },
} as const;

/** ティーチペンダントのコネクター（E コントローラー） */
export const KAWASAKI_TP_KIND = 'KAWASAKI-E-TP';

/** RS007N のアプリケーション用の信号線のコネクター（ベース側・アーム側。同じ形の相手コネクター付きケーブルで配線する） */
export const RS_USER_KIND = 'KAWASAKI-RS007N-USER';
/** アプリケーション用の信号線の本数（推定） */
export const RS_USER_PINS = 10;

/* ------------------------------------------------------------------ */
/* 汎用入出力（D-sub 37 ピン）                                           */
/* ------------------------------------------------------------------ */

export const DSUB37 = 'DSUB37';
export const IO_PINS = 37;
/** 出力 1 点の定格電流[A]（推定） */
export const E01_OUT_RATED = 0.1;

/**
 * 汎用入力のコネクター（D-sub 37 ピン。Conneko の中の割付け。推定）:
 * 1〜32 入力 1001〜1032（AS 言語の信号番号）、33・34 +24V（内部電源。入力の共通）、35〜37 0V。
 * NPN 仕様（入力と 0V の間を接点・NPN 出力で閉じて ON。プラスコモン）。
 */
export function e01Inputs(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  for (let n = 1; n <= 32; n++) {
    pins.push({ id: id(n), label: `IN${1000 + n}（${n}）`, note: `汎用入力 ${1000 + n}（DC24V。0V へ引き込んで ON）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: id(33) }, optional: true });
  }
  powerPins(cn, pins, links);
  return { pins, links };
}

/**
 * 汎用出力のコネクター（D-sub 37 ピン。Conneko の中の割付け。推定）:
 * 1〜32 出力 1〜32（AS 言語の信号番号）、33・34 +24V（内部電源）、35〜37 0V（出力の共通）。
 * NPN トランジスタ（負荷を +24V と出力の間につなぐ）。
 */
export function e01Outputs(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  for (let n = 1; n <= 32; n++) {
    pins.push({ id: id(n), label: `OUT${n}（${n}）`, note: `汎用出力 ${n}（NPN トランジスタ、DC24V ${E01_OUT_RATED}A）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
    links.push({ from: id(n), to: id(35), switch: 'output', ratedCurrent: E01_OUT_RATED });
  }
  powerPins(cn, pins, links);
  return { pins, links };
}

function powerPins(cn: string, pins: PinDef[], links: InternalLink[]) {
  const id = (n: number) => `${cn}#${n}`;
  pins.push(
    { id: id(33), label: '+24V（33）', note: '入出力用の DC24V +24V（内部電源）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' }, optional: true },
    { id: id(34), label: '+24V（34）', note: '入出力用の +24V。33 番と内部で共通', role: 'pass', optional: true },
    { id: id(35), label: '0V（35）', note: '入出力用の DC24V 0V（内部電源）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' }, optional: true },
    { id: id(36), label: '0V（36）', note: '入出力用の 0V。35 番と内部で共通', role: 'pass', optional: true },
    { id: id(37), label: '0V（37）', note: '入出力用の 0V。35 番と内部で共通', role: 'pass', optional: true },
  );
  links.push({ from: id(33), to: id(34) }, { from: id(35), to: id(36) }, { from: id(35), to: id(37) });
}
