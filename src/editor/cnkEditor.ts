/**
 * 配線言語（.cnk）のエディタ部品（CodeMirror 6）: 色分け、入力候補、誤りの下線。
 *
 * 候補の中身は src/lang/complete.ts（エディタに依存しない）。ここではそれを CodeMirror の形にするだけ。
 */
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, insertCompletionText, startCompletion, type Completion, type CompletionSource } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, StreamLanguage, bracketMatching, indentUnit, syntaxHighlighting, type StringStream } from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { EditorState, type Extension, type Text } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { complete, type CompletionKind } from '../lang/complete';
import type { DefLookup, Diagnostic } from '../lang/compile';
import type { DeviceDefinition } from '../devices/types';
import type { Span } from '../lang/lexer';

/** 行の先頭に来るキーワード */
const STATEMENT_KEYWORDS = new Set(['wire', 'sheet', 'comment', 'title', 'author', 'revision', 'requiredPL']);
const DECL_KEYWORDS = new Set(['at', 'on', 'slot']);

interface LineState {
  /** 行の何番目の単語か */
  index: number;
  /** = の後（機器種別を書く位置） */
  afterEq: boolean;
  /** 機器種別の後（パラメータ・at・on・slot） */
  decl: boolean;
}

/** 色分けのための簡単な字句の読み方（構文の誤りはコンパイラが出すので、ここでは見た目だけ） */
const cnkLanguage = StreamLanguage.define<LineState>({
  name: 'cnk',
  startState: () => ({ index: 0, afterEq: false, decl: false }),
  copyState: (s) => ({ ...s }),
  token(stream: StringStream, state: LineState) {
    if (stream.sol()) Object.assign(state, { index: 0, afterEq: false, decl: false });
    if (stream.eatSpace()) return null;
    const first = state.index === 0;
    state.index++;
    if (stream.match('//') || stream.match('#')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.peek() === '"') {
      stream.next();
      let escaped = false;
      for (let c = stream.next(); c !== undefined && c !== null; c = stream.next()) {
        if (c === '"' && !escaped) break;
        escaped = c === '\\' && !escaped;
      }
      return 'string';
    }
    if (stream.match(/^<[^>\n]*>?/)) return 'atom';
    if (stream.match(/^--(?=\s|$)/)) return 'operator';
    if (stream.match(/^[{}[\](),:]/)) {
      return 'punctuation';
    }
    if (stream.match('=')) {
      if (state.index === 2) state.afterEq = true;
      return 'operator';
    }
    const word = stream.match(/^[^\s{}[\](),=:"<>]+/) as RegExpMatchArray | null;
    if (!word) {
      stream.next();
      return null;
    }
    const text = word[0];
    if (state.afterEq) {
      state.afterEq = false;
      state.decl = true;
      return 'typeName';
    }
    if (first && STATEMENT_KEYWORDS.has(text)) return 'keyword';
    if (state.decl && DECL_KEYWORDS.has(text)) return 'keyword';
    if (/^\d+(\.\d+)?(sq|mm)$/i.test(text) || /^-?\d+(\.\d+)?$/.test(text)) return 'number';
    // 宣言の機器名（次が =）
    if (first && /^\s*=/.test(stream.string.slice(stream.pos))) return 'definition';
    // 線番（次が :）
    if (/^\s*:/.test(stream.string.slice(stream.pos))) return 'labelName';
    const dot = text.indexOf('.');
    if (dot > 0) {
      // 機器名.端子ID は、機器名と端子 ID を分けて色を付ける
      stream.backUp(text.length - dot);
      state.index--;
      return 'variableName';
    }
    if (text.startsWith('.')) return 'propertyName';
    return null;
  },
  languageData: { commentTokens: { line: '//' } },
  tokenTable: { definition: tags.definition(tags.variableName) },
});

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6b7785', fontStyle: 'italic' },
  { tag: tags.string, color: '#0f766e' },
  { tag: tags.keyword, color: '#7c3aed', fontWeight: '600' },
  { tag: tags.operator, color: '#b45309', fontWeight: '600' },
  { tag: tags.typeName, color: '#1d4ed8' },
  { tag: tags.number, color: '#b45309' },
  { tag: tags.atom, color: '#2563eb', fontWeight: '600' },
  { tag: tags.definition(tags.variableName), color: '#111827', fontWeight: '700' },
  { tag: tags.variableName, color: '#111827' },
  { tag: tags.propertyName, color: '#9d174d' },
  { tag: tags.labelName, color: '#15803d', fontWeight: '600' },
]);

