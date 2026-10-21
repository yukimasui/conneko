import { IQR_BUS } from '../mitsubishi/melsec';
import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 主ベースユニット R35B（入出力スロット 5）。
 * 外形 W245 × H101 × D32.5 mm（1mm ≒ 2px）。R38B（8 スロット、W328）・R312B（12 スロット、W439）は
 * スロット数と幅だけが違うので、定義の生成は buildRBase にまとめている。
 *
 * 黒い樹脂のベースに、左から電源スロット（POWER、幅 54.6mm）、CPU スロット（幅 27.8mm）、
 * 入出力スロット 0, 1, …（ピッチ約 27.8mm）が並ぶ。各スロットの中央にユニット接続用のベースコネクタ、
 * 上下にユニット固定用のフック穴、左右の端に取付穴（M4）、右端に増設ケーブル用コネクタ（カバー付き）がある。
 *
 * 装着（図面の mount）の約束:
 *   位置 1 = 電源ユニット（R61P など）、位置 2 = CPU ユニット（R04CPU など）、位置 3 以降 = 入出力スロット 0, 1, …
 * 装着したユニットは位置の小さい順に、電源スロットの左端（origin）から左詰めで並べて描く。
 * 入出力番号は電源ユニット・CPU を除いた入出力ユニットに、位置の順に 16 点単位で X0（= Y0）から割り付ける
 * （iQ-R の入出力番号は入力・出力で共通の並び。16 点ユニットは 16 点、32 点ユニットは 32 点を占有する）。
 *
 * 制限: 位置の番号に抜け（空きスロット）があっても詰めて描き、入出力番号も詰めて割り付ける。
 * 実機の初期設定では空きスロットも 16 点を占有するので、空きスロットにはブランクカバー RG60 を装着しておく。
 */

export interface RBaseOptions {
  type: string;
  model: string;
  /** 入出力スロット数 */
  ioSlots: number;
  /** 外形幅[mm] */
  widthMm: number;
  /** 内部消費電流 DC5V[A] */
  load5V: number;
}

const H = 202;
/** 電源スロットの左端（装着したユニットを並べ始める位置） */
const ORIGIN_X = 22;
/** ユニット（高さ 106mm）はベース（高さ 101mm）より上下に約 2.5mm はみ出す */
const ORIGIN_Y = -5;
/** スロットの幅（電源ユニット 54.6mm、CPU・入出力ユニット 27.8mm） */
const PS_W = 109;
const SLOT_W = 56;

