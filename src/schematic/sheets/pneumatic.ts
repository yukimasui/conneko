/**
 * 空圧回路図（kind: 'pneumatic'）。概念図のエア機器とチューブから、JIS B 0125-1（ISO 1219-1）の記号で回路図を自動で描く。
 *
 * 並べ方（一般的な空圧回路図の描き方）:
 * - 上の段にアクチュエータ（シリンダ・エアチャックなど）、その下に速度制御弁などの途中の機器、その下に方向制御弁を、弁ごとに縦の列にする
 * - 弁の P（1）は下の主管へつなぐ。主管の左にエア源と 3 点セットを流れの順に並べる
 * - 排気ポート（3・5）は、サイレンサをつないだものはサイレンサの記号、何もつないでいなければ大気への排気（三角）を描く
 * - 記号の横に機器名・型式、ソレノイド・オートスイッチの横に PLC の入出力番号（つないでいれば）を書く。
 *   通信タイプのマニホールドに装着した弁のソレノイドは、SI ユニットの出力（例: MF2 出力3）を書く
 * 線は、弁の作業ポートからアクチュエータのポートまでを、途中の機器を通る道筋で描く（チューブの引き回しそのものではない）。
 *
 * 編集画面では記号のまとまり（機器ごと。マニホールドは装着した弁ごと）をドラッグで動かせる。動かした位置はシートの items
 * （要素 ID は pneumaticElement、x, y は外形の左上）に入り、配管は動かした位置に合わせて直角に引き直す。
 */
import type { Model } from '../../check/model';
import { key } from '../../check/model';
import { airPressures } from '../../check/pneumatic';
import { deviceModel, type DeviceDefinition, type PneumaticHint, type ValveOperator } from '../../devices/types';
import { serialOutputName } from '../../model/bus';
import type { Diagram } from '../../model/diagram';
import { ioRows } from '../../export/reports';
import type { SchematicSheetOut } from '../format';
import { pneumaticElement, type SchematicItem } from '../model';
import type { Bounds } from '../place';
import { textWidth } from '../symbols';
import { conflicts, crosses, hits, r3, simplify, STUBS, type PinAt, type Segment } from '../wiring';
import { pageMaker, upOf } from './table';

type DefLookup = (type: string) => DeviceDefinition | undefined;
type XY = [number, number];

/** 描画の補助（座標は y が下向き。ページの y が上向きの座標に直して書く） */
class Pen {
  constructor(private page: SchematicSheetOut) {}
  private up = (p: XY) => upOf(this.page)(p[0], p[1]);
  line(points: XY[], opts: { closed?: boolean; dashed?: boolean; layer?: string } = {}) {
    this.page.polylines.push({ points: points.map(this.up), layer: opts.layer ?? 'SYMBOL', ...(opts.closed ? { closed: true } : {}), ...(opts.dashed ? { dashed: true } : {}) });
  }
  rect(x: number, y: number, w: number, h: number, opts: { dashed?: boolean; layer?: string } = {}) {
    this.line([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...opts, closed: true });
  }
  circle(cx: number, cy: number, r: number, layer = 'SYMBOL') {
    const n = 20;
    this.line(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)] as XY), { closed: true, layer });
  }
  /** 矢印（先端に塗りのない三角） */
  arrow(from: XY, to: XY, layer = 'SYMBOL') {
    this.line([from, to], { layer });
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
    const len = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / len, dy / len];
    const s = 1.6;
    this.line([to, [to[0] - ux * s * 1.6 - uy * s * 0.7, to[1] - uy * s * 1.6 + ux * s * 0.7], [to[0] - ux * s * 1.6 + uy * s * 0.7, to[1] - uy * s * 1.6 - ux * s * 0.7]], { closed: true, layer });
  }
  dot(x: number, y: number) {
    this.page.dots.push({ at: this.up([x, y]), layer: 'WIRE' });
  }
  text(x: number, y: number, text: string, opts: { height?: number; align?: 'left' | 'center' | 'right'; layer?: string } = {}) {
    if (!text) return;
    this.page.texts.push({ at: this.up([x, y]), text, height: opts.height ?? 2.5, align: opts.align ?? 'left', layer: opts.layer ?? 'TEXT' });
  }
}

/** ばね（ジグザグ）。x0 から x1 へ、高さ h */
function spring(pen: Pen, x0: number, x1: number, cy: number, h = 2.5) {
  const n = 5;
  const pts: XY[] = [];
  for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, i === 0 || i === n ? cy : cy + (i % 2 ? -h : h)]);
  pen.line(pts);
}

/** 弁の操作部。x は箱の外側の辺、dir は外向き（-1: 左、1: 右）。返り値は操作部の外側の端 */
function operator(pen: Pen, op: ValveOperator, x: number, cy: number, dir: -1 | 1): number {
  const w = 5;
  const o = x + dir * w;
  if (op === 'solenoid') {
    // ソレノイド: 長方形に斜線
    const [a, b] = dir < 0 ? [o, x] : [x, o];
    pen.rect(a, cy - 3, w, 6);
    pen.line([[a, cy + 3], [b, cy - 3]]);
  } else if (op === 'spring') {
    spring(pen, x, o + dir * 1, cy);
    return o + dir * 1;
  } else if (op === 'pilot') {
    pen.line([[x, cy], [o, cy]], { dashed: true });
    pen.line([[o, cy - 2], [o, cy + 2], [o - dir * 3, cy]], { closed: true });
  } else if (op === 'manual') {
    pen.line([[x, cy], [o, cy]]);
    pen.line([[o, cy - 2.5], [o, cy + 2.5]]);
  } else {
    // 機械操作（ローラ）
    pen.line([[x, cy], [o - dir * 1.5, cy]]);
    pen.circle(o, cy, 1.5);
  }
  return o;
}

const BOX_W = 15;
const BOX_H = 12;

/** 弁の箱の中の流れ（箱の左上 x, y）。flows は [始点ポート, 終点ポート] の組、blocked は塞がったポート */
function valveBox(pen: Pen, x: number, y: number, ports: Record<string, XY>, flows: [string, string][], blocked: string[]) {
  pen.rect(x, y, BOX_W, BOX_H);
  const at = (p: string): XY => [x + ports[p][0], y + ports[p][1]];
  for (const [a, b] of flows) {
    const [pa, pb] = [at(a), at(b)];
    // 端から少し内側へ
    const inset = (p: XY, q: XY): XY => [p[0] + (q[0] - p[0]) * 0.12, p[1] + (q[1] - p[1]) * 0.12];
    pen.arrow(inset(pa, pb), inset(pb, pa));
  }
  for (const b of blocked) {
    const [px, py] = at(b);
    const iy = py < y + BOX_H / 2 ? py + 3 : py - 3;
    pen.line([[px, py], [px, iy]]);
    pen.line([[px - 1.5, iy], [px + 1.5, iy]]);
  }
}

interface Drawn {
  /** 記号のポート名 → 線をつなぐ点 */
  pins: Record<string, XY>;
  /** 記号の外形（文字を置くため） */
  box: { x: number; y: number; w: number; h: number };
}

