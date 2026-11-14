/**
 * 配線言語から作った図面に、元の図面の「言語に書かない情報」を引き継ぐ。
 *
 * 配線言語は接続（何と何をどの電線でつなぐか）を書くもので、配置（機器の位置、電線の曲がり、リンクの向き、展開図の配置）は書かない。
 * アプリで開いている図面を言語で編集して戻すときに、変えていない部分の配置が失われないようにする。
 * 機器の位置は compile.ts が先に引き継ぐ（リンクを置く位置を決めるのに要るため）。ここではリンク・電線・図面全体の設定を扱う。
 */
import { nextDeviceId, nextWireId, sheetOf, type Diagram, type DiagramDevice, type DiagramWire } from '../model/diagram';
import type { DeviceDefinition } from '../devices/types';
import type { SourceMap } from './compile';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** リンクを見分ける手がかり: シート・種類・名前と、電線でつないだ相手の端子（相手がリンクなら種類と名前） */
function linkSignatures(d: Diagram, lookup: DefLookup): Map<string, string> {
  const isLink = (x: DiagramDevice | undefined) => !!x && !!lookup(x.type)?.netLabel;
  const byId = new Map(d.devices.map((x) => [x.id, x]));
  const nameOf = (x: DiagramDevice) => String(x.params?.[lookup(x.type)!.netLabel!.param] ?? '').trim();
  const peers = new Map<string, Set<string>>();
  const add = (link: string, other: { device: string; terminal: string }) => {
    const o = byId.get(other.device);
    const label = isLink(o) ? `<${o!.type}|${nameOf(o!)}>` : `${other.device}.${other.terminal}`;
    if (!peers.has(link)) peers.set(link, new Set());
    peers.get(link)!.add(label);
  };
  for (const w of d.wires) {
    if (isLink(byId.get(w.from.device))) add(w.from.device, w.to);
    if (isLink(byId.get(w.to.device))) add(w.to.device, w.from);
  }
  const out = new Map<string, string>();
  for (const x of d.devices) {
    if (!isLink(x)) continue;
    out.set(x.id, [sheetOf(d, x), x.type, nameOf(x), ...[...(peers.get(x.id) ?? [])].sort()].join('\u0000'));
  }
  return out;
}

const pairKey = (w: DiagramWire) => `${w.from.device}\u0000${w.from.terminal}\u0001${w.to.device}\u0000${w.to.terminal}`;
const reversedKey = (w: DiagramWire) => `${w.to.device}\u0000${w.to.terminal}\u0001${w.from.device}\u0000${w.from.terminal}`;

export function inheritFromBase(diagram: Diagram, base: Diagram, map: SourceMap, lookup: DefLookup): Diagram {
  // ---- リンク: 同じ手がかりのリンクが元の図面にあれば、機器名・位置・向きを引き継ぐ ----
  const sigNew = linkSignatures(diagram, lookup);
  const sigBase = linkSignatures(base, lookup);
  const baseBySig = new Map<string, DiagramDevice[]>();
  for (const x of base.devices) {
    const s = sigBase.get(x.id);
    if (s === undefined) continue;
    if (!baseBySig.has(s)) baseBySig.set(s, []);
    baseBySig.get(s)!.push(x);
  }
  const used = new Set(diagram.devices.filter((x) => !sigNew.has(x.id)).map((x) => x.id));
  const rename = new Map<string, string>();
  const inherited = new Map<string, DiagramDevice>();
  for (const x of diagram.devices) {
    const s = sigNew.get(x.id);
    if (s === undefined) continue;
    const match = baseBySig.get(s)?.find((b) => !used.has(b.id));
    if (!match) continue;
    used.add(match.id);
    rename.set(x.id, match.id);
    inherited.set(x.id, match);
  }
  for (const x of diagram.devices) {
    if (!sigNew.has(x.id) || rename.has(x.id)) continue;
    const id = used.has(x.id) ? nextDeviceId(lookup(x.type)!.labelPrefix, used) : x.id;
    used.add(id);
    rename.set(x.id, id);
  }
  const renamed = (id: string) => rename.get(id) ?? id;
  const devices = diagram.devices.map((x) => {
    const b = inherited.get(x.id);
    if (b) return { ...x, id: b.id, x: b.x, y: b.y, params: { ...b.params, ...x.params, ...(b.params?.side !== undefined ? { side: b.params.side } : {}) } };
    return rename.has(x.id) ? { ...x, id: renamed(x.id) } : x;
  });
  const spans = new Map<string, NonNullable<ReturnType<SourceMap['devices']['get']>>>();
  for (const [id, span] of map.devices) spans.set(renamed(id), span);
  map.devices.clear();
  for (const [id, span] of spans) map.devices.set(id, span);

  // ---- 電線: 同じ端子どうしの電線が元の図面にあれば、ID・曲がり・経路・出す向きを引き継ぐ ----
  let wires = diagram.wires.map((w) => ({ ...w, from: { ...w.from, device: renamed(w.from.device) }, to: { ...w.to, device: renamed(w.to.device) } }));
  const pool = new Map<string, DiagramWire[]>();
  for (const b of base.wires) {
    const k = pairKey(b);
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k)!.push(b);
  }
  const take = (k: string) => pool.get(k)?.shift();
  const usedWires = new Set<string>();
  const matched = wires.map((w) => {
    const same = take(pairKey(w));
    if (same) return { w, b: same, reversed: false };
    const rev = take(reversedKey(w));
    return rev ? { w, b: rev, reversed: true } : { w, b: undefined, reversed: false };
  });
  for (const m of matched) if (m.b && !usedWires.has(m.b.id)) usedWires.add(m.b.id);
  const wireSpans = new Map<string, NonNullable<ReturnType<SourceMap['wires']['get']>>>();
  const taken = new Set<string>();
  wires = matched.map(({ w, b, reversed }) => {
    let id: string;
    if (b && !taken.has(b.id)) id = b.id;
    else id = nextWireId(new Set([...usedWires, ...taken]));
    taken.add(id);
    const span = map.wires.get(w.id);
    if (span) wireSpans.set(id, span);
    if (!b) return { ...w, id };
    const fromSide = reversed ? b.toSide : b.fromSide;
    const toSide = reversed ? b.fromSide : b.toSide;
    return {
      ...w,
      id,
      ...(typeof b.bend === 'number' && !reversed ? { bend: b.bend } : {}),
      ...(b.route ? { route: reversed ? [...b.route].reverse() : b.route } : {}),
      ...(fromSide ? { fromSide } : {}),
      ...(toSide ? { toSide } : {}),
    };
  });
  map.wires.clear();
  for (const [id, span] of wireSpans) map.wires.set(id, span);

  // ---- 図面全体: 言語に書かない設定（工程・チューブの巻）と展開図の配置 ----
  const { title: _t, author: _a, revision: _r, requiredPL: _p, ...rest } = base.settings ?? {};
  const settings = { ...rest, ...diagram.settings };
  return {
    ...diagram,
    devices,
    wires,
    ...(Object.keys(settings).length ? { settings } : {}),
    ...(base.schematic ? { schematic: base.schematic } : {}),
  };
}
