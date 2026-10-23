/**
 * コネクタから引いたときの「つなげる機器」の候補（コネクタの種類が合う機器）と、選んだときの配置・接続。
 *
 * - 図面にある機器の空いているコネクタと、カタログの機器（新しく置く）の両方を候補にする
 * - 引いた側の機器のパラメータを 1 つ変えればつながる機器も候補にする
 *   （RCP6 の適応コントローラーを P3 → P5 にすれば RCON につながる、など）。選ぶとそのパラメータも変える
 * - 相手の機器もパラメータで合うコネクタが変わる場合（コントローラーから引いてアクチュエーターを選ぶ）は、合う値で置く
 * - 同じ 2 台の間でほかにもつなげるコネクタ（200V サーボのモーターとエンコーダーなど）があれば、まとめてつなぐ
 *
 * コネクタの種類にはオス・メス（機器側かケーブル側か）の区別がないため、引いた側と同じ分類（category）の機器は除く
 * （アクチュエーターどうし、PLC のユニットどうしを出さないため）。ただしケーブル（def.cable）は同じ分類でも出す。
 * LAN ポート（RJ45）は相手が多すぎるため対象外（従来どおりネットワークの候補を出す）。
 */
import { connectorsMate, isLanPort, resolveDevice } from '../devices/resolve';
import { paramLabel, paramsWithDefaults, type ConnectorSpec, type DeviceDefinition, type ParamValues, type TerminalDef } from '../devices/types';
import { paramVariants } from '../devices/validate';
import { tubeAttrs } from './air';
import { CABLE_WIRE_TYPE, isTube, nextDeviceId, nextWireId, sheetOf, type Diagram, type DiagramDevice, type DiagramWire, type TerminalRef } from './diagram';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface MateCandidate {
  /** 図面にある機器につなぐ場合はその ID。省略時は新しく置く */
  device?: string;
  type: string;
  /** 新しく置く機器のパラメータ（既定値のままなら省略） */
  params?: ParamValues;
  /** 引いた側の機器のパラメータを変えてつなぐ場合の変更 */
  sourceChange?: { key: string; value: number | string; label: string };
  /** つなぐコネクタの組（from: 引いた側の端子ID、to: 相手の端子ID）。先頭が引いたコネクタ */
  pairs: { from: string; to: string }[];
  /** ベースユニット・ゲートウェイなどへの装着が必要な機器（置いただけでは装着の警告が出る） */
  needsMount?: boolean;
}

/** 候補を出すコネクタか（LAN ポートは除く。RJ-45 とつなぐ M12 D コードの通信ポートも LAN ポートとして扱う） */
export function hasMateCandidates(c: ConnectorSpec | undefined): boolean {
  return !!c && !isLanPort(c);
}

/** まとめてつなぐ対象にするコネクタか（通信ポートは相手を決めきれないので、引いたコネクタ以外ではつながない） */
const pairable = (c: ConnectorSpec) => !isLanPort(c) && !c.protocols?.length;

/** 相手の候補にするか（同じ分類の機器はケーブルのときだけ） */
const otherSide = (a: DeviceDefinition, b: DeviceDefinition) => a.category !== b.category || !!a.cable || !!b.cable;

/** 新しく置く機器の並び: 汎用品 → メーカー順 → 型式順（変換端子台の候補 io.ts の terminalBlocksFor と同じ） */
const byMakerModel = (a: DeviceDefinition, b: DeviceDefinition) =>
  Number(!!a.maker) - Number(!!b.maker) || (a.maker ?? '').localeCompare(b.maker ?? '', 'ja') || a.model.localeCompare(b.model, 'ja', { numeric: true });

const specKey = (c: ConnectorSpec) => `${c.kind}|${[...(c.mates ?? [])].sort().join(',')}`;