/** 方向制御弁。中心 cx、箱の上端 y。ポートは外部の配管をつなぐ箱（2 位置は右、3 位置は中央）に付ける */
function drawValve(pen: Pen, hint: PneumaticHint, cx: number, y: number, solLabel: { a?: string; b?: string }): Drawn {
  const v = hint.valve ?? { ways: 5, positions: 2, operators: { a: 'solenoid', b: 'spring' } };
  const n = v.positions;
  const total = n * BOX_W;
  const x0 = cx - total / 2;
  // ポートの位置（箱の中の座標）
  const five = v.ways === 5;
  const ports: Record<string, XY> = five
    ? { '4': [BOX_W * 0.25, 0], '2': [BOX_W * 0.75, 0], '5': [BOX_W * 0.2, BOX_H], '1': [BOX_W * 0.5, BOX_H], '3': [BOX_W * 0.8, BOX_H] }
    : { '2': [BOX_W * 0.5, 0], '1': [BOX_W * 0.3, BOX_H], '3': [BOX_W * 0.7, BOX_H] };
  // 位置ごとの流れ: a 側（左の箱）＝ a を操作した位置、b 側（右の箱）＝ b を操作した（またはばねで戻った）位置
  const nc = !v.normallyOpen;
  const posA: [[string, string][], string[]] = five ? [[['1', '4'], ['2', '3']], ['5']] : nc ? [[['1', '2']], ['3']] : [[['2', '3']], ['1']];
  const posB: [[string, string][], string[]] = five ? [[['1', '2'], ['4', '5']], ['3']] : nc ? [[['2', '3']], ['1']] : [[['1', '2']], ['3']];
  const center: [[string, string][], string[]] =
    v.center === 'exhaust'
      ? [[['4', '5'], ['2', '3']], ['1']]
      : v.center === 'pressure'
        ? [[['1', '4'], ['1', '2']], ['5', '3']]
        : [[], five ? ['4', '2', '5', '1', '3'] : ['2', '1', '3']];
  const boxes = n === 3 ? [posA, center, posB] : [posA, posB];
  boxes.forEach(([flows, blocked], i) => valveBox(pen, x0 + i * BOX_W, y, ports, flows, blocked));
  const cy = y + BOX_H / 2;
  const left = operator(pen, v.operators.a, x0, cy, -1);
  const right = operator(pen, v.operators.b, x0 + total, cy, 1);
  // ソレノイドの名前は操作部の真上に（隣の弁の名前とくっつかないよう、箱の外へは出さない）
  if (solLabel.a) pen.text(x0 - 2.5, y - 2.5, solLabel.a, { align: 'center', layer: 'TAG', height: 2.2 });
  if (solLabel.b) pen.text(x0 + total + 2.5, y - 2.5, solLabel.b, { align: 'center', layer: 'TAG', height: 2.2 });
  // 外部の配管をつなぐ箱
  const bx = x0 + (n === 3 ? BOX_W : BOX_W);
  const pins: Record<string, XY> = {};
  for (const [p, [px, py]] of Object.entries(ports)) {
    pins[p] = [bx + px, y + py];
    pen.text(bx + px + 0.8, py === 0 ? y - 1.6 : y + BOX_H + 1.8, p, { height: 1.8 });
  }
  return { pins, box: { x: left, y, w: right - left, h: BOX_H } };
}

/** シリンダ。中心 cx・上端 y。ポートは下に出す（head は左、rod は右） */
function drawCylinder(pen: Pen, hint: PneumaticHint, cx: number, y: number): Drawn {
  const c = hint.cylinder ?? { acting: 'double' };
  const w = 40;
  const h = 10;
  const x0 = cx - w / 2;
  pen.rect(x0, y, w, h);
  const px = x0 + w * 0.32;
  // ピストンとロッド
  pen.line([[px, y], [px, y + h]]);
  pen.line([[px, y + h / 2 - 0.9], [x0 + w + 12, y + h / 2 - 0.9]]);
  pen.line([[px, y + h / 2 + 0.9], [x0 + w + 12, y + h / 2 + 0.9]]);
  pen.line([[x0 + w + 12, y + h / 2 - 0.9], [x0 + w + 12, y + h / 2 + 0.9]]);
  if (c.doubleRod) {
    pen.line([[x0 - 10, y + h / 2 - 0.9], [px, y + h / 2 - 0.9]]);
    pen.line([[x0 - 10, y + h / 2 + 0.9], [px, y + h / 2 + 0.9]]);
  }
  if (c.acting === 'single-push') spring(pen, px + 1, x0 + w - 1, y + h / 2 + 3, 1.5);
  if (c.acting === 'single-pull') spring(pen, x0 + 1, px - 1, y + h / 2 + 3, 1.5);
  if (c.cushion) {
    pen.rect(px - 4, y + h / 2 - 1.5, 4, 3);
    pen.rect(px + 0.01, y + h / 2 - 1.5, 4, 3);
  }
  if (c.magnet) pen.rect(px - 1, y + 1, 2, 2);
  const pins: Record<string, XY> = {};
  if (c.acting !== 'single-pull') pins.head = [x0 + 4, y + h];
  if (c.acting !== 'single-push') pins.rod = [x0 + w - 4, y + h];
  return { pins, box: { x: x0, y, w: w + 12, h } };
}

/** 汎用の箱の記号（エアチャック・ロータリ・真空など、簡略に描く機器）。ポートは下に並べる */
function drawBoxSymbol(pen: Pen, label: string, ports: string[], cx: number, y: number, w = 26, h = 12): Drawn {
  pen.rect(cx - w / 2, y, w, h);
  pen.text(cx, y + h / 2, label, { align: 'center', height: 2.5 });
  const pins: Record<string, XY> = {};
  ports.forEach((p, i) => (pins[p] = [cx - w / 2 + (w * (i + 1)) / (ports.length + 1), y + h]));
  return { pins, box: { x: cx - w / 2, y, w, h } };
}

/**
 * エアチャック・ロータリアクチュエータ（JIS に決まった記号がないので、SMC のカタログのように複動の本体に指・回転の矢印を付けて描く）。
 * ports は左から並べるポート名（弁の 4 につながるポートを左にすると線が交差しない）。ポートの横に名前（開・閉、A・B）を書く
 */
function drawGripperOrRotary(pen: Pen, kind: 'gripper' | 'rotary', ports: string[], cx: number, y: number): Drawn {
  const w = 30;
  const h = 10;
  const x0 = cx - w / 2;
  pen.rect(x0, y, w, h);
  if (kind === 'gripper') {
    // 本体の中のピストンと、上に開閉する 2 本の指
    pen.line([[cx, y], [cx, y + h]]);
    pen.line([[cx - 7, y], [cx - 7, y - 6], [cx - 2.5, y - 6], [cx - 2.5, y - 3.5]]);
    pen.line([[cx + 7, y], [cx + 7, y - 6], [cx + 2.5, y - 6], [cx + 2.5, y - 3.5]]);
    pen.arrow([cx - 5, y - 9], [cx - 9, y - 9]);
    pen.arrow([cx + 5, y - 9], [cx + 9, y - 9]);
  } else {
    // 揺動の矢印（両向き）
    const r = 3.5;
    const pts: XY[] = Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * (0.15 + (0.7 * i) / 8);
      return [cx + r * Math.cos(a) * 1.6, y + h / 2 - r * Math.sin(a) + 1.5] as XY;
    });
    pen.line(pts);
    pen.arrow(pts[1], pts[0]);
    pen.arrow(pts[7], pts[8]);
  }
  const names: Record<string, string> = { open: '開', close: '閉', a: 'A', b: 'B' };
  const pins: Record<string, XY> = {};
  ports.forEach((p, i) => {
    const px = ports.length === 1 ? cx : x0 + 5 + (i * (w - 10)) / (ports.length - 1);
    pins[p] = [px, y + h];
    pen.text(px + 0.8, y + h + 2.5, names[p] ?? p, { height: 1.8 });
  });
  return { pins, box: { x: x0, y: kind === 'gripper' ? y - 10 : y, w, h: kind === 'gripper' ? h + 10 : h } };
}

