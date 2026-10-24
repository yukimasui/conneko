/**
 * 東洋技研 インターフェイス（コネクタ端子台）の共通の作り方。
 *
 * どのシリーズも「奥側にコネクタ（MIL または FCN）、手前に端子が 2 段（奥段・手前段）」の構成で、
 * シリーズごとに端子の結線方式・ピッチ・段のずらし方・本体色が違う。
 *
 * | シリーズ | 結線方式 | ピッチ | 段のずらし | 本体 |
 * |---|---|---|---|---|
 * | PCN7 | ネジ式（M3、Y 形圧着端子用セルフアップ） | 7mm | 半ピッチ（千鳥） | グレー |
 * | PCX | スプリングロック式（プッシュイン） | 3.5mm | なし（2 段が縦にそろう） | アイボリーのケース + グレーの端子 |
 * | PCV5 | スプリングロック式（プッシュイン） | 5mm | 2.5mm（千鳥） | グレー |
 * | PCW | スプリングロック式（プッシュイン、2.5㎟対応） | 5mm | 2.5mm（千鳥） | 黒 |
 *
 * 端子の並びは rows（奥段 upper / 手前段 lower、左から順）で与え、各端子に「つながるコネクタのピン番号」を書く。
 * 端子 ID は記名板の印字に合わせ、パラメータ（記名板の種類など）で変えない。
 */
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, PinDef, TerminalDef, WireAcceptSpec } from '../types';
import { MARK_COLORS, defs, fcnHeaderH, markerCell, milHeaderH, r2, screw, spring35, spring5, text, togiLogo } from './parts';

export type Series = 'pcn7' | 'pcx' | 'pcv5' | 'pcw';

/** 端子 1 個 */
export interface Term {
  /** 端子 ID（記名板の印字。同じ印字が並ぶ分岐端子は '-1' などを付ける） */
  id: string;
  /** 記名板の印字（パラメータで変わることがある） */
  label: string;
  /** 端子の意味 */
  note: string;
  /** つながるコネクタのピン番号（CN#n の n） */
  pins?: number[];
  /** 同じ名前どうしが内部で短絡している端子（コネクタにつながらない分岐端子など） */
  bus?: string;
  /** 記名板のマスの色（目印・コモン） */
  mark?: keyof typeof MARK_COLORS;
}

export interface Rows {
  /** 奥段（コネクタ側）。左から */
  upper: Term[];
  /** 手前段。左から */
  lower: Term[];
}

/** シリーズごとの寸法と結線方式（px、1mm ≒ 2px） */
export interface SeriesSpec {
  label: string;
  /** 端子のピッチ */
  pitch: number;
  /** 奥段を右へずらす量 */
  stagger: number;
  height: number;
  /** コネクタの中心の Y */
  cnY: number;
  upperY: number;
  lowerY: number;
  /** 結線方式（説明文用） */
  method: string;
  /** 端子の注記に付ける、適合電線の要約 */
  wireShort: string;
  /** 端子が受け入れる電線（端末処理・太さ。チェックに使う） */
  wire: WireAcceptSpec;
}