/** 引いた側の機器の、パラメータの候補（いまの値と、引いたコネクタが変わる 1 つだけの変更） */
function sourceVariants(def: DeviceDefinition, params: ParamValues | undefined, terminal: string) {
  const current = resolveDevice(def, params).terminal(terminal)?.connector;
  if (!current) return [];
  const out: { params: ParamValues | undefined; spec: ConnectorSpec; change?: MateCandidate['sourceChange'] }[] = [{ params, spec: current }];
  const seen = new Set([specKey(current)]);
  const full = paramsWithDefaults(def, params);
  for (const p of def.params ?? []) {
    for (const o of p.options) {
      if (String(o.value) === String(full[p.key])) continue;
      const next = { ...params, [p.key]: o.value };
      const spec = resolveDevice(def, next).terminal(terminal)?.connector;
      if (!spec || seen.has(specKey(spec))) continue;
      seen.add(specKey(spec));
      out.push({ params: next, spec, change: { key: p.key, value: o.value, label: `${p.label}を「${paramLabel(def, p.key, o.value)}」に変更` } });
    }
  }
  return out;
}

/** 2 台の間でつなぐコネクタの組（先頭は引いたコネクタ）。busyA / busyB は使用中の端子 */
function pairsBetween(
  a: TerminalDef[],
  from: string,
  b: TerminalDef[],
  first: string,
  busyA: Set<string>,
  busyB: Set<string>,
): MateCandidate['pairs'] {
  const pairs = [{ from, to: first }];
  const usedB = new Set([first, ...busyB]);
  for (const ta of a) {
    if (ta.id === from || busyA.has(ta.id) || !ta.connector || !pairable(ta.connector)) continue;
    const tb = b.find((x) => !usedB.has(x.id) && x.connector && pairable(x.connector) && connectorsMate(ta.connector!, x.connector));
    if (!tb) continue;
    usedB.add(tb.id);
    pairs.push({ from: ta.id, to: tb.id });
  }
  return pairs;
}

/** 端子ごとの使用中の判定（電線・ケーブルがつながっている端子） */
function busyTerminals(d: Diagram): Map<string, Set<string>> {
  const busy = new Map<string, Set<string>>();
  const add = (r: TerminalRef) => (busy.get(r.device) ?? busy.set(r.device, new Set()).get(r.device)!).add(r.terminal);
  for (const w of d.wires) {
    add(w.from);
    add(w.to);
  }
  return busy;
}

/**
 * コネクタ from から引いたときの「つなげる機器」の候補。
 * 並びは、図面の機器 → 新しく置く機器。それぞれ、引いた側の設定を変えずにつながるものが先。
 */
export function mateCandidates(d: Diagram, from: TerminalRef, defs: DeviceDefinition[], lookup: DefLookup): MateCandidate[] {
  const src = d.devices.find((x) => x.id === from.device);
  const srcDef = src && lookup(src.type);
  if (!src || !srcDef) return [];
  const variants = sourceVariants(srcDef, src.params, from.terminal);
  if (!variants.length || !hasMateCandidates(variants[0].spec)) return [];
  const busy = busyTerminals(d);
  const none = new Set<string>();
  const srcBusy = busy.get(src.id) ?? none;
  const sheet = sheetOf(d, src);

  const placed: MateCandidate[] = [];
  for (const other of d.devices) {
    const def = other.id === src.id ? undefined : lookup(other.type);
    if (!def || sheetOf(d, other) !== sheet || !otherSide(srcDef, def)) continue;
    const terminals = resolveDevice(def, other.params).terminals;
    const otherBusy = busy.get(other.id) ?? none;
    for (const v of variants) {
      const hit = terminals.find((t) => t.connector && !otherBusy.has(t.id) && connectorsMate(v.spec, t.connector));
      if (!hit) continue;
      const srcTerminals = resolveDevice(srcDef, v.params).terminals;
      placed.push({
        device: other.id,
        type: other.type,
        pairs: pairsBetween(srcTerminals, from.terminal, terminals, hit.id, srcBusy, otherBusy),
        ...(v.change ? { sourceChange: v.change } : {}),
      });
      break;
    }
  }

  const fresh: MateCandidate[] = [];
  for (const def of [...defs].sort(byMakerModel)) {
    if (def.netLabel || !otherSide(srcDef, def)) continue;
    let found: MateCandidate | undefined;
    for (const v of variants) {
      for (const q of paramVariants(def)) {
        // 装着で決まる先頭番号だけを変えた組は、置くときのパラメータにしない
        if ('ioIn' in q) continue;
        const terminals = resolveDevice(def, q).terminals;
        const hit = terminals.find((t) => t.connector && connectorsMate(v.spec, t.connector));
        if (!hit) continue;
        const srcTerminals = resolveDevice(srcDef, v.params).terminals;
        found = {
          type: def.type,
          ...(Object.keys(q).length ? { params: q } : {}),
          pairs: pairsBetween(srcTerminals, from.terminal, terminals, hit.id, srcBusy, none),
          ...(v.change ? { sourceChange: v.change } : {}),
          ...(def.bus && !def.bus.host ? { needsMount: true } : {}),
        };
        break;
      }
      if (found) break;
    }
    if (found) fresh.push(found);
  }
  const order = (c: MateCandidate) => Number(!!c.sourceChange);
  return [...placed.sort((a, b) => order(a) - order(b)), ...fresh.sort((a, b) => order(a) - order(b))];
}

