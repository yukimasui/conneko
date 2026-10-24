/**
 * 機器定義から展開図の要素（記号の単位）を切り出す。
 *
 * 展開図では 1 台の機器が複数の記号に分かれる（電磁接触器ならコイル・主接点・補助接点）。
 * 端子・ピン・内部経路（links）から次の順に切り出し、どれにも当たらない端子は機器ごとの「箱」にまとめる。
 *
 * 0. 一次電源（電源の出力の端子を ○ で並べる）
 * 1. 機器定義の schematic.elements（明示した要素）
 * 2. 電磁接触器・リレーのコイル（受電端子がちょうど 2 つ）
 * 3. 保護の経路（遮断器の極、サーマルリレーの熱動素子）と、電磁接触器の主接点。極をまとめて 1 要素
 * 4. c 接点（共通の端子から b 接点と a 接点が出る組）、a 接点・b 接点（経路ごとに 1 要素）
 * 5. PLC の出力点・入力点（1 点ごとに 1 要素）
 * 6. 端子台の端子（常時導通の経路でつながった端子の組ごと）
 * 7. 接地端子
 * 8. 残りの端子（ネジ端子の箱と、コネクタごとのピンの箱）
 */
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, ParamValues, PinDef, TerminalDef } from '../devices/types';
import type { SymbolDef } from './format';
import { boxSymbol, contactSymbolId, librarySymbol, type BoxPin } from './symbols';

export type ElementKind =
  | 'coil'
  | 'contact'
  | 'breaker'
  | 'contactor'
  | 'thermal'
  | 'plc-input'
  | 'plc-output'
  | 'terminal'
  | 'ground'
  | 'motor'
  | 'lamp'
  | 'buzzer'
  | 'source'
  | 'box';

export interface SchematicElement {
  /** 機器の中で一意なキー。要素 ID は `<機器名>:<キー>`（例: 'MC1:13-14'） */
  key: string;
  kind: ElementKind;
  /** 画面に出す説明（例: 'a 接点 13-14'） */
  name: string;
  /** 記号 ID（箱は機器ごとに作った ID） */
  symbol: string;
  /** 機器の端子 ID（ピン ID を含む）→ 記号の端子名。複数の端子が同じ記号の端子に当たることがある */
  pinOf: Record<string, string>;
  /** 機器から決まる属性の値（端子番号・入出力番号など）。機器名 TAG は配置するときに入れる */
  attributes: Record<string, string>;
  /** 箱の記号（kind が 'box' のとき） */
  box?: SymbolDef;
}

/** 要素の ID */
export function elementId(deviceId: string, key: string): string {
  return `${deviceId}:${key}`;
}

/** 要素の記号の定義 */
export function elementSymbol(el: SchematicElement): SymbolDef {
  const def = el.box ?? librarySymbol(el.symbol);
  if (!def) throw new Error(`記号 ${el.symbol} がありません`);
  return def;
}