export const SERIES: Record<Series, SeriesSpec> = {
  pcn7: {
    label: 'PCN7',
    pitch: 14,
    stagger: 7,
    height: 80,
    cnY: 13,
    upperY: 43,
    lowerY: 63,
    method:
      'ネジ式（M3 セルフアップネジ、Y 形圧着端子用。丸形圧着端子は R タイプ）。適合電線 1.25㎟ 以下、締付トルク 1.2N・m',
    wireShort: 'M3 ネジ、Y 形圧着端子、1.25㎟ 以下',
    wire: { methods: ['fork'], maxSq: 1.25 },
  },
  pcx: {
    label: 'PCX',
    pitch: 7,
    stagger: 0,
    height: 86,
    cnY: 11,
    upperY: 34,
    lowerY: 57,
    method:
      'スプリングロック式（プッシュイン）。フェルール 0.14〜0.75㎟（AWG26〜18、DIN46228-4、長さ 8〜12mm）と単線 φ0.3〜1.3mm はそのまま差し込み、より線 0.08〜1.5㎟（むき長さ 9〜10mm）は橙色のボタンを押して差し込む。被覆外径 φ3.2mm 以上の電線は不可',
    wireShort: 'プッシュイン、フェルール 0.14〜0.75㎟ / より線 0.08〜1.5㎟',
    wire: { methods: ['ferrule', 'bare'], minSq: 0.08, maxSq: 1.5 },
  },
  pcv5: {
    label: 'PCV5',
    pitch: 10,
    stagger: 5,
    height: 86,
    cnY: 16,
    upperY: 53,
    lowerY: 71,
    method:
      'スプリングロック式（プッシュイン）。フェルール 0.25〜1㎟（AWG26〜18、DIN46228-4）と単線 φ0.5〜1.6mm は差し込み、より線 0.08〜1.25㎟ は開閉口にドライバを差して差し込む。被覆外径 φ3.6mm 以上の電線は不可',
    wireShort: 'プッシュイン、フェルール 0.25〜1㎟ / より線 0.08〜1.25㎟',
    wire: { methods: ['ferrule', 'bare'], minSq: 0.08, maxSq: 1.25 },
  },
  pcw: {
    label: 'PCW',
    pitch: 10,
    stagger: 5,
    height: 86,
    cnY: 16,
    upperY: 53,
    lowerY: 71,
    method:
      'スプリングロック式（プッシュイン、2.5㎟ 対応）。フェルール 0.14〜2.5㎟（0.14〜0.34㎟ は長さ 12mm、0.5〜2.5㎟ は 10mm）と単線 φ0.3〜1.6mm は差し込み、より線 0.08〜2.5㎟（むき長さ 10〜11mm）は開閉口にドライバ（VT5-1）を差して差し込む。被覆外径 φ4.7mm 以下',
    wireShort: 'プッシュイン、フェルール 0.14〜2.5㎟ / より線 0.08〜2.5㎟',
    wire: { methods: ['ferrule', 'bare'], minSq: 0.08, maxSq: 2.5 },
  },
};

export interface ConnectorBlockSpec {
  type: string;
  name: string;
  /** 型式（パラメータで変わる場合は関数） */
  model: string | ((p: ParamValues) => string);
  series: Series;
  /** 本体の幅[mm]（取付けタブ込み） */
  widthMm: number;
  connector: 'MIL' | 'FCN';
  poles: number;
  rows: Rows | ((p: ParamValues) => Rows);
  /** コネクタのピンの表示名 */
  pinLabel?: (n: number) => string;
  /** 記名板の端子の pins（行の約束の番号）→ コネクタのピン番号（物理的な番号）。省略時は同じ番号 */
  pinMap?: (n: number) => number;
  /** コネクタの defaultCable（この端子台が前提にする変換ケーブル） */
  defaultCable?: string;
  description: string;
  params?: ParamDef[];
}

/** MIL の A・B 連番: A_k はピン 2k−1（▲側の列）、B_k はピン 2k */
export const milPinOfAB = (row: 'A' | 'B', k: number) => (row === 'A' ? 2 * k - 1 : 2 * k);

const evalRows = (rows: ConnectorBlockSpec['rows'], p: ParamValues) => (typeof rows === 'function' ? rows(p) : rows);

