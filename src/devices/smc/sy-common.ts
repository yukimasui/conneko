/**
 * SMC 5 ポート電磁弁 SY シリーズに共通の仕様（切換えの種類ごとのエアの通り道・使用圧力範囲・空圧回路図の記号）と、
 * パイロット弁・L 形プラグ・ワンタッチ管継手の絵。
 * ボディ配管形（sy-body.ts）、ベース配管形（個別配線のマニホールドに装着する sy-manifold.ts）、
 * プラグイン形（通信タイプのマニホールドに装着する sy-serial.ts）から使う。
 *
 * 出典: SMC SY3000/5000 シリーズ カタログ
 *   型式の 4 桁目（SY3□20 の □）: 1 = 2 位置シングル、2 = 2 位置ダブル、3 = 3 位置クローズドセンタ、4 = 3 位置エキゾーストセンタ、5 = 3 位置プレッシャセンタ
 *   使用圧力範囲（内部パイロット）: 2 位置シングル 0.15〜0.7MPa、2 位置ダブル 0.1〜0.7MPa、3 位置 0.2〜0.7MPa
 *   消費電力: DC 0.35W、表示灯付き 0.4W。許容電圧変動 ±10%
 */
import type { AcceptSpec, AirLink, PneumaticHint } from '../types';
import { text } from '../generic/parts';

/** 切換えの種類 */
export type SyFunction = 'single' | 'double' | 'closed' | 'exhaust' | 'pressure';

export interface SyFunctionSpec {
  /** 型式の 4 桁目 */
  digit: number;
  /** ソレノイドの数 */
  solenoids: 1 | 2;
  /** 一般名称 */
  name: string;
  /** 説明に使う短い名前 */
  short: string;
  minPressure: number;
  maxPressure: number;
  /** 3 位置の中立 */
  center?: 'closed' | 'exhaust' | 'pressure';
  /** 動作の説明 */
  behavior: string;
}

export const SY_FUNCTIONS: Record<SyFunction, SyFunctionSpec> = {
  single: {
    digit: 1,
    solenoids: 1,
    name: '電磁弁（シングルソレノイド）',
    short: '2 位置シングル',
    minPressure: 0.15,
    maxPressure: 0.7,
    behavior: '通電中だけ切り換わり（P→A・B→EB）、通電をやめるとばねで元の位置（P→B・A→EA）に戻る。',
  },
  double: {
    digit: 2,
    solenoids: 2,
    name: '電磁弁（ダブルソレノイド）',
    short: '2 位置ダブル',
    minPressure: 0.1,
    maxPressure: 0.7,
    behavior: 'A 側に通電すると P→A・B→EB、B 側に通電すると P→B・A→EA に切り換わり、通電をやめてもその位置を保つ（A と B を同時に通電しない）。',
  },
  closed: {
    digit: 3,
    solenoids: 2,
    name: '電磁弁（3 位置クローズドセンタ）',
    short: '3 位置クローズドセンタ',
    minPressure: 0.2,
    maxPressure: 0.7,
    center: 'closed',
    behavior:
      'A 側に通電すると P→A・B→EB、B 側に通電すると P→B・A→EA。どちらも通電していないとばねで中立に戻り、すべてのポートを閉じる（シリンダをその位置で止める。A と B を同時に通電しない）。',
  },
  exhaust: {
    digit: 4,
    solenoids: 2,
    name: '電磁弁（3 位置エキゾーストセンタ）',
    short: '3 位置エキゾーストセンタ',
    minPressure: 0.2,
    maxPressure: 0.7,
    center: 'exhaust',
    behavior:
      'A 側に通電すると P→A・B→EB、B 側に通電すると P→B・A→EA。どちらも通電していないとばねで中立に戻り、P を閉じて A・B を排気する（シリンダを自由にする。A と B を同時に通電しない）。',
  },
  pressure: {
    digit: 5,
    solenoids: 2,
    name: '電磁弁（3 位置プレッシャセンタ）',
    short: '3 位置プレッシャセンタ',
    minPressure: 0.2,
    maxPressure: 0.7,
    center: 'pressure',
    behavior:
      'A 側に通電すると P→A・B→EB、B 側に通電すると P→B・A→EA。どちらも通電していないとばねで中立に戻り、P を A・B の両方へ通して EA・EB を閉じる（A と B を同時に通電しない）。',
  },
};

/** 切換えの種類の並び（選択肢の順） */
export const SY_FUNCTION_ORDER: SyFunction[] = ['single', 'double', 'closed', 'exhaust', 'pressure'];

/**
 * 機器の中のエアの通り道。A 側に通電した位置を on、B 側（シングルは通電していない位置）を off にする。
 * 3 位置の中立の通り道（エキゾーストセンタの A→EA・B→EB、プレッシャセンタの P→A・P→B）は、
 * どれも on / off のどちらかの位置にもある通り道なので、届く範囲の計算には足さない。
 */
