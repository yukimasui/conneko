/**
 * 展開図の記号ライブラリ（JIS C 0617 / IEC 60617）。
 *
 * - 記号はすべて「左から右へ流れる」横向きで定義する（ラダー図の段に置く向き）。縦に使うときは配置で回転する。
 * - 単位は mm、y は上向きが正（DXF と同じ）。端子は 2.5mm の格子に乗せる。
 * - 2 端子の記号は端子を (0, 0) と (10, 0) に置く。多極の記号は 1 極目を y = 0 とし、5mm ずつ下に並べる。
 * - 属性: TAG（機器名）、T1, T2…（記号の端子 1, 2… の端子番号）、XREF（接点の所在）、ADDR（PLC の入出力番号）、COMMENT。
 */
import type { ContactActuator } from '../devices/types';
import type { AttributeDef, Point, Primitive, SymbolDef } from './format';

/** 2 端子の記号の長さ */
const LEN = 10;
/** 多極の記号の極の間隔 */
const POLE = 5;
/** 端子番号の文字の高さ */
const PIN_TEXT = 1.8;
/** 機器名の文字の高さ */
const TAG_TEXT = 2.5;

const line = (...points: Point[]): Primitive => ({ kind: 'line', points });
const dashed = (...points: Point[]): Primitive => ({ kind: 'line', points, dashed: true });
const rect = (x1: number, y1: number, x2: number, y2: number): Primitive => ({
  kind: 'line',
  points: [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ],
  closed: true,
});
const text = (at: Point, s: string, height: number, align: 'left' | 'center' | 'right' = 'center'): Primitive => ({
  kind: 'text',
  at,
  text: s,
  height,
  align,
});
const attr = (tag: string, at: Point, height: number, align: 'left' | 'center' | 'right' = 'center'): AttributeDef => ({
  tag,
  at,
  height,
  align,
});

// ---- 接点 ----

/** 接点の可動部（ブレード）の根元と、固定接点の位置 */
const BLADE_FROM = 3;
const FIXED_AT = 7;
/** 操作部の記号を描く高さ */
const ACTUATOR_Y = 4.5;
/** 連動の破線を通す x */
const LINK_X = 5;

/** a 接点の 1 極（y の位置に描く）。ブレードは上へ開く */
function makeContactPole(y: number): Primitive[] {
  return [line([0, y], [BLADE_FROM, y]), line([BLADE_FROM, y], [7.33, y + 2.5]), line([FIXED_AT, y], [LEN, y])];
}
/** a 接点のブレードの x = LINK_X での高さ（破線の連動をここにつなぐ） */
const MAKE_BLADE_AT_LINK = (2.5 * (LINK_X - BLADE_FROM)) / (7.33 - BLADE_FROM);

/** b 接点の 1 極。ブレードは下へ傾き、固定接点から下へ出したストッパーに当たる */
function breakContactPole(y: number): Primitive[] {
  return [
    line([0, y], [BLADE_FROM, y]),
    line([BLADE_FROM, y], [7.6, y - 2]),
    line([FIXED_AT, y], [LEN, y]),
    line([FIXED_AT, y], [FIXED_AT, y - 2.3]),
  ];
}
const BREAK_BLADE_AT_LINK = (-2 * (LINK_X - BLADE_FROM)) / (7.6 - BLADE_FROM);

