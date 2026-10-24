/**
 * リンクを端子の横にそろえる。
 *
 * 左右の端子: 機器の端子につないだリンクを、端子の並び順のまま機器の横に一列に並べ直す。端子の間隔より詰められないぶんは
 * 列を上下に広げる（並びの中心は端子の並びの中心）。並び順が端子と同じなら、電線の重なりを避けるレーンの
 * 割り当て（src/editor/routing.ts の assignLanes）で電線が交差しない。
 * 上下の端子: リンクは左右に電線をつなぐ形なので、端子の真下（上）から L 字で入るよう、端子の横にずらして縦に積む。
 * 右半分の端子のリンクは端子の右に、左半分は左に置き、外側の端子ほど機器の近くに置く（L 字が入れ子になり交差しない）。
 * 上下の端子の縦のリンク: 端子の並び順のまま、機器の下（上）に一列に横に詰めて並べる。端子の真下に置けないぶんは
 * 電線を途中で横に振って入れる（並び順が端子と同じなので、レーンの割り当てで電線が交差しない）。
 * 左右の端子の縦のリンクは、横に並べると電線がほかのリンクを横切るため、横のリンクにして並べる。
 */
import { linkShape, linkSize, VERTICAL_LINK_WIDTH, withLinkOrientation } from '../devices/link';
import { resolveDevice } from '../devices/resolve';
import { deviceSize, type DeviceDefinition, type ParamValues, type TerminalSide } from '../devices/types';
import { sheetOf, type Diagram, type DiagramDevice } from './diagram';
import { mountFamily } from './ops';
import { spread } from './spread';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** リンクの縦の間隔（リンクの高さと、下に出る相手の一覧のぶん） */
export const LINK_PITCH = 50;
/** 機器の外形からリンクまでの最小の距離（両端のスタブと、電線が折り返す余白） */
const COLUMN_GAP = 90;
/** 電線 1 本ごとに足す距離（重なりを避けるレーンの間隔。routing.ts の LANE_GAP） */
const LANE_GAP = 9;
/** 上下の端子: 機器の外形から最初のリンクまでの距離と、端子からリンクの電線をつなぐ端までの横の距離 */
const BELOW_GAP = 40;
const ABOVE_GAP = 70;
const SIDE_SHIFT = 26;
/** 縦のリンク: 隣のリンクとの隙間と、機器の外形からリンクまでの距離（両端のスタブのぶん。電線 1 本ごとに LANE_GAP を足す） */
const VERTICAL_SPACE = 6;
const VERTICAL_BELOW_GAP = 70;
const VERTICAL_ABOVE_GAP = 90;

/** 機器 deviceId の端子につないだリンク（その端子とだけつながっているもの）と、つないだ端子 */
function attachedLinks(d: Diagram, deviceId: string, lookup: DefLookup) {
  const dev = d.devices.find((x) => x.id === deviceId);
  const def = dev && lookup(dev.type);
  if (!dev || !def) return [];
  const resolved = resolveDevice(def, dev.params);
  const sheet = sheetOf(d, dev);
  const out: { link: DiagramDevice; wire: string; side: TerminalSide; x: number; y: number }[] = [];
  for (const w of d.wires) {
    const [mine, other] = w.from.device === deviceId ? [w.from, w.to] : w.to.device === deviceId ? [w.to, w.from] : [];
    if (!mine || !other) continue;
    const link = d.devices.find((x) => x.id === other.device);
    if (!link || !lookup(link.type)?.netLabel || sheetOf(d, link) !== sheet) continue;
    // ほかの機器ともつないだリンクは動かさない
    if (d.wires.some((x) => x.id !== w.id && (x.from.device === link.id || x.to.device === link.id))) continue;
    const t = resolved.terminal(mine.terminal);
    if (!t) continue;
    out.push({ link, wire: w.id, side: t.side, x: dev.x + t.x, y: dev.y + t.y });
  }
  return out;
}

