/**
 * SMC オートスイッチ D-M9 シリーズ（無接点、直接取付）の部品。
 *
 * オートスイッチは、シリンダ・エアチャック・ロータリアクチュエータの機器のパラメータで種類・個数を選び、
 * 機器の端子としてリード線を出す（別の機器として置かない）。理由:
 * - SMC の型式ではオートスイッチ付きのシリンダを 1 つの型式で注文する（例: CDM2B25-100Z-M9BW。末尾が種類と個数）。部品表も 1 行になる
 * - スイッチの位置（ヘッド側＝後退端・ロッド側＝前進端）がシリンダの絵と端子の名前で決まり、置き間違い・装着の手間がない
 * - ストロークで長さが変わっても、スイッチはシリンダの両端に付いたまま動く
 *
 * 端子ID: 1 個目（SW1）はヘッド側（後退端を検出）、2 個目（SW2）はロッド側（前進端を検出）。
 * 線色は IEC 60757 の色略号で、3 線式は SW1.BN（茶 +V）・SW1.BK（黒 出力）・SW1.BU（青 0V）、2 線式は SW1.BN（茶 OUT+）・SW1.BU（青 OUT−）。
 *
 * 出典: SMC オートスイッチ D-M9 シリーズ カタログ（無接点オートスイッチ 直接取付形 D-M9N(V)/D-M9P(V)/D-M9B(V)）
 *   D-M9N: 3 線式 NPN、電源電圧 DC5・12・24V（4.5〜28V）、消費電流 10mA 以下、負荷電圧 DC28V 以下、負荷電流 40mA 以下、内部降下電圧 0.8V 以下（10mA）
 *   D-M9P: 3 線式 PNP、電源電圧 DC4.5〜28V、消費電流 10mA 以下、負荷電流 40mA 以下（D-M9N と同じとする）
 *   D-M9B: 2 線式、負荷電圧 DC24V（DC10〜28V）、負荷電流 2.5〜40mA、内部降下電圧 4V 以下、漏れ電流 0.8mA 以下
 *   リード線: 3 線式は 茶 DC(+)・黒 OUT・青 DC(−)、2 線式は 茶 OUT(+)・青 OUT(−)。表示灯は ON で赤（W は 2 色表示: 適正範囲で緑）
 *   リード線長さ記号: 無記号 0.5m、M 1m、L 3m、Z 5m。シリンダの型式の個数記号: 無記号 2 個、S 1 個
 */
import type { InternalLink, ParamDef, ParamValues, SignalSpec, TerminalDef } from '../types';
import { leadProps, WIRE_HEX, type Lead, type WireColor } from '../keyence/sensor-parts';

export type SwitchKind = 'none' | 'magnet' | 'M9N' | 'M9P' | 'M9B' | 'M9NW' | 'M9PW' | 'M9BW';

export interface SwitchInfo {
  /** 型式の記号（'M9BW' など） */
  code: string;
  wires: 2 | 3;
  out: 'npn' | 'pnp' | '2wire';
  twoColor: boolean;
}

export const SWITCHES: Record<Exclude<SwitchKind, 'none' | 'magnet'>, SwitchInfo> = {
  M9N: { code: 'M9N', wires: 3, out: 'npn', twoColor: false },
  M9P: { code: 'M9P', wires: 3, out: 'pnp', twoColor: false },
  M9B: { code: 'M9B', wires: 2, out: '2wire', twoColor: false },
  M9NW: { code: 'M9NW', wires: 3, out: 'npn', twoColor: true },
  M9PW: { code: 'M9PW', wires: 3, out: 'pnp', twoColor: true },
  M9BW: { code: 'M9BW', wires: 2, out: '2wire', twoColor: true },
};

/** 負荷電流の上限[A]（D-M9N・D-M9P・D-M9B とも 40mA） */
export const SWITCH_LOAD_CURRENT = 0.04;

/** 選んだオートスイッチ（なし・マグネットのみなら undefined） */
export function switchOf(p: ParamValues): SwitchInfo | undefined {
  return SWITCHES[String(p.switch) as keyof typeof SWITCHES];
}

/** マグネット内蔵か（オートスイッチ付き、またはマグネットのみ。マグネットが標準の機器は常に true として扱う） */
export const hasMagnet = (p: ParamValues) => p.switch !== 'none';

/** スイッチの取付け位置 */
export type SwitchPos = 'both' | 'head' | 'rod';