/** 操作部の記号（接点の上に描き、破線でブレードとつなぐ） */
function actuatorPrimitives(actuator: ContactActuator): Primitive[] {
  const y = ACTUATOR_Y;
  switch (actuator) {
    case 'pushbutton':
      // 押し操作: 接点の側へ脚の出た横棒
      return [line([3.5, y - 0.7], [3.5, y], [6.5, y], [6.5, y - 0.7])];
    case 'emergency':
      // きのこ形の押しボタン
      return [line([3.2, y], [6.8, y]), { kind: 'arc', center: [LINK_X, y], r: 1.8, start: 0, end: 180 }];
    case 'pull':
      // 引き操作: 接点と反対の側へ脚の出た横棒
      return [line([3.5, y + 0.7], [3.5, y], [6.5, y], [6.5, y + 0.7])];
    case 'limit':
      // 機械的な操作（リミットスイッチ）: 接点の側へ向いた三角
      return [{ kind: 'line', points: [[4, y + 1], [6, y + 1], [LINK_X, y - 0.5]], closed: true }];
    case 'thermal':
      // 熱動
      return [line([3, y], [4, y], [4, y + 1.2], [6, y + 1.2], [6, y], [7, y])];
    case 'selector':
      // ひねり操作: 段のついた横棒
      return [line([3.5, y - 0.7], [3.5, y], [6.5, y], [6.5, y + 0.7])];
    case 'on-delay':
      // 限時動作: 上に凸の弧（動作のときに遅れる）
      return [{ kind: 'arc', center: [LINK_X, y - 1.2], r: 1.6, start: 20, end: 160 }];
    case 'off-delay':
      // 限時復帰: 下に凸の弧（復帰のときに遅れる）
      return [{ kind: 'arc', center: [LINK_X, y + 1.2], r: 1.6, start: 200, end: 340 }];
  }
}

const ACTUATOR_NAMES: Record<ContactActuator, string> = {
  pushbutton: '押しボタン',
  emergency: '非常停止',
  pull: '引き操作',
  limit: 'リミットスイッチ',
  thermal: '熱動',
  selector: 'セレクタスイッチ',
  'on-delay': '限時動作',
  'off-delay': '限時復帰',
};

/**
 * 直接開路動作の印（IEC 60617 の「強制開離」。丸の中に開く向きの矢印）。操作部と接点をつなぐ破線の途中に描く
 */
function directOpeningPrimitives(bladeY: number, top: number): Primitive[] {
  const cy = (bladeY + top) / 2 + 0.3;
  return [
    { kind: 'circle', center: [LINK_X - 1.6, cy], r: 1.1 },
    line([LINK_X - 1.6, cy + 0.7], [LINK_X - 1.6, cy - 0.7]),
    line([LINK_X - 2.1, cy - 0.15], [LINK_X - 1.6, cy - 0.7], [LINK_X - 1.1, cy - 0.15]),
  ];
}

function contact(kind: 'NO' | 'NC', actuator?: ContactActuator, directOpening = false): SymbolDef {
  const primitives = kind === 'NO' ? makeContactPole(0) : breakContactPole(0);
  const bladeY = kind === 'NO' ? MAKE_BLADE_AT_LINK : BREAK_BLADE_AT_LINK;
  const top = actuator === 'limit' ? ACTUATOR_Y - 0.5 : ACTUATOR_Y;
  if (actuator) primitives.push(dashed([LINK_X, bladeY], [LINK_X, top]), ...actuatorPrimitives(actuator));
  if (directOpening) primitives.push(...directOpeningPrimitives(bladeY, top));
  return {
    description: `${kind === 'NO' ? 'a 接点' : 'b 接点'}${actuator || directOpening ? `（${[actuator && ACTUATOR_NAMES[actuator], directOpening && '直接開路動作'].filter(Boolean).join('・')}）` : ''}`,
    primitives,
    pins: { 1: [0, 0], 2: [LEN, 0] },
    attributes: [
      attr('T1', [1.5, 1.5], PIN_TEXT),
      attr('T2', [8.5, 1.5], PIN_TEXT),
      attr('TAG', [LINK_X, -4], TAG_TEXT),
      attr('XREF', [LINK_X, -6.5], PIN_TEXT),
    ],
  };
}

/**
 * c 接点（切換接点）。端子 1 が共通（左）、端子 2 が b 接点側（右）、端子 3 が a 接点側（右上 5mm）。
 * 可動部は b 接点側に当たった状態で描く。
 */
