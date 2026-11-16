/**
 * 配線言語（.cnk）の入力候補（エディタの補完）。
 *
 * カーソルのある行の、カーソルより前の文字から「いま何を書いているか」を決め、候補を返す。
 * - `名前 = ▮`               機器種別（機器名の接頭辞が合う機種を先に。名前・型式・メーカーでも探せる）
 * - `名前 = 種別(▮`          パラメータ名、`キー=▮` ならその選択肢
 * - `機器名.▮`、`機器名.[▮`  その機器の端子 ID（呼び名・つながっているか）
 * - `-- ▮`、`線番: ▮`、行頭  宣言した機器名、リンク `<名前>`（行頭では キーワード・新しい機器名も）
 * - 電線の後ろ・`wire ▮`     電線の属性（色・太さ・種類・端末処理・チューブ外径、`no=` など）
 * - `<▮`                     使っているリンクの名前
 *
 * エディタの部品（CodeMirror）には依存しない。候補はここで絞り込み、並べた順に出す。
 */
import { CABLE_SPECS } from '../data/cables';
import { TERMINATIONS } from '../data/terminations';
import { TUBE_ODS, TUBE_TYPES } from '../data/tubes';
import { allowableCurrent, WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import { resolveDevice, type ResolvedDevice } from '../devices/resolve';
import { paramOptions, type DeviceDefinition, type TerminalDef } from '../devices/types';
import { computeBus, effectiveParams } from '../model/bus';
import { CABLE_WIRE_TYPE } from '../model/diagram';
import { compile, type DefLookup } from './compile';
import { isBareWord, quoteWord } from './lexer';

export type CompletionKind = 'device' | 'type' | 'terminal' | 'param' | 'value' | 'attr' | 'keyword' | 'link' | 'new';

export interface CompletionItem {
  /** 候補の一覧に出す文字 */
  label: string;
  /** 候補の右に出す短い説明 */
  detail?: string;
  kind: CompletionKind;
  /** 選んだときに入れる文字（省略時は label） */
  apply?: string;
  /** 選んだあと、続けて次の候補を出す（機器名を選んだら端子、パラメータ名を選んだら値） */
  retrigger?: boolean;
}

export interface CompletionResult {
  /** 置き換える範囲（ソースの文字位置。UTF-16 の単位） */
  from: number;
  to: number;
  items: CompletionItem[];
}

export interface CompletionOptions {
  lookup: DefLookup;
  defs: DeviceDefinition[];
  /** 自分で候補を呼び出した（Ctrl+Space）。false のときは、何も書いていない行頭では候補を出さない */
  explicit?: boolean;
}

/** ソースで宣言した機器（端子の候補に使う） */
interface Analysis {
  devices: Map<string, { def: DeviceDefinition; r: ResolvedDevice; wired: Set<string>; note?: string }>;
  /** 使っているリンクの名前（種類ごとではなく、まとめて） */
  links: string[];
  /** 宣言したすべての機器名（機器種別が分からない機器も含む。新しい機器名を重ねないため） */
  names: Set<string>;
}

/** 最大の候補数（一覧の描画が重くならないように） */
const MAX_ITEMS = 150;

const KEYWORDS: CompletionItem[] = [
  { label: 'wire', detail: '電線の既定（wire KIV 2sq black { … }）', kind: 'keyword', apply: 'wire ', retrigger: true },
  { label: 'sheet', detail: 'シート（sheet "主回路" { … }）', kind: 'keyword', apply: 'sheet ' },
  { label: 'comment', detail: '端子のコメント（comment IN1.CN1#1 "…"）', kind: 'keyword', apply: 'comment ', retrigger: true },
  { label: 'title', detail: '図面名', kind: 'keyword', apply: 'title "' },
  { label: 'author', detail: '作成者', kind: 'keyword', apply: 'author "' },
  { label: 'revision', detail: '版', kind: 'keyword', apply: 'revision "' },
  { label: 'requiredPL', detail: '要求パフォーマンスレベル（a〜e）', kind: 'keyword', apply: 'requiredPL ', retrigger: true },
];

/** 補完に使う解析の結果。打っている行だけが変わるあいだは使い回す（キーを押すたびにコンパイルし直さない） */
let cache: { key: string; defs: DeviceDefinition[]; analysis: Analysis } | undefined;

function analyze(source: string, offset: number, options: CompletionOptions): Analysis {
  // いま打っている行を空にしたソースを解析する。それが同じあいだは前の結果を使う
  // （打っている行の書きかけの電線を「接続済み」に数えず、キャッシュの中身もキーと必ず合うように、空にしたソースのほうをコンパイルする）
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = source.indexOf('\n', offset);
  const key = source.slice(0, lineStart) + source.slice(lineEnd < 0 ? source.length : lineEnd);
  if (cache && cache.key === key && cache.defs === options.defs) return cache.analysis;

  const { diagram } = compile(key, { lookup: options.lookup, defs: options.defs });
  const bus = computeBus(diagram.devices, options.lookup);
  const wired = new Map<string, Set<string>>();
  for (const w of diagram.wires) {
    for (const r of [w.from, w.to]) {
      if (!wired.has(r.device)) wired.set(r.device, new Set());
      wired.get(r.device)!.add(r.terminal);
    }
  }
  const devices: Analysis['devices'] = new Map();
  const links = new Set<string>();
  for (const d of diagram.devices) {
    const def = options.lookup(d.type);
    if (!def) continue;
    if (def.netLabel) {
      const name = String(d.params?.[def.netLabel.param] ?? '').trim();
      if (name) links.add(name);
    }
    devices.set(d.id, { def, r: resolveDevice(def, effectiveParams(d, bus)), wired: wired.get(d.id) ?? new Set(), note: d.note });
  }
  const analysis = { devices, links: [...links].sort(), names: new Set(diagram.devices.map((d) => d.id)) };
  cache = { key, defs: options.defs, analysis };
  return analysis;
}

/** 大文字・小文字を区別しない比較のための正規化 */
const norm = (s: string) => s.toLowerCase();

/**
 * 打った文字で候補を絞り、合い方の順に並べる（先頭が合うもの → 途中に含むもの）。
 * keys は候補ごとの照らし合わせる文字（先頭が label、続いて説明など）。何も打っていなければ、そのままの順
 */
function rank<T>(items: T[], typed: string, keys: (item: T) => string[]): T[] {
  const q = norm(typed);
  if (!q) return items.slice(0, MAX_ITEMS);
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const [main, ...rest] = keys(item).map(norm);
    // 1 文字だけ打ったときは、先頭が合うものだけ（途中や説明に含むものまで出すと多すぎる）
    let score = -1;
    if (main.startsWith(q)) score = 0;
    else if (q.length < 2) score = -1;
    else if (main.includes(q)) score = 1;
    else if (rest.some((k) => k.includes(q))) score = 2;
    if (score >= 0) scored.push({ item, score, i });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, MAX_ITEMS)
    .map((x) => x.item);
}