const text = (x: number, y: number, t: string, size = 4, fill = '#e6e7e9', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 取付穴（M4 用の長穴） */
const hole = (x: number, y: number) => `
  <rect x="${x - 4}" y="${y - 6}" width="8" height="12" rx="4" fill="#0a0a0b" stroke="#55585f" stroke-width="0.6"/>`;

/** ベースコネクタ（ユニット裏面のコネクタが差さる。2 列のピン穴） */
const baseConnector = (cx: number, cy: number) => `
  <rect x="${cx - 7}" y="${cy - 24}" width="14" height="48" rx="1" fill="#101113" stroke="#4a4d55" stroke-width="0.6"/>
  <rect x="${cx - 5}" y="${cy - 22}" width="10" height="44" rx="0.6" fill="#050506"/>
  <path d="M${cx - 2} ${cy - 20} V${cy + 20} M${cx + 2} ${cy - 20} V${cy + 20}" stroke="#b8902e" stroke-width="1.2" stroke-dasharray="1 1.4"/>`;

/** ユニット固定用のフック穴（上側）と固定ネジ穴（下側） */
const hooks = (x: number, w: number) => `
  <rect x="${x + w / 2 - 6}" y="9" width="12" height="5" rx="1" fill="#0a0a0b"/>
  <circle cx="${x + w / 2}" cy="${H - 12}" r="2.6" fill="#0a0a0b" stroke="#55585f" stroke-width="0.5"/>`;

/** iQ-R 主ベースユニットの機器定義を生成する */
export function buildRBase(o: RBaseOptions): DeviceDefinition {
  const W = Math.round(o.widthMm * 2);
  const slots = [
    { x: ORIGIN_X, w: PS_W, label: 'POWER' },
    { x: ORIGIN_X + PS_W, w: SLOT_W, label: 'CPU' },
    ...Array.from({ length: o.ioSlots }, (_, i) => ({ x: ORIGIN_X + PS_W + SLOT_W * (i + 1), w: SLOT_W, label: String(i) })),
  ];
  const right = ORIGIN_X + PS_W + SLOT_W * (o.ioSlots + 1);

  const svg = `
  <defs>
    <linearGradient id="base-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c2e35"/>
      <stop offset="0.5" stop-color="#22242a"/>
      <stop offset="1" stop-color="#1a1b20"/>
    </linearGradient>
    <linearGradient id="rail-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b3e47"/>
      <stop offset="1" stop-color="#2a2c33"/>
    </linearGradient>
    <linearGradient id="slot-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16171b"/>
      <stop offset="0.5" stop-color="#1e2025"/>
      <stop offset="1" stop-color="#16171b"/>
    </linearGradient>
  </defs>

  <!-- ベース本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2" fill="url(#base-{{uid}})" stroke="#0c0c0e" stroke-width="1"/>
  <!-- 上下のレール -->
  <rect x="${ORIGIN_X - 2}" y="4" width="${right - ORIGIN_X + 4}" height="22" rx="1" fill="url(#rail-{{uid}})"/>
  <rect x="${ORIGIN_X - 2}" y="${H - 26}" width="${right - ORIGIN_X + 4}" height="22" rx="1" fill="url(#rail-{{uid}})"/>

  <!-- スロット -->
  ${slots
    .map(
      (s) => `
  <rect x="${s.x + 1.5}" y="28" width="${s.w - 3}" height="${H - 56}" rx="1" fill="url(#slot-{{uid}})" stroke="#0b0b0d" stroke-width="0.6"/>
  ${hooks(s.x, s.w)}
  ${text(s.x + s.w / 2, 22.5, s.label, s.label.length > 3 ? 4.4 : 5, '#f0f1f3')}
  ${baseConnector(s.x + s.w / 2, 100)}`,
    )
    .join('')}
  <!-- スロット間の仕切り -->
  ${slots
    .slice(1)
    .map((s) => `<line x1="${s.x}" y1="28" x2="${s.x}" y2="${H - 28}" stroke="#3d4048" stroke-width="1"/>`)
    .join('')}

  <!-- 取付穴（左右の端） -->
  ${hole(11, 18)}${hole(11, H - 18)}
  ${hole(W - 11, 18)}${hole(W - 11, H - 18)}
  <!-- 型式・シリーズ名（左端に縦書き） -->
  <text x="13" y="${H / 2}" transform="rotate(-90 13 ${H / 2})" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#f0f1f3">${o.model}</text>
  <!-- 増設ケーブル用コネクタ（右端、カバー付き） -->
  <rect x="${W - 19}" y="62" width="15" height="78" rx="2" fill="#3a3d45" stroke="#101114" stroke-width="0.6"/>
  <rect x="${W - 16}" y="72" width="9" height="58" rx="1" fill="#16171b"/>
  ${text(W - 11.5, 58, 'OUT', 3.6, '#c9ccd0')}
`;

  return {
    type: o.type,
    name: 'PLC ベースユニット',
    model: o.model,
    maker: '三菱電機',
    category: 'plc',
    description: `三菱電機 MELSEC iQ-R シリーズの主ベースユニット（入出力スロット ${o.ioSlots}）。外形 W${o.widthMm} × H101 × D32.5mm、内部消費電流 DC5V ${Math.round(o.load5V * 1000)}mA（電源ユニットから供給）。電源ユニット・CPU ユニット・入出力ユニットを装着する。装着位置（mount の slot）は 1 = 電源ユニット、2 = CPU ユニット、3 以降 = 入出力スロット 0〜${o.ioSlots - 1}（位置 n が入出力スロット n−3）。入出力番号は入出力ユニットに位置の順で 16 点単位に X0/Y0 から割り付ける（入力と出力で共通の並び）。空きスロットは詰めて割り付けるので、実機の初期設定（空きスロット 16 点）に合わせるには空きスロットにブランクカバー RG60 を装着する。外部配線用の端子はない（FG は電源ユニットの端子で接地する）。`,
    labelPrefix: 'BASE',
    width: W,
    height: H,
    svg,
    terminals: [],
    bus: {
      kind: IQR_BUS,
      host: {
        // 電源ユニット・CPU ユニットも装着するユニットとして数える
        slots: o.ioSlots + 2,
        origin: { x: ORIGIN_X, y: ORIGIN_Y },
        numbering: { mode: 'shared', unit: 16, start: { input: 0 } },
      },
      load: { '5V': o.load5V },
    },
  };
}

const def: DeviceDefinition = buildRBase({ type: 'mitsubishi.r35b', model: 'R35B', ioSlots: 5, widthMm: 245, load5V: 0.58 });

export default def;
