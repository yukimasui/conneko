/**
 * フエニックス・コンタクトの DIN レール用端子台（CLIPLINE complete）。極数分を並べ、端に終端カバーと止め具（エンドクランプ）を付けた状態を描く。
 *
 * - PT 2,5（3209510、青 PT 2,5 BU は 3209523）: プッシュイン式の中継端子台。幅 5.2mm、長さ 48.6mm、24A・800V、0.14〜4㎟（より線 0.14〜2.5㎟）。
 *   両端に電線の差込口、その内側にオレンジのプッシュボタン（より線を差すときに押す）、中央にブリッジ用の穴（2 列）と記名板の溝。
 * - UT 2,5（3044076）: ネジ式（M3、0.5〜0.6N・m）の中継端子台。幅 5.2mm、24A、0.14〜4㎟（より線 0.14〜2.5㎟）。長さは PT 2,5 と同じに描く。
 * - PT 2,5-PE（3209536）: プッシュイン式の接地端子台（緑黄）。幅 5.2mm。DIN レールに導通し、レールを通して接地する。
 *
 * 渡り（同電位）: 中央の穴に差込式ブリッジ FBS □-5（赤）を差すと、隣り合う極がつながる。パラメータ bridge に「1-4, 7-8」のように
 * 極の範囲を書くと、その範囲の極を内部でつないだものとして扱い、絵にブリッジを描き、部品表に FBS を載せる。
 *
 * 端子 ID は汎用の端子台（generic.terminal-block.6p）・東洋技研のレール用端子台と同じく、極 n の上側が 'na'、下側が 'nb'。
 */
import type { Accessory, DeviceDefinition, InternalLink, ParamDef, ParamValues, TerminalDef, Termination } from '../types';

export type PhoenixSeries = 'PT' | 'UT' | 'PT-PE';

const PITCH = 10.4;
const STOP = 19;
const COVER = 4.4;
const TOP = 3;
const H = 104;
const LEN = 97;
const TOP_Y = 10.5;
const BOT_Y = TOP + LEN - 7.5;
const r2 = (n: number) => Math.round(n * 100) / 100;

const POLE_OPTIONS = [4, 6, 8, 10, 12, 16, 20];