/** 取り付けるスイッチの番号（1: ヘッド側、2: ロッド側） */
export function switchSlots(p: ParamValues): (1 | 2)[] {
  if (!switchOf(p)) return [];
  if (p.switchPos === 'head') return [1];
  if (p.switchPos === 'rod') return [2];
  return [1, 2];
}

/** オートスイッチのパラメータ（種類・個数・リード線長さ） */
export function switchParams(opts: { names: { 1: string; 2: string }; magnet?: boolean; defaultSwitch?: SwitchKind }): ParamDef[] {
  // magnet: false はマグネットが標準で内蔵されている機器（'none' はスイッチなし）
  const magnetOpt = opts.magnet === false ? [] : [{ value: 'magnet', label: 'マグネット内蔵（スイッチなし）' }];
  return [
    {
      key: 'switch',
      label: 'オートスイッチ',
      options: [
        { value: 'none', label: opts.magnet === false ? 'なし' : 'なし（マグネットなし）' },
        ...magnetOpt,
        { value: 'M9N', label: 'D-M9N（3 線式 NPN）' },
        { value: 'M9P', label: 'D-M9P（3 線式 PNP）' },
        { value: 'M9B', label: 'D-M9B（2 線式）' },
        { value: 'M9NW', label: 'D-M9NW（3 線式 NPN・2 色表示）' },
        { value: 'M9PW', label: 'D-M9PW（3 線式 PNP・2 色表示）' },
        { value: 'M9BW', label: 'D-M9BW（2 線式・2 色表示）' },
      ],
      default: opts.defaultSwitch ?? 'none',
    },
    {
      key: 'switchPos',
      label: 'スイッチの個数・位置',
      options: [
        { value: 'both', label: `2 個（${opts.names[1]}・${opts.names[2]}）` },
        { value: 'head', label: `1 個（${opts.names[1]}）` },
        { value: 'rod', label: `1 個（${opts.names[2]}）` },
      ],
      default: 'both',
    },
    {
      key: 'lead',
      label: 'リード線の長さ',
      options: [
        { value: '', label: '0.5m' },
        { value: 'M', label: '1m（M）' },
        { value: 'L', label: '3m（L）' },
        { value: 'Z', label: '5m（Z）' },
      ],
      default: '',
    },
  ];
}

/** 型式の末尾（'-M9BW'、'-M9NWLS' など）。スイッチなしなら '' */
export function switchSuffix(p: ParamValues): string {
  const s = switchOf(p);
  if (!s) return '';
  return `-${s.code}${p.lead ?? ''}${switchSlots(p).length === 1 ? 'S' : ''}`;
}

/** 型式の説明に使う、スイッチの説明 */
export function switchDescription(names: { 1: string; 2: string }): string {
  return (
    `オートスイッチ（D-M9 シリーズ）はパラメータで種類と個数を選ぶと、リード線が端子として出る。SW1 は${names[1]}、SW2 は${names[2]}を検出する。` +
    '3 線式（D-M9N・D-M9P）は 茶を +24V、青を 0V、黒（出力）を PLC の入力につなぐ（NPN は PLC の COM を +24V、PNP は 0V にする）。' +
    '2 線式（D-M9B）は茶（OUT+）・青（OUT−）を PLC の入力回路に直列に入れる（COM が +24V なら 茶を入力・青を 0V、COM が 0V なら 茶を +24V・青を入力）。' +
    '負荷電流は 40mA 以下（D-M9B は 2.5〜40mA）。リレーやソレノイドを直接駆動しない。'
  );
}

/** スイッチ 1 個分のリード線 */
function leadsOf(s: SwitchInfo): Lead[] {
  const signal: SignalSpec = { dir: 'out', kind: s.out };
  return s.wires === 3
    ? [
        { color: 'BN', label: '+V（DC4.5〜28V）', role: 'plus' },
        { color: 'BK', label: `出力（${s.out === 'pnp' ? 'PNP' : 'NPN'}）`, role: 'out', signal },
        { color: 'BU', label: '0V', role: 'minus' },
      ]
    : [
        { color: 'BN', label: 'OUT+（2 線式）', role: 'out', signal },
        { color: 'BU', label: 'OUT−（2 線式）', role: 'out', signal },
      ];
}

/** 出力の端子ID（3 線式は黒、2 線式は茶） */
export const switchOutId = (slot: 1 | 2, s: SwitchInfo) => `SW${slot}.${s.wires === 3 ? 'BK' : 'BN'}`;