/** 文字列の短いハッシュ（箱の記号 ID を内容ごとに分けるため） */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** DXF のブロック名に使える文字だけにする */
function safeName(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

/** 端子番号として書く文字（コネクタのピンは '#' の後ろの番号） */
export function pinNumber(id: string): string {
  const i = id.indexOf('#');
  return i >= 0 ? id.slice(i + 1) : id;
}

/**
 * PLC の入出力点のラベルを、入出力番号と端子番号に分ける。
 * ラベルは 'R000 (No.1)'、'X00 (B20)'、'IN016（1B）'、'1SVON 軸1 サーボ ON 出力' のような形なので、
 * 先頭の語を入出力番号とし、括弧の中がピン名（'B20'、'1B'）ならそれを端子番号にする。
 */
export function splitIoLabel(label: string, id: string): { addr: string; pin: string } {
  const addr = label.split(/[\s(（]/)[0] || label;
  const paren = /[(（]([^)）]*)[)）]\s*$/.exec(label)?.[1].trim();
  const pin = paren && /^[A-Z]?\d+[A-Z]?$/.test(paren) ? paren : pinNumber(id);
  return { addr, pin };
}

export function deviceElements(def: DeviceDefinition, params?: ParamValues): SchematicElement[] {
  if (def.category === 'link') return [];
  const r = resolveDevice(def, params);
  const hint = def.schematic ?? {};
  const used = new Set<string>();
  const out: SchematicElement[] = [];
  const free = (id: string) => !used.has(id);

  const add = (el: SchematicElement) => {
    for (const id of Object.keys(el.pinOf)) used.add(id);
    out.push(el);
  };
  /** 2 端子の記号（端子 1・2） */
  const twoPin = (kind: ElementKind, symbol: string, name: string, a: string, b: string): SchematicElement => ({
    key: `${a}-${b}`,
    kind,
    name: `${name} ${a}-${b}`,
    symbol,
    pinOf: { [a]: '1', [b]: '2' },
    attributes: { T1: pinNumber(a), T2: pinNumber(b) },
  });
  /** 多極の記号（極 i の一次側が 2i-1、二次側が 2i） */
  const poles = (kind: ElementKind, symbol: string, name: string, pairs: [string, string][]): SchematicElement => {
    const pinOf: Record<string, string> = {};
    const attributes: Record<string, string> = {};
    pairs.forEach(([a, b], i) => {
      pinOf[a] = String(2 * i + 1);
      pinOf[b] = String(2 * i + 2);
      attributes[`T${2 * i + 1}`] = pinNumber(a);
      attributes[`T${2 * i + 2}`] = pinNumber(b);
    });
    return { key: 'main', kind, name, symbol, pinOf, attributes };
  };

  // 0. 一次電源
  if (def.category === 'power-source') {
    // 接地（PE）は電源の端子に入れず、接地の記号にする（下の 7）
    const outs = r.terminals.filter((t) => t.role === 'supply' && t.supply?.conductor !== 'PE' && free(t.id)).slice(0, 4);
    if (outs.length >= 2) {
      add({
        key: 'main',
        kind: 'source',
        name: `一次電源 ${outs.map((t) => t.id).join('・')}`,
        symbol: `source-${outs.length}p`,
        pinOf: Object.fromEntries(outs.map((t, i) => [t.id, String(i + 1)])),
        attributes: Object.fromEntries(outs.map((t, i) => [`T${i + 1}`, t.label ?? t.id])),
      });
    }
  }

  // 1. 明示した要素
  for (const e of hint.elements ?? []) {
    const ts = e.terminals;
    if (e.kind === 'motor') {
      const pinOf = Object.fromEntries(ts.map((t, i) => [t, String(i + 1)]));
      const attributes = Object.fromEntries(ts.map((t, i) => [`T${i + 1}`, pinNumber(t)]));
      add({ key: ts.join('-'), kind: 'motor', name: `電動機 ${ts.join('-')}`, symbol: ts.length === 3 ? 'motor-3p' : 'motor-1p', pinOf, attributes });
    } else {
      add(twoPin(e.kind, e.kind, e.kind === 'coil' ? 'コイル' : e.kind === 'buzzer' ? 'ブザー' : '表示灯', ts[0], ts[1]));
    }
  }

  // 2. 電磁接触器・リレーのコイル
  if (def.category === 'contactor') {
    const inputs = r.terminals.filter((t) => t.role === 'input' && free(t.id));
    if (inputs.length === 2) {
      // A1 → A2 の順にそろえる（定義の並びが逆の機器がある）
      const [a, b] = [...inputs].sort((x, y) => x.id.localeCompare(y.id, 'en', { numeric: true }));
      add(twoPin('coil', 'coil', 'コイル', a.id, b.id));
    }
  }

  // 3. 保護の経路と電磁接触器の主接点
  const protectLinks = r.links.filter((l) => l.protects && !l.switch && free(l.from) && free(l.to));
  const thermal = protectLinks.length > 0 && def.category !== 'breaker';
  if (protectLinks.length > 0 && protectLinks.length <= 4) {
    const pairs = protectLinks.map((l) => [l.from, l.to] as [string, string]);
    const n = pairs.length;
    if (thermal) add(poles('thermal', `thermal-${n}p`, `熱動素子（${n} 極）`, pairs));
    else
      add(poles('breaker', `${hint.earthLeakage ? 'elb' : 'breaker'}-${n}p`, `${hint.earthLeakage ? '漏電遮断器' : '遮断器'}（${n} 極）`, pairs));
  }
  if (def.category === 'contactor') {
    const main = r.links.filter(
      (l) => l.switch === 'NO' && r.terminal(l.from)?.role === 'line' && r.terminal(l.to)?.role === 'load' && free(l.from) && free(l.to),
    );
    if (main.length > 0 && main.length <= 4) {
      add(poles('contactor', `contactor-${main.length}p`, `主接点（${main.length} 極）`, main.map((l) => [l.from, l.to])));
    }
  }

  // 4. c 接点（共通の端子を持つ b 接点と a 接点の組）、a 接点・b 接点
  const actuator = hint.actuator ?? (thermal ? 'thermal' : undefined);
  for (const nc of r.links) {
    if (nc.switch !== 'NC' || !free(nc.from) || !free(nc.to)) continue;
    for (const no of r.links) {
      if (no.switch !== 'NO' || !free(no.from) || !free(no.to)) continue;
      const com = [nc.from, nc.to].find((t) => t === no.from || t === no.to);
      if (!com) continue;
      const b = nc.from === com ? nc.to : nc.from;
      const a = no.from === com ? no.to : no.from;
      if (a === b) continue;
      add({
        key: `${com}-${b}-${a}`,
        kind: 'contact',
        name: `c 接点 ${com}-${b}/${a}`,
        symbol: contactSymbolId('C', nc.timed ?? no.timed ?? actuator, !!nc.directOpening),
        pinOf: { [com]: '1', [b]: '2', [a]: '3' },
        attributes: { T1: pinNumber(com), T2: pinNumber(b), T3: pinNumber(a) },
      });
      break;
    }
  }
  for (const l of r.links) {
    if ((l.switch !== 'NO' && l.switch !== 'NC') || !free(l.from) || !free(l.to)) continue;
    const name = `${l.timed === 'on-delay' ? '限時動作 ' : l.timed === 'off-delay' ? '限時復帰 ' : ''}${l.switch === 'NO' ? 'a 接点' : 'b 接点'}${l.positions ? `（位置 ${l.positions.join('・')} で閉）` : ''}`;
    add(twoPin('contact', contactSymbolId(l.switch, l.timed ?? actuator, !!l.directOpening), name, l.from, l.to));
  }

  // 5. PLC の出力点・入力点
  if (def.category === 'plc') {
    const point = (kind: 'plc-input' | 'plc-output', id: string) => {
      const label = (r.terminal(id) ?? r.pin(id))?.label ?? id;
      const { addr, pin } = splitIoLabel(label, id);
      add({
        key: id,
        kind,
        name: `${kind === 'plc-input' ? '入力' : '出力'} ${label}`,
        // ソース出力（PNP）は段の左に置く記号
        symbol: kind === 'plc-input' ? 'plc-in' : (r.terminal(id) ?? r.pin(id))?.signal?.kind === 'pnp' ? 'plc-out-src' : 'plc-out',
        pinOf: { [id]: '1' },
        // ネジ端子の PLC は端子名が入出力番号そのもの（'Y00'）なので、同じなら端子番号を書かない
        attributes: { ADDR: addr, ...(pin !== addr ? { T1: pin } : {}) },
      });
    };
    for (const l of r.links) if (l.switch === 'output' && free(l.from)) point('plc-output', l.from);
    for (const t of [...r.terminals, ...r.pins]) if (t.signal?.dir === 'in' && free(t.id)) point('plc-input', t.id);
  }

  // 6. 端子台の端子（常時導通の経路でつながった端子の組）
  if (def.category === 'terminal') {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      const p = parent.get(x) ?? x;
      if (p === x) return x;
      const root = find(p);
      parent.set(x, root);
      return root;
    };
    for (const l of r.links) if (!l.switch && free(l.from) && free(l.to)) parent.set(find(l.from), find(l.to));
    const groups = new Map<string, string[]>();
    // ネジ端子を先に、ピンを後に並べる（端子 1 がネジ、端子 2 がもう一方のネジかピン）
    for (const t of [...r.terminals, ...r.pins]) {
      if (t.role === 'connector' || !free(t.id)) continue;
      const root = find(t.id);
      groups.set(root, [...(groups.get(root) ?? []), t.id]);
    }
    for (const ids of groups.values()) {
      const pinOf = Object.fromEntries(ids.map((id, i) => [id, i === 0 ? '1' : '2']));
      add({ key: ids[0], kind: 'terminal', name: `端子 ${ids[0]}`, symbol: 'terminal', pinOf, attributes: { T1: pinNumber(ids[0]) } });
    }
  }

  // 7. 接地端子
  for (const t of r.terminals) {
    const pe = t.role === 'ground' || (t.role === 'supply' && t.supply?.conductor === 'PE');
    if (!pe || !free(t.id)) continue;
    add({ key: t.id, kind: 'ground', name: `接地 ${t.id}`, symbol: 'ground', pinOf: { [t.id]: '1' }, attributes: { T1: t.id } });
  }

  // 8. 残りの端子を箱にまとめる（ネジ端子で 1 つ、コネクタごとに 1 つ）
  const rest = r.terminals.filter((t) => t.role !== 'connector' && t.role !== 'air' && free(t.id));
  if (rest.length > 0) add(makeBox(def, 'main', def.model, rest));
  const restPins = new Map<string, PinDef[]>();
  for (const p of r.pins) {
    // 画面に出さないエアのポート（装着形の電磁弁の P・EA・EB など）は電気の要素にしない（空圧回路図で描く）
    if (!free(p.id) || p.role === 'air') continue;
    const cn = p.id.slice(0, p.id.indexOf('#'));
    restPins.set(cn, [...(restPins.get(cn) ?? []), p]);
  }
  for (const [cn, ps] of restPins) add(makeBox(def, cn, `${def.model} ${cn}`, ps));

  return out;
}