function changeover(actuator?: ContactActuator, directOpening = false): SymbolDef {
  const primitives = breakContactPole(0);
  primitives.push(line([FIXED_AT, 5], [LEN, 5]), line([FIXED_AT, 5], [FIXED_AT, 3.8]));
  const top = actuator === 'limit' ? ACTUATOR_Y - 0.5 : ACTUATOR_Y;
  if (actuator) primitives.push(dashed([LINK_X, BREAK_BLADE_AT_LINK], [LINK_X, top]), ...actuatorPrimitives(actuator));
  if (directOpening) primitives.push(...directOpeningPrimitives(BREAK_BLADE_AT_LINK, top));
  return {
    description: `c 接点${actuator || directOpening ? `（${[actuator && ACTUATOR_NAMES[actuator], directOpening && '直接開路動作'].filter(Boolean).join('・')}）` : ''}`,
    primitives,
    pins: { 1: [0, 0], 2: [LEN, 0], 3: [LEN, 5] },
    attributes: [
      attr('T1', [1.5, 1.5], PIN_TEXT),
      attr('T2', [8.8, -1.5], PIN_TEXT),
      attr('T3', [8.8, 6.5], PIN_TEXT),
      attr('TAG', [LINK_X, -4.5], TAG_TEXT),
      attr('XREF', [LINK_X, -7], PIN_TEXT),
    ],
  };
}

// ---- 多極の開閉器 ----

type PoleStyle = 'breaker' | 'contactor';

/** 縦向きの記号（主回路）の極の間隔。端子番号（'1/L1' など）を極の間に書けるよう横向きより広くする */
const POLE_V = 7.5;

/** 多極の記号の端子（極 i の一次側が 2i-1、二次側が 2i）と端子番号の属性 */
function polePins(poles: number, pitch = POLE): { pins: Record<string, Point>; attributes: AttributeDef[] } {
  const pins: Record<string, Point> = {};
  const attributes: AttributeDef[] = [];
  for (let i = 0; i < poles; i++) {
    const y = -i * pitch;
    pins[2 * i + 1] = [0, y];
    pins[2 * i + 2] = [LEN, y];
    attributes.push(attr(`T${2 * i + 1}`, [1.5, y + 1.5], PIN_TEXT), attr(`T${2 * i + 2}`, [8.5, y + 1.5], PIN_TEXT));
  }
  return { pins, attributes };
}

function switchPoles(poles: number, style: PoleStyle, earthLeakage = false, pitch = POLE): SymbolDef {
  const primitives: Primitive[] = [];
  for (let i = 0; i < poles; i++) {
    const y = -i * pitch;
    primitives.push(...makeContactPole(y));
    if (style === 'breaker') {
      // 遮断器: 固定接点に ×
      primitives.push(line([FIXED_AT - 0.6, y - 0.6], [FIXED_AT + 0.6, y + 0.6]), line([FIXED_AT - 0.6, y + 0.6], [FIXED_AT + 0.6, y - 0.6]));
    } else {
      // 電磁接触器: 固定接点に半円
      primitives.push({ kind: 'arc', center: [FIXED_AT, y], r: 0.6, start: 90, end: 270 });
    }
  }
  const bottom = -(poles - 1) * pitch;
  if (poles > 1) primitives.push(dashed([LINK_X, MAKE_BLADE_AT_LINK], [LINK_X, bottom + MAKE_BLADE_AT_LINK]));
  if (earthLeakage) {
    // 漏電検出: 1 極目の上に IΔ の枠を置き、破線で連動させる
    primitives.push(dashed([LINK_X, MAKE_BLADE_AT_LINK], [LINK_X, 3.5]), rect(3.25, 3.5, 6.75, 6.5), text([LINK_X, 5], 'IΔ', PIN_TEXT));
  }
  const { pins, attributes } = polePins(poles, pitch);
  const name = style === 'breaker' ? (earthLeakage ? '漏電遮断器' : '遮断器') : '電磁接触器の主接点';
  return {
    description: `${name}（${poles} 極）`,
    primitives,
    pins,
    attributes: [...attributes, attr('TAG', [LINK_X, bottom - 4], TAG_TEXT)],
  };
}

/** サーマルリレーの熱動素子（多極） */
function thermalElement(poles: number, pitch = POLE): SymbolDef {
  const primitives: Primitive[] = [];
  for (let i = 0; i < poles; i++) {
    const y = -i * pitch;
    primitives.push(line([0, y], [3.5, y], [3.5, y + 1.5], [6.5, y + 1.5], [6.5, y], [LEN, y]));
  }
  const bottom = -(poles - 1) * pitch;
  primitives.push(rect(2.5, 2.5, 7.5, bottom - 1.25));
  const { pins, attributes } = polePins(poles, pitch);
  return {
    description: `サーマルリレーの熱動素子（${poles} 極）`,
    primitives,
    pins,
    attributes: [...attributes, attr('TAG', [LINK_X, bottom - 4], TAG_TEXT)],
  };
}