/** 吹き出しの呼び名（例: '後退端 出力'） */
function hintOf(short: string, l: Lead, s: SwitchInfo): string {
  if (s.wires === 2) return `${short} ${l.color === 'BN' ? 'OUT+' : 'OUT−'}`;
  return `${short} ${l.color === 'BN' ? '+V' : l.color === 'BU' ? '0V' : '出力'}`;
}

export interface SwitchPlacement {
  slot: 1 | 2;
  /** リード線の先端の中心 X */
  x: number;
}

export interface SwitchName {
  /** 端子の吹き出し・ラベルに使う短い名前（'後退端' など。4 文字まで） */
  short: string;
  /** 説明に使う名前（'ヘッド側（後退端）' など） */
  long: string;
}

/** リード線の先端どうしの間隔[px] */
export const LEAD_PITCH = 9;

/** スイッチの端子（リード線の先）。y はリード線の先端の Y */
export function switchTerminals(p: ParamValues, places: SwitchPlacement[], y: number, names: Record<1 | 2, SwitchName>): TerminalDef[] {
  const s = switchOf(p);
  if (!s) return [];
  const leads = leadsOf(s);
  return places.flatMap(({ slot, x }) =>
    leads.map((l, i) => {
      const name = names[slot];
      const props = leadProps(l, p, 4.5, 28);
      return {
        id: `SW${slot}.${l.color}`,
        label: `SW${slot} ${WIRE_HEX[l.color].name} ${l.label}`,
        hint: hintOf(name.short, l, s),
        note: `オートスイッチ SW${slot}（${name.long}を検出）の${WIRE_HEX[l.color].name}${s.wires === 2 ? '（2 線式）' : ''}`,
        x: +(x + (i - (leads.length - 1) / 2) * LEAD_PITCH).toFixed(2),
        y,
        side: 'bottom' as const,
        ...props,
      } as TerminalDef;
    }),
  );
}

/** スイッチの出力の内部経路（検出で導通。NPN は黒 → 青、PNP は黒 → 茶、2 線式は茶 → 青） */
export function switchLinks(p: ParamValues): InternalLink[] {
  const s = switchOf(p);
  if (!s) return [];
  return switchSlots(p).map((slot) => {
    const pre = `SW${slot}.`;
    if (s.wires === 2) return { from: `${pre}BN`, to: `${pre}BU`, switch: 'output' as const, ratedCurrent: SWITCH_LOAD_CURRENT };
    return { from: `${pre}BK`, to: s.out === 'pnp' ? `${pre}BN` : `${pre}BU`, switch: 'output' as const, ratedCurrent: SWITCH_LOAD_CURRENT };
  });
}

/** 空圧回路図に書くスイッチの出力端子（head: SW1、rod: SW2） */
/** 空圧回路図に書くオートスイッチ（names は SW1・SW2 が検出する位置） */
export function pneumaticSwitchList(p: ParamValues, names: { 1: string; 2: string }): { label: string; terminal: string }[] | undefined {
  const s = switchOf(p);
  if (!s) return undefined;
  return switchSlots(p).map((slot) => ({ label: names[slot], terminal: switchOutId(slot, s) }));
}

export function pneumaticSwitches(p: ParamValues): { head?: string; rod?: string } | undefined {
  const s = switchOf(p);
  if (!s) return undefined;
  const slots = switchSlots(p);
  return {
    ...(slots.includes(1) ? { head: switchOutId(1, s) } : {}),
    ...(slots.includes(2) ? { rod: switchOutId(2, s) } : {}),
  };
}

/**
 * オートスイッチの本体（横長、溝に入る形）。x, y は左上、w は長さ。表示灯（赤 / 2 色表示は緑）を出口の反対側の端に描く。
 * exit はリード線の出る側（'left' | 'right'）
 */
export function switchBody(x: number, y: number, w: number, h: number, s: SwitchInfo, exit: 'left' | 'right'): string {
  const ledX = exit === 'right' ? x + 2.5 : x + w - 5.5;
  return `
  <rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${h}" rx="1.4" fill="#2b2d31" stroke="#0c0d0e" stroke-width="0.5"/>
  <rect x="${+(x + 1).toFixed(2)}" y="${+(y + 0.8).toFixed(2)}" width="${+(w - 2).toFixed(2)}" height="${+(h * 0.35).toFixed(2)}" rx="0.8" fill="#4a4d52" opacity="0.8"/>
  <rect x="${+ledX.toFixed(2)}" y="${+(y + h / 2 - 1.4).toFixed(2)}" width="3" height="2.8" rx="0.6" fill="${s.twoColor ? '#3ad35a' : '#ff3b30'}"/>
  <circle cx="${+(exit === 'right' ? x + w - 3 : x + 3).toFixed(2)}" cy="${+(y + h / 2).toFixed(2)}" r="0.9" fill="#9aa0a6"/>`;
}

