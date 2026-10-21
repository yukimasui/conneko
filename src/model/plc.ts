/**
 * PLC エディタの操作: ユニットの並べ替え・装着・取り外し・追加と、番号が変わった I/O の線番・リンク名の付け替え。
 */
import { buildModel, key } from '../check/model';
import type { DeviceDefinition } from '../devices/types';
import { busAccepts } from './bus';
import { CABLE_WIRE_TYPE, nextDeviceId, sheetOf, type Diagram, type DiagramDevice } from './diagram';
import { ioSystem } from './io';
import { LINK_TYPE } from './ops';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** 親に装着しているユニット（位置の順） */
export function mountedUnits(d: Diagram, hostId: string): DiagramDevice[] {
  return d.devices.filter((x) => x.mount?.device === hostId).sort((a, b) => a.mount!.slot - b.mount!.slot);
}

/** 親が位置の決まったスロット（ベースユニットなど）を持つか。持たなければユニットは詰めて並べる */
export function hasFixedSlots(def: DeviceDefinition | undefined): boolean {
  return !!def?.bus?.host?.slotX;
}

/** 表示するスロットの数（スロット数の上限、なければ装着数 + 1） */
export function slotCount(d: Diagram, hostId: string, lookup: DefLookup): number {
  const host = d.devices.find((x) => x.id === hostId);
  const def = host && lookup(host.type);
  const units = mountedUnits(d, hostId);
  const used = Math.max(0, ...units.map((u) => u.mount!.slot));
  return def?.bus?.host?.slots ?? used + 1;
}

/**
 * 装着の位置を決め直す。slots は「位置（1 から）→ 機器ID」。
 * スロットの位置が決まっていない親（CPU の右に連結するもの）は、空きを詰めて 1, 2, … にする。
 */
export function setSlots(d: Diagram, hostId: string, slots: Map<number, string>, lookup: DefLookup): Diagram {
  const host = d.devices.find((x) => x.id === hostId);
  const fixed = hasFixedSlots(host && lookup(host.type));
  const order = [...slots].sort((a, b) => a[0] - b[0]);
  const slotOf = new Map(order.map(([slot, id], i) => [id, fixed ? slot : i + 1]));
  return {
    ...d,
    devices: d.devices.map((x) => {
      if (slotOf.has(x.id)) return { ...x, mount: { device: hostId, slot: slotOf.get(x.id)! }, sheet: host?.sheet ?? x.sheet };
      if (x.mount?.device === hostId) {
        const { mount: _, ...rest } = x;
        return rest;
      }
      return x;
    }),
  };
}

/** 今の装着の位置（位置 → 機器ID） */
export function currentSlots(d: Diagram, hostId: string): Map<number, string> {
  return new Map(mountedUnits(d, hostId).map((u) => [u.mount!.slot, u.id]));
}

/** ユニットを位置 to へ動かす（そこに別のユニットがあれば入れ替える。詰めて並べる親では間に差し込む） */
export function moveUnit(d: Diagram, hostId: string, unitId: string, to: number, lookup: DefLookup): Diagram {
  const host = d.devices.find((x) => x.id === hostId);
  const slots = currentSlots(d, hostId);
  const from = [...slots].find(([, id]) => id === unitId)?.[0];
  if (hasFixedSlots(host && lookup(host.type))) {
    const other = slots.get(to);
    if (from !== undefined) slots.delete(from);
    if (other && from !== undefined) slots.set(from, other);
    slots.set(to, unitId);
    return setSlots(d, hostId, slots, lookup);
  }
  // 詰めて並べる親: 並び順の中で差し込む
  const order = mountedUnits(d, hostId).map((u) => u.id).filter((id) => id !== unitId);
  order.splice(Math.max(0, Math.min(to - 1, order.length)), 0, unitId);
  return setSlots(d, hostId, new Map(order.map((id, i) => [i + 1, id])), lookup);
}

/** 図面にある、この親に装着できる未装着のユニット */
export function freeUnits(d: Diagram, hostId: string, lookup: DefLookup): DiagramDevice[] {
  const host = d.devices.find((x) => x.id === hostId);
  const hostDef = host && lookup(host.type);
  if (!hostDef) return [];
  return d.devices.filter((x) => {
    const def = lookup(x.type);
    return !x.mount && x.id !== hostId && !!def && busAccepts(hostDef, def);
  });
}

/** 親に装着できるユニットの種類 */
export function compatibleTypes(hostDef: DeviceDefinition, defs: DeviceDefinition[]): DeviceDefinition[] {
  return defs.filter((x) => busAccepts(hostDef, x));
}

/** 空いている位置（スロットの位置が決まっていれば最初の空き、なければ末尾） */
function freeSlot(d: Diagram, hostId: string, lookup: DefLookup, def?: DeviceDefinition): number {
  const host = d.devices.find((x) => x.id === hostId);
  const hostDef = host && lookup(host.type);
  const slots = currentSlots(d, hostId);
  const roles = hostDef?.bus?.host?.slotRoles ?? {};
  if (hasFixedSlots(hostDef)) {
    const n = hostDef?.bus?.host?.slots ?? slots.size + 1;
    // 専用の位置（電源・CPU）があるユニットはそこへ、ほかは専用でない最初の空きへ
    for (let s = 1; s <= n; s++) {
      if (slots.has(s)) continue;
      const role = roles[s];
      if (role ? role === def?.bus?.role : !def?.bus?.role || !Object.values(roles).includes(def.bus.role)) return s;
    }
    return n + 1;
  }
  return slots.size + 1;
}