/** 機器 deviceId と、装着した親・子（マニホールドと電磁弁、PLC とユニット）の端子につないだリンク */
const familyLinks = (d: Diagram, deviceId: string, lookup: DefLookup) => mountFamily(d, deviceId).flatMap((id) => attachedLinks(d, id, lookup));

/** 機器 deviceId（装着した親・子を含む）の端子につないだリンクで、並べ直せるものの数 */
export function alignableLinkCount(d: Diagram, deviceId: string, lookup: DefLookup): number {
  return familyLinks(d, deviceId, lookup).length;
}

/**
 * 機器 deviceId の端子につないだリンクを、端子の横に並べ直す。装着した親・子（マニホールドと電磁弁など）はまとめて 1 台として並べる。
 * リンクの向きは「自動」（相手の端子の側）に戻し、つないだ電線の手で曲げた経路・向きの指定は自動に戻す
 */
export function alignLinks(d: Diagram, deviceId: string, lookup: DefLookup): Diagram {
  const items = familyLinks(d, deviceId, lookup);
  if (!items.length) return d;
  // 親・子をまとめた外形
  const boxes = mountFamily(d, deviceId).flatMap((id) => {
    const x = d.devices.find((v) => v.id === id);
    const def = x && lookup(x.type);
    if (!x || !def) return [];
    const s = deviceSize(def, x.params);
    return [{ x: x.x, y: x.y, r: x.x + s.width, b: x.y + s.height }];
  });
  if (!boxes.length) return d;
  const dev = { x: Math.min(...boxes.map((v) => v.x)), y: Math.min(...boxes.map((v) => v.y)) };
  const size = { width: Math.max(...boxes.map((v) => v.r)) - dev.x, height: Math.max(...boxes.map((v) => v.b)) - dev.y };
  const moved = new Map<string, { x: number; y: number }>();
  /** 並べたあとのリンクのパラメータ（向きは「自動」に戻し、左右の端子の縦のリンクは横にする） */
  const params = new Map<string, ParamValues>();
  const vertical = (it: (typeof items)[number]) => linkShape(it.link.params).vertical;
  for (const it of items) {
    const horizontalSide = it.side === 'left' || it.side === 'right';
    const p = horizontalSide && vertical(it) ? withLinkOrientation(it.link.params, false) : { ...it.link.params };
    params.set(it.link.id, { ...p, side: 'auto' });
  }
  for (const side of ['left', 'right'] as const) {
    const group = items.filter((it) => it.side === side).sort((a, b) => a.y - b.y || a.link.y - b.link.y);
    if (!group.length) continue;
    const centers = spread(group.map((it) => ({ want: it.y, size: LINK_PITCH })));
    const gap = COLUMN_GAP + group.length * LANE_GAP;
    const ls = linkSize(false);
    group.forEach((it, i) => {
      const x = side === 'left' ? dev.x - gap - ls.width : dev.x + size.width + gap;
      moved.set(it.link.id, { x: Math.round(x), y: Math.round(centers[i] - ls.height / 2) });
    });
  }
  for (const side of ['top', 'bottom'] as const) {
    const group = items.filter((it) => it.side === side && !vertical(it)).sort((a, b) => a.x - b.x || a.link.x - b.link.x);
    const half = Math.floor(group.length / 2);
    const ls = linkSize(false);
    // 左半分は左の端子から、右半分は右の端子から順に、機器の近くへ積む
    const halves = [group.slice(0, half), group.slice(half).reverse()];
    halves.forEach((h, k) =>
      h.forEach((it, i) => {
        const x = k === 0 ? it.x - SIDE_SHIFT - ls.width : it.x + SIDE_SHIFT;
        // 上は機器名のラベル（装着した親はユニットのラベルの上にもう 1 段）を避けて離す
        const y = side === 'bottom' ? dev.y + size.height + BELOW_GAP + i * LINK_PITCH : dev.y - ABOVE_GAP - ls.height - i * LINK_PITCH;
        moved.set(it.link.id, { x: Math.round(x), y: Math.round(y) });
      }),
    );
    // 縦のリンクは、端子の並び順のまま一列に横に詰める（中心は端子の真下・真上に近づける）
    const row = items.filter((it) => it.side === side && vertical(it)).sort((a, b) => a.x - b.x || a.link.x - b.link.x);
    if (!row.length) continue;
    const vs = linkSize(true);
    const centers = spread(row.map((it) => ({ want: it.x, size: VERTICAL_LINK_WIDTH + VERTICAL_SPACE })));
    const gap = (side === 'bottom' ? VERTICAL_BELOW_GAP : VERTICAL_ABOVE_GAP) + (row.length - 1) * LANE_GAP;
    row.forEach((it, i) => {
      const y = side === 'bottom' ? dev.y + size.height + gap : dev.y - gap - vs.height;
      // 端子の位置は 0.01px 単位なので、真下に置いたリンクへ電線がまっすぐ下りるよう x は丸めすぎない
      moved.set(it.link.id, { x: Math.round((centers[i] - vs.width / 2) * 100) / 100, y: Math.round(y) });
    });
  }
  const wires = new Set(items.map((it) => it.wire));
  return {
    ...d,
    devices: d.devices.map((x) => {
      const p = moved.get(x.id);
      return p ? { ...x, ...p, params: params.get(x.id) } : x;
    }),
    wires: d.wires.map((w) => {
      if (!wires.has(w.id)) return w;
      const { bend: _b, route: _r, fromSide: _f, toSide: _t, ...rest } = w;
      return rest;
    }),
  };
}