/** オートスイッチの印（ひし形）と、検出する位置・PLC の入出力番号。x, y はひし形の中心 */
function drawSwitch(pen: Pen, x: number, y: number, label: string, addr: string | undefined, align: 'left' | 'right') {
  pen.line([[x, y - 1.8], [x + 1.8, y], [x, y + 1.8], [x - 1.8, y]], { closed: true });
  const tx = align === 'left' ? x + 2.8 : x - 2.8;
  pen.text(tx, y - 0.2, addr ? `${label} ${addr}` : label, { height: 1.9, layer: 'TAG', align });
}

/** 速度制御弁（縦向き）。上端 y、中心 cx。in が下（弁の側）・out が上（アクチュエータの側）のとき上向きの流れが自由流れ */
function drawSpeedController(pen: Pen, cx: number, y: number, freeUp: boolean): Drawn {
  const h = 16;
  pen.rect(cx - 6, y, 12, h, { dashed: true });
  // 主の流れ（絞り）
  pen.line([[cx - 2.5, y], [cx - 2.5, y + h]]);
  pen.line([[cx - 4.2, y + h / 2 - 2.5], [cx - 2.9, y + h / 2], [cx - 4.2, y + h / 2 + 2.5]]);
  pen.line([[cx - 0.8, y + h / 2 - 2.5], [cx - 2.1, y + h / 2], [cx - 0.8, y + h / 2 + 2.5]]);
  pen.line([[cx - 5, y + h / 2 + 3], [cx, y + h / 2 - 3]]);
  // 逆止弁（並列）
  pen.line([[cx - 2.5, y + 2], [cx + 3, y + 2], [cx + 3, y + h - 2], [cx - 2.5, y + h - 2]]);
  // 玉は V 字の弁座の開いた側に座る。V 字の頂点から玉へ向かう向きが自由流れ
  const dir = freeUp ? -1 : 1;
  const apex = y + h / 2 - dir * 2.2;
  pen.line([[cx + 1.2, apex + dir * 3.2], [cx + 3, apex], [cx + 4.8, apex + dir * 3.2]]);
  pen.circle(cx + 3, apex + dir * 2.1, 1.1);
  return { pins: { top: [cx - 2.5, y], bottom: [cx - 2.5, y + h] }, box: { x: cx - 6, y, w: 12, h } };
}

/** 横向きの機器（エア源・3 点セットなど。in が左、out が右）。左端 x、中心の高さ cy。返り値の幅で次を並べる */
function drawInline(pen: Pen, hint: PneumaticHint, x: number, cy: number, opts: { exhSilencer?: boolean } = {}): Drawn & { width: number } {
  const diamond = (dx: number, inner: 'filter' | 'lub' | 'mist') => {
    const s = 6;
    pen.line([[dx, cy], [dx + s, cy - s], [dx + 2 * s, cy], [dx + s, cy + s]], { closed: true });
    if (inner === 'filter' || inner === 'mist') pen.line([[dx + s, cy - s + 1], [dx + s, cy + s - 1]], { dashed: true });
    if (inner === 'mist') pen.line([[dx + s - 2, cy - s + 3], [dx + s - 2, cy + s - 3]], { dashed: true });
    if (inner === 'lub') {
      pen.line([[dx + s, cy - 3], [dx + s, cy + 2]]);
      pen.circle(dx + s, cy + 2.8, 0.8);
    }
    return 2 * s;
  };
  const regulator = (dx: number) => {
    const s = 12;
    pen.rect(dx, cy - s / 2, s, s);
    pen.arrow([dx + s / 2, cy + s / 2 - 1], [dx + s / 2, cy - s / 2 + 1]);
    spring(pen, dx + s / 2 - 2.5, dx + s / 2 + 2.5, cy - s / 2 - 2.5, 1.2);
    pen.line([[dx + s / 2 - 3, cy - s / 2 - 0.5], [dx + s / 2 + 3, cy - s / 2 - 4.5]]);
    // 二次側からのパイロット（破線）
    pen.line([[dx + s, cy + 3], [dx + s / 2 + 2, cy + 3], [dx + s / 2 + 2, cy + s / 2]], { dashed: true });
    return s;
  };
  const gauge = (gx: number) => {
    pen.line([[gx, cy], [gx, cy - 9]]);
    pen.circle(gx, cy - 12, 3);
    pen.line([[gx - 1.8, cy - 10.2], [gx + 1.8, cy - 13.8]]);
  };
  const pipe = (a: number, b: number) => pen.line([[a, cy], [b, cy]], { layer: 'WIRE' });
  let cx = x;
  const s = hint.symbol;
  const unitsOf = (): NonNullable<PneumaticHint['units']> =>
    s === 'frl' ? (hint.units ?? ['filter', 'regulator', 'lubricator']) : s === 'filter-regulator' ? ['filter-regulator'] : [s as 'filter'];
  if (s === 'source') {
    pen.circle(x + 5, cy, 5);
    pen.line([[x + 3, cy - 2.5], [x + 7.5, cy], [x + 3, cy + 2.5]], { closed: true });
    return { pins: { out: [x + 10, cy] }, box: { x, y: cy - 5, w: 10, h: 10 }, width: 10 };
  }
  if (s === 'shutoff') {
    pen.line([[x, cy - 3], [x + 10, cy + 3], [x + 10, cy - 3], [x, cy + 3]], { closed: true });
    return { pins: { in: [x, cy], out: [x + 10, cy] }, box: { x, y: cy - 3, w: 10, h: 6 }, width: 10 };
  }
  if (s === 'check-valve') {
    // in → out が自由流れ: V 字の頂点を in 側に、玉を V 字の中（out 側）に
    pen.line([[x + 8.5, cy - 3.2], [x + 3.5, cy], [x + 8.5, cy + 3.2]]);
    pen.circle(x + 6.8, cy, 1.8);
    pipe(x, x + 3.5);
    pipe(x + 8.6, x + 12);
    return { pins: { in: [x, cy], out: [x + 12, cy] }, box: { x, y: cy - 3, w: 12, h: 6 }, width: 12 };
  }
  if (s === 'residual-valve') {
    // 3 ポート 2 位置の手動弁（ロック付き）。外部の配管は右の箱（通常＝二次側を排気する位置）につなぐ
    const bx = x + 8;
    const top = cy - 6;
    const bot = cy + 6;
    pen.rect(bx, top, 10, 12);
    pen.rect(bx + 10, top, 10, 12);
    // 左の箱（ハンドルを開けた位置）: 1(IN) → 2(OUT)、3(EXH) は塞ぐ
    pen.arrow([bx + 3, bot], [bx + 5, top]);
    pen.line([[bx + 7, bot], [bx + 7, bot - 3]]);
    pen.line([[bx + 5.5, bot - 3], [bx + 8.5, bot - 3]]);
    // 右の箱（閉じた位置）: 2(OUT) → 3(EXH)、1(IN) は塞ぐ
    pen.arrow([bx + 15, top], [bx + 17, bot]);
    pen.line([[bx + 13, bot], [bx + 13, bot - 3]]);
    pen.line([[bx + 11.5, bot - 3], [bx + 14.5, bot - 3]]);
    // 手動操作（ロック付き）。主の流れの線に重ならないよう箱の上寄りに付ける
    const oy = top + 3;
    pen.line([[bx, oy], [bx - 5, oy]]);
    pen.line([[bx - 5, oy - 2.5], [bx - 5, oy + 2.5]]);
    pen.line([[bx - 3, oy - 1.5], [bx - 2, oy + 1.5]]);
    // 一次側は下から、二次側は上から出して、主の流れ（cy）につなぐ
    pen.line([[x, cy], [x + 2, cy], [x + 2, bot + 5], [bx + 13, bot + 5], [bx + 13, bot]], { layer: 'WIRE' });
    pen.line([[bx + 15, top], [bx + 15, top - 5], [bx + 24, top - 5], [bx + 24, cy]], { layer: 'WIRE' });
    drawExhaust(pen, [bx + 17, bot], !!opts.exhSilencer);
    return { pins: { in: [x, cy], out: [bx + 24, cy], exh: [bx + 17, bot] }, box: { x, y: top - 5, w: bx + 24 - x, h: 22 }, width: bx + 24 - x };
  }
  if (s === 'pressure-switch' || s === 'gauge') {
    pen.line([[x, cy], [x + 4, cy]], { layer: 'WIRE' });
    if (s === 'gauge') gauge(x + 4);
    else {
      pen.rect(x + 1, cy - 14, 8, 8);
      pen.line([[x + 4, cy], [x + 4, cy - 6]], { dashed: true });
      spring(pen, x + 2, x + 8, cy - 10, 1.2);
    }
    return { pins: { in: [x, cy], out: [x + 4, cy] }, box: { x, y: cy - 14, w: 10, h: 14 }, width: 10 };
  }
  const units = unitsOf();
  const start = cx;
  for (const u of units) {
    if (cx > start) {
      pipe(cx, cx + 3);
      cx += 3;
    }
    if (u === 'filter') cx += diamond(cx, 'filter');
    else if (u === 'mist-separator') cx += diamond(cx, 'mist');
    else if (u === 'lubricator') cx += diamond(cx, 'lub');
    else if (u === 'regulator' || u === 'filter-regulator') {
      if (u === 'filter-regulator') {
        cx += diamond(cx, 'filter');
        pipe(cx, cx + 2);
        cx += 2;
      }
      cx += regulator(cx);
      // 圧力計は二次側の管から立ち上げる
      if (hint.gauge) {
        pipe(cx, cx + 5);
        gauge(cx + 2.5);
        cx += 5;
      }
    }
  }
  if (s === 'frl' || units.length > 1) pen.rect(start - 2, cy - 20, cx - start + 4, 28, { dashed: true });
  return { pins: { in: [start, cy], out: [cx, cy] }, box: { x: start - 2, y: cy - 20, w: cx - start + 4, h: 28 }, width: cx - start };
}