/** 図面にある未装着のユニットを装着する */
export function mountUnit(d: Diagram, hostId: string, unitId: string, lookup: DefLookup): Diagram {
  const unit = d.devices.find((x) => x.id === unitId);
  const slots = currentSlots(d, hostId);
  slots.set(freeSlot(d, hostId, lookup, unit && lookup(unit.type)), unitId);
  return setSlots(d, hostId, slots, lookup);
}

/** 新しいユニットを置いて装着する */
export function addUnit(d: Diagram, hostId: string, def: DeviceDefinition, lookup: DefLookup): Diagram {
  const host = d.devices.find((x) => x.id === hostId);
  if (!host) return d;
  const id = nextDeviceId(def.labelPrefix, d.devices.map((x) => x.id));
  const added: Diagram = { ...d, devices: [...d.devices, { id, type: def.type, x: host.x, y: host.y, sheet: sheetOf(d, host) }] };
  return mountUnit(added, hostId, id, lookup);
}

/** ユニットを外して、親の下に置く */
export function unmountUnit(d: Diagram, unitId: string, lookup: DefLookup): Diagram {
  const unit = d.devices.find((x) => x.id === unitId);
  const host = unit?.mount && d.devices.find((x) => x.id === unit.mount!.device);
  if (!unit || !host) return d;
  const hostDef = lookup(host.type);
  const slots = currentSlots(d, host.id);
  slots.delete(unit.mount!.slot);
  const out = setSlots(d, host.id, slots, lookup);
  return {
    ...out,
    devices: out.devices.map((x) => (x.id === unitId ? { ...x, x: host.x, y: host.y + (hostDef?.height ?? 200) + 120 } : x)),
  };
}

/**
 * 装着の位置が変わって入出力番号が変わった I/O について、そのネットの電線の線番とリンクの名前を新しい番号に付け替える
 * （「R000」「R000-2」のように番号で始まる名前だけ。コメントは端子に付いているのでそのまま）。
 */
export function renumberIoNames(before: Diagram, after: Diagram, hostId: string, lookup: DefLookup): Diagram {
  const addr = (d: Diagram) => {
    const map = new Map<string, string>();
    for (const u of ioSystem(d, hostId, lookup)?.units ?? []) for (const p of u.points) map.set(`${p.device}:${p.terminal}`, p.address);
    return map;
  };
  const oldAddr = addr(before);
  const newAddr = addr(after);
  const m = buildModel(after, lookup, () => {});
  /** ネット → [古い番号, 新しい番号] */
  const changes = new Map<string, [string, string]>();
  for (const [k, next] of newAddr) {
    const prev = oldAddr.get(k);
    if (!prev || prev === next) continue;
    const [dev, term] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
    changes.set(m.fixed.find(key(dev, term)), [prev, next]);
  }
  if (!changes.size) return after;
  // 入れ替わりで名前がぶつからないよう、いったん印を付けてから外す
  const MARK = '\u0000';
  const rename = (text: string | undefined, root: string) => {
    const c = changes.get(root);
    if (!text || !c) return text;
    const [from, to] = c;
    return text === from || text.startsWith(`${from}-`) ? MARK + to + text.slice(from.length) : text;
  };
  const netOf = (device: string, terminal: string) => m.fixed.find(key(device, terminal));
  const marked: Diagram = {
    ...after,
    wires: after.wires.map((w) => {
      if (w.wireType === CABLE_WIRE_TYPE) return w;
      const wireNo = rename(w.wireNo, netOf(w.from.device, w.from.terminal));
      return wireNo === w.wireNo ? w : { ...w, wireNo };
    }),
    devices: after.devices.map((x) => {
      if (x.type !== LINK_TYPE) return x;
      const name = String(x.params?.name ?? '');
      const next = rename(name, netOf(x.id, 'T'));
      return next === name ? x : { ...x, params: { ...x.params, name: next ?? '' } };
    }),
  };
  const strip = (t: string | undefined) => (t?.startsWith(MARK) ? t.slice(1) : t);
  return {
    ...marked,
    wires: marked.wires.map((w) => (w.wireNo?.startsWith(MARK) ? { ...w, wireNo: strip(w.wireNo) } : w)),
    devices: marked.devices.map((x) => {
      const name = x.type === LINK_TYPE ? String(x.params?.name ?? '') : '';
      return name.startsWith(MARK) ? { ...x, params: { ...x.params, name: strip(name) ?? '' } } : x;
    }),
  };
}

/** ユニットを図面から削除する（つながる電線・ケーブルも消し、詰めて並べる親では位置を詰める） */
export function removeUnit(d: Diagram, unitId: string, lookup: DefLookup): Diagram {
  const unit = d.devices.find((x) => x.id === unitId);
  const hostId = unit?.mount?.device;
  const out: Diagram = {
    ...d,
    devices: d.devices.filter((x) => x.id !== unitId),
    wires: d.wires.filter((w) => w.from.device !== unitId && w.to.device !== unitId),
  };
  return hostId ? setSlots(out, hostId, currentSlots(out, hostId), lookup) : out;
}
