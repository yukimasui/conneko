/**
 * 配線言語（.cnk）の字句解析。
 *
 * 端子 ID には `1/L1`・`+V1`・`24V-`・`CN1#1`・`SW1.BN` のように記号が入るので、単語は「空白と区切り記号以外の並び」とする。
 * 区切り記号は `{ } [ ] ( ) , = :` と、文字列の `"`、リンクの `< >`。電線の演算子 `--` は、前後を空白で区切った単語として書く。
 */

export interface Pos {
  /** 行（1 から） */
  line: number;
  /** 桁（1 から。文字数） */
  col: number;
}

/** ソース上の範囲（end は範囲の次の位置） */
export interface Span {
  start: Pos;
  end: Pos;
}

export type TokenKind = 'word' | 'string' | 'link' | 'punct' | 'newline' | 'eof';

export interface Token {
  kind: TokenKind;
  /** 単語・文字列・リンク名の中身（引用符を外したもの）。punct は記号そのもの */
  text: string;
  span: Span;
  /** 単語のうち、引用符の外にある最初の `.` の位置（text の添字）。機器名と端子 ID の境目。なければ -1 */
  dot: number;
  /** 直前に空白・改行がある（`PS1.[R,S,T]` のように、単語にすぐ続く `[` を見分ける） */
  spaced: boolean;
}

export interface LexError {
  message: string;
  span: Span;
}

const PUNCT = new Set(['{', '}', '[', ']', '(', ')', ',', '=', ':']);
const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\r' || c === '　';
const isWordChar = (c: string) => !isSpace(c) && c !== '\n' && !PUNCT.has(c) && c !== '"' && c !== '<' && c !== '>';

export function lex(source: string): { tokens: Token[]; errors: LexError[] } {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  const chars = [...source];
  let i = 0;
  let line = 1;
  let col = 1;
  /** `[`・`(` の中では改行を文の区切りにしない */
  let depth = 0;
  let spaced = true;

  const pos = (): Pos => ({ line, col });
  const advance = () => {
    if (chars[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    i++;
  };
  const push = (kind: TokenKind, text: string, start: Pos, dot = -1) => {
    tokens.push({ kind, text, span: { start, end: pos() }, dot, spaced });
    spaced = false;
  };
  const skipLine = () => {
    while (i < chars.length && chars[i] !== '\n') advance();
  };

  /** 引用符で囲んだ部分を読む（開きの `"` の位置から）。`\"` と `\\` を解釈する */
  const readQuoted = (): string => {
    const start = pos();
    advance();
    let out = '';
    while (i < chars.length && chars[i] !== '"' && chars[i] !== '\n') {
      if (chars[i] === '\\' && (chars[i + 1] === '"' || chars[i + 1] === '\\')) advance();
      out += chars[i];
      advance();
    }
    if (chars[i] === '"') advance();
    else errors.push({ message: '文字列の閉じる " がありません', span: { start, end: pos() } });
    return out;
  };

  while (i < chars.length) {
    const c = chars[i];
    if (isSpace(c)) {
      advance();
      spaced = true;
      continue;
    }
    if (c === '\n') {
      const start = pos();
      advance();
      if (depth > 0) {
        // [ ] ( ) の中の改行は、並びの途中（直前が , か開き括弧、または次が , か閉じ括弧）のときだけ続きとして読む。
        // それ以外は括弧の閉じ忘れとみなして文を区切る（後ろの行を巻き込まず、その行の誤りとして出す）
        const prev = tokens[tokens.length - 1];
        // 次の字句の先頭を先読みする（空行とコメントだけの行は飛ばす）
        let j = i;
        for (;;) {
          while (j < chars.length && (isSpace(chars[j]) || chars[j] === '\n')) j++;
          if (chars[j] !== '#' && !(chars[j] === '/' && chars[j + 1] === '/')) break;
          while (j < chars.length && chars[j] !== '\n') j++;
        }
        const continues = (prev?.kind === 'punct' && (prev.text === ',' || prev.text === '[' || prev.text === '(')) || chars[j] === ',' || chars[j] === ']' || chars[j] === ')';
        if (!continues) depth = 0;
      }
      if (depth === 0) push('newline', '\n', start);
      spaced = true;
      continue;
    }
    // コメント: 単語の先頭の `//` と `#`（`CN1#1` や `1/L1` の途中のものはコメントにしない）
    if ((c === '/' && chars[i + 1] === '/') || c === '#') {
      skipLine();
      continue;
    }
    if (PUNCT.has(c)) {
      const start = pos();
      advance();
      if (c === '[' || c === '(') depth++;
      if ((c === ']' || c === ')') && depth > 0) depth--;
      // ブロックの括弧は [ ] ( ) の中には来ない。閉じ忘れが後ろの行を巻き込まないよう、ここで数え直す
      if (c === '{' || c === '}') depth = 0;
      push('punct', c, start);
      continue;
    }
    if (c === '<') {
      const start = pos();
      advance();
      let name = '';
      while (i < chars.length && chars[i] !== '>' && chars[i] !== '\n') {
        name += chars[i];
        advance();
      }
      if (chars[i] === '>') advance();
      else errors.push({ message: 'リンクの閉じる > がありません（<名前> と書きます）', span: { start, end: pos() } });
      push('link', name.trim(), start);
      continue;
    }
    if (c === '>') {
      const start = pos();
      advance();
      errors.push({ message: '対応する < のない > です', span: { start, end: pos() } });
      continue;
    }
    // 単語（引用符で囲んだ部分を含められる。例: AD1."IN COM"）。全体が 1 つの引用符だけなら文字列
    const start = pos();
    let text = '';
    let dot = -1;
    let quotedParts = 0;
    let bareChars = 0;
    while (i < chars.length && (isWordChar(chars[i]) || chars[i] === '"')) {
      if (chars[i] === '"') {
        text += readQuoted();
        quotedParts++;
        continue;
      }
      if (chars[i] === '.' && dot < 0) dot = text.length;
      text += chars[i];
      bareChars++;
      advance();
    }
    if (quotedParts === 1 && bareChars === 0) push('string', text, start);
    else push('word', text, start, dot);
  }
  const end = pos();
  if (tokens.length && tokens[tokens.length - 1].kind !== 'newline') tokens.push({ kind: 'newline', text: '\n', span: { start: end, end }, dot: -1, spaced: true });
  tokens.push({ kind: 'eof', text: '', span: { start: end, end }, dot: -1, spaced: true });
  return { tokens, errors };
}

/** 引用符なしの単語として書ける文字列か（書けなければ出力時に "…" で囲む） */
export function isBareWord(s: string): boolean {
  if (!s || s === '--' || s.startsWith('//') || s.startsWith('#')) return false;
  return [...s].every(isWordChar);
}

/** 単語として出力する（必要なら引用符で囲む） */
export function quoteWord(s: string): string {
  return isBareWord(s) ? s : `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** 文字列として出力する */
export function quoteString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}
