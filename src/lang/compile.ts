/**
 * 配線言語（.cnk）のコンパイル: ソース → 図面データ（Diagram）。
 *
 * 段階:
 * 1. 構文解析（parser.ts）
 * 2. 名前の解決: 機器種別・パラメータ・端子 ID・電線の属性を機器カタログと照らし、誤りをソースの位置つきで出す
 * 3. 図面データの組み立て: 置いていない機器を並べ、リンク（<名前>）を機器にし、シートをまたぐ電線をリンクに置き換える
 *
 * 電気的なチェック（短絡・電圧の不一致・電線の太さなど）は check.ts で、できた図面データに既存の配線チェックをかけて行う。
 * 機器カタログは引数（lookup / defs）で受け取る（アプリの外の CLI からも使えるようにするため）。
 */
import { computeBus, effectiveParams, mountedPositions } from '../model/bus';
import { normalizeTubes } from '../model/air';
import { CABLE_WIRE_TYPE, nextDeviceId, type Diagram, type DiagramDevice, type DiagramSettings, type DiagramWire, type Sheet, type TerminalRef } from '../model/diagram';
import { AIR_LINK_TYPE, LINK_TYPE, NET_LINK_TYPE, splitCrossSheetWires } from '../model/ops';
import { isLanPort, resolveDevice, type ResolvedDevice } from '../devices/resolve';
import { deviceSize, type DeviceDefinition, type ParamValues, type Termination, type TerminalDef, type TerminalSide } from '../devices/types';
import { CABLE_SPECS, getCableSpec } from '../data/cables';
import { TERMINATIONS } from '../data/terminations';
import { DEFAULT_TUBE, TUBE_COLORS, TUBE_ODS, TUBE_TYPES, isTubeType } from '../data/tubes';
import { DEFAULT_WIRE, WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import type { Attr, ChainStmt, DeviceStmt, Endpoint, Stmt, Text } from './ast';
import type { Span } from './lexer';
import { inheritFromBase } from './merge';
import { parse } from './parser';
import { suggest } from './suggest';

export type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  /** 誤りの種類（'syntax'、'unknown-terminal'、配線チェックのルール名など） */
  code: string;
  message: string;
  /** ソース上の位置（配線チェックの指摘で、ソースに対応する文がないものは省略） */
  span?: Span;
  /** 'compile': 構文・名前の解決、'check': 電気的なチェック */
  phase: 'compile' | 'check';
  /** 関係するほかの位置（指摘に出てくるほかの電線・機器） */
  related?: { label: string; span: Span }[];
  /** 推定の値を含む機器定義が関わる指摘 */
  estimated?: boolean;
}

export interface CompileOptions {
  lookup: DefLookup;
  /** 機器カタログ（候補の提示に使う） */
  defs: DeviceDefinition[];
  /** 配置（機器の位置・電線の曲がり・展開図など、言語に書かない情報）を引き継ぐ元の図面 */
  base?: Diagram;
}

export interface SourceMap {
  /** 機器名 → 宣言の位置（リンクは <名前> を書いた位置） */
  devices: Map<string, Span>;
  /** 電線 ID → 電線を書いた文の位置 */
  wires: Map<string, Span>;
}

export interface CompileResult {
  /** できた図面データ（誤りがあっても、解決できた範囲で作る） */
  diagram: Diagram;
  diagnostics: Diagnostic[];
  /** 構文・名前の解決に誤り（error）がない */
  ok: boolean;
  map: SourceMap;
}

/** 電線の属性（解決済み） */
interface WireProps {
  no?: string;
  color?: string;
  size?: number;
  type?: string;
  od?: number;
  cable?: string;
  from?: Termination;
  to?: Termination;
}

const COLOR_IDS = new Map<string, string>();
for (const c of [...WIRE_COLORS, ...TUBE_COLORS]) {
  COLOR_IDS.set(c.id, c.id);
  if (!COLOR_IDS.has(c.name)) COLOR_IDS.set(c.name, c.id);
}
const TYPE_IDS = [...WIRE_TYPES.map((t) => t.id), ...TUBE_TYPES.map((t) => t.id), CABLE_WIRE_TYPE];
const TERMINATION_IDS = TERMINATIONS.map((t) => t.id) as string[];
const ATTR_KEYS = ['no', 'color', 'size', 'type', 'od', 'cable', 'from', 'to', 'end'];
/** 定義の params にないが、図面に書けるパラメータ（装着していない I/O ユニットの先頭番号） */
const EXTRA_PARAMS = ['ioIn', 'ioOut'];
const NUMBER = /^-?\d+(\.\d+)?$/;