/** 候補の種類 → CodeMirror の候補のアイコンの種類 */
const ICON: Record<CompletionKind, string> = {
  device: 'variable',
  type: 'class',
  terminal: 'property',
  param: 'property',
  value: 'enum',
  attr: 'constant',
  keyword: 'keyword',
  link: 'text',
  new: 'function',
};

function completionSource(lookup: DefLookup, defs: DeviceDefinition[]): CompletionSource {
  return (ctx) => {
    const r = complete(ctx.state.doc.toString(), ctx.pos, { lookup, defs, explicit: ctx.explicit });
    if (!r) return null;
    return {
      from: r.from,
      to: r.to,
      // 絞り込みと並べ替えは complete() で済ませてある（名前・型式・呼び名でも探せるように）
      filter: false,
      options: r.items.map(
        (item): Completion => ({
          label: item.label,
          detail: item.detail,
          type: ICON[item.kind],
          apply: (view, _c, from, to) => {
            view.dispatch(insertCompletionText(view.state, item.apply ?? item.label, from, to));
            // 機器名を選んだら端子、パラメータ名を選んだら値、と続けて出す
            if (item.retrigger) window.setTimeout(() => startCompletion(view), 0);
          },
        }),
      ),
    };
  };
}

export interface CnkEditorOptions {
  doc: string;
  lookup: DefLookup;
  defs: DeviceDefinition[];
  onChange: (text: string) => void;
}

/** 配線言語のエディタの拡張一式 */
export function cnkExtensions({ lookup, defs, onChange }: Omit<CnkEditorOptions, 'doc'>): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    bracketMatching(),
    closeBrackets(),
    indentUnit.of('  '),
    EditorState.tabSize.of(2),
    cnkLanguage,
    syntaxHighlighting(highlight),
    // 候補の種類のアイコンは、日本語のフォントで記号が化けることがあるので出さない（説明の文字で分かる）
    autocompletion({ override: [completionSource(lookup, defs)], icons: false, maxRenderedOptions: 150, activateOnTypingDelay: 60 }),
    lintGutter(),
    keymap.of([...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onChange(u.state.doc.toString());
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: '12px', backgroundColor: '#fbfcfd' },
      '.cm-scroller': { fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace", lineHeight: '18px' },
      '.cm-gutters': { backgroundColor: '#f1f4f8', borderRight: '1px solid var(--border)', color: 'var(--muted)' },
      '.cm-activeLine': { backgroundColor: '#f3f6fb' },
      '.cm-activeLineGutter': { backgroundColor: '#e6ecf5' },
      '&.cm-focused': { outline: 'none' },
      '.cm-tooltip-autocomplete > ul': { fontFamily: "ui-monospace, 'Cascadia Code', monospace", maxHeight: '18em' },
      '.cm-tooltip-autocomplete .cm-completionDetail': { fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif", fontStyle: 'normal', color: 'var(--muted)', marginLeft: '1.2em' },
    }),
  ];
}

export function createCnkEditor(parent: HTMLElement, options: CnkEditorOptions): EditorView {
  return new EditorView({ parent, state: EditorState.create({ doc: options.doc, extensions: cnkExtensions(options) }) });
}

/** 行・桁（1 から。桁は文字数）を、文書の位置（UTF-16 の単位）にする */
export function offsetOf(doc: Text, line: number, col: number): number {
  const l = doc.line(Math.min(Math.max(line, 1), doc.lines));
  return l.from + Math.min([...l.text].slice(0, Math.max(col - 1, 0)).join('').length, l.length);
}

function rangeOf(doc: Text, span: Span): { from: number; to: number } {
  const from = offsetOf(doc, span.start.line, span.start.col);
  const to = Math.max(from, offsetOf(doc, span.end.line, span.end.col));
  return { from, to };
}

/** コンパイラの指摘を、エディタの下線と行の印にする */
export function showDiagnostics(view: EditorView, diagnostics: Diagnostic[]) {
  const doc = view.state.doc;
  const list: CmDiagnostic[] = diagnostics
    .filter((d): d is Diagnostic & { span: Span } => !!d.span)
    .map((d) => ({ ...rangeOf(doc, d.span), severity: d.severity, source: d.code, message: `${d.message}${d.estimated ? '（推定を含む）' : ''}` }));
  view.dispatch(setDiagnostics(view.state, list));
}

/** 指摘の位置を選んで、見えるところまで動かす */
export function revealSpan(view: EditorView, span: Span) {
  const { from, to } = rangeOf(view.state.doc, span);
  view.dispatch({ selection: { anchor: from, head: Math.max(to, from) }, scrollIntoView: true });
  view.focus();
}

/** 文書を入れ替える（「元に戻す」） */
export function replaceDoc(view: EditorView, text: string) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