/** 電源・出力側の端子は箱の右、それ以外は左に並べる */
function isRightSide(t: TerminalDef | PinDef): boolean {
  return t.role === 'supply' || t.role === 'load' || t.signal?.dir === 'out';
}

function makeBox(def: DeviceDefinition, key: string, title: string, ts: (TerminalDef | PinDef)[]): SchematicElement {
  const toPin = (t: TerminalDef | PinDef): BoxPin => ({ pin: t.id, label: t.id });
  let left = ts.filter((t) => !isRightSide(t)).map(toPin);
  let right = ts.filter(isRightSide).map(toPin);
  // 片側に寄りすぎる場合は半分ずつに分ける
  if (left.length > 2 * right.length + 4 || right.length > 2 * left.length + 4) {
    const all = ts.map(toPin);
    const half = Math.ceil(all.length / 2);
    left = all.slice(0, half);
    right = all.slice(half);
  }
  const box = boxSymbol(title, left, right);
  const symbol = `box_${safeName(def.type)}_${safeName(key)}_${hash(JSON.stringify([title, left, right]))}`;
  return {
    key,
    kind: 'box',
    name: key === 'main' ? '本体' : `コネクタ ${key}`,
    symbol,
    pinOf: Object.fromEntries(ts.map((t) => [t.id, t.id])),
    attributes: {},
    box,
  };
}
