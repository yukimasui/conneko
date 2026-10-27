/**
 * ファナック（FANUC）のロボット・ロボットコントローラーを描くための共通部品と、
 * ロボットとコントローラーをつなぐコネクターの種類（connector.kind）の対応。
 *
 * catalog/ 配下の各機器ファイル（1 機器 1 ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * ロボットとコントローラーの組み合わせ（IAI のアクチュエーターと同じ考え方。src/devices/iai/actuator.ts）:
 * - コントローラー側のロボット接続コネクター（RM1: モーター動力・ブレーキ、RP1: パルスコーダ・ロボット I/O）は、
 *   コントローラーごとの種類（'FANUC-R30IB-MINI-RM1' など）にする。
 * - ロボット側のコネクターはロボットごとの種類（'FANUC-LRM200ID-RM1' など）にし、`mates` に適合するコントローラーの種類を書く。
 *   適合しないロボットとコントローラーは connector-mismatch になる。
 * - ロボット接続ケーブル（ロボットに付属する専用ケーブル）は、src/data/cables.ts の CableSpec（両端の種類の組）で表し、
 *   ロボット側のコネクターの `defaultCable` で選ぶ。部品表にケーブルが 1 本ずつ載る。
 * - 新しいロボット・コントローラーを足すときは、ここに種類の組を足し、ロボット側の mates と cables.ts の組を足す。
 */
import type { AcceptSpec, ConnectorSpec, PinDef } from '../types';

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

/* ------------------------------------------------------------------ */
/* 電気的な定数                                                         */
/* ------------------------------------------------------------------ */

/** 周辺機器 I/O・ロボット I/O の DC24V（+24V 側。外部電源を使うときの許容範囲は推定で ±10%） */
export const DC24_PLUS: AcceptSpec = { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+'] };
/** 入力のコモン（SDICOM）。+24V（プラスコモン）にも 0V（マイナスコモン）にもつなぐ */
export const DC24_ANY: AcceptSpec = { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+', '-'] };

/* ------------------------------------------------------------------ */
/* コネクターの種類                                                     */
/* ------------------------------------------------------------------ */

/** コントローラー側のロボット接続コネクターの種類 */
export const CTRL_KIND = {
  /** R-30iB Mini Plus */
  miniPlus: { rm1: 'FANUC-R30IB-MINI-RM1', rp1: 'FANUC-R30IB-MINI-RP1' },
} as const;

/** ロボット側のロボット接続コネクターの種類 */
export const ROBOT_KIND = {
  lrMate200iD: { rm1: 'FANUC-LRM200ID-RM1', rp1: 'FANUC-LRM200ID-RP1' },
} as const;

/** ティーチングペンダント（iPendant）のコネクター */
export const IPENDANT_KIND = 'FANUC-IPENDANT';

/** LR Mate のエンドエフェクタ用 I/O コネクター（EE、12 ピン丸形） */
export const EE12_KIND = 'FANUC-EE12';

/** ロボット接続ケーブル RP1 のピン数（Conneko のピン番号の数。実機のピン番号ではない） */
export const RP1_PINS = 24;

/** モーター動力・ブレーキ（RM1）のコネクター。電気的なピンは扱わない（太いケーブル 1 本で描く） */
export const rm1Connector = (kind: string, extra: Partial<ConnectorSpec> = {}): ConnectorSpec => ({
  kind,
  pins: 0,
  width: 16,
  style: 'lan',
  required: true,
  ...extra,
});

/** パルスコーダ・ロボット I/O（RP1）のコネクター。ロボット I/O のピンを持つ（太いケーブル 1 本で描く） */
export const rp1Connector = (kind: string, extra: Partial<ConnectorSpec> = {}): ConnectorSpec => ({
  kind,
  pins: RP1_PINS,
  width: 14,
  style: 'lan',
  required: true,
  ...extra,
});

/* ------------------------------------------------------------------ */
/* ロボット I/O（RI / RO）                                              */
/* ------------------------------------------------------------------ */

/**
 * RP1 のピン（Conneko のピン番号）。ロボット I/O をロボット接続ケーブル RP1 で通す（ロボット I/O の RI/RO とその電源は
 * パルスコーダの信号と同じ RP1 のケーブルを通る）。実機のピン番号は資料で確認できなかったため、Conneko の中だけの番号を付けた（推定）。
 * 1〜8 RI1〜RI8、9〜16 RO1〜RO8、17・18 +24V（24F）、19・20 0V、21〜24 パルスコーダの信号。
 */
export const RP1_MAP = {
  ri: (n: number) => n,
  ro: (n: number) => 8 + n,
  p24: [17, 18],
  m0v: [19, 20],
  pulsecoder: [21, 22, 23, 24],
} as const;

/** ロボット側の RP1 のピン（向きのない中継。ロボットの中の配線でエンドエフェクタ用コネクター EE へ通じる） */
export function robotRp1Pins(cn: string): PinDef[] {
  const pins: PinDef[] = [];
  for (let i = 1; i <= 8; i++) pins.push({ id: `${cn}#${RP1_MAP.ri(i)}`, label: `RI${i}`, note: `ロボット入力 RI${i}（コントローラーの RI${i} へ）`, role: 'pass', optional: true });
  for (let i = 1; i <= 8; i++) pins.push({ id: `${cn}#${RP1_MAP.ro(i)}`, label: `RO${i}`, note: `ロボット出力 RO${i}（コントローラーの RO${i} から）`, role: 'pass', optional: true });
  for (const p of RP1_MAP.p24) pins.push({ id: `${cn}#${p}`, label: '24F', note: 'ロボット I/O 用の +24V（コントローラーから）', role: 'pass', optional: true });
  for (const p of RP1_MAP.m0v) pins.push({ id: `${cn}#${p}`, label: '0V', note: 'ロボット I/O 用の 0V（コントローラーから）', role: 'pass', optional: true });
  RP1_MAP.pulsecoder.forEach((p, i) => pins.push({ id: `${cn}#${p}`, label: `PC${i + 1}`, note: 'パルスコーダの信号・電源（Conneko では扱わない）', role: 'signal', optional: true }));
  return pins;
}

/**
 * LR Mate 200iD のエンドエフェクタ用コネクター EE（12 ピン）の割付け。
 * 1〜6 RI1〜RI6、7 RO7、8 RO8、9・10 +24V、11・12 0V（LR Mate 200iD 機構部取扱説明書の図の引用として販売店が掲載していた割付け。一次資料は未確認）。
 * RO1〜RO6 は電磁弁内蔵仕様の電磁弁の駆動に使うため EE には出ていない。
 */
export const EE12_PINS: { pin: number; name: string; rp1: number; note: string }[] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ pin: n, name: `RI${n}`, rp1: RP1_MAP.ri(n), note: `ロボット入力 RI${n}` })),
  { pin: 7, name: 'RO7', rp1: RP1_MAP.ro(7), note: 'ロボット出力 RO7（+24V を出す）' },
  { pin: 8, name: 'RO8', rp1: RP1_MAP.ro(8), note: 'ロボット出力 RO8（+24V を出す）' },
  { pin: 9, name: '24V', rp1: RP1_MAP.p24[0], note: 'エンドエフェクタ用の +24V（コントローラーの 24F）' },
  { pin: 10, name: '24V', rp1: RP1_MAP.p24[0], note: 'エンドエフェクタ用の +24V（コントローラーの 24F）' },
  { pin: 11, name: '0V', rp1: RP1_MAP.m0v[0], note: 'エンドエフェクタ用の 0V' },
  { pin: 12, name: '0V', rp1: RP1_MAP.m0v[0], note: 'エンドエフェクタ用の 0V' },
];