/** カーソルより前の行が、コメントの中か・文字列の中か */
function lineState(prefix: string): 'code' | 'comment' | 'string' {
  let quoted = false;
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i];
    if (quoted) {
      if (c === '\\') i++;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if ((c === '#' || (c === '/' && prefix[i + 1] === '/')) && (i === 0 || /[\s　]/.test(prefix[i - 1]))) return 'comment';
  }
  return quoted ? 'string' : 'code';
}

/** 閉じていない [ の数（引用符の中は数えない） */
function openBrackets(text: string): number {
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '\\') i++;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && depth > 0) depth--;
  }
  return depth;
}

/** 引用符の外にある、いちばん後ろの { か } の位置（なければ -1） */
function lastBrace(text: string): number {
  let at = -1;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '\\') i++;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '}') at = i;
  }
  return at;
}

export function complete(source: string, offset: number, options: CompletionOptions): CompletionResult | null {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const line = source.slice(lineStart, offset);
  if (lineState(line) !== 'code') return null;
  // 1 行に書いたブロック（`PLC1 = … { IN1 = ▮`、`wire KIV { A.1 -- ▮`）は、ブロックの中の文から見る
  const prefix = line.slice(lastBrace(line) + 1);
  const result = (word: string, items: CompletionItem[]): CompletionResult | null => (items.length ? { from: offset - word.length, to: offset, items } : null);

  // ---- リンク <名前 ----
  const link = /<([^<>"]*)$/.exec(prefix);
  if (link) {
    const a = analyze(source, offset, options);
    return result(
      link[1],
      rank(a.links, link[1], (n) => [n]).map((n) => ({ label: `<${n}>`, apply: `${n}>`, detail: 'リンク', kind: 'link' as const })),
    );
  }

  // ---- 機器の宣言: 名前 = 種別(パラメータ) … ----
  const decl = /^\s*("(?:[^"\\]|\\.)*"|[^\s"=:[\]{}()<>,]+)\s*=\s*(.*)$/.exec(prefix);
  if (decl) {
    const name = decl[1].replace(/^"|"$/g, '');
    const rest = decl[2];
    // 機器種別を書く位置。空白を含む語（「三菱 漏電」）でも探せるよう、最初の語が機器種別でないあいだは全体を検索の語にする
    const firstWord = /^\S*/.exec(rest)![0];
    if (!/[("]/.test(rest) && (!/\s/.test(rest) || !options.lookup(firstWord))) return result(rest, deviceTypes(rest, name, options.defs));
    const inParams = /^([^\s(]+)\(([^)]*)$/.exec(rest);
    if (inParams) {
      const def = options.lookup(inParams[1]);
      if (!def) return null;
      const segment = inParams[2].slice(inParams[2].lastIndexOf(',') + 1).replace(/^\s+/, '');
      const eq = segment.indexOf('=');
      if (eq < 0) return result(segment, paramKeys(def, segment, inParams[2]));
      const key = segment.slice(0, eq).trim();
      const typed = segment.slice(eq + 1).replace(/^\s+/, '');
      return result(typed, paramValues(def, key, typed));
    }
    const after = /^[^\s(]+(?:\([^)]*\))?\s+(.*)$/.exec(rest);
    if (after) {
      const on = /(?:^|\s)on\s+([^\s]*)$/.exec(after[1]);
      if (on) {
        const a = analyze(source, offset, options);
        return result(on[1], deviceNames(a, on[1], false).filter((x) => x.label !== name));
      }
      const word = /([^\s"]*)$/.exec(after[1])![1];
      return result(
        word,
        rank(
          [
            { label: 'at', detail: 'キャンバス上の位置（at x,y）', kind: 'keyword' as const, apply: 'at ' },
            { label: 'on', detail: '装着先の機器（on PLC1）', kind: 'keyword' as const, apply: 'on ', retrigger: true },
            { label: 'slot', detail: '装着する位置（1 から）', kind: 'keyword' as const, apply: 'slot ' },
          ],
          word,
          (x) => [x.label],
        ),
      );
    }
    return null;
  }

  // ---- 設定 ----
  const pl = /^\s*requiredPL\s+(\S*)$/.exec(prefix);
  if (pl) return result(pl[1], ['a', 'b', 'c', 'd', 'e'].filter((x) => x.startsWith(pl[1])).map((x) => ({ label: x, detail: `PL ${x}`, kind: 'value' as const })));
  if (/^\s*(title|author|revision|sheet)\s/.test(prefix)) return null;

  // ---- 同じ機器の端子の並び 機器名.[…, ▮ ----
  const vector = /([^\s[\],:"<>.]+)\.\[([^\]]*)$/.exec(prefix);
  if (vector) {
    const a = analyze(source, offset, options);
    const d = a.devices.get(vector[1]);
    if (!d) return null;
    const typed = vector[2].slice(vector[2].lastIndexOf(',') + 1).replace(/^\s+/, '');
    return result(typed, terminals(d, typed, false));
  }

  // ---- いま打っている単語と、その前 ----
  const word = /([^\s,[\]:]*)$/.exec(prefix)![1];
  const before = prefix.slice(0, prefix.length - word.length);
  const head = before.trim();
  const isComment = /^comment$/.test(head);

  // 機器名.端子
  const dot = word.indexOf('.');
  if (dot > 0 && !word.startsWith('<')) {
    const a = analyze(source, offset, options);
    const d = a.devices.get(word.slice(0, dot));
    if (d) {
      const typed = word.slice(dot + 1);
      return result(typed, terminals(d, typed, isComment));
    }
  }

  // 属性の値 key=…
  const kv = /^(no|color|size|type|od|cable|from|to|end)=(.*)$/.exec(word);
  if (kv) return result(kv[2], attrValues(kv[1], kv[2]));

  // wire の見出し
  if (/^\s*wire\b/.test(before)) return result(word, attributes(word, prefix));

  // 端子を書く位置: 行頭・-- の後・線番: の後・[ の後・並びの , の後・comment の後
  const endpointPos =
    head === '' ||
    isComment ||
    /(^|\s)--$/.test(head) ||
    /:$/.test(head) ||
    (openBrackets(before) > 0 && /[[,]$/.test(head));
  if (endpointPos) {
    if (head === '' && !word && !options.explicit) return null;
    const a = analyze(source, offset, options);
    const items: CompletionItem[] = [];
    if (head === '') {
      items.push(...rank(KEYWORDS, word, (x) => [x.label]));
      items.push(...newDeviceNames(word, a, options.defs));
    }
    items.push(...deviceNames(a, word, true));
    if (!isComment) items.push(...rank(a.links, word.replace(/^</, ''), (n) => [n]).map((n) => ({ label: `<${n}>`, detail: 'リンク', kind: 'link' as const })));
    return result(word, items);
  }

  // 電線の後ろ（-- のある行）: 属性
  if (/(^|\s)--(\s|$)/.test(before)) return result(word, attributes(word, prefix));
  // 端子を 1 つ書いたところ: -- を出す
  if (head && !/^comment\b/.test(head) && /\s$/.test(before) && /^-{0,2}$/.test(word)) return result(word, [{ label: '--', detail: '電線でつなぐ', kind: 'keyword', apply: '-- ', retrigger: true }]);
  return null;
}

/** 機器種別の候補。宣言する機器名の接頭辞（ELB1 → ELB）が機種の接頭辞と合うものを先に出す */
function deviceTypes(typed: string, name: string, defs: DeviceDefinition[]): CompletionItem[] {
  const prefix = /^[A-Za-z]+/.exec(name)?.[0]?.toUpperCase() ?? '';
  const sorted = [...defs].sort((a, b) => {
    const pa = prefix && a.labelPrefix.toUpperCase() === prefix ? 0 : 1;
    const pb = prefix && b.labelPrefix.toUpperCase() === prefix ? 0 : 1;
    return pa - pb || (a.type < b.type ? -1 : a.type > b.type ? 1 : 0);
  });
  // 空白で区切った語をすべて含むもの（「三菱 漏電」のようにも探せる）
  const terms = norm(typed).split(/\s+/).filter(Boolean);
  const hay = (d: DeviceDefinition) => norm([d.type, d.model, d.name, d.maker ?? '', d.category].join(' '));
  const hits = terms.length > 1 ? sorted.filter((d) => terms.every((t) => hay(d).includes(t))) : rank(sorted, typed, (d) => [d.type, d.model, d.name, d.maker ?? '', d.category]);
  return hits.slice(0, MAX_ITEMS).map((d) => ({ label: d.type, detail: `${d.name}（${d.model}）`, kind: 'type' as const }));
}

function paramKeys(def: DeviceDefinition, typed: string, written: string): CompletionItem[] {
  const used = new Set([...written.matchAll(/([^\s,=]+)\s*=/g)].map((m) => m[1]));
  const params = (def.params ?? []).filter((p) => !used.has(p.key));
  return rank(params, typed, (p) => [p.key, p.label]).map((p) => {
    const choices = p.input === 'text' ? '自由に入力' : p.options.map((o) => String(o.value)).join(', ');
    return { label: p.key, detail: `${p.label}${p.unit ? ` [${p.unit}]` : ''} 既定 ${p.default}（${choices}）`.slice(0, 90), kind: 'param' as const, apply: `${p.key}=`, retrigger: p.input !== 'text' };
  });
}

function paramValues(def: DeviceDefinition, key: string, typed: string): CompletionItem[] {
  const p = def.params?.find((x) => x.key === key);
  if (!p || p.input === 'text') return [];
  // ほかのパラメータの値で変わる選択肢もあるが、ここでは既定値での選択肢を出す（選べない値はコンパイルで指摘する）
  const options = paramOptions(def, p, undefined);
  return rank(options, typed, (o) => [String(o.value), o.label ?? '']).map((o) => ({
    label: String(o.value),
    apply: quoteWord(String(o.value)),
    detail: `${o.label ?? `${o.value}${p.unit ?? ''}`}${o.value === p.default ? '（既定）' : ''}`,
    kind: 'value' as const,
  }));
}

/** 宣言した機器名（選ぶと「機器名.」まで入れ、続けて端子を出す） */
function deviceNames(a: Analysis, typed: string, withDot: boolean): CompletionItem[] {
  const list = [...a.devices.entries()].filter(([, d]) => !d.def.netLabel);
  return rank(list, typed, ([id, d]) => [id, d.def.name, d.note ?? '']).map(([id, d]) => ({
    label: id,
    detail: `${d.def.name}（${d.def.model}）${d.note ? ` ${d.note}` : ''}`,
    kind: 'device' as const,
    apply: withDot ? `${quoteWord(id)}.` : quoteWord(id),
    retrigger: withDot,
  }));
}

/** 行頭で、機種の接頭辞を打ったときの新しい機器名（ELB → ELB2 = ）。選ぶと続けて機器種別を出す */
function newDeviceNames(typed: string, a: Analysis, defs: DeviceDefinition[]): CompletionItem[] {
  const t = /^[A-Za-z]+/.exec(typed)?.[0];
  if (!t || t !== typed) return [];
  const prefixes = [...new Set(defs.filter((d) => !d.netLabel).map((d) => d.labelPrefix))].filter((p) => p.toUpperCase().startsWith(t.toUpperCase())).sort();
  return prefixes.slice(0, 8).map((p) => {
    let n = 1;
    while (a.names.has(`${p}${n}`)) n++;
    return { label: `${p}${n} =`, detail: '新しい機器を宣言', kind: 'new' as const, apply: `${p}${n} = `, retrigger: true };
  });
}

const ROLE_NAMES: Record<string, string> = {
  line: '一次側',
  load: '二次側',
  pass: '中継',
  supply: '電源出力',
  input: '受電',
  ground: '接地',
  signal: '信号',
  connector: 'コネクタ',
  air: 'エア',
};

/** 機器の端子（comment のときはコネクタのピンも） */
function terminals(d: { def: DeviceDefinition; r: ResolvedDevice; wired: Set<string> }, typed: string, withPins: boolean): CompletionItem[] {
  const list: Pick<TerminalDef, 'id' | 'label' | 'note' | 'hint' | 'role'>[] = [...d.r.terminals, ...(withPins ? d.r.pins : [])];
  return rank(list, typed, (t) => [t.id, t.label ?? '', t.hint ?? '', t.note ?? '']).map((t) => {
    // 役割・印字・呼び名を、同じ言葉が重ならないように並べる（「一次側 一次側」にしない）
    const parts: string[] = [];
    for (const x of [ROLE_NAMES[t.role] ?? t.role, t.label && t.label !== t.id ? t.label : '', t.hint ?? t.note ?? '']) {
      if (x && !parts.some((p) => p.includes(x) || x.includes(p))) parts.push(x);
      else if (x && parts.some((p) => x.includes(p) && x !== p)) parts.splice(parts.findIndex((p) => x.includes(p)), 1, x);
    }
    return {
      label: t.id,
      apply: quoteWord(t.id),
      detail: `${parts.join(' ')}${d.wired.has(t.id) ? '（接続済み）' : ''}`.slice(0, 80),
      kind: 'terminal' as const,
    };
  });
}

/** 行に書いた電線の種類（太さの候補の許容電流に使う）。なければ KIV */
function wireTypeIn(prefix: string): string {
  const words = prefix.split(/\s+/);
  return [...words].reverse().find((w) => WIRE_TYPES.some((t) => t.id === w)) ?? (/\btype=(\S+)/.exec(prefix)?.[1] ?? 'KIV');
}

function attributes(typed: string, prefix: string): CompletionItem[] {
  const type = WIRE_TYPES.find((t) => t.id === wireTypeIn(prefix)) ?? WIRE_TYPES[0];
  const items: CompletionItem[] = [
    ...WIRE_COLORS.map((c) => ({ label: c.id, detail: `色 ${c.name}`, kind: 'attr' as const })),
    ...type.sizes.map((s) => {
      const amps = allowableCurrent(type.id, s);
      return { label: `${s}sq`, detail: `太さ（${type.id}${amps ? ` 許容電流 ${amps}A` : ''}）`, kind: 'attr' as const };
    }),
    ...WIRE_TYPES.map((t) => ({ label: t.id, detail: t.description, kind: 'attr' as const })),
    ...TUBE_TYPES.map((t) => ({ label: t.id, detail: `チューブ ${t.name}`, kind: 'attr' as const })),
    ...TERMINATIONS.map((t) => ({ label: t.id, detail: `端末処理 ${t.name}`, kind: 'attr' as const })),
    ...TUBE_ODS.map((od) => ({ label: `${od}mm`, detail: 'チューブの外径', kind: 'attr' as const })),
    { label: 'no=', detail: '線番', kind: 'attr' },
    { label: 'cable=', detail: '変換ケーブルの種類', kind: 'attr', retrigger: true },
    { label: 'from=', detail: 'from 側の端末処理', kind: 'attr', retrigger: true },
    { label: 'to=', detail: 'to 側の端末処理', kind: 'attr', retrigger: true },
  ];
  return rank(items, typed, (x) => [x.label, x.detail ?? '']);
}

function attrValues(key: string, typed: string): CompletionItem[] {
  const list: CompletionItem[] =
    key === 'color'
      ? WIRE_COLORS.map((c) => ({ label: c.id, detail: c.name, kind: 'value' }))
      : key === 'type'
        ? [...WIRE_TYPES.map((t) => ({ label: t.id, detail: t.description, kind: 'value' as const })), { label: CABLE_WIRE_TYPE, detail: 'ケーブル', kind: 'value' as const }]
        : key === 'size'
          ? [...new Set(WIRE_TYPES.flatMap((t) => t.sizes))].sort((a, b) => a - b).map((s) => ({ label: String(s), detail: 'sq', kind: 'value' as const }))
          : key === 'od'
            ? TUBE_ODS.map((od) => ({ label: String(od), detail: 'mm', kind: 'value' as const }))
            : key === 'cable'
              ? CABLE_SPECS.map((c) => ({ label: c.id, apply: isBareWord(c.id) ? c.id : quoteWord(c.id), detail: c.name, kind: 'value' as const }))
              : key === 'no'
                ? []
                : TERMINATIONS.map((t) => ({ label: t.id, detail: t.name, kind: 'value' as const }));
  return rank(list, typed, (x) => [x.label, x.detail ?? '']);
}