/**
 * 候補を選んだときの図面: 引いた側のパラメータを変え、新しい機器なら at（フロー座標）に引いたコネクタが来るよう置き、ケーブルでつなぐ。
 * 新しく置いた機器の ID も返す（選択するため）。
 */
export function applyMateCandidate(d: Diagram, from: TerminalRef, c: MateCandidate, at: { x: number; y: number }, lookup: DefLookup): { diagram: Diagram; device: string } {
  const src = d.devices.find((x) => x.id === from.device);
  const def = lookup(c.type);
  if (!src || !def) return { diagram: d, device: from.device };
  let devices = d.devices;
  if (c.sourceChange) {
    const { key, value } = c.sourceChange;
    devices = devices.map((x) => (x.id === src.id ? { ...x, params: { ...x.params, [key]: value } } : x));
  }
  let target = c.device;
  if (!target) {
    target = nextDeviceId(def.labelPrefix, devices.map((x) => x.id));
    const hit = resolveDevice(def, c.params).terminal(c.pairs[0].to);
    const placed: DiagramDevice = {
      id: target,
      type: c.type,
      x: Math.round(at.x - (hit?.x ?? 0)),
      y: Math.round(at.y - (hit?.y ?? 0)),
      ...(c.params ? { params: c.params } : {}),
      ...(src.sheet ? { sheet: src.sheet } : {}),
    };
    devices = [...devices, placed];
  }
  const used = d.wires.map((w) => w.id);
  // エアのポートどうしはチューブでつなぐ
  const srcPort = resolveDevice(lookup(src.type)!, src.params).terminal(c.pairs[0].from);
  if (srcPort?.role === 'air') {
    const next: Diagram = { ...d, devices };
    const tubes: DiagramWire[] = c.pairs.map((p) => {
      const id = nextWireId(used);
      used.push(id);
      const a = { device: src.id, terminal: p.from };
      const b = { device: target!, terminal: p.to };
      const prev = [...d.wires].reverse().find((w) => isTube(w));
      return { id, from: a, to: b, ...tubeAttrs(next, a, b, lookup, prev) };
    });
    return { diagram: { ...next, wires: [...d.wires, ...tubes] }, device: target };
  }
  const cables: DiagramWire[] = c.pairs.map((p, i) => {
    const id = nextWireId(used);
    used.push(id);
    return {
      id,
      from: { device: src.id, terminal: p.from },
      to: { device: target!, terminal: p.to },
      color: 'black',
      sizeSq: 0,
      wireType: CABLE_WIRE_TYPE,
      wireNo: i ? `CBL-${src.id}-${i + 1}` : `CBL-${src.id}`,
    };
  });
  return { diagram: { ...d, devices, wires: [...d.wires, ...cables] }, device: target };
}