// ---- コイル・負荷 ----

function coil(): SymbolDef {
  return {
    description: 'コイル',
    primitives: [line([0, 0], [3.75, 0]), rect(3.75, -2.5, 6.25, 2.5), line([6.25, 0], [LEN, 0])],
    pins: { 1: [0, 0], 2: [LEN, 0] },
    attributes: [
      attr('T1', [1.5, 1.5], PIN_TEXT),
      attr('T2', [8.5, 1.5], PIN_TEXT),
      attr('TAG', [LINK_X, -4.25], TAG_TEXT),
      attr('XREF', [LINK_X, -6.75], PIN_TEXT),
    ],
  };
}

function lamp(): SymbolDef {
  const d = 2 * Math.SQRT1_2;
  return {
    description: '表示灯',
    primitives: [
      line([0, 0], [3, 0]),
      { kind: 'circle', center: [LINK_X, 0], r: 2 },
      line([LINK_X - d, -d], [LINK_X + d, d]),
      line([LINK_X - d, d], [LINK_X + d, -d]),
      line([7, 0], [LEN, 0]),
    ],
    pins: { 1: [0, 0], 2: [LEN, 0] },
    attributes: [attr('T1', [1.5, 1.5], PIN_TEXT), attr('T2', [8.5, 1.5], PIN_TEXT), attr('TAG', [LINK_X, -4], TAG_TEXT)],
  };
}

/** ブザー: 平らな側を下にした半円に、両端の端子から線をつなぐ */
function buzzer(): SymbolDef {
  return {
    description: 'ブザー',
    primitives: [
      line([0, 0], [3, 0], [3, -1]),
      line([7, -1], [7, 0], [LEN, 0]),
      line([2.6, -1], [7.4, -1]),
      { kind: 'arc', center: [LINK_X, -1], r: 2.4, start: 0, end: 180 },
    ],
    pins: { 1: [0, 0], 2: [LEN, 0] },
    attributes: [attr('T1', [1.5, 1.5], PIN_TEXT), attr('T2', [8.5, 1.5], PIN_TEXT), attr('TAG', [LINK_X, -4], TAG_TEXT)],
  };
}

/** 電動機。端子は左に並べ（間隔 pitch）、右の円の中心へ向けてつなぐ */
function motor(phases: 1 | 3, pitch = POLE): SymbolDef {
  const n = phases === 3 ? 3 : 2;
  const r = phases === 3 ? 6 : 5;
  const cy = (-(n - 1) * pitch) / 2;
  const cx = phases === 3 ? 14 : 12;
  const primitives: Primitive[] = [{ kind: 'circle', center: [cx, cy], r }];
  const pins: Record<string, Point> = {};
  const attributes: AttributeDef[] = [];
  for (let i = 0; i < n; i++) {
    const y = -i * pitch;
    // 端子からまっすぐ 3mm 出し、円の中心へ向けて円周まで
    const bend: Point = [3, y];
    const [vx, vy] = [bend[0] - cx, bend[1] - cy];
    const len = Math.hypot(vx, vy);
    const edge: Point = [cx + (vx / len) * r, cy + (vy / len) * r];
    primitives.push(Math.abs(vy) < 0.01 ? line([0, y], edge) : line([0, y], bend, edge));
    pins[i + 1] = [0, y];
    attributes.push(attr(`T${i + 1}`, [1.5, y + 1.5], PIN_TEXT));
  }
  primitives.push(text([cx, cy + 1.2], 'M', 3), text([cx, cy - 2.2], phases === 3 ? '3~' : '1~', 2));
  return {
    description: phases === 3 ? '三相電動機' : '単相電動機',
    primitives,
    pins,
    attributes: [...attributes, attr('TAG', [cx, cy + r + 2], TAG_TEXT)],
  };
}

// ---- 一次電源（受電の端子） ----