/** 機器 deviceId（装着した親・子を含む）の上下の端子につないだリンクのうち、縦・横のものの数 */
export function verticalLinkCounts(d: Diagram, deviceId: string, lookup: DefLookup): { vertical: number; horizontal: number } {
  const items = familyLinks(d, deviceId, lookup).filter((it) => it.side === 'top' || it.side === 'bottom');
  const vertical = items.filter((it) => linkShape(it.link.params).vertical).length;
  return { vertical, horizontal: items.length - vertical };
}

/**
 * 機器 deviceId の上下の端子につないだリンクを縦（vertical）または横にして、端子のそばに並べ直す。
 * 左右の端子のリンクは横のまま並べ直す
 */
export function alignLinksAs(d: Diagram, deviceId: string, vertical: boolean, lookup: DefLookup): Diagram {
  const ids = new Set(familyLinks(d, deviceId, lookup).filter((it) => it.side === 'top' || it.side === 'bottom').map((it) => it.link.id));
  const next = { ...d, devices: d.devices.map((x) => (ids.has(x.id) ? { ...x, params: withLinkOrientation(x.params, vertical) } : x)) };
  return alignLinks(next, deviceId, lookup);
}

/**
 * リンク ids の向きを縦（vertical）または横にする。リンクの中心の位置は変えない（つなぐ側の指定は 左 ↔ 上・右 ↔ 下に移す）。
 * リンク以外の機器は変えない
 */
export function setLinkOrientation(d: Diagram, ids: string[], vertical: boolean, lookup: DefLookup): Diagram {
  const target = new Set(ids);
  let changed = false;
  const devices = d.devices.map((x) => {
    const def = lookup(x.type);
    if (!target.has(x.id) || !def?.netLabel || linkShape(x.params).vertical === vertical) return x;
    changed = true;
    const before = deviceSize(def, x.params);
    const params = withLinkOrientation(x.params, vertical);
    const after = deviceSize(def, params);
    return { ...x, x: Math.round(x.x + (before.width - after.width) / 2), y: Math.round(x.y + (before.height - after.height) / 2), params };
  });
  return changed ? { ...d, devices } : d;
}