/* ------------------------------------------------------------------ */
/* 描画部品                                                             */
/* ------------------------------------------------------------------ */

/** 塗装色（標準のファナックイエローと、クリーン仕様・食品向けの白塗装） */
export const PAINTS = {
  yellow: { light: '#ffe14d', base: '#f6c400', dark: '#c79600', edge: '#8f6c00', logo: '#1b1b1b' },
  white: { light: '#ffffff', base: '#eceeec', dark: '#c4c8c6', edge: '#8d9290', logo: '#1b1b1b' },
} as const;

export type PaintKey = keyof typeof PAINTS;

/** ファナックのロゴ（黄色地に黒文字。幅 w、高さ h の枠に収める） */
export const fanucLogo = (x: number, y: number, w: number, h: number) => `
  <rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="1" fill="#f6c400" stroke="#8f6c00" stroke-width="0.5"/>
  ${text(x + w / 2, y + h * 0.76, 'FANUC', n2(h * 0.78), '#111', 'middle', 'bold', ' letter-spacing="0.4"')}`;

/** ねじ端子 1 極（上から見たマイナス・プラスねじ） */
export const screw = (x: number, y: number, r = 3.6) => `
  <circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="url(#fscrew-{{uid}})" stroke="#4d5156" stroke-width="0.5"/>
  <path d="M${n2(x - r * 0.6)} ${n2(y)} H${n2(x + r * 0.6)} M${n2(x)} ${n2(y - r * 0.6)} V${n2(y + r * 0.6)}" stroke="#41454a" stroke-width="0.8"/>`;

/** ねじのグラデーション（screw と組で使う） */
export const screwDefs = `
    <radialGradient id="fscrew-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="0.6" stop-color="#bfc3c7"/>
      <stop offset="1" stop-color="#8b9095"/>
    </radialGradient>`;