/** 一次電源の端子（R・S・T など）を ○ で並べる。横向きは端子を右に出し、縦向きは ○ の上に端子名、下に端子を出す */
function source(n: number, vertical: boolean): SymbolDef {
  const primitives: Primitive[] = [];
  const pins: Record<string, Point> = {};
  const pinDirs: Record<string, Point> = {};
  const attributes: AttributeDef[] = [];
  for (let i = 0; i < n; i++) {
    if (vertical) {
      const x = i * POLE_V;
      primitives.push({ kind: 'circle', center: [x, -1.25], r: 1.25 });
      pins[i + 1] = [x, -2.5];
      pinDirs[i + 1] = [0, -1];
      attributes.push(attr(`T${i + 1}`, [x, 1.5], TAG_TEXT));
    } else {
      const y = -i * POLE;
      primitives.push({ kind: 'circle', center: [1.25, y], r: 1.25 });
      pins[i + 1] = [2.5, y];
      pinDirs[i + 1] = [1, 0];
      attributes.push(attr(`T${i + 1}`, [-0.8, y], TAG_TEXT, 'right'));
    }
  }
  const tagAt: Point = vertical ? [(n - 1) * POLE_V + 3, -1.25] : [1.25, -(n - 1) * POLE - 4];
  return {
    description: `一次電源（${n} 端子）`,
    primitives,
    pins,
    pinDirs,
    attributes: [...attributes, attr('TAG', tagAt, PIN_TEXT, vertical ? 'left' : 'center')],
  };
}

// ---- 縦向き（主回路） ----

/**
 * 横向きの記号を縦向き（上から下へ流れる）にする。y = −x の直線で映す（x, y）→（−y, −x）ので、
 * 端子 1 側が上、極は左から右へ並び、接点の傾きは JIS の縦向きの形になる。文字は回さず横書きのまま置く。
 * 端子番号（T1, T2…）は線の左に右寄せ、機器名は記号の右に左寄せで書く。
 */
function vertical(def: SymbolDef): SymbolDef {
  const t = ([x, y]: Point): Point => [-y, -x];
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const primitives = def.primitives.map((p): Primitive => {
    switch (p.kind) {
      case 'line':
        return { ...p, points: p.points.map(t) };
      case 'circle':
        return { ...p, center: t(p.center) };
      case 'arc':
        // 映すと回る向きが逆になるので、始まりと終わりを入れ替える
        return { ...p, center: t(p.center), start: norm(-90 - p.end), end: norm(-90 - p.start) };
      case 'text':
        return { ...p, at: t(p.at) };
    }
  });
  const pins = Object.fromEntries(Object.entries(def.pins).map(([k, v]) => [k, t(v)]));
  const pinDirs = Object.fromEntries(
    Object.entries(def.pins).map(([k, v]) => {
      const d = def.pinDirs?.[k] ?? (v[0] <= 0.01 ? [-1, 0] : [1, 0]);
      return [k, t(d as Point)];
    }),
  );
  const attributes = def.attributes.map((a) => ({
    ...a,
    at: t(a.at),
    align: /^T\d+$/.test(a.tag) ? ('right' as const) : a.tag === 'TAG' ? ('left' as const) : a.align,
  }));
  // 端子番号は線の左に寄せる（映すと線の上だった位置が線の左になる）
  for (const a of attributes) if (/^T\d+$/.test(a.tag)) a.at = [a.at[0] - 0.3, a.at[1]];
  // 機器名は記号の右へ
  const xs = primitives.flatMap((p) => (p.kind === 'line' ? p.points.map((q) => q[0]) : p.kind === 'text' ? [] : [p.center[0] + p.r]));
  const right = Math.max(...xs, ...Object.values(pins).map((q) => q[0]));
  const ys = Object.values(pins).map((q) => q[1]);
  for (const a of attributes) if (a.tag === 'TAG') a.at = [right + 2, (Math.max(...ys) + Math.min(...ys)) / 2];
  return { description: `${def.description}（縦）`, primitives, pins, pinDirs, attributes };
}

// ---- 端子・接地 ----

function terminal(): SymbolDef {
  return {
    description: '端子',
    primitives: [{ kind: 'circle', center: [1.25, 0], r: 1.25 }],
    pins: { 1: [0, 0], 2: [2.5, 0] },
    attributes: [attr('T1', [1.25, 2.6], PIN_TEXT), attr('TAG', [1.25, -2.6], PIN_TEXT)],
  };
}