/**
 * スイッチのリード線（灰色のシースから茶・黒・青の芯線に分かれ、先端が棒端子）。
 * from はシースの出口、cx はリード線の先端の中心 X、yFan はシースが分かれる位置、yEnd は先端の Y。
 */
export function switchCable(from: { x: number; y: number }, cx: number, yFan: number, yEnd: number, s: SwitchInfo, label: string, labelSide: 'left' | 'right' = 'right'): string {
  const leads = leadsOf(s);
  const n = leads.length;
  const sheath = `M${+from.x.toFixed(2)} ${+from.y.toFixed(2)} C${+from.x.toFixed(2)} ${+((from.y + yFan) / 2).toFixed(2)} ${+cx.toFixed(2)} ${+((from.y + yFan) / 2).toFixed(2)} ${+cx.toFixed(2)} ${yFan}`;
  let out = `
  <path d="${sheath}" fill="none" stroke="#5d6166" stroke-width="4.6" stroke-linecap="round"/>
  <path d="${sheath}" fill="none" stroke="#a7abb0" stroke-width="3.4" stroke-linecap="round"/>`;
  const yLead = yEnd - 7;
  leads.forEach((l, i) => {
    const c = WIRE_HEX[l.color as WireColor];
    const x = +(cx + (i - (n - 1) / 2) * LEAD_PITCH).toFixed(2);
    const off = +(cx + (i - (n - 1) / 2) * 1.1).toFixed(2);
    const d = `M${off} ${yFan - 1} C${off} ${yFan + 7} ${x} ${yLead - 10} ${x} ${yLead}`;
    out += `<path d="${d}" fill="none" stroke="${c.edge}" stroke-width="2.8" stroke-linecap="round"/>`;
    out += `<path d="${d}" fill="none" stroke="${c.fill}" stroke-width="1.9" stroke-linecap="round"/>`;
    out += `<rect x="${x - 1.5}" y="${yLead - 1}" width="3" height="${yEnd - yLead + 1}" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
    out += `<text x="${x}" y="${yLead - 2.5}" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold" fill="#333">${c.name}</text>`;
  });
  out += `<rect x="${+(cx - 2.6).toFixed(2)}" y="${yFan - 2.5}" width="5.2" height="2.6" rx="0.8" fill="#55595e"/>`;
  const lx = labelSide === 'right' ? cx + 4 : cx - 4;
  out += `<text x="${+lx.toFixed(2)}" y="${yFan - 1}" text-anchor="${labelSide === 'right' ? 'start' : 'end'}" font-family="sans-serif" font-size="4" font-weight="bold" fill="#1f5fa8">${label}</text>`;
  return out;
}

/**
 * 2 つのスイッチのリード線の先端の位置を、互いに重ならないように決める。want は希望の中心 X（スイッチの位置）。
 * [min, max] の範囲に収める
 */
export function spreadLeads(want: { slot: 1 | 2; x: number }[], wires: number, min: number, max: number): SwitchPlacement[] {
  const half = ((wires - 1) / 2) * LEAD_PITCH + 3;
  const gap = 2 * half + LABEL_GAP;
  const out = want.map((w) => ({ slot: w.slot, x: Math.min(Math.max(w.x, min + half), max - half) }));
  if (out.length === 2 && out[1].x - out[0].x < gap) {
    const mid = (out[0].x + out[1].x) / 2;
    out[0].x = Math.max(min + half, mid - gap / 2);
    out[1].x = Math.max(out[0].x + gap, Math.min(max - half, mid + gap / 2));
  }
  return out.map((o) => ({ slot: o.slot, x: +o.x.toFixed(2) }));
}

/** 2 つのスイッチのリード線の間に、名前（'SW1 後退端' など）を内側へ向けて書くための間隔[px] */
const LABEL_GAP = 50;

/** 2 つのスイッチのリード線を並べるのに要る最小の幅[px] */
export const leadsMinWidth = (wires: number) => 4 * (((wires - 1) / 2) * LEAD_PITCH + 3) + LABEL_GAP + 8;

/** リード線の名前を書く側（2 個のときは内側、1 個のときは機器の中央の側） */
export const labelSideOf = (slot: 1 | 2, count: number, x: number, width: number): 'left' | 'right' =>
  count === 2 ? (slot === 1 ? 'right' : 'left') : x > width / 2 ? 'left' : 'right';