/** 排気: サイレンサ（silencer）か、大気への排気（三角）。ポートの点 p から下へ */
function drawExhaust(pen: Pen, p: XY, silencer: boolean) {
  const [x, y] = p;
  pen.line([[x, y], [x, y + 4]], { layer: 'WIRE' });
  if (silencer) {
    pen.rect(x - 2, y + 4, 4, 5);
    for (const dx of [-1, 0, 1]) pen.line([[x + dx, y + 5], [x + dx, y + 8]]);
  } else {
    pen.line([[x - 2, y + 4], [x + 2, y + 4], [x, y + 7]], { closed: true });
  }
}

const ACTUATORS = new Set(['cylinder', 'gripper', 'rotary', 'vacuum-pad']);
const INLINE = new Set(['speed-controller', 'check-valve', 'shutoff', 'tee']);
const SUPPLY = new Set(['source', 'filter', 'mist-separator', 'lubricator', 'regulator', 'filter-regulator', 'frl', 'residual-valve', 'shutoff', 'pressure-switch', 'gauge']);

interface Entry {
  id: string;
  def: DeviceDefinition;
  hint: PneumaticHint;
  /** 端子ID → 記号のポート名 */
  symPort: Map<string, string>;
  x: number;
  model: string;
}

/** 編集画面でドラッグして動かせる記号のまとまり（機器ごと。マニホールドは装着した弁ごと） */
export interface PneumaticGroup {
  /** シートの items の要素 ID（pneumaticElement） */
  element: string;
  device: string;
  /** 表示用の名前（機器名と型式） */
  label: string;
  /** まとまりの記号の外形の左上（items の x, y はこの点）。y は下向き */
  origin: XY;
  /** 文字を含めたまとまりの範囲（つかむところ）。y は下向き */
  bounds: Box;
}

type Box = Drawn['box'];

/** 記号のまとまりの下書き（自動の位置で別のページに描いたもの） */
interface Sketch<T extends Drawn> {
  page: SchematicSheetOut;
  drawn: T;
}

const shiftXY = (p: XY, d: XY): XY => [p[0] + d[0], p[1] + d[1]];
const shiftBox = (b: Box, d: XY): Box => ({ ...b, x: b.x + d[0], y: b.y + d[1] });
function shiftDrawn<T extends Drawn>(t: T, d: XY): T {
  if (!d[0] && !d[1]) return t;
  return { ...t, pins: Object.fromEntries(Object.entries(t.pins).map(([k, p]) => [k, shiftXY(p, d)])), box: shiftBox(t.box, d) };
}
function unionBox(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** 下書きの図形と文字の範囲（y は下向き） */
function sketchBounds(s: Sketch<Drawn>): Box {
  const H = s.page.paper.height;
  let b: Box = s.drawn.box;
  const add = (x1: number, y1: number, x2: number, y2: number) => (b = unionBox(b, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }));
  for (const pl of s.page.polylines) for (const [x, y] of pl.points) add(x, H - y, x, H - y);
  for (const t of s.page.texts) {
    const w = textWidth(t.text, t.height);
    const x1 = t.align === 'right' ? t.at[0] - w : t.align === 'center' ? t.at[0] - w / 2 : t.at[0];
    add(x1, H - t.at[1] - t.height / 2, x1 + w, H - t.at[1] + t.height / 2);
  }
  return b;
}

/** 下書きを d（y は下向き）だけずらして本のページへ移す */
function commitSketch(page: SchematicSheetOut, s: Sketch<Drawn>, d: XY) {
  // ページの座標は y が上向き
  const mv = (p: [number, number]): [number, number] => [p[0] + d[0], p[1] - d[1]];
  for (const pl of s.page.polylines) page.polylines.push({ ...pl, points: pl.points.map(mv) });
  for (const dot of s.page.dots) page.dots.push({ ...dot, at: mv(dot.at) });
  for (const t of s.page.texts) page.texts.push({ ...t, at: mv(t.at) });
}

export function pneumaticPages(
  sheet: { id: string; name: string; items?: SchematicItem[] },
  diagram: Diagram,
  model: Model,
  lookup: DefLookup,
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  return pneumaticLayout(sheet, diagram, model, lookup, paper).pages;
}

/**
 * 空圧回路図のページと、動かせる記号のまとまり。
 * 記号のまとまりは自動の位置（下の「並べ方」）に置き、シートの items にあるものはその位置へ動かす。配管は記号の位置が決まってから引く。
 */