const text = (x: number, y: number, t: string, size: number, fill = '#222', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 端子台の幅（極数で変わる）: 止め具・極・終端カバー・止め具 */
const widthOf = (poles: number) => r2(STOP + 1 + poles * PITCH + COVER + 1 + STOP);
const poleX = (i: number) => r2(STOP + 1 + PITCH * i + PITCH / 2);

/**
 * 渡りの指定（「1-4, 7-8」）を極の範囲の一覧にする。範囲の外・1 極だけ・重なりは捨てる
 */
export function parseBridges(spec: string | number | undefined, poles: number): [number, number][] {
  const out: [number, number][] = [];
  const used = new Set<number>();
  for (const part of String(spec ?? '').split(/[,、，\s]+/)) {
    const m = /^(\d+)\s*[-‐−〜~]\s*(\d+)$/.exec(part.trim());
    if (!m) continue;
    const a = Math.min(Number(m[1]), Number(m[2]));
    const b = Math.max(Number(m[1]), Number(m[2]));
    if (a < 1 || b > poles || a === b) continue;
    if (Array.from({ length: b - a + 1 }, (_, k) => a + k).some((n) => used.has(n))) continue;
    for (let n = a; n <= b; n++) used.add(n);
    out.push([a, b]);
  }
  return out;
}

/** 差込式ブリッジ FBS の型式（2・3・4・5・10・20 極。それ以外は長いものを切って使う） */
function fbsModel(n: number): string {
  if ([2, 3, 4, 5, 10, 20].includes(n)) return `FBS ${n}-5`;
  return n < 10 ? 'FBS 10-5' : 'FBS 20-5';
}

interface SeriesSpec {
  type: string;
  name: string;
  model: string;
  partNo: string;
  body: string;
  edge: string;
  /** 1 極の長さ（説明用。確かめられなかったものは空） */
  length: string;
  wire: string;
  cover: string;
}

const SERIES: Record<PhoenixSeries, SeriesSpec> = {
  PT: {
    type: 'phoenix.pt-2.5',
    name: '端子台（プッシュイン）',
    model: 'PT 2,5',
    partNo: '3209510',
    body: '#b4b6b3',
    edge: '#7c7e7b',
    length: '48.6mm',
    wire: 'プッシュイン、単線 0.14〜4㎟ / より線 0.14〜2.5㎟（フェルール可）、24A',
    cover: 'D-ST 2,5',
  },
  UT: {
    type: 'phoenix.ut-2.5',
    name: '端子台（ネジ式）',
    model: 'UT 2,5',
    partNo: '3044076',
    body: '#b4b6b3',
    edge: '#7c7e7b',
    length: '',
    wire: 'ネジ M3（0.5〜0.6N・m）、単線 0.14〜4㎟ / より線 0.14〜2.5㎟（フェルール可）、24A',
    cover: 'D-UT 2,5/10',
  },
  'PT-PE': {
    type: 'phoenix.pt-2.5-pe',
    name: '端子台（接地 PE）',
    model: 'PT 2,5-PE',
    partNo: '3209536',
    body: '#3c9a48',
    edge: '#21652b',
    length: '48.6mm',
    wire: 'プッシュイン、0.14〜4㎟（フェルール可）',
    cover: 'D-ST 2,5',
  },
};

const COLORS: Record<string, { body: string; edge: string; suffix: string; partNo: string }> = {
  gray: { body: '#b4b6b3', edge: '#7c7e7b', suffix: '', partNo: '3209510' },
  BU: { body: '#3f7fc6', edge: '#245289', suffix: ' BU', partNo: '3209523' },
};

const polesParam: ParamDef = {
  key: 'poles',
  label: '極数',
  unit: '極',
  options: POLE_OPTIONS.map((n) => ({ value: n })),
  default: 10,
};

const bridgeParam: ParamDef = {
  key: 'bridge',
  label: '渡り（差込式ブリッジ。例: 1-4, 7-8）',
  input: 'text',
  options: [],
  default: '',
};

const colorParam: ParamDef = {
  key: 'color',
  label: '色',
  options: [
    { value: 'gray', label: '灰（PT 2,5、3209510）' },
    { value: 'BU', label: '青（PT 2,5 BU、3209523。N 相・0V 用）' },
  ],
  default: 'gray',
};

/** フエニックス・コンタクトの端子台の機器定義を作る */
export function buildPhoenixTerminal(series: PhoenixSeries): DeviceDefinition {
  const s = SERIES[series];
  const pe = series === 'PT-PE';
  const poles = (p: ParamValues) => (POLE_OPTIONS.includes(Number(p.poles)) ? Number(p.poles) : 10);
  const colorOf = (p: ParamValues) => (series === 'PT' ? (COLORS[String(p.color)] ?? COLORS.gray) : { body: s.body, edge: s.edge, suffix: '', partNo: s.partNo });
  const bridges = (p: ParamValues) => (pe ? [] : parseBridges(p.bridge, poles(p)));

  /** 1 極分 */
  const pole = (i: number, c: { body: string; edge: string }) => {
    const x = STOP + 1 + PITCH * i;
    const cx = poleX(i);
    const entry = (y: number) => `
  <rect x="${r2(cx - 3.3)}" y="${r2(y - 3.4)}" width="6.6" height="6.8" rx="1.4" fill="#1f2022" stroke="#5d6064" stroke-width="0.4"/>
  <circle cx="${cx}" cy="${y}" r="1.5" fill="#3d4044"/>`;
    const push = (y: number) => `<rect x="${r2(cx - 2.9)}" y="${y}" width="5.8" height="7.5" rx="1" fill="#ee7d1f" stroke="#9c4a08" stroke-width="0.35"/>`;
    const screwHead = (y: number) => `
  <circle cx="${cx}" cy="${y}" r="3.6" fill="url(#pxscrew-{{uid}})" stroke="#5e6064" stroke-width="0.5"/>
  <path d="M${r2(cx - 2.3)} ${y} H${r2(cx + 2.3)}" stroke="#46494d" stroke-width="1.1" stroke-linecap="round"/>`;
    const ends =
      series === 'UT'
        ? `${entry(TOP_Y)}${screwHead(TOP_Y + 13)}${entry(BOT_Y)}${screwHead(BOT_Y - 13)}`
        : `${entry(TOP_Y)}${push(TOP_Y + 6)}${entry(BOT_Y)}${push(BOT_Y - 13.5)}`;
    const peFoot = pe ? `<rect x="${r2(x + 1.2)}" y="${r2(H / 2 - 16)}" width="${r2(PITCH - 2.4)}" height="8" rx="0.6" fill="#f2d33a" stroke="#a88d10" stroke-width="0.35"/>` : '';
    return `
  <rect x="${r2(x + 0.25)}" y="${TOP}" width="${r2(PITCH - 0.5)}" height="${LEN}" rx="1.2" fill="${c.body}" stroke="${c.edge}" stroke-width="0.5"/>
  ${ends}
  <!-- テスト穴 -->
  <circle cx="${cx}" cy="${series === 'UT' ? 33 : 30}" r="0.9" fill="#2b2b2b"/>
  <circle cx="${cx}" cy="${H - (series === 'UT' ? 33 : 30)}" r="0.9" fill="#2b2b2b"/>
  <!-- ブリッジ用の穴（2 列） -->
  ${pe ? peFoot : `<rect x="${r2(cx - 1.4)}" y="38" width="2.8" height="4" rx="0.5" fill="#3b3d40"/><rect x="${r2(cx - 1.4)}" y="${H - 42}" width="2.8" height="4" rx="0.5" fill="#3b3d40"/>`}
  <!-- 記名板 -->
  <rect x="${r2(x + 1.1)}" y="45" width="${r2(PITCH - 2.2)}" height="14" rx="0.6" fill="#fafafa" stroke="#9a9ea4" stroke-width="0.4"/>
  ${pe ? `<path d="M${cx} 47.4 V50.6 M${r2(cx - 2.4)} 50.6 H${r2(cx + 2.4)} M${r2(cx - 1.6)} 52 H${r2(cx + 1.6)} M${r2(cx - 0.8)} 53.4 H${r2(cx + 0.8)}" stroke="#222" stroke-width="0.6" fill="none"/>${text(cx, 57.6, String(i + 1), 3.2)}` : text(cx, 55.4, String(i + 1), 5)}`;
  };

  /** 差込式ブリッジ FBS（赤）。a〜b 極をつなぐ */
  const bridge = ([a, b]: [number, number]) => {
    const x1 = r2(poleX(a - 1) - 2.6);
    const x2 = r2(poleX(b - 1) + 2.6);
    return `
  <rect x="${x1}" y="37" width="${r2(x2 - x1)}" height="6" rx="1" fill="#d42b25" stroke="#7d1310" stroke-width="0.5"/>
  ${Array.from({ length: b - a + 1 }, (_, k) => `<rect x="${r2(poleX(a - 1 + k) - 1)}" y="38.6" width="2" height="2.8" rx="0.4" fill="#a01a15"/>`).join('')}`;
  };

  const stopper = (x: number) => `
  <rect x="${r2(x)}" y="16" width="${STOP}" height="72" rx="2" fill="#56595e" stroke="#2f3236" stroke-width="0.6"/>
  <circle cx="${r2(x + STOP / 2)}" cy="52" r="3.6" fill="url(#pxscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${r2(x + STOP / 2 - 2.2)} 52 H${r2(x + STOP / 2 + 2.2)}" stroke="#444" stroke-width="1"/>`;

  const svg = (p: ParamValues) => {
    const n = poles(p);
    const c = colorOf(p);
    const W = widthOf(n);
    return `
  <defs>
    <linearGradient id="pxrail-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ebee"/>
      <stop offset="0.5" stop-color="#b4b8bd"/>
      <stop offset="1" stop-color="#d7dade"/>
    </linearGradient>
    <radialGradient id="pxscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- DIN レール（35mm） -->
  <rect x="0" y="17" width="${W}" height="70" fill="url(#pxrail-{{uid}})" stroke="#8d9197" stroke-width="0.5"/>
  ${stopper(0)}
  ${Array.from({ length: n }, (_, i) => pole(i, c)).join('')}
  ${bridges(p).map(bridge).join('')}
  <!-- 終端カバー -->
  <rect x="${r2(STOP + 1 + n * PITCH)}" y="${TOP + 2}" width="${COVER}" height="${LEN - 4}" rx="0.8" fill="${c.body}" stroke="${c.edge}" stroke-width="0.5" opacity="0.92"/>
  ${stopper(STOP + 1 + n * PITCH + COVER + 1)}
  ${text(r2(STOP / 2), H - 2, 'PHOENIX', 3, '#3b3f44')}`;
  };

  const WIRE = { wire: { methods: ['ferrule', 'bare'] as Termination[], minSq: 0.14, maxSq: 4 } };
  const terminals = (p: ParamValues): TerminalDef[] =>
    Array.from({ length: poles(p) }, (_, i) =>
      (['a', 'b'] as const).map(
        (ab): TerminalDef => ({
          id: `${i + 1}${ab}`,
          label: `${i + 1}`,
          note: pe
            ? `接地 ${i + 1} 番の${ab === 'a' ? '上' : '下'}側（DIN レールを通してほかの極とつながる）［${s.wire}］`
            : `${i + 1} 番の${ab === 'a' ? '上' : '下'}側（${ab === 'a' ? '下' : '上'}側 ${i + 1}${ab === 'a' ? 'b' : 'a'} と導通）［${s.wire}］`,
          x: poleX(i),
          y: ab === 'a' ? TOP_Y : BOT_Y,
          side: ab === 'a' ? 'top' : 'bottom',
          role: pe ? 'ground' : 'pass',
          optional: true,
          ...WIRE,
          ...(pe ? {} : { ratedCurrent: 24 }),
        }),
      ),
    ).flat();

  const links = (p: ParamValues): InternalLink[] => {
    const n = poles(p);
    const own = Array.from({ length: n }, (_, i) => ({ from: `${i + 1}a`, to: `${i + 1}b` }));
    // 接地端子台は DIN レールを通して全極がつながる。中継端子台は渡り（ブリッジ）の範囲の極どうしがつながる
    const across = pe
      ? Array.from({ length: n - 1 }, (_, i) => ({ from: `${i + 1}a`, to: `${i + 2}a` }))
      : bridges(p).flatMap(([a, b]) => Array.from({ length: b - a }, (_, k) => ({ from: `${a + k}a`, to: `${a + k + 1}a` })));
    return [...own, ...across];
  };

  const accessories = (p: ParamValues): Accessory[] => [
    { model: s.cover, name: '終端カバー', category: 'terminal', spec: `${s.model} 用` },
    { model: 'CLIPFIX 35', name: 'エンドクランプ（止め具）', category: 'terminal', spec: 'NS 35 レール用', qty: 2 },
    ...bridges(p).map(([a, b]): Accessory => {
      const model = fbsModel(b - a + 1);
      return {
        model,
        name: '差込式ブリッジ（渡り）',
        category: 'terminal',
        spec: `${a}〜${b} 番（${b - a + 1} 極）${model === `FBS ${b - a + 1}-5` ? '' : `。${b - a + 1} 極に切って使う`}`,
      };
    }),
  ];

  const description =
    series === 'PT'
      ? 'フエニックス・コンタクト PT 2,5（プッシュイン式の中継端子台、DIN レール NS 35 用）を並べ、終端カバー D-ST 2,5 とエンドクランプ CLIPFIX 35 を付けた状態。' +
        `1 極は幅 5.2mm・長さ ${s.length}、上 na・下 nb が導通。定格 24A・800V。単線・フェルール付きの電線はそのまま差し込み、より線はオレンジのプッシュボタンを押して差し込む（単線 0.14〜4㎟、より線 0.14〜2.5㎟、AWG26〜12）。` +
        '中央の穴に差込式ブリッジ FBS □-5 を差すと隣の極と同電位にできる（パラメータ「渡り」に「1-4, 7-8」のように極の範囲を書く）。色は灰（3209510）・青（PT 2,5 BU、3209523）。極数はパラメータ。' +
        '出典: https://www.phoenixcontact.com/en-pc/products/feed-through-terminal-block-pt-25-3209510'
      : series === 'UT'
        ? 'フエニックス・コンタクト UT 2,5（ネジ式の中継端子台、品番 3044076、DIN レール NS 35 用）を並べ、終端カバー D-UT 2,5/10 とエンドクランプ CLIPFIX 35 を付けた状態。' +
          '1 極は幅 5.2mm、上 na・下 nb が導通。定格 24A（定格断面積 2.5㎟）。ネジ M3、締付トルク 0.5〜0.6N・m、むき長さ 9mm。単線 0.14〜4㎟、より線 0.14〜2.5㎟（フェルール可。丸形・Y 形の圧着端子は使わない）。' +
          '中央の穴に差込式ブリッジ FBS □-5 を差すと隣の極と同電位にできる（パラメータ「渡り」に「1-4, 7-8」のように極の範囲を書く）。極数はパラメータ。' +
          '出典: https://www.phoenixcontact.com/en-us/products/feed-through-terminal-block-ut-25-3044076'
        : 'フエニックス・コンタクト PT 2,5-PE（プッシュイン式の接地端子台、緑黄、品番 3209536、DIN レール NS 35 用）を並べ、終端カバーとエンドクランプ CLIPFIX 35 を付けた状態。' +
          '1 極は幅 5.2mm、上 na・下 nb の 2 点。足の金具が DIN レールに導通し、全極がレールを通してつながる（レールは盤の接地に落とす）。機器の接地線（FG・PE）をまとめて受ける。適合電線 0.14〜4㎟（AWG26〜12）。極数はパラメータ。' +
          '出典: フエニックス・コンタクト PT 2,5-PE 製品情報（品番 3209536）';

  return {
    type: s.type,
    name: s.name,
    model: `${s.model}（10 極）`,
    modelOf: (p) => `${s.model}${colorOf(p).suffix}（${poles(p)} 極）`,
    maker: 'フエニックス・コンタクト',
    category: 'terminal',
    description,
    ...(series === 'UT' ? {} : series === 'PT-PE' ? { estimated: '1 極の長さ（PT 2,5 と同じ 48.6mm）と終端カバー（D-ST 2,5）は推定' } : {}),
    labelPrefix: pe ? 'TE' : 'TB',
    width: widthOf(10),
    height: H,
    size: (p) => ({ width: widthOf(poles(p)), height: H }),
    svg,
    terminals,
    links,
    accessories,
    params: [polesParam, ...(series === 'PT' ? [colorParam] : []), ...(pe ? [] : [bridgeParam])],
  };
}