export function buildConnectorBlock(s: ConnectorBlockSpec): DeviceDefinition {
  const g = SERIES[s.series];
  const W = Math.round(s.widthMm * 2);
  const H = g.height;
  const cx = W / 2;
  const header = s.connector === 'MIL' ? milHeaderH(cx, g.cnY, s.poles) : fcnHeaderH(cx, g.cnY);
  const modelOf = (p: ParamValues) => (typeof s.model === 'function' ? s.model(p) : s.model);

  /** 端子の位置（左端の端子を中央にそろえる） */
  const place = (rows: Rows) => {
    const n = Math.max(rows.upper.length, rows.lower.length);
    const x0 = cx - ((n - 1) * g.pitch + g.stagger) / 2;
    const pos = new Map<string, { x: number; y: number; row: 'upper' | 'lower'; t: Term }>();
    rows.lower.forEach((t, i) => pos.set(t.id, { x: r2(x0 + i * g.pitch), y: g.lowerY, row: 'lower', t }));
    rows.upper.forEach((t, i) => pos.set(t.id, { x: r2(x0 + g.stagger + i * g.pitch), y: g.upperY, row: 'upper', t }));
    return { pos, x0, n };
  };

  const svg = (p: ParamValues) => {
    const rows = evalRows(s.rows, p);
    const { pos, x0, n } = place(rows);
    const model = modelOf(p);
    const all = [...pos.values()];
    const left = x0 - g.pitch / 2 - 1;
    const right = x0 + (n - 1) * g.pitch + g.stagger + g.pitch / 2 + 1;
    const upperL = x0 + (rows.upper.length ? g.stagger : 0) - g.pitch / 2;
    const upperR = upperL + rows.upper.length * g.pitch;
    const lowerL = x0 - g.pitch / 2;
    const lowerR = lowerL + rows.lower.length * g.pitch;
    let body = '';
    let terms = '';
    let marks = '';

    if (s.series === 'pcn7') {
      body = `
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2.5" fill="#d2d3ce" stroke="#8e8f8a" stroke-width="0.8"/>
  <rect x="1" y="26" width="${W - 2}" height="0.8" fill="#a9aaa5"/>
  <!-- レール用ツメ（LOCK） -->
  <rect x="4" y="3" width="13" height="20" rx="1" fill="#e48a2c" stroke="#9c5815" stroke-width="0.5"/>
  ${text(10.5, 15, 'LOCK', 2.6, '#5a2f08')}
  <rect x="${W - 17}" y="3" width="13" height="20" rx="1" fill="#e48a2c" stroke="#9c5815" stroke-width="0.5"/>
  ${text(W - 10.5, 15, 'LOCK', 2.6, '#5a2f08')}
  <!-- 取付け穴（直付け用） -->
  <circle cx="26" cy="${g.cnY}" r="4.5" fill="#b9bab5" stroke="#7f807b" stroke-width="0.6"/><circle cx="26" cy="${g.cnY}" r="2.3" fill="#4a4b47"/>
  <circle cx="${W - 26}" cy="${g.cnY}" r="4.5" fill="#b9bab5" stroke="#7f807b" stroke-width="0.6"/><circle cx="${W - 26}" cy="${g.cnY}" r="2.3" fill="#4a4b47"/>
  <!-- 端子台（奥段・手前段） -->
  <rect x="${r2(upperL)}" y="33.5" width="${r2(upperR - upperL)}" height="20" rx="1" fill="#6f7277" stroke="#3c3e41" stroke-width="0.6"/>
  <rect x="${r2(lowerL)}" y="53.5" width="${r2(lowerR - lowerL)}" height="19" rx="1" fill="#62656a" stroke="#3c3e41" stroke-width="0.6"/>
  ${all.map((q) => `<rect x="${r2(q.x - g.pitch / 2 + 0.6)}" y="${q.row === 'upper' ? 34.5 : 54.5}" width="0.9" height="${q.row === 'upper' ? 18 : 17}" fill="#a7aaae"/>`).join('')}
  ${text(19, 24.6, model, 3.4, '#55575a', 'start')}
  ${togiLogo(W - 30, 24.6, 3.4)}`;
      terms = all.map((q) => screw(q.x, q.y, 4.6)).join('');
      // 記名板（奥段の印字は端子の上、手前段の印字は端子の下）
      marks = all
        .map((q) =>
          markerCell(q.x, q.row === 'upper' ? 27.5 : 72.5, g.pitch - 0.4, 6, q.t.label, q.t.label.length > 3 ? 3.2 : 3.8, q.t.mark ? MARK_COLORS[q.t.mark] : undefined),
        )
        .join('');
    } else if (s.series === 'pcx') {
      body = `
  <!-- ケース（アイボリー）とレールのロックボタン（黄） -->
  <rect x="1" y="6" width="${W - 2}" height="${H - 12}" rx="2" fill="#ece6d4" stroke="#aaa391" stroke-width="0.8"/>
  <rect x="${r2(cx - 16)}" y="${H - 9}" width="32" height="8.5" rx="2" fill="#f4b21c" stroke="#b07a05" stroke-width="0.5"/>
  ${[-10, -5, 0, 5, 10].map((d) => `<rect x="${r2(cx + d - 0.6)}" y="${H - 7.5}" width="1.2" height="5" fill="#d18f06"/>`).join('')}
  <!-- 端子台（2 段） -->
  <rect x="${r2(left)}" y="22" width="${r2(right - left)}" height="22" rx="1" fill="#c9cbc8" stroke="#8b8d8a" stroke-width="0.6"/>
  <rect x="${r2(left)}" y="45" width="${r2(right - left)}" height="22" rx="1" fill="#c3c5c2" stroke="#8b8d8a" stroke-width="0.6"/>
  ${text(4, H - 15.5, model, 3.2, '#5a5547', 'start')}
  ${togiLogo(W - 14, H - 15.5, 3.4)}`;
      terms = all.map((q) => spring35(q.x, q.y)).join('');
      marks = all
        .map((q) => markerCell(q.x, q.y + 4.2, g.pitch - 0.2, 5, q.t.label, q.t.label.length > 3 ? 2 : 2.5, q.t.mark ? MARK_COLORS[q.t.mark] : undefined))
        .join('');
    } else {
      const dark = s.series === 'pcw';
      const caseFill = dark ? '#2a2c2e' : '#d3d5d1';
      const caseStroke = dark ? '#0d0d0e' : '#8f918d';
      const tier = dark ? ['#1f2022', '#18191a'] : ['#c2c4c0', '#b8bab6'];
      body = `
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2.5" fill="${caseFill}" stroke="${caseStroke}" stroke-width="0.8"/>
  <!-- 取付け穴 -->
  <circle cx="16" cy="${g.cnY}" r="4.5" fill="${dark ? '#3c3f42' : '#b8bab6'}" stroke="${dark ? '#121314' : '#7d7f7b'}" stroke-width="0.6"/><circle cx="16" cy="${g.cnY}" r="2.3" fill="#111"/>
  <circle cx="${W - 16}" cy="${g.cnY}" r="4.5" fill="${dark ? '#3c3f42' : '#b8bab6'}" stroke="${dark ? '#121314' : '#7d7f7b'}" stroke-width="0.6"/><circle cx="${W - 16}" cy="${g.cnY}" r="2.3" fill="#111"/>
  <!-- 端子台（段差のある 2 段） -->
  <rect x="${r2(upperL)}" y="43" width="${r2(upperR - upperL)}" height="16" rx="1" fill="${tier[0]}" stroke="#0e0e0f" stroke-width="0.5"/>
  <rect x="${r2(lowerL)}" y="60" width="${r2(lowerR - lowerL)}" height="16" rx="1" fill="${tier[1]}" stroke="#0e0e0f" stroke-width="0.5"/>
  ${all.map((q) => `<line x1="${r2(q.x + g.pitch / 2)}" y1="${q.row === 'upper' ? 44 : 61}" x2="${r2(q.x + g.pitch / 2)}" y2="${q.row === 'upper' ? 58 : 75}" stroke="${dark ? '#3e4144' : '#8f918d'}" stroke-width="0.5"/>`).join('')}
  <!-- DIN レールのツメ -->
  <rect x="${r2(cx - 14)}" y="${H - 8}" width="28" height="7" rx="1.2" fill="${dark ? '#f4b21c' : '#e88f2a'}" stroke="#8a5a08" stroke-width="0.5"/>
  ${text(5, H - 3, model, 3.4, dark ? '#c9cbce' : '#55575a', 'start')}
  ${togiLogo(W - 18, H - 3, 3.6)}`;
      terms = all
        .map((q) => (dark ? spring5(q.x, q.y, '#0c0c0d', '#7a7d81') : spring5(q.x, q.y, '#3a3c3f', '#6b6e72')))
        .join('');
      // 記名板（2 行。奥段の印字が上の行、手前段の印字が下の行）
      marks = `<rect x="${r2(Math.min(upperL, lowerL) - 1)}" y="30.5" width="${r2(Math.max(upperR, lowerR) - Math.min(upperL, lowerL) + 2)}" height="12" fill="#f7f7f4" stroke="#8c8f93" stroke-width="0.4"/>
  ${all
    .map((q) => markerCell(q.x, q.row === 'upper' ? 31 : 36.6, g.pitch - 0.4, 5.4, q.t.label, q.t.label.length > 3 ? 2.4 : 3, q.t.mark ? MARK_COLORS[q.t.mark] : undefined))
    .join('')}`;
    }

    return `${defs}
  ${body}
  <!-- コネクタ -->
  ${header.svg}
  <!-- 端子 -->
  ${terms}
  <!-- 記名板 -->
  ${marks}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const rows = evalRows(s.rows, p);
    const { pos } = place(rows);
    const cn: TerminalDef = {
      id: 'CN',
      label: s.connector === 'MIL' ? `CN（MIL ${s.poles}P）` : 'CN（FCN 40P）',
      x: cx,
      y: g.cnY,
      side: 'top',
      role: 'connector',
      // ケーブルのプラグは上から差す（正面向き）
      connector:
        s.connector === 'MIL'
          ? { kind: `MIL${s.poles}`, pins: s.poles, width: header.width, facing: 'front', length: 16, ...(s.defaultCable ? { defaultCable: s.defaultCable } : {}) }
          : { kind: 'FCN40', pins: 40, width: header.width, facing: 'front', length: 18 },
    };
    return [
      cn,
      ...[...pos.values()].map(
        (q): TerminalDef => ({
          id: q.t.id,
          label: q.t.label,
          note: `${q.t.note}［${g.wireShort}］`,
          x: q.x,
          y: q.y,
          // 電線は手前（図の下側）に出す
          side: 'bottom',
          role: 'pass',
          optional: true,
          // ネジ式の R タイプ（丸形圧着端子用）は丸形も使える
          wire: p.crimp === 'R' ? { ...g.wire, methods: ['ring', 'fork'] } : g.wire,
        }),
      ),
    ];
  };

  const pins: PinDef[] = Array.from({ length: s.poles }, (_, i) => ({
    id: `CN#${i + 1}`,
    label: s.pinLabel ? s.pinLabel(i + 1) : `MIL ピン ${i + 1}`,
    role: 'pass',
    optional: true,
  }));

  const links = (p: ParamValues): InternalLink[] => {
    const rows = evalRows(s.rows, p);
    const all = [...rows.upper, ...rows.lower];
    const out: InternalLink[] = [];
    for (const t of all) for (const n of t.pins ?? []) out.push({ from: `CN#${s.pinMap ? s.pinMap(n) : n}`, to: t.id });
    const buses = new Map<string, string[]>();
    for (const t of all) if (t.bus) buses.set(t.bus, [...(buses.get(t.bus) ?? []), t.id]);
    for (const ids of buses.values()) for (let i = 1; i < ids.length; i++) out.push({ from: ids[i - 1], to: ids[i] });
    return out;
  };

  return {
    type: s.type,
    name: s.name,
    model: modelOf(Object.fromEntries((s.params ?? []).map((x) => [x.key, x.default]))),
    maker: '東洋技研',
    category: 'terminal',
    description: `${s.description} 結線方式: ${g.method}。`,
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
    ...(s.params ? { params: s.params } : {}),
  };
}