export function pneumaticLayout(
  sheet: { id: string; name: string; items?: SchematicItem[] },
  diagram: Diagram,
  model: Model,
  lookup: DefLookup,
  paper: { width: number; height: number },
): { pages: SchematicSheetOut[]; groups: PneumaticGroup[] } {
  const make = pageMaker(sheet, paper);
  const blank = (): SchematicSheetOut => ({ id: '', name: '', paper, inserts: [], polylines: [], dots: [], texts: [] });
  const sketch = <T extends Drawn>(draw: (pen: Pen) => T): Sketch<T> => {
    const p = blank();
    return { page: p, drawn: draw(new Pen(p)) };
  };
  const entries = new Map<string, Entry>();
  for (const { device, def, r } of model.devices.values()) {
    const hint = r.pneumatic;
    if (!hint) continue;
    entries.set(device.id, {
      id: device.id,
      def,
      hint,
      symPort: new Map(Object.entries(hint.ports).map(([sym, t]) => [t, sym])),
      x: device.x,
      model: deviceModel(def, device.params),
    });
  }
  const page = make.newPage();
  const pen = new Pen(page);
  if (!entries.size) {
    pen.text(25, 40, '空圧回路図にする機器がありません（概念図にエア機器を置き、チューブでつなぐと描けます）', { height: 3.5 });
    return { pages: make.pages, groups: [] };
  }

  // ポートのつながり（チューブ・エアのリンク）
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  };
  for (const w of model.tubes) link(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of model.labelLinks) link(a, b);
  // エアのリンクの端子は、つないだ先どうしを直接つなぐ（リンクは図に描かない）
  const owner = (k: string) => k.slice(0, k.indexOf(':'));
  const portOf = (k: string) => k.slice(k.indexOf(':') + 1);
  const neighbors = (k: string, seen = new Set<string>()): string[] => {
    seen.add(k);
    const out: string[] = [];
    for (const n of adj.get(k) ?? []) {
      if (seen.has(n)) continue;
      if (entries.has(owner(n))) out.push(n);
      else {
        seen.add(n);
        for (const m of adj.get(n) ?? []) if (!seen.has(m)) out.push(...(entries.has(owner(m)) ? [m] : neighbors(m, seen)));
      }
    }
    return out;
  };

  /** 作業ポートからアクチュエータまでの道筋（途中の機器を通る） */
  const trace = (from: string, visited = new Set<string>()): { chain: { id: string; enter: string; exit: string }[]; end?: string } => {
    for (const n of neighbors(from)) {
      const e = entries.get(owner(n))!;
      if (ACTUATORS.has(e.hint.symbol)) return { chain: [], end: n };
      if (INLINE.has(e.hint.symbol) && !visited.has(e.id)) {
        visited.add(e.id);
        const others = Object.values(e.hint.ports).filter((t) => t !== portOf(n));
        for (const t of others) {
          const r = trace(key(e.id, t), visited);
          if (r.end) return { chain: [{ id: e.id, enter: portOf(n), exit: t }, ...r.chain], end: r.end };
        }
      }
    }
    return { chain: [] };
  };

  // 列: 弁ごと（概念図の左から）。弁につながらないアクチュエータは単独の列
  const valves = [...entries.values()].filter((e) => e.hint.symbol === 'valve').sort((a, b) => a.x - b.x);
  type Line = { valvePort: string; chain: { id: string; enter: string; exit: string }[]; end?: string };
  const columns: { valve?: Entry; actuator?: Entry; lines: Line[] }[] = [];
  const usedActuators = new Set<string>();
  for (const v of valves) {
    const workPorts = (v.hint.valve?.ways === 5 ? ['4', '2'] : ['2']).filter((p) => v.hint.ports[p]);
    const lines: Line[] = workPorts.map((p) => ({ valvePort: p, ...trace(key(v.id, v.hint.ports[p])) }));
    const actId = lines.map((l) => l.end && owner(l.end)).find(Boolean);
    if (actId) usedActuators.add(actId);
    columns.push({ valve: v, actuator: actId ? entries.get(actId) : undefined, lines });
  }
  for (const e of [...entries.values()].filter((x) => ACTUATORS.has(x.hint.symbol) && !usedActuators.has(x.id)).sort((a, b) => a.x - b.x)) {
    columns.push({ actuator: e, lines: [] });
  }

  // PLC の入出力番号（ソレノイド・オートスイッチの横に書く）
  const address = new Map<string, string>();
  for (const r of ioRows(diagram, lookup)) for (const c of r.connections.split(/[,、\s]+/).filter(Boolean)) if (!address.has(c)) address.set(c, r.address);
  const tagOf = (dev: string, terminal?: string) => (terminal ? address.get(`${dev}.${terminal}`) : undefined);

  const pressure = airPressures(model);
  const W = paper.width;
  const top = 32;
  const yAct = top + 8;
  const yInline = top + 42;
  const yValve = top + 84;
  const yMain = top + 130;
  const ySupply = top + 162;
  const left = 30;
  const colW = Math.max(52, Math.min(80, (W - left - 30) / Math.max(1, columns.length)));

  pen.text(left, top - 10, '空圧回路図（JIS B 0125-1 の記号。概念図のエア機器とチューブから自動で作成）', { height: 3 });

  // マニホールド（装着した弁の親）
  const hostOf = (id: string) => {
    const h = model.devices.get(id)?.device.mount?.device;
    return h && entries.get(h)?.hint.symbol === 'manifold' ? h : undefined;
  };
  /** マニホールドの排気ポートに付けたサイレンサ */
  const hostSilencer = (host: string) =>
    [...(model.devices.get(host)?.r.air.entries() ?? [])]
      .filter(([, a]) => a.kind === 'exhaust')
      .flatMap(([t]) => neighbors(key(host, t)))
      .filter((n) => entries.get(owner(n))?.hint.symbol === 'silencer');

  // 記号のまとまりは、いったん自動の位置で下書きに描き、シートの items で動かした量だけずらして本のページへ移す
  const moved = new Map((sheet.items ?? []).map((it) => [it.element, it]));
  const groups: PneumaticGroup[] = [];
  const offsetOf = (device: string, box: Box): XY => {
    const it = moved.get(pneumaticElement(device));
    return it ? [it.x - box.x, it.y - box.y] : [0, 0];
  };
  /** 下書きを本のページへ移し、動かせるまとまりとして記録する。返り値は移したあとの位置 */
  const place = <T extends Drawn>(device: string, s: Sketch<T>, d: XY = offsetOf(device, s.drawn.box), more: Sketch<Drawn>[] = []): T => {
    commitSketch(page, s, d);
    const e = entries.get(device);
    const at = shiftDrawn(s.drawn, d);
    const bounds = more.reduce((b, m) => unionBox(b, sketchBounds(m)), sketchBounds(s));
    groups.push({ element: pneumaticElement(device), device, label: e ? `${device}（${e.model}）` : device, origin: [at.box.x, at.box.y], bounds: shiftBox(bounds, d) });
    return at;
  };
  /** 配管が避ける記号の外形（本のページの位置） */
  const obstacles: Box[] = [];

  // 列ごとのまとまり: アクチュエータ・速度制御弁・弁（マニホールドに装着した弁は、あとでマニホールドごと移す）
  const valveSketches = new Map<string, { sketch: Sketch<Drawn>; host?: string }>();
  const valveAt = new Map<string, Drawn>();
  /** 弁の作業ポートからアクチュエータまでの配管（弁の位置が決まってから引く） */
  const workLines: { valve: string; valvePort: string; net: string; ends: PinAt[]; labels: { text: string; at: XY }[]; unconnected: boolean }[] = [];
  columns.forEach((col, i) => {
    const cx = left + colW * i + colW / 2;
    let act: Drawn | undefined;
    let actAuto: Drawn | undefined;
    if (col.actuator) {
      const a = col.actuator;
      const s = sketch((pen) => {
        // 弁の 4 につながるポートを左に置く（線が交差しないように）
        const toFour = col.lines.find((l) => l.valvePort === '4')?.end;
        const ports = Object.keys(a.hint.ports).sort((p, q) => Number(a.hint.ports[q] === (toFour && portOf(toFour))) - Number(a.hint.ports[p] === (toFour && portOf(toFour))));
        const drawn =
          a.hint.symbol === 'cylinder'
            ? drawCylinder(pen, a.hint, cx - 4, yAct)
            : a.hint.symbol === 'gripper' || a.hint.symbol === 'rotary'
              ? drawGripperOrRotary(pen, a.hint.symbol, ports, cx, yAct)
              : drawBoxSymbol(pen, 'パッド', Object.keys(a.hint.ports), cx, yAct);
        // 機器名・型式は記号の右
        pen.text(drawn.box.x + drawn.box.w + 3, yAct + 2.5, a.id, { layer: 'TAG', height: 2.8 });
        pen.text(drawn.box.x + drawn.box.w + 3, yAct + 6.5, a.model, { height: 2 });
        // オートスイッチ: 記号の上の、検出する端の側にひし形と入出力番号
        const cs = a.hint.cylinder?.switches;
        const switches = a.hint.switches ?? [
          ...(cs?.head ? [{ label: '後退端', terminal: cs.head }] : []),
          ...(cs?.rod ? [{ label: '前進端', terminal: cs.rod }] : []),
        ];
        switches.forEach((sw, k) => {
          const leftSide = k === 0;
          const sx = leftSide ? drawn.box.x + 3 : drawn.box.x + Math.min(drawn.box.w, 40) - 3;
          // 文字は端から外側へ（左のスイッチは左へ、右のスイッチは右へ）
          drawSwitch(pen, sx, drawn.box.y - 4, sw.label, tagOf(a.id, sw.terminal), leftSide ? 'right' : 'left');
        });
        // ポートに直付けしたスピードコントローラ（アクチュエータのすぐ下。アクチュエータと一緒に動かす）。
        // 配管はスピードコントローラの下の端から引くので、そのポートの位置を付け替える
        let box = drawn.box;
        const pins = { ...drawn.pins };
        for (const [sym, attached] of Object.entries(a.hint.speedControllers ?? {})) {
          const pin = drawn.pins[sym];
          if (!pin || !attached) continue;
          const sy = yAct + 15;
          // メータアウトは弁 → アクチュエータが自由流れ（上向き）
          const d = drawSpeedController(pen, pin[0] + 2.5, sy, attached.control === 'meter-out');
          pen.line([pin, d.pins.top], { layer: 'WIRE' });
          // 型式は記号の右に 2 行で書く。右に同じアクチュエータの別のポートがあって入らなければ左に書く
          const [series, rest] = [attached.model.slice(0, attached.model.indexOf('-')), attached.model.slice(attached.model.indexOf('-'))];
          const tw = Math.max(textWidth(series, 1.8), textWidth(rest, 1.8));
          const others = Object.values(drawn.pins).map((q) => q[0]).filter((x) => x > pin[0] + 0.1);
          const leftSide = others.length > 0 && Math.min(...others) - 3.5 < d.box.x + d.box.w + 1 + tw + 1;
          const tx = leftSide ? d.box.x - 1 : d.box.x + d.box.w + 1;
          const align = leftSide ? 'right' : 'left';
          pen.text(tx, sy + 5, series, { height: 1.8, align });
          pen.text(tx, sy + 8, rest, { height: 1.8, align });
          pins[sym] = d.pins.bottom;
          box = unionBox(box, d.box);
        }
        return { ...drawn, box, pins };
      });
      actAuto = s.drawn;
      act = place(a.id, s);
      obstacles.push(act.box);
    }
    if (col.valve) {
      const v = col.valve;
      const host = hostOf(v.id);
      const s = sketch((pen) => {
        const sol = v.hint.valve?.solenoids;
        const label = (side: 'a' | 'b') => {
          const t = sol?.[side];
          if (!t && !(v.hint.valve?.operators[side] === 'solenoid')) return undefined;
          // シンク出力は − 側、ソース出力は + 側につながるので、両方を調べる。通信タイプのマニホールドの弁は SI ユニットの出力
          const addr = tagOf(v.id, t) ?? tagOf(v.id, t?.replace(/\+$/, '-')) ?? serialOutputName(model.bus, v.id, side === 'a' ? 'A' : 'B');
          const name = v.hint.valve?.operators.b === 'solenoid' ? `${v.id}${side.toUpperCase()}` : v.id;
          return addr ? `${name}（${addr}）` : name;
        };
        const vd = drawValve(pen, v.hint, cx, yValve, { a: label('a'), b: label('b') });
        pen.text(vd.box.x + vd.box.w + 1, yValve + BOX_H + 6, v.model, { height: 2 });
        // 排気
        for (const p of ['5', '3']) {
          const t = v.hint.ports[p];
          if (!t || !vd.pins[p]) continue;
          // マニホールドに装着した弁の排気は、マニホールドの排気ポートに付けたサイレンサで出す
          const nb = host ? hostSilencer(host) : neighbors(key(v.id, t));
          const sil = host ? nb.length > 0 : nb.some((n) => entries.get(owner(n))?.hint.symbol === 'silencer');
          if (host || !nb.length || sil) drawExhaust(pen, vd.pins[p], sil);
        }
        // 供給のない弁は主管へつながない
        const pt = v.hint.ports['1'];
        if (pt && vd.pins['1'] && !pressure.has(key(v.id, pt))) pen.text(vd.pins['1'][0], vd.pins['1'][1] + 8, '供給なし', { align: 'center', height: 2 });
        return vd;
      });
      valveSketches.set(v.id, { sketch: s, host });
      if (!host) valveAt.set(v.id, place(v.id, s));
    }
    // 作業ポート → 途中の機器 → アクチュエータ
    col.lines.forEach((ln) => {
      if (!col.valve) return;
      const net = `${col.valve.id}:${ln.valvePort}`;
      const endSym = ln.end ? col.actuator?.symPort.get(portOf(ln.end)) : undefined;
      const to = endSym && act ? act.pins[endSym] : undefined;
      const toAuto = endSym && actAuto ? actAuto.pins[endSym] : undefined;
      if (!to || !toAuto) {
        workLines.push({ valve: col.valve.id, valvePort: ln.valvePort, net, ends: [], labels: [], unconnected: true });
        return;
      }
      // 配管の端（アクチュエータの側から順に、[下へ出す端, 上へ出す端] の組になるよう並べる）
      const ends: PinAt[] = [{ pos: to, dir: DOWN }];
      const labels: { text: string; at: XY }[] = [];
      let cur: XY = to;
      let curAuto: XY = toAuto;
      // アクチュエータの側から途中の機器を上から順に置く（動かしていなければ、アクチュエータの自動の位置の真下）
      [...ln.chain].reverse().forEach((c, j) => {
        const e = entries.get(c.id)!;
        if (e.hint.symbol === 'tee') return;
        const sy = yInline + j * 20;
        if (e.hint.symbol === 'speed-controller') {
          // 弁の側から入る向き（enter）が in なら、上向き（弁 → アクチュエータ）が自由流れ
          const freeUp = e.symPort.get(c.enter) === 'in';
          const s = sketch((pen) => {
            const d = drawSpeedController(pen, curAuto[0] + 2.5, sy, freeUp);
            pen.text(d.box.x + d.box.w + 1, sy + 4, e.id, { layer: 'TAG', height: 2.2 });
            pen.text(d.box.x + d.box.w + 1, sy + 7.5, e.model, { height: 1.8 });
            return d;
          });
          const d = place(e.id, s);
          obstacles.push(d.box);
          ends.push({ pos: d.pins.top, dir: UP }, { pos: d.pins.bottom, dir: DOWN });
          cur = d.pins.bottom;
          curAuto = s.drawn.pins.bottom;
        } else {
          labels.push({ text: e.id, at: [cur[0] + 2, sy + 6 + cur[1] - curAuto[1]] });
        }
      });
      workLines.push({ valve: col.valve.id, valvePort: ln.valvePort, net, ends, labels, unconnected: false });
    });
  });

  // マニホールド: 装着した弁を破線で囲み、型式を書く。弁ごとマニホールドのまとまりとして動かす
  for (const host of new Set([...valveSketches.values()].map((v) => v.host).filter((h): h is string => !!h))) {
    const mounted = [...valveSketches].filter(([, v]) => v.host === host);
    const boxes = mounted.map(([, v]) => v.sketch.drawn.box);
    const frame = sketch((pen): Drawn => {
      const x0 = Math.min(...boxes.map((b) => b.x)) - 3;
      const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 3;
      pen.rect(x0, yValve - 4, x1 - x0, BOX_H + 18, { dashed: true });
      const e = entries.get(host)!;
      // 連数はブランクプレートも数える（型式の連数と合わせる）。主管へ下ろす線に重ならないよう、枠の右下の外に書く
      const stations = [...model.devices.values()].filter((x) => x.device.mount?.device === host).length;
      const blanks = stations - boxes.length;
      pen.text(x1 + 2, yValve + BOX_H + 10, e.id, { height: 2.4, layer: 'TAG' });
      pen.text(x1 + 2, yValve + BOX_H + 13.5, `${e.model}（${stations} 連${blanks > 0 ? `、ブランク ${blanks}` : ''}）`, { height: 1.9 });
      return { pins: {}, box: { x: x0, y: yValve - 4, w: x1 - x0, h: BOX_H + 18 } };
    });
    const d = offsetOf(host, frame.drawn.box);
    for (const [id, v] of mounted) {
      commitSketch(page, v.sketch, d);
      valveAt.set(id, shiftDrawn(v.sketch.drawn, d));
    }
    place(host, frame, d, mounted.map(([, v]) => v.sketch));
  }
  for (const vd of valveAt.values()) obstacles.push(vd.box);

  // エア源・3 点セット（主管の左、流れの順）
  const sources = [...entries.values()].filter((e) => e.hint.symbol === 'source');
  const chain: Entry[] = [];
  const seen = new Set<string>();
  const walk = (e: Entry) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    chain.push(e);
    const outs = Object.entries(e.hint.ports)
      .filter(([sym]) => sym === 'out')
      .map(([, t]) => key(e.id, t));
    for (const o of outs) {
      for (const n of neighbors(o)) {
        const next = entries.get(owner(n))!;
        if (SUPPLY.has(next.hint.symbol) && next.hint.symbol !== 'source') walk(next);
      }
    }
  };
  sources.forEach(walk);
  let x = left;
  /** 前の機器の出口（本のページの位置。配管をつなぐ） */
  let last: XY | undefined;
  const supplyPipes: [PinAt, PinAt][] = [];
  for (const e of chain) {
    const exh = e.hint.ports.exh;
    const exhSilencer = !!exh && neighbors(key(e.id, exh)).some((n) => entries.get(owner(n))?.hint.symbol === 'silencer');
    // エア源は型式の代わりに「エア源」と書く（工場エアなどの説明は長いため）
    const sub = e.hint.symbol === 'source' ? 'エア源' : e.model;
    const s = sketch((pen) => {
      const d = drawInline(pen, e.hint, x, ySupply, { exhSilencer });
      pen.text(d.box.x, ySupply + 12, e.id, { layer: 'TAG', height: 2.4 });
      pen.text(d.box.x, ySupply + 15.5, sub, { height: 1.8 });
      const p = pressure.get(key(e.id, Object.entries(e.hint.ports).find(([sy]) => sy === 'out')?.[1] ?? ''));
      if (p !== undefined && (e.hint.symbol === 'source' || e.hint.units?.includes('regulator') || e.hint.symbol === 'regulator' || e.hint.symbol === 'filter-regulator')) {
        // 3 点セットを囲む破線に重ならないよう、出口の少し右に書く
        pen.text((d.pins.out?.[0] ?? x + d.width) + 3, ySupply - 3, `${p}MPa`, { height: 2, layer: 'TAG' });
      }
      return d;
    });
    const off = offsetOf(e.id, s.drawn.box);
    const d = place(e.id, s, off);
    obstacles.push(d.box);
    const outAuto: XY = s.drawn.pins.out ?? [x + s.drawn.width, ySupply];
    if (last) supplyPipes.push([{ pos: last, dir: RIGHT }, { pos: d.pins.in ?? [d.box.x, d.box.y + d.box.h / 2], dir: LEFT }]);
    last = shiftXY(outAuto, off);
    // 次の記号の自動の位置は、この機器の（自動の位置の）名前・型式の文字に重ならない位置から
    x = Math.max(outAuto[0] + 8, s.drawn.box.x + Math.max(textWidth(sub, 1.8), textWidth(e.id, 2.4)) + 5);
  }

  // --- 配管（記号の位置が決まってから、直角の折れ線で引く） ---
  const segments: Segment[] = [];
  const bounds: Bounds[] = obstacles.map((b) => ({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h }));
  const pipe = (points: XY[], net: string) => {
    pen.line(points, { layer: 'WIRE' });
    for (let k = 0; k + 1 < points.length; k++) segments.push({ a: points[k], b: points[k + 1], net });
  };
  // 主管: 3 点セットの出口から上がって、各弁の P の下を通す。主管の高さはいちばん下の弁に合わせる
  const taps: XY[] = [];
  for (const [id, vd] of valveAt) {
    const pt = entries.get(id)!.hint.ports['1'];
    if (pt && vd.pins['1'] && pressure.has(key(id, pt))) taps.push(vd.pins['1']);
  }
  if (taps.length) {
    const startX = last ? last[0] + 4 : undefined;
    const xs = [...taps.map((t) => t[0]), ...(startX !== undefined ? [startX] : [])];
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    // 主管の高さ: いちばん下の弁の P から自動の配置と同じだけ下。記号を横切るなら上下にずらす
    const lowest = Math.max(...taps.map((t) => t[1]));
    const base = lowest + (yMain - (yValve + BOX_H));
    const busLines = (y: number): XY[][] => [
      [[x0, y], [x1, y]],
      ...taps.map((t): XY[] => [t, [t[0], y]]),
      ...(last && startX !== undefined ? [[last, [startX, last[1]], [startX, y]] as XY[]] : []),
    ];
    const tries = [0, ...Array.from({ length: 24 }, (_, k) => (k % 2 ? 1 : -1) * 2.5 * Math.ceil((k + 1) / 2))].map((dy) => base + dy).filter((y) => y >= lowest + 5);
    const busY = tries.find((y) => busLines(y).every((pl) => hits(pl, bounds) === 0)) ?? base;
    for (const t of taps) pipe([t, [t[0], busY]], 'main');
    if (last && startX !== undefined) pipe(simplify([last, [startX, last[1]], [startX, busY]]), 'main');
    if (x1 > x0) pipe([[x0, busY], [x1, busY]], 'main');
    for (const t of new Set(xs)) if (t > x0 && t < x1) pen.dot(t, busY);
    if (!last) pen.text(taps[0][0], busY + 5, 'エア源につながっていません', { height: 2.2 });
  }
  // エア源から 3 点セットへ（流れの順）
  supplyPipes.forEach(([a, b], k) => pipe(pipeRoute(a, b, `supply${k}`, bounds, segments), `supply${k}`));
  // 弁の作業ポートから途中の機器を通ってアクチュエータまで（弁の側から引く）
  for (const ln of workLines) {
    const from = valveAt.get(ln.valve)?.pins[ln.valvePort];
    if (!from) continue;
    if (ln.unconnected) {
      pen.text(from[0], from[1] - 4, '未接続', { align: 'center', height: 2 });
      continue;
    }
    const ends = [...ln.ends, { pos: from, dir: UP }];
    // 弁のポートからは少し長めに出して曲げる（マニホールドの破線の枠やポート番号から離す）
    for (let k = ends.length - 2; k >= 0; k -= 2) pipe(pipeRoute(ends[k + 1], ends[k], ln.net, bounds, segments, k === ends.length - 2 ? VALVE_STUBS : STUBS), ln.net);
    for (const l of ln.labels) pen.text(l.at[0], l.at[1], l.text, { layer: 'TAG', height: 2.2 });
  }
  return { pages: make.pages, groups };
}