export function syAirLinks(): AirLink[] {
  return [
    { from: 'P', to: 'B', directed: true, valve: 'off' },
    { from: 'A', to: 'EA', directed: true, valve: 'off' },
    { from: 'P', to: 'A', directed: true, valve: 'on' },
    { from: 'B', to: 'EB', directed: true, valve: 'on' },
  ];
}

/**
 * 空圧回路図の記号。sol はソレノイドの + 端子の ID（シングルは a 側だけ）。
 * プラグイン形の弁（ソレノイドの電気端子を画面に出さないもの）は sol を省略する
 */
export function syPneumatic(fn: SyFunction, sol?: { a: string; b?: string }): PneumaticHint {
  const f = SY_FUNCTIONS[fn];
  return {
    symbol: 'valve',
    ports: { '1': 'P', '2': 'B', '4': 'A', '3': 'EB', '5': 'EA' },
    valve: {
      ways: 5,
      positions: f.center ? 3 : 2,
      operators: { a: 'solenoid', b: f.solenoids === 2 ? 'solenoid' : 'spring' },
      ...(f.center ? { center: f.center } : {}),
      ...(sol ? { solenoids: f.solenoids === 2 ? { a: sol.a, b: sol.b } : { a: sol.a } } : {}),
    },
  };
}

/** ソレノイドの受電条件（DC24V ±10%、極性あり） */
export const coilAccepts = (c: '+' | '-'): AcceptSpec => ({ system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: [c] });

/** 0.4W / 24V（表示灯付き） */
export const SY_COIL_CURRENT = 0.017;

/** 共通のグラデーション（弁本体の白い樹脂・パイロット弁・マニホールドのアルミ） */
export const syDefs = `
    <linearGradient id="valve-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#c9cdd1"/>
    </linearGradient>
    <linearGradient id="pilot-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595e"/>
      <stop offset="0.5" stop-color="#36393c"/>
      <stop offset="1" stop-color="#1f2123"/>
    </linearGradient>
    <linearGradient id="alu-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3e6e9"/>
      <stop offset="0.45" stop-color="#c3c8cd"/>
      <stop offset="1" stop-color="#9aa1a8"/>
    </linearGradient>`;

/** リード線（赤・黒）。from から to へ下りる（または上る）曲線 */
export function leadWire(x1: number, y1: number, x2: number, y2: number, color: 'red' | 'black'): string {
  const [c, edge] = color === 'red' ? ['#d6302c', '#871a17'] : ['#1d1d1d', '#000'];
  const my = (y1 + y2) / 2;
  const d = `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
  return `<path d="${d}" fill="none" stroke="${edge}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
}

/** リード線の先の圧着端子（棒端子）。x, y は先端 */
export function leadTip(x: number, y: number, dir: 'up' | 'down'): string {
  const y0 = dir === 'down' ? y - 10 : y;
  return `<rect x="${x - 1.6}" y="${y0}" width="3.2" height="10" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
}

/** L 形プラグ（表示灯付き）。x, y は左上 */
export function lPlug(x: number, y: number, w: number, h: number, label = ''): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#2b2c2e" stroke="#0e0e0f" stroke-width="0.6"/>
  <rect x="${x + 2.5}" y="${y + 2.5}" width="${Math.min(7, w / 3)}" height="${Math.min(5, h / 2.6)}" rx="1" fill="#ff4a3d" opacity="0.9"/>
  ${label ? text(x + w - 5, y + h - 3.5, label, 5, '#f2f2f2') : ''}`;
}

/** ワンタッチ管継手を正面から見た絵（リリースブッシュ・チューブの穴）。cx, cy は中心、r は外側の半径 */
export function fittingFace(cx: number, cy: number, r: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#8c939a" stroke="#4b5056" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#dfe3e6" stroke="#6b7279" stroke-width="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.38}" fill="#2a2c2f"/>`;
}

/** 下向きに出たワンタッチ管継手（横から見た絵）。cx は中心、y は付け根、len は長さ */
export function fittingDown(cx: number, y: number, w: number, len: number): string {
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${len * 0.55}" fill="#a9b0b6" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - w / 2 - 1}" y="${y + len * 0.55}" width="${w + 2}" height="${len * 0.45}" rx="1.2" fill="#e4e7ea" stroke="#6b7279" stroke-width="0.5"/>`;
}

/** 左向きに出たワンタッチ管継手（横から見た絵）。x は付け根、cy は中心 */
export function fittingLeft(x: number, cy: number, h: number, len: number): string {
  return `<rect x="${x - len * 0.55}" y="${cy - h / 2}" width="${len * 0.55}" height="${h}" fill="#a9b0b6" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${x - len}" y="${cy - h / 2 - 1}" width="${len * 0.45}" height="${h + 2}" rx="1.2" fill="#e4e7ea" stroke="#6b7279" stroke-width="0.5"/>`;
}