function ground(): SymbolDef {
  return {
    description: '接地',
    primitives: [
      line([0, 0], [0, -2.5]),
      line([-2, -2.5], [2, -2.5]),
      line([-1.3, -3.3], [1.3, -3.3]),
      line([-0.6, -4.1], [0.6, -4.1]),
    ],
    pins: { 1: [0, 0] },
    attributes: [attr('T1', [1, 1.5], PIN_TEXT, 'left')],
  };
}

// ---- PLC の入出力 ----

/**
 * PLC の入出力点。段の右端（コイルの位置）に置く枠で、左に端子を出す（入力: +24V → 接点 → 入力、
 * シンク出力: +24V → 負荷 → 出力 の順に並ぶ）。ソース出力のように左に置く場合は配置で回転する。
 * 出力は枠の右に縦線を足して入力と見分ける。
 */
function plcPoint(dir: 'in' | 'out'): SymbolDef {
  const primitives: Primitive[] = [rect(2.5, -2.5, 17.5, 2.5), line([0, 0], [2.5, 0])];
  if (dir === 'out') primitives.push(line([16, -2.5], [16, 2.5]));
  return {
    description: dir === 'in' ? 'PLC の入力' : 'PLC の出力',
    primitives,
    pins: { 1: [0, 0] },
    attributes: [
      attr('ADDR', [dir === 'in' ? 10 : 9.25, 0], TAG_TEXT),
      attr('T1', [1.25, 1.5], PIN_TEXT),
      attr('TAG', [10, 4], PIN_TEXT),
      attr('COMMENT', [10, -4], PIN_TEXT),
    ],
  };
}

// ---- 箱（どの記号にも当たらない機器） ----

export interface BoxPin {
  /** 記号の端子名（機器の端子 ID をそのまま使う） */
  pin: string;
  label: string;
}

/** 文字列の幅の目安[mm]（半角は高さの 0.7 倍、全角は 1 倍） */
export function textWidth(s: string, height: number): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) < 0x100 ? 0.7 * height : height;
  return w;
}

/**
 * 端子を左右に並べた四角の記号。端子は 5mm 間隔で、1 つ目を y = 0 に置く。
 * title は枠の中の上に書く文字（型式など）。
 */
export function boxSymbol(title: string, left: BoxPin[], right: BoxPin[]): SymbolDef {
  const rows = Math.max(left.length, right.length, 1);
  const labelWidth = (ps: BoxPin[]) => Math.max(0, ...ps.map((p) => textWidth(p.label, PIN_TEXT)));
  const inner = Math.max(20, labelWidth(left) + labelWidth(right) + 5, textWidth(title, PIN_TEXT) + 3);
  // 枠の幅は格子（2.5mm）に合わせる
  const width = Math.ceil(inner / 2.5) * 2.5;
  const x1 = 2.5;
  const x2 = x1 + width;
  const top = 5;
  const bottom = -(rows - 1) * POLE - 2.5;
  const primitives: Primitive[] = [rect(x1, bottom, x2, top), text([(x1 + x2) / 2, 3], title, PIN_TEXT)];
  const pins: Record<string, Point> = {};
  left.forEach((p, i) => {
    const y = -i * POLE;
    pins[p.pin] = [0, y];
    primitives.push(line([0, y], [x1, y]), text([x1 + 0.8, y], p.label, PIN_TEXT, 'left'));
  });
  right.forEach((p, i) => {
    const y = -i * POLE;
    pins[p.pin] = [x2 + 2.5, y];
    primitives.push(line([x2, y], [x2 + 2.5, y]), text([x2 - 0.8, y], p.label, PIN_TEXT, 'right'));
  });
  return {
    description: `箱（${title}）`,
    primitives,
    pins,
    attributes: [attr('TAG', [(x1 + x2) / 2, top + 2], TAG_TEXT)],
  };
}

// ---- 記号 ID ----

const ACTUATORS: ContactActuator[] = ['pushbutton', 'emergency', 'pull', 'limit', 'thermal', 'selector', 'on-delay', 'off-delay'];