const UP: XY = [0, -1];
const DOWN: XY = [0, 1];
const LEFT: XY = [-1, 0];
const RIGHT: XY = [1, 0];
/** 弁の作業ポートから出す長さの候補 */
const VALVE_STUBS = [7.5, 10, 12.5, 5, 15];

/**
 * 配管を直角の折れ線で引く（座標は y が下向き）。端から少しまっすぐ出し、L 字・Z 字か、記号の脇を回るコの字でつなぐ。
 * 記号を横切らないこと > ほかの配管と重ならないこと > 短く曲がりの少ないこと > 候補の順（a の側で曲げる）で選ぶ。
 */
export function pipeRoute(a: PinAt, b: PinAt, net: string, obstacles: Bounds[], segments: Segment[], stubs: number[] = STUBS): XY[] {
  const [ax, ay] = a.pos;
  const [bx, by] = b.pos;
  const facing =
    (r3(ay) === r3(by) && (bx - ax) * a.dir[0] > 0 && (ax - bx) * b.dir[0] > 0) ||
    (r3(ax) === r3(bx) && (by - ay) * a.dir[1] > 0 && (ay - by) * b.dir[1] > 0);
  const candidates: XY[][] = facing ? [[a.pos, b.pos]] : [];
  const vertical = a.dir[0] === 0;
  for (const len of stubs) {
    const sa: XY = [ax + a.dir[0] * len, ay + a.dir[1] * len];
    const sb: XY = [bx + b.dir[0] * len, by + b.dir[1] * len];
    const first: XY = vertical ? [sb[0], sa[1]] : [sa[0], sb[1]];
    const second: XY = vertical ? [sa[0], sb[1]] : [sb[0], sa[1]];
    candidates.push(simplify([a.pos, sa, first, sb, b.pos]), simplify([a.pos, sa, second, sb, b.pos]));
  }
  // コの字: 記号の外形の 5mm 外を回る
  const lanes = vertical ? obstacles.flatMap((o) => [o.x1 - 5, o.x2 + 5]) : obstacles.flatMap((o) => [o.y1 - 5, o.y2 + 5]);
  for (const len of [stubs[0], stubs[0] + 5]) {
    const sa: XY = [ax + a.dir[0] * len, ay + a.dir[1] * len];
    const sb: XY = [bx + b.dir[0] * len, by + b.dir[1] * len];
    for (const l of lanes) candidates.push(simplify(vertical ? [a.pos, sa, [l, sa[1]], [l, sb[1]], sb, b.pos] : [a.pos, sa, [sa[0], l], [sb[0], l], sb, b.pos]));
  }
  const length = (c: XY[]) => c.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - c[i][0]) + Math.abs(p[1] - c[i][1]), 0);
  let best = candidates[0];
  let bestScore = Infinity;
  const scoreOf = (c: XY[]) => hits(c, obstacles) * 1000 + conflicts(c, net, segments) + length(c) * 0.01 + (c.length - 2) * 0.3;
  candidates.forEach((c, i) => {
    const score = scoreOf(c) + i * 1e-4;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  });
  // 決まった形では記号を横切るか別の配管に重なるときは、記号の脇の格子の上で最短の経路を探す
  if (bestScore >= 10) {
    const g = gridRoute(a, b, net, obstacles, segments, stubs[0]);
    if (g && scoreOf(g) < bestScore) return g;
  }
  return best;
}

