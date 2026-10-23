/**
 * 電線の描き方の計算（画面と印刷・画像出力で共通）。
 * - リンクの向き（「自動」のとき、つないだ相手の端子のある側）
 * - 電線の両端の向き・スタブの長さ・コネクタ
 * - 重なりを避けるレーン
 * - 折れ線（自動の経路、または手で曲げた経路）
 */
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, ParamValues, TerminalSide } from '../devices/types';
import type { DiagramWire, TerminalRef } from '../model/diagram';
import { LINK_TYPE } from '../model/ops';
import { FAN_LENGTH } from './CableGraphics';
import { HANDLE_DEPTH } from './DeviceNode';
import type { WireGeometry } from './EditorContext';
import { assignLanes, manualRoute, routeWire, stubLength, type LaneInput, type Point } from './routing';

type DefLookup = (type: string) => DeviceDefinition | undefined;


export interface LayoutDevice {
  id: string;
  type: string;
  x: number;
  y: number;
}

export type LayoutWire = Pick<DiagramWire, 'id' | 'from' | 'to' | 'fromSide' | 'toSide' | 'bend' | 'route'>;

/** 向きが「自動」のリンクを、つないだ相手の端子のある側に向ける（side は電線をつなぐ側） */
export function linkSidesOf(
  devices: LayoutDevice[],
  wires: LayoutWire[],
  paramsOf: (id: string) => ParamValues | undefined,
  lookup: DefLookup,
): Map<string, 'left' | 'right'> {
  const out = new Map<string, 'left' | 'right'>();
  const byId = new Map(devices.map((d) => [d.id, d]));
  const linkDef = lookup(LINK_TYPE);
  for (const d of devices) {
    const def = lookup(d.type);
    if (!def?.netLabel || (paramsOf(d.id)?.side ?? 'auto') !== 'auto' || !linkDef) continue;
    const w = wires.find((x) => x.from.device === d.id || x.to.device === d.id);
    const ref = w && (w.from.device === d.id ? w.to : w.from);
    const other = ref && byId.get(ref.device);
    const odef = other && lookup(other.type);
    const t = other && odef && ref ? resolveDevice(odef, paramsOf(other.id)).terminal(ref.terminal) : undefined;
    if (!other || !t) continue;
    out.set(d.id, other.x + t.x < d.x + linkDef.width / 2 ? 'left' : 'right');
  }
  return out;
}

/**
 * 電線ごとの両端の形（向き・スタブの長さ・コネクタ・端子の中心）と、重なりを避けるレーン。
 * devices は同じシートの機器（位置つき）、paramsOf はリンクの向きなどを反映したパラメータ。
 */
export function wireLayout(
  devices: LayoutDevice[],
  wires: LayoutWire[],
  paramsOf: (id: string) => ParamValues | undefined,
  lookup: DefLookup,
): { geometry: Map<string, WireGeometry>; lanes: Map<string, number> } {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const inputs: LaneInput[] = [];
  const geometry = new Map<string, WireGeometry>();
  const linkDef = lookup(LINK_TYPE);
  const raw = (r: TerminalRef) => {
    const n = byId.get(r.device);
    const def = n && lookup(n.type);
    const rd = n && def ? resolveDevice(def, paramsOf(n.id)) : undefined;
    const t = rd?.terminal(r.terminal);
    return n && def && rd && t ? { n, def, rd, t, x: n.x + t.x, y: n.y + t.y } : null;
  };
  for (const w of wires) {
    const a = raw(w.from);
    const b = raw(w.to);
    if (!a || !b) continue;
    /** 電線を出す向き: 手動の指定、なければ相手がリンクで左右に出る端子ならリンクのある側 */
    const sideOf = (me: NonNullable<typeof a>, other: NonNullable<typeof a>, manual?: TerminalSide): TerminalSide => {
      if (manual) return manual;
      const horizontal = me.t.side === 'left' || me.t.side === 'right';
      if (horizontal && !me.t.connector && !other.t.connector && other.def.netLabel && !me.def.netLabel && linkDef) {
        return other.n.x + linkDef.width / 2 < me.x ? 'left' : 'right';
      }
      return me.t.side;
    };
    const end = (me: NonNullable<typeof a>, side: TerminalSide) => {
      const { t, rd } = me;
      const toEdge = { top: t.y, bottom: rd.height - t.y, left: t.x, right: rd.width - t.x }[side];
      // ケーブルはコネクタ付近で芯線を広げて描くため、まっすぐ出る区間を長めにとる
      // 正面向きのコネクタは、プラグの端からケーブルが出る
      const exit = t.connector?.facing === 'front' ? (t.connector.length ?? 12) / 2 - HANDLE_DEPTH / 2 : 12;
      const stub = t.connector ? Math.max(stubLength(toEdge), FAN_LENGTH + 8 + exit) : stubLength(toEdge);
      return { side, stub, connector: t.connector };
    };
    const s = end(a, sideOf(a, b, w.fromSide));
    const t = end(b, sideOf(b, a, w.toSide));
    geometry.set(w.id, {
      sStub: s.stub,
      tStub: t.stub,
      sSide: s.side,
      tSide: t.side,
      sCenter: { x: a.x, y: a.y },
      tCenter: { x: b.x, y: b.y },
      sConnector: s.connector,
      tConnector: t.connector,
    });
    inputs.push({ id: w.id, sx: a.x, sy: a.y, sSide: s.side, sStub: s.stub, tx: b.x, ty: b.y, tSide: t.side, tStub: t.stub, manual: !!w.bend || !!w.route });
  }
  return { geometry, lanes: assignLanes(inputs) };
}

/** 電線の折れ線（端子の中心から。手で曲げた経路があればそれを使う） */
export function wirePoints(w: LayoutWire, geo: WireGeometry, lanes: Map<string, number>): Point[] {
  const ends = {
    sx: geo.sCenter.x,
    sy: geo.sCenter.y,
    sSide: geo.sSide,
    tx: geo.tCenter.x,
    ty: geo.tCenter.y,
    tSide: geo.tSide,
    sStub: geo.sStub,
    tStub: geo.tStub,
  };
  if (w.route) return manualRoute(ends, w.route).points;
  const bend = w.bend ?? 0;
  return routeWire(ends, (bend ? 0 : (lanes.get(w.id) ?? 0)) + bend).points;
}
