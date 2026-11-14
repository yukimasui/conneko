/**
 * 図面データ（Diagram）を配線言語（.cnk）のソースにする（compile.ts の逆）。
 *
 * - 機器はシートごとに宣言の順で、装着したユニットは親のブロックの中に書く
 * - 電線は「種類・太さ・色」が同じものを wire ブロックにまとめ、同じ 2 台の間に並ぶ電線は `A.[…] -- B.[…]` に、
 *   同じ線番で端子から端子へ続く電線（渡り配線）は `A -- B -- C` にまとめる
 * - リンク（シート間の接続記号）は機器として宣言せず、電線の端に `<名前>` と書く
 *
 * 機器の位置・電線の曲がり・展開図の配置は書かない（positions を指定すれば機器の位置だけ `at x,y` で書く）。
 */
import { CABLE_WIRE_TYPE, isTube, sheetOf, sheetsOf, type Diagram, type DiagramDevice, type DiagramWire, type TerminalRef } from '../model/diagram';
import type { DeviceDefinition } from '../devices/types';
import { quoteString, quoteWord } from './lexer';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface PrintOptions {
  lookup: DefLookup;
  /** 機器の位置を `at x,y` で書く（元の図面なしで配置を保つとき） */
  positions?: boolean;
}

/** 1 つの文にまとめる電線の本数・端子の数の上限（行が長くなりすぎないように） */
const MAX_VECTOR = 12;
const MAX_CHAIN = 6;

const NUMERIC = /^-?\d+(\.\d+)?$/;