/** 記号 ID の一覧（ライブラリの記号。箱は含まない） */
export const LIBRARY_SYMBOL_IDS: string[] = [
  'contact-no',
  'contact-nc',
  'contact-c',
  ...ACTUATORS.flatMap((a) => [`contact-no-${a}`, `contact-nc-${a}`, `contact-c-${a}`]),
  // 直接開路動作の印つき（非常停止・リミットスイッチ・押しボタン・引き操作の b 接点・c 接点、イネーブルスイッチの a 接点）
  ...(['pushbutton', 'emergency', 'pull', 'limit'] as const).flatMap((a) => [`contact-nc-${a}-do`, `contact-c-${a}-do`, `contact-no-${a}-do`]),
  'coil',
  'lamp',
  'buzzer',
  'motor-3p',
  'motor-1p',
  'motor-3p-v',
  'motor-1p-v',
  ...[1, 2, 3, 4].flatMap((n) => [`breaker-${n}p`, `elb-${n}p`, `contactor-${n}p`, `thermal-${n}p`]),
  ...[1, 2, 3, 4].flatMap((n) => [`breaker-${n}p-v`, `elb-${n}p-v`, `contactor-${n}p-v`, `thermal-${n}p-v`]),
  ...[2, 3, 4].flatMap((n) => [`source-${n}p`, `source-${n}p-v`]),
  'terminal',
  'ground',
  'plc-in',
  'plc-out',
];

/** 接点の記号 ID（C は c 接点）。directOpening で直接開路動作の印をつける（末尾 -do） */
export function contactSymbolId(kind: 'NO' | 'NC' | 'C', actuator?: ContactActuator, directOpening = false): string {
  return `contact-${kind.toLowerCase()}${actuator ? `-${actuator}` : ''}${directOpening ? '-do' : ''}`;
}

const cache = new Map<string, SymbolDef>();

/** ライブラリの記号を ID から作る（無ければ undefined） */
export function librarySymbol(id: string): SymbolDef | undefined {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = buildSymbol(id);
  if (def) cache.set(id, def);
  return def;
}

function buildSymbol(id: string): SymbolDef | undefined {
  const c = /^contact-(no|nc|c)(?:-([a-z-]+?))?(-do)?$/.exec(id);
  if (c) {
    const actuator = c[2] as ContactActuator | undefined;
    if (actuator && !ACTUATORS.includes(actuator)) return undefined;
    const direct = !!c[3];
    if (c[1] === 'c') return changeover(actuator, direct);
    return contact(c[1] === 'no' ? 'NO' : 'NC', actuator, direct);
  }
  const p = /^(breaker|elb|contactor|thermal)-([1-4])p(-v)?$/.exec(id);
  if (p) {
    const n = Number(p[2]);
    const pitch = p[3] ? POLE_V : POLE;
    const def = p[1] === 'thermal' ? thermalElement(n, pitch) : switchPoles(n, p[1] === 'contactor' ? 'contactor' : 'breaker', p[1] === 'elb', pitch);
    return p[3] ? vertical(def) : def;
  }
  const src = /^source-([1-4])p(-v)?$/.exec(id);
  if (src) return source(Number(src[1]), !!src[2]);
  const m = /^motor-(3|1)p-v$/.exec(id);
  if (m) {
    const def = vertical(motor(m[1] === '3' ? 3 : 1, POLE_V));
    // 円の中の文字は縦向きでも「M」の下に相の数を置く
    const circle = def.primitives.find((p) => p.kind === 'circle');
    if (circle?.kind === 'circle') {
      const [cx, cy] = circle.center;
      def.primitives = def.primitives.map((p) =>
        p.kind !== 'text' ? p : { ...p, at: p.text === 'M' ? [cx, cy + 1.2] : [cx, cy - 2.2] },
      );
    }
    return def;
  }
  switch (id) {
    case 'coil':
      return coil();
    case 'lamp':
      return lamp();
    case 'buzzer':
      return buzzer();
    case 'motor-3p':
      return motor(3);
    case 'motor-1p':
      return motor(1);
    case 'terminal':
      return terminal();
    case 'ground':
      return ground();
    case 'plc-in':
      return plcPoint('in');
    case 'plc-out':
      return plcPoint('out');
  }
  return undefined;
}