/** 自動で並べるときの間隔[px]（電線とリンクを引く余白を見込む） */
const GAP_X = 170;
const GAP_Y = 220;
const ROW_WIDTH = 1900;

const refKey = (r: TerminalRef) => `${r.device}\u0000${r.terminal}`;

export function compile(source: string, options: CompileOptions): CompileResult {
  const { lookup, defs, base } = options;
  const diagnostics: Diagnostic[] = [];
  const map: SourceMap = { devices: new Map(), wires: new Map() };
  const report = (severity: Diagnostic['severity'], code: string, message: string, span: Span) => diagnostics.push({ severity, code, message, span, phase: 'compile' });
  const error = (code: string, message: string, span: Span) => report('error', code, message, span);

  const { program, errors } = parse(source);
  for (const e of errors) error('syntax', e.message, e.span);

  // ---- シートと機器の宣言を集める ----
  const sheets: Sheet[] = [];
  const settings: DiagramSettings = {};
  const devices: DiagramDevice[] = [];
  const byId = new Map<string, DiagramDevice>();
  /** `at` で位置を書いた機器 */
  const placed = new Set<string>();
  /** 配線の文と、その文を囲む電線の既定・シート */
  const chains: { stmt: ChainStmt; props: WireProps; sheet?: string }[] = [];
  const comments: { target: Endpoint; text: Text }[] = [];

  const sheetFor = (id: Text | undefined, name: Text | undefined): string => {
    const found = id ? sheets.find((s) => s.id === id.value) : sheets.find((s) => s.name === name!.value);
    if (found) {
      if (id && name && found.name !== name.value) report('warning', 'sheet-renamed', `シート ${found.id} の名前は先に「${found.name}」と書かれています`, name.span);
      return found.id;
    }
    let sid = id?.value;
    if (!sid) {
      let n = sheets.length + 1;
      while (sheets.some((s) => s.id === `S${n}`)) n++;
      sid = `S${n}`;
    }
    sheets.push({ id: sid, name: name?.value ?? sid });
    return sid;
  };

  const declare = (stmt: DeviceStmt, sheet: string | undefined) => {
    const id = stmt.id.value;
    if (!id || /[\s.]/.test(id)) {
      error('invalid-name', `機器名「${id}」には空白と . を使えません`, stmt.id.span);
      return;
    }
    const first = map.devices.get(id);
    if (first) {
      error('duplicate-device', `機器名 ${id} は ${first.start.line} 行目で宣言済みです`, stmt.id.span);
      return;
    }
    const def = lookup(stmt.deviceType.value);
    if (!def) {
      const near = suggest(stmt.deviceType.value, defs.map((d) => d.type));
      const byModel = defs.filter((d) => d.model.toLowerCase() === stmt.deviceType.value.toLowerCase()).map((d) => d.type);
      const hints = [...new Set([...byModel, ...near])].slice(0, 3);
      error('unknown-device', `機器種別 "${stmt.deviceType.value}" は機器カタログにありません${hints.length ? `（もしかして: ${hints.join('、')}）` : ''}`, stmt.deviceType.span);
    }
    const params: ParamValues = {};
    for (const p of stmt.params) {
      const raw = p.value.value;
      const pd = def?.params?.find((x) => x.key === p.key.value);
      if (!def) {
        params[p.key.value] = !p.quoted && NUMBER.test(raw) ? Number(raw) : raw;
      } else if (!pd) {
        params[p.key.value] = !p.quoted && NUMBER.test(raw) ? Number(raw) : raw;
        if (!EXTRA_PARAMS.includes(p.key.value) && !def.netLabel) {
          const keys = (def.params ?? []).map((x) => x.key);
          const near = suggest(p.key.value, keys);
          report(
            'warning',
            'unknown-param',
            `${id}: ${def.type} にパラメータ ${p.key.value} はありません（${near.length ? `もしかして: ${near.join('、')}` : keys.length ? `あるのは ${keys.join('、')}` : 'パラメータのない機器です'}）`,
            p.key.span,
          );
        }
      } else if (pd.input === 'text') {
        params[pd.key] = raw;
      } else {
        const opt = pd.options.find((o) => String(o.value) === raw) ?? (NUMBER.test(raw) ? pd.options.find((o) => o.value === Number(raw)) : undefined);
        if (opt) {
          params[pd.key] = opt.value;
        } else {
          error('invalid-param', `${id}: ${pd.label}（${pd.key}）に ${raw} は選べません（選べるのは ${pd.options.map((o) => String(o.value)).join('、')}）`, p.value.span);
        }
      }
    }
    const device: DiagramDevice = {
      id,
      type: stmt.deviceType.value,
      x: stmt.at?.x ?? 0,
      y: stmt.at?.y ?? 0,
      ...(Object.keys(params).length ? { params } : {}),
      ...(stmt.on ? { mount: { device: stmt.on.value, slot: stmt.slot ?? 0 } } : {}),
      ...(sheet ? { sheet } : {}),
      ...(stmt.note?.value.trim() ? { note: stmt.note.value } : {}),
    };
    if (stmt.at) placed.add(id);
    devices.push(device);
    byId.set(id, device);
    map.devices.set(id, stmt.id.span);
    if (stmt.slot !== undefined && !stmt.on) report('warning', 'slot-without-host', `${id}: slot は装着するユニット（on 機器名、または機器のブロックの中）に書きます`, stmt.id.span);
    for (const child of stmt.children) declare(child, sheet);
  };

  const walk = (body: Stmt[], props: WireProps, sheet: string | undefined) => {
    for (const s of body) {
      if (s.type === 'device') {
        declare(s, sheet);
      } else if (s.type === 'chain') {
        chains.push({ stmt: s, props, sheet });
      } else if (s.type === 'wire') {
        walk(s.body, applyAttrs(props, s.attrs), sheet);
      } else if (s.type === 'sheet') {
        if (sheet) error('nested-sheet', 'sheet の中に sheet は書けません', s.span);
        walk(s.body, props, sheetFor(s.id, s.name));
      } else if (s.type === 'comment') {
        comments.push({ target: s.target, text: s.text });
      } else if (s.key.value === 'requiredPL') {
        if (/^[a-e]$/.test(s.value.value)) settings.requiredPL = s.value.value as DiagramSettings['requiredPL'];
        else error('invalid-setting', 'requiredPL は a〜e のいずれかです', s.value.span);
      } else {
        settings[s.key.value as 'title' | 'author' | 'revision'] = s.value.value;
      }
    }
  };

  /** 電線の属性を、囲んでいる既定（props）に重ねる */
  function applyAttrs(props: WireProps, attrs: Attr[]): WireProps {
    const out = { ...props };
    const termination = (a: Attr): Termination | undefined => {
      if (TERMINATION_IDS.includes(a.value.value)) return a.value.value as Termination;
      error('invalid-attr', `端末処理 ${a.value.value} はありません（${TERMINATION_IDS.join('、')}）`, a.value.span);
      return undefined;
    };
    const size = (a: Attr, text: string): number | undefined => {
      const n = Number(text);
      if (NUMBER.test(text) && n > 0) return n;
      error('invalid-attr', `太さ ${a.value.value} を読めません（3.5sq のように書きます）`, a.value.span);
      return undefined;
    };
    for (const a of attrs) {
      const v = a.value.value;
      if (a.key) {
        switch (a.key.value) {
          case 'no':
            out.no = v;
            break;
          case 'color': {
            const c = COLOR_IDS.get(v);
            if (c) out.color = c;
            else error('invalid-attr', `電線色 ${v} はありません（${suggestOr(v, [...COLOR_IDS.keys()])}）`, a.value.span);
            break;
          }
          case 'size':
            out.size = size(a, v.replace(/sq$/i, '')) ?? out.size;
            break;
          case 'type':
            if (TYPE_IDS.includes(v)) out.type = v;
            else error('invalid-attr', `電線の種類 ${v} はありません（${suggestOr(v, TYPE_IDS)}）`, a.value.span);
            break;
          case 'od':
            out.od = size(a, v.replace(/mm$/i, '')) ?? out.od;
            break;
          case 'cable':
            out.cable = v;
            if (!getCableSpec(v)) report('warning', 'unknown-cable', `変換ケーブル ${v} はありません（${suggestOr(v, CABLE_SPECS.map((c) => c.id))}）`, a.value.span);
            break;
          case 'from':
            out.from = termination(a) ?? out.from;
            break;
          case 'to':
            out.to = termination(a) ?? out.to;
            break;
          case 'end':
            out.from = out.to = termination(a) ?? out.from;
            break;
          default:
            error('invalid-attr', `電線の属性 ${a.key.value}= はありません（${suggestOr(a.key.value, ATTR_KEYS)}）`, a.key.span);
        }
        continue;
      }
      const sq = /^(\d+(?:\.\d+)?)sq$/i.exec(v);
      const mm = /^[φΦ]?(\d+(?:\.\d+)?)mm$/i.exec(v);
      if (sq) out.size = Number(sq[1]);
      else if (mm) out.od = Number(mm[1]);
      else if (COLOR_IDS.has(v)) out.color = COLOR_IDS.get(v);
      else if (TYPE_IDS.includes(v)) out.type = v;
      else if (TERMINATION_IDS.includes(v)) out.from = out.to = v as Termination;
      else {
        const near = suggest(v, [...COLOR_IDS.keys(), ...TYPE_IDS, ...TERMINATION_IDS]);
        error(
          'invalid-attr',
          `電線の属性「${v}」を読めません${near.length ? `（もしかして: ${near.join('、')}）` : ''}。色（black・赤 など）、太さ（3.5sq）、種類（KIV など）、チューブ外径（6mm）、端末処理（ferrule など）、または no=線番 を書けます`,
          a.value.span,
        );
      }
    }
    return out;
  }

  function suggestOr(word: string, candidates: string[]): string {
    const near = suggest(word, candidates);
    return near.length ? `もしかして: ${near.join('、')}` : `書けるのは ${candidates.slice(0, 16).join('、')}${candidates.length > 16 ? ' など' : ''}`;
  }

  walk(program.body, {}, undefined);

  // ---- 装着（mount）の解決 ----
  for (const d of devices) {
    if (!d.mount) continue;
    const span = map.devices.get(d.id)!;
    if (!byId.has(d.mount.device)) {
      error('unknown-device', `${d.id}: 装着先の機器 ${d.mount.device} が宣言されていません`, span);
      delete d.mount;
    } else if (!d.mount.slot) {
      // on だけを書いたユニットは、装着先の空いている最初の位置
      const used = new Set(devices.filter((x) => x !== d && x.mount?.device === d.mount!.device).map((x) => x.mount!.slot));
      let n = 1;
      while (used.has(n)) n++;
      d.mount.slot = n;
    }
  }

  // ---- 位置: at で書いた位置 > 元の図面の位置 > 自動 ----
  const baseDevices = new Map((base?.devices ?? []).map((d) => [d.id, d]));
  const sheetIdOf = (d: DiagramDevice) => (d.sheet && sheets.some((s) => s.id === d.sheet) ? d.sheet : (sheets[0]?.id ?? ''));
  const sizeOf = (d: DiagramDevice) => {
    const def = lookup(d.type);
    return def ? deviceSize(def, d.params) : { width: 120, height: 80 };
  };
  const cursor = new Map<string, { x: number; y: number; rowH: number }>();
  for (const d of devices) {
    const b = baseDevices.get(d.id);
    if (!placed.has(d.id) && b && !d.mount) {
      d.x = b.x;
      d.y = b.y;
      placed.add(d.id);
    }
  }
  for (const d of devices) {
    if (placed.has(d.id) || d.mount) continue;
    const sid = sheetIdOf(d);
    let c = cursor.get(sid);
    if (!c) {
      // 位置の決まっている機器の下から並べ始める
      const fixed = devices.filter((x) => placed.has(x.id) && sheetIdOf(x) === sid);
      const bottom = fixed.length ? Math.max(...fixed.map((x) => x.y + sizeOf(x).height)) + GAP_Y : 0;
      cursor.set(sid, (c = { x: 0, y: bottom, rowH: 0 }));
    }
    // 装着したユニットは親の横に並ぶので、その幅も見込む
    const family = devices.filter((x) => x.mount?.device === d.id);
    const width = sizeOf(d).width + family.reduce((sum, x) => sum + sizeOf(x).width, 0);
    const height = Math.max(sizeOf(d).height, ...family.map((x) => sizeOf(x).height));
    if (c.x > 0 && c.x + width > ROW_WIDTH) {
      c.x = 0;
      c.y += c.rowH + GAP_Y;
      c.rowH = 0;
    }
    d.x = c.x;
    d.y = c.y;
    c.x += width + GAP_X;
    c.rowH = Math.max(c.rowH, height);
  }
  for (const [id, pos] of mountedPositions(devices, lookup)) Object.assign(byId.get(id)!, pos);

  // ---- 端子の解決 ----
  const bus = computeBus(devices, lookup);
  const resolved = new Map<string, ResolvedDevice>();
  for (const d of devices) {
    const def = lookup(d.type);
    if (def) resolved.set(d.id, resolveDevice(def, effectiveParams(d, bus)));
  }
  type Port = Pick<TerminalDef, 'id' | 'role' | 'connector'>;
  /**
   * 端子を探す。機器種別が不明な機器の端子は 'unknown'（重ねて誤りを出さない）。
   * コネクタのピン（`CN1#1`。画面に端子として出ない）は、コメントを付けるとき（allowPin）だけ認める。
   * ピンに電線をつなぐと、画面に描けず、選ぶことも消すこともできない電線になる
   */
  const findPort = (e: Extract<Endpoint, { kind: 'terminal' }>, allowPin = false): Port | 'unknown' | undefined => {
    const d = byId.get(e.device.value);
    if (!d) {
      const near = suggest(e.device.value, [...byId.keys()]);
      error('unknown-device', `機器 ${e.device.value} が宣言されていません${near.length ? `（もしかして: ${near.join('、')}）` : ''}`, e.device.span);
      return undefined;
    }
    const r = resolved.get(d.id);
    if (!r) return 'unknown';
    const t = r.terminal(e.terminal.value);
    if (t) return t;
    const pin = r.pin(e.terminal.value);
    if (pin && allowPin) return pin;
    if (pin) {
      const connector = r.terminals.find((x) => x.connector && e.terminal.value.startsWith(`${x.id}#`));
      error(
        'pin-wire',
        `${d.id}.${e.terminal.value} はコネクタのピンで、電線を直接つなげません${connector ? `（コネクタ ${d.id}.${connector.id} をケーブルで変換端子台などへつなぎ、その端子に電線をつなぎます）` : ''}`,
        e.terminal.span,
      );
      return undefined;
    }
    const ids = r.terminals.map((x) => x.id);
    const near = suggest(e.terminal.value, allowPin ? [...ids, ...r.pins.map((x) => x.id)] : ids);
    const list = ids.length > 40 ? `${ids.slice(0, 40).join('、')} など ${ids.length} 個` : ids.join('、');
    error(
      'unknown-terminal',
      `${d.id}（${r.def.model}）に端子 ${e.terminal.value} はありません${near.length ? `（もしかして: ${near.join('、')}）` : ''}。端子: ${list || 'なし'}`,
      e.terminal.span,
    );
    return undefined;
  };

  for (const c of comments) {
    if (c.target.kind !== 'terminal') {
      error('invalid-comment', 'comment はリンクには書けません（機器名.端子ID に書きます）', c.target.span);
      continue;
    }
    if (!findPort(c.target, true)) continue;
    const d = byId.get(c.target.device.value)!;
    d.comments = { ...d.comments, [c.target.terminal.value]: c.text.value };
  }

  // ---- 配線 ----
  const wires: DiagramWire[] = [];
  const pairSeen = new Map<string, Span>();
  let wireCount = 0;
  const linkIds = () => devices.map((d) => d.id);

  /** リンクの機器を、相手の端子の近く（電線が出る向きの先）に置く */
  const placeLink = (type: string, name: string, peer: TerminalRef | undefined, sheet: string | undefined, span: Span): string => {
    const def = lookup(type)!;
    const id = nextDeviceId(def.labelPrefix, linkIds());
    const host = peer && byId.get(peer.device);
    const term = host && resolved.get(host.id)?.terminal(peer!.terminal);
    const side: TerminalSide = term?.side ?? 'right';
    const p = host && term ? { x: host.x + term.x, y: host.y + term.y } : { x: 0, y: 0 };
    const W = def.width;
    const H = def.height;
    let x = side === 'left' ? p.x - 50 - W : side === 'right' ? p.x + 50 : p.x + 26;
    let y = side === 'top' ? p.y - 50 - H : side === 'bottom' ? p.y + 50 : p.y - H / 2;
    const sid = host ? sheetIdOf(host) : (sheet ?? sheets[0]?.id ?? '');
    const rects = devices.filter((o) => sheetIdOf(o) === sid).map((o) => ({ x: o.x, y: o.y, ...sizeOf(o) }));
    const hits = (yy: number) => rects.some((r) => x < r.x + r.width + 8 && x + W + 8 > r.x && yy < r.y + r.height + 6 && yy + H + 6 > r.y);
    const step = (side === 'top' ? -1 : 1) * (H + 18);
    for (let i = 0; i < 60 && hits(y); i++) y += step;
    x = Math.round(x);
    y = Math.round(y);
    const device: DiagramDevice = { id, type, x, y, params: { name, side: 'auto' }, ...(host?.sheet ? { sheet: host.sheet } : !host && sheet ? { sheet } : {}) };
    devices.push(device);
    byId.set(id, device);
    resolved.set(id, resolveDevice(def, device.params));
    map.devices.set(id, span);
    return id;
  };

  for (const { stmt, props: outer, sheet } of chains) {
    const props = applyAttrs(outer, stmt.attrs);
    // 端子を解決する（リンクは相手が決まってから機器にする）
    type Node = { e: Endpoint; ref?: TerminalRef; port?: Port; ok: boolean };
    const groups: Node[][] = stmt.groups.map((g) =>
      g.endpoints.map((e): Node => {
        if (e.kind === 'link') return { e, ok: true };
        const port = findPort(e);
        return { e, ok: !!port, ref: { device: e.device.value, terminal: e.terminal.value }, ...(port && port !== 'unknown' ? { port } : {}) };
      }),
    );
    const linkDevice = new Map<Endpoint, string>();
    /** リンクの種類は、つなぐ相手で決まる（エアのポート → エアのリンク、LAN の通信ポート → ネットワークリンク） */
    const linkTypeFor = (peer: Node): string => (peer.port?.role === 'air' ? AIR_LINK_TYPE : peer.port && isLanPort(peer.port.connector) ? NET_LINK_TYPE : LINK_TYPE);
    const refOfLink = (n: Node, peer: Node): TerminalRef | undefined => {
      if (n.e.kind !== 'link') return n.ref;
      let id = linkDevice.get(n.e);
      const type = peer.e.kind === 'link' ? LINK_TYPE : linkTypeFor(peer);
      if (!id) {
        if (!lookup(type)) {
          error('unknown-device', `リンクの機器定義（${type}）が機器カタログにありません`, n.e.span);
          return undefined;
        }
        id = placeLink(type, n.e.name.value, peer.e.kind === 'link' ? undefined : peer.ref, sheet, n.e.span);
        linkDevice.set(n.e, id);
      } else if (byId.get(id)!.type !== type && peer.e.kind !== 'link') {
        error('link-kind', `リンク <${n.e.name.value}> に、電線・LAN ケーブル・チューブを混ぜてつないでいます`, n.e.span);
        return undefined;
      }
      const def = lookup(byId.get(id)!.type)!;
      return { device: id, terminal: def.netLabel?.terminal ?? 'T' };
    };

    for (let g = 0; g + 1 < groups.length; g++) {
      const a = groups[g];
      const b = groups[g + 1];
      if (a.length !== b.length && a.length !== 1 && b.length !== 1) {
        error('width-mismatch', `-- の左は ${a.length} 本、右は ${b.length} 本で、本数が合いません（同じ本数どうし、または片方が 1 本のときにつなげます）`, {
          start: stmt.groups[g].span.start,
          end: stmt.groups[g + 1].span.end,
        });
        continue;
      }
      const n = Math.max(a.length, b.length);
      if (stmt.labels.length > 1 && stmt.labels.length !== n) {
        error('width-mismatch', `線番が ${stmt.labels.length} 個、電線が ${n} 本で、数が合いません`, { start: stmt.labels[0].span.start, end: stmt.labels[stmt.labels.length - 1].span.end });
      }
      for (let i = 0; i < n; i++) {
        const na = a[a.length === 1 ? 0 : i];
        const nb = b[b.length === 1 ? 0 : i];
        if (!na.ok || !nb.ok) continue;
        if (na.e.kind === 'link' && nb.e.kind === 'link' && na.e === nb.e) continue;
        const from = refOfLink(na, nb);
        const to = refOfLink(nb, na);
        if (!from || !to) continue;
        const span: Span = { start: na.e.span.start, end: nb.e.span.end };
        if (refKey(from) === refKey(to)) {
          error('self-wire', `${from.device}.${from.terminal} を同じ端子につないでいます`, span);
          continue;
        }
        const pair = [refKey(from), refKey(to)].sort().join('\u0001');
        const dup = pairSeen.get(pair);
        if (dup && na.e.kind !== 'link' && nb.e.kind !== 'link') {
          report('warning', 'duplicate-wire', `${from.device}.${from.terminal} と ${to.device}.${to.terminal} は ${dup.start.line} 行目でもつないでいます`, span);
        }
        pairSeen.set(pair, span);

        // 相手の種類: リンクのときは、リンクの機器の端子で見る
        const portOf = (r: TerminalRef) => resolved.get(r.device)?.terminal(r.terminal) ?? resolved.get(r.device)?.pin(r.terminal);
        const pa = portOf(from);
        const pb = portOf(to);
        const tube = pa?.role === 'air' && pb?.role === 'air';
        // 線番: 文の線番 > wire ブロックの no= > リンクの名前（リンクにつなぐ電線・ケーブルは、書かなければリンクと同じ線番。チューブには付けない）
        const linkNo = tube ? undefined : na.e.kind === 'link' ? na.e.name.value : nb.e.kind === 'link' ? nb.e.name.value : undefined;
        const no = stmt.labels.length ? stmt.labels[stmt.labels.length === 1 ? 0 : Math.min(i, stmt.labels.length - 1)].value || undefined : (props.no ?? linkNo) || undefined;
        const id = `W${++wireCount}`;
        let wire: DiagramWire;
        if (tube) {
          if (props.od !== undefined && !TUBE_ODS.includes(props.od)) report('warning', 'tube-size', `チューブの外径 ${props.od}mm は選べません（${TUBE_ODS.join('、')}）`, span);
          wire = {
            id,
            from,
            to,
            ...(no ? { wireNo: no } : {}),
            color: props.color && TUBE_COLORS.some((c) => c.id === props.color) ? props.color : DEFAULT_TUBE.color,
            sizeSq: 0,
            wireType: props.type && isTubeType(props.type) ? props.type : DEFAULT_TUBE.wireType,
            ...(props.od ? { tubeOD: props.od } : {}),
          };
        } else if (pa?.role === 'connector' && pb?.role === 'connector') {
          wire = { id, from, to, ...(no ? { wireNo: no } : {}), color: 'black', sizeSq: 0, wireType: CABLE_WIRE_TYPE, ...(props.cable ? { cable: props.cable } : {}) };
        } else {
          const wireType = props.type && !isTubeType(props.type) && props.type !== CABLE_WIRE_TYPE ? props.type : DEFAULT_WIRE.wireType;
          const sizeSq = props.size ?? DEFAULT_WIRE.sizeSq;
          const spec = WIRE_TYPES.find((t) => t.id === wireType);
          if (props.size !== undefined && spec && !spec.sizes.includes(sizeSq)) {
            report('warning', 'wire-size', `${wireType} に ${sizeSq}sq はありません（${spec.sizes.join('、')}）`, span);
          }
          wire = {
            id,
            from,
            to,
            ...(no ? { wireNo: no } : {}),
            color: props.color && WIRE_COLORS.some((c) => c.id === props.color) ? props.color : DEFAULT_WIRE.color,
            sizeSq,
            wireType,
            ...(props.from ? { fromTermination: props.from } : {}),
            ...(props.to ? { toTermination: props.to } : {}),
          };
        }
        wires.push(wire);
        map.wires.set(id, span);
      }
    }
  }

  // ---- 図面データにまとめる ----
  let diagram: Diagram = {
    devices,
    wires,
    ...(Object.keys(settings).length ? { settings } : {}),
    ...(sheets.length ? { sheets } : {}),
  };
  diagram = normalizeTubes(diagram, lookup);
  diagram = splitCrossSheets(diagram, lookup, map);
  if (base) diagram = inheritFromBase(diagram, base, map, lookup);

  return { diagram, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error'), map };
}

/**
 * シートをまたぐ電線をリンクの組に置き換え、置き換えでできた電線・リンクにも元の文の位置と端末処理を引き継ぐ
 * （チェックの指摘をソースの行に戻せるようにする）。
 *
 * 置き換えでできる電線は「元の電線の端子（from）— リンク」。元の電線 1 本につき、両端に 1 本ずつできる。
 * どの元の電線からできたかは、端子・属性（線番・種類・太さ・色）と、同じ名前のリンクの相手側の端子で見分ける
 * （同じ端子からシートをまたぐ電線が何本も出ているとき、それぞれの行に戻すため）。
 */
function splitCrossSheets(d: Diagram, lookup: DefLookup, map: SourceMap): Diagram {
  const out = splitCrossSheetWires(d, lookup);
  if (out === d) return d;
  const before = new Map(d.wires.map((w) => [w.id, w]));
  const after = new Map(out.wires.map((w) => [w.id, w]));
  const oldDevices = new Set(d.devices.map((x) => x.id));
  const isNew = (w: DiagramWire) => !before.has(w.id) || !sameWire(before.get(w.id)!, w);
  const removed = d.wires.filter((w) => !after.has(w.id) || !sameWire(w, after.get(w.id)!));
  // 置き換えでできた電線は、なくなった電線の ID を使い回すことがある。元の位置は先に控えておく
  const spans = new Map(removed.map((r) => [r.id, map.wires.get(r.id)]));
  for (const r of removed) map.wires.delete(r.id);

  const devices = new Map(out.devices.map((x) => [x.id, x]));
  const linkKeyOf = (w: DiagramWire) => {
    const link = devices.get(w.to.device);
    const label = link && lookup(link.type)?.netLabel;
    return link && label ? `${link.type}\u0000${String(link.params?.[label.param] ?? '')}` : '';
  };
  const created = out.wires.filter(isNew);
  /** リンクの名前 → その名前のリンクにつないだ、置き換えでできた電線の端子 */
  const endsByLink = new Map<string, Set<string>>();
  for (const w of created) {
    const k = linkKeyOf(w);
    if (!endsByLink.has(k)) endsByLink.set(k, new Set());
    endsByLink.get(k)!.add(refKey(w.from));
  }
  const sameAttrs = (a: DiagramWire, b: DiagramWire) => (a.wireNo ?? '') === (b.wireNo ?? '') && a.wireType === b.wireType && a.sizeSq === b.sizeSq && a.color === b.color;
  /** 元の電線ごとの、対応づけ済みの端子 */
  const usedEnds = new Map<string, Set<string>>();
  const fixed = new Map<string, DiagramWire>();
  for (const w of created) {
    const end = refKey(w.from);
    const partners = endsByLink.get(linkKeyOf(w)) ?? new Set<string>();
    const other = (r: DiagramWire) => (refKey(r.from) === end ? refKey(r.to) : refKey(r.from));
    const candidates = removed.filter((r) => (refKey(r.from) === end || refKey(r.to) === end) && !usedEnds.get(r.id)?.has(end));
    const src =
      candidates.find((r) => sameAttrs(r, w) && partners.has(other(r))) ?? candidates.find((r) => sameAttrs(r, w)) ?? candidates.find((r) => partners.has(other(r))) ?? candidates[0];
    if (!src) continue;
    if (!usedEnds.has(src.id)) usedEnds.set(src.id, new Set());
    usedEnds.get(src.id)!.add(end);
    const span = spans.get(src.id);
    if (span) {
      map.wires.set(w.id, span);
      for (const r of [w.from, w.to]) if (!oldDevices.has(r.device) && !map.devices.has(r.device)) map.devices.set(r.device, span);
    }
    // 元の電線の、この端子の側の端末処理を引き継ぐ（置き換えでは引き継がれないため）
    const termination = refKey(src.from) === end ? src.fromTermination : src.toTermination;
    if (termination) fixed.set(w.id, { ...w, fromTermination: termination });
  }
  return fixed.size ? { ...out, wires: out.wires.map((w) => fixed.get(w.id) ?? w) } : out;
}

const sameWire = (a: DiagramWire, b: DiagramWire) => refKey(a.from) === refKey(b.from) && refKey(a.to) === refKey(b.to);