export function printDiagram(d: Diagram, options: PrintOptions): string {
  const { lookup } = options;
  const byId = new Map(d.devices.map((x) => [x.id, x]));
  const linkName = (x: DiagramDevice | undefined): string | undefined => {
    const label = x && lookup(x.type)?.netLabel;
    if (!x || !label) return undefined;
    const name = String(x.params?.[label.param] ?? '').trim();
    return name && !/[>\n]/.test(name) ? name : undefined;
  };
  const wired = new Set(d.wires.flatMap((w) => [w.from.device, w.to.device]));
  /** `<名前>` と書くリンク（名前があり、電線がつながっているもの）。それ以外のリンクは機器として宣言する */
  const sugar = new Set(d.devices.filter((x) => linkName(x) !== undefined && wired.has(x.id)).map((x) => x.id));

  const out: string[] = [];
  const s = d.settings ?? {};
  if (s.title) out.push(`title ${quoteString(s.title)}`);
  if (s.author) out.push(`author ${quoteString(s.author)}`);
  if (s.revision) out.push(`revision ${quoteString(s.revision)}`);
  if (s.requiredPL) out.push(`requiredPL ${s.requiredPL}`);
  if (out.length) out.push('');

  const paramText = (def: DeviceDefinition | undefined, key: string, v: number | string): string => {
    if (typeof v === 'number') return String(v);
    const pd = def?.params?.find((p) => p.key === key);
    // 数字に見える文字列は、選択肢から選ぶパラメータ以外では引用符で囲む（数値として読まれないように）
    if (NUMERIC.test(v) && !(pd && pd.input !== 'text')) return quoteString(v);
    return quoteWord(v);
  };

  const declaration = (x: DiagramDevice, standalone: boolean): string => {
    const def = lookup(x.type);
    const params = Object.entries(x.params ?? {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string');
    let line = `${quoteWord(x.id)} = ${x.type}`;
    if (params.length) line += `(${params.map(([k, v]) => `${k}=${paramText(def, k, v)}`).join(', ')})`;
    if (x.note) line += ` ${quoteString(x.note)}`;
    if (standalone && x.mount) line += ` on ${quoteWord(x.mount.device)} slot ${x.mount.slot}`;
    if (options.positions && !x.mount) line += ` at ${Math.round(x.x)},${Math.round(x.y)}`;
    return line;
  };

  const endpoint = (r: TerminalRef): string => {
    const name = sugar.has(r.device) ? linkName(byId.get(r.device)) : undefined;
    return name !== undefined ? `<${name}>` : `${quoteWord(r.device)}.${quoteWord(r.terminal)}`;
  };

  /** wire ブロックの見出しにする属性（種類・太さ・色。チューブは種類・外径・色） */
  const blockAttrs = (w: DiagramWire): string => {
    if (w.wireType === CABLE_WIRE_TYPE) return '';
    if (isTube(w)) return [w.wireType, w.tubeOD ? `${w.tubeOD}mm` : '', w.color].filter(Boolean).join(' ');
    return `${w.wireType} ${w.sizeSq}sq ${w.color}`;
  };
  /** 文の後ろに書く属性（端末処理・ケーブルの種類） */
  const trailing = (w: DiagramWire): string => {
    const parts: string[] = [];
    if (w.cable) parts.push(`cable=${quoteWord(w.cable)}`);
    if (w.fromTermination && w.fromTermination === w.toTermination) parts.push(w.fromTermination);
    else {
      if (w.fromTermination) parts.push(`from=${w.fromTermination}`);
      if (w.toTermination) parts.push(`to=${w.toTermination}`);
    }
    return parts.join(' ');
  };

  const printWires = (wires: DiagramWire[], indent: string) => {
    // 同じ端子と同じリンクを結ぶ、属性も同じ電線の重なりは 1 本にする
    // （シートをまたぐ電線をリンクに置き換えると、同じ端子から出る電線の数だけ重なってできる。「この端子はこのリンクにつながる」の意味は 1 本で足りる）
    const seen = new Set<string>();
    const list = wires.filter((w) => {
      if (!sugar.has(w.from.device) && !sugar.has(w.to.device)) return true;
      const ends = [`${w.from.device}.${w.from.terminal}`, `${w.to.device}.${w.to.terminal}`].sort();
      const k = [...ends, w.wireNo ?? '', blockAttrs(w), trailing(w)].join('|');
      return !seen.has(k) && !!seen.add(k);
    });
    const groups = new Map<string, DiagramWire[]>();
    for (const w of list) {
      const k = blockAttrs(w);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(w);
    }
    for (const [attrs, group] of groups) {
      const inner = attrs ? `${indent}  ` : indent;
      const lines = statements(group).map((line) => `${inner}${line}`);
      out.push('');
      if (attrs) out.push(`${indent}wire ${attrs} {`, ...lines, `${indent}}`);
      else out.push(...lines);
    }
  };

  /** 電線の並びを文にする（並んだ電線・渡り配線をまとめる） */
  const statements = (wires: DiagramWire[]): string[] => {
    type Unit = { wires: DiagramWire[]; kind: 'single' | 'vector' | 'chain' };
    const units: Unit[] = [];
    const isLinkEnd = (w: DiagramWire) => sugar.has(w.from.device) || sugar.has(w.to.device);
    for (const w of wires) {
      const u = units[units.length - 1];
      const prev = u?.wires[u.wires.length - 1];
      const first = u?.wires[0];
      if (u && prev && first && trailing(prev) === trailing(w) && !isLinkEnd(w) && !isLinkEnd(prev)) {
        // 同じ 2 台の間に並ぶ電線（線番はすべてあるか、すべてないか）
        const pairs = new Set(u.wires.map((x) => `${x.from.terminal}|${x.to.terminal}`));
        if (
          u.kind !== 'chain' &&
          u.wires.length < MAX_VECTOR &&
          w.from.device === first.from.device &&
          w.to.device === first.to.device &&
          w.from.device !== w.to.device &&
          !!w.wireNo === !!first.wireNo &&
          !pairs.has(`${w.from.terminal}|${w.to.terminal}`) &&
          !u.wires.some((x) => x.from.terminal === w.from.terminal || x.to.terminal === w.to.terminal)
        ) {
          u.wires.push(w);
          u.kind = 'vector';
          continue;
        }
        // 同じ線番で、前の電線の終わりの端子から続く電線（渡り配線）
        if (u.kind !== 'vector' && u.wires.length < MAX_CHAIN - 1 && (w.wireNo ?? '') === (first.wireNo ?? '') && prev.to.device === w.from.device && prev.to.terminal === w.from.terminal) {
          const visited = new Set(u.wires.flatMap((x) => [endpoint(x.from), endpoint(x.to)]));
          if (!visited.has(endpoint(w.to))) {
            u.wires.push(w);
            u.kind = 'chain';
            continue;
          }
        }
      }
      units.push({ wires: [w], kind: 'single' });
    }
    return units.map((u) => {
      const first = u.wires[0];
      const tail = trailing(first);
      let label = first.wireNo ? `${quoteWord(first.wireNo)}: ` : '';
      // リンクにつなぐ電線・ケーブルは、線番を書かなければリンクの名前が線番になる。同じなら省き、線番がなければ "" と書く
      const link = u.kind === 'single' && !isTube(first) ? (linkName(sugar.has(first.from.device) ? byId.get(first.from.device) : undefined) ?? linkName(sugar.has(first.to.device) ? byId.get(first.to.device) : undefined)) : undefined;
      if (link !== undefined) label = first.wireNo === link ? '' : first.wireNo ? label : '"": ';
      let body: string;
      if (u.kind === 'vector') {
        const numbers = u.wires.map((x) => x.wireNo ?? '');
        if (first.wireNo && new Set(numbers).size > 1) label = `[${numbers.map(quoteWord).join(', ')}]: `;
        const side = (pick: (w: DiagramWire) => TerminalRef) => `${quoteWord(pick(first).device)}.[${u.wires.map((x) => quoteWord(pick(x).terminal)).join(', ')}]`;
        body = `${side((x) => x.from)} -- ${side((x) => x.to)}`;
      } else {
        body = [endpoint(first.from), ...u.wires.map((x) => endpoint(x.to))].join(' -- ');
      }
      return `${label}${body}${tail ? ` ${tail}` : ''}`;
    });
  };

  const sheets = sheetsOf(d);
  const single = !d.sheets?.length;
  for (const sheet of sheets) {
    const indent = single ? '' : '  ';
    if (!single) out.push(`sheet ${quoteWord(sheet.id)} ${quoteString(sheet.name)} {`);
    const members = d.devices.filter((x) => sheetOf(d, x) === sheet.id);
    const inSheet = new Set(members.map((x) => x.id));
    const isChild = (x: DiagramDevice) => !!x.mount && inSheet.has(x.mount.device) && x.mount.device !== x.id;
    for (const x of members) {
      if (sugar.has(x.id) || isChild(x)) continue;
      const children = members.filter((c) => isChild(c) && c.mount!.device === x.id).sort((a, b) => a.mount!.slot - b.mount!.slot);
      const head = `${indent}${declaration(x, true)}`;
      if (!children.length) {
        out.push(head);
        continue;
      }
      out.push(`${head} {`);
      let expected = 1;
      for (const c of children) {
        out.push(`${indent}  ${declaration(c, false)}${c.mount!.slot !== expected ? ` slot ${c.mount!.slot}` : ''}`);
        expected = c.mount!.slot + 1;
      }
      out.push(`${indent}}`);
    }
    const comments = members.flatMap((x) => Object.entries(x.comments ?? {}).map(([terminal, text]) => `${indent}comment ${quoteWord(x.id)}.${quoteWord(terminal)} ${quoteString(text)}`));
    if (comments.length) out.push('', ...comments);
    // 電線は from 側の機器のシートに書く（リンクに置き換えたあとの図面では、両端は同じシートにある）
    const wires = d.wires.filter((w) => {
      const a = byId.get(w.from.device) ?? byId.get(w.to.device);
      return a ? sheetOf(d, a) === sheet.id : sheet === sheets[0];
    });
    printWires(wires, indent);
    if (!single) out.push('}', '');
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return `${out.join('\n')}\n`;
}