/**
 * 格子の上の最短経路（ダイクストラ法）。格子の線は端から出した点と、記号の外形の 5mm 外の位置。
 * 記号を横切る区間は通らず、長さ・曲がりの数・別の配管との重なりで費用を数える。見つからなければ undefined
 */
function gridRoute(a: PinAt, b: PinAt, net: string, obstacles: Bounds[], segments: Segment[], stub: number): XY[] | undefined {
  const sa: XY = [a.pos[0] + a.dir[0] * stub, a.pos[1] + a.dir[1] * stub];
  const sb: XY = [b.pos[0] + b.dir[0] * stub, b.pos[1] + b.dir[1] * stub];
  const uniq = (v: number[]) => [...new Set(v.map(r3))].sort((p, q) => p - q);
  const xs = uniq([sa[0], sb[0], (sa[0] + sb[0]) / 2, ...obstacles.flatMap((o) => [o.x1 - 5, o.x2 + 5])]);
  const ys = uniq([sa[1], sb[1], (sa[1] + sb[1]) / 2, ...obstacles.flatMap((o) => [o.y1 - 5, o.y2 + 5])]);
  const nx = xs.length;
  const idx = (i: number, j: number) => j * nx + i;
  const start = idx(xs.indexOf(r3(sa[0])), ys.indexOf(r3(sa[1])));
  const goal = idx(xs.indexOf(r3(sb[0])), ys.indexOf(r3(sb[1])));
  // 向き: 0 右・1 左・2 下・3 上
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirOf = (d: XY) => DIRS.findIndex(([x, y]) => x === Math.sign(d[0]) && y === Math.sign(d[1]));
  const startDir = dirOf(a.dir);
  const endDir = dirOf([-b.dir[0], -b.dir[1]]);
  const n = nx * ys.length * 4;
  const cost = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [];
  const push = (c: number, s: number) => {
    heap.push([c, s]);
    for (let k = heap.length - 1; k > 0; ) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const lastItem = heap.pop()!;
    if (heap.length) {
      heap[0] = lastItem;
      for (let k = 0; ; ) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const s0 = start * 4 + startDir;
  cost[s0] = 0;
  push(0, s0);
  let found = -1;
  let foundCost = Infinity;
  while (heap.length) {
    const [c, s] = pop();
    if (c > cost[s]) continue;
    if (c >= foundCost) break;
    const node = s >> 2;
    const dir = s & 3;
    if (node === goal) {
      // 最後に b へ入る向きと違えば、もう 1 回曲がる
      const total = c + (dir === endDir ? 0 : 0.3);
      if (total < foundCost) {
        found = s;
        foundCost = total;
      }
      continue;
    }
    const i = node % nx;
    const j = (node - i) / nx;
    DIRS.forEach(([dx, dy], d) => {
      if ((d ^ 1) === dir && (d >> 1) === (dir >> 1)) return; // 来た道は戻らない
      const ni = i + dx;
      const nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ys.length) return;
      const p: XY = [xs[i], ys[j]];
      const q: XY = [xs[ni], ys[nj]];
      if (obstacles.some((o) => crosses(p, q, o))) return;
      const step = (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1])) * 0.01 + (d === dir ? 0 : 0.3) + conflicts([p, q], net, segments);
      const ns = idx(ni, nj) * 4 + d;
      if (c + step < cost[ns]) {
        cost[ns] = c + step;
        prev[ns] = s;
        push(c + step, ns);
      }
    });
  }
  if (found < 0) return undefined;
  const path: XY[] = [];
  for (let s = found; s >= 0; s = prev[s]) {
    const node = s >> 2;
    path.unshift([xs[node % nx], ys[Math.floor(node / nx)]]);
    if (s === s0) break;
  }
  return simplify([a.pos, ...path, b.pos]);
}
