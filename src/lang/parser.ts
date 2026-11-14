/**
 * 配線言語（.cnk）の構文解析。字句の並びを構文木（ast.ts）にする。
 *
 * 誤りのある文は、その行の終わりまで読み飛ばして次の文から続ける（1 回のコンパイルで複数の誤りを出す）。
 */
import { SETTING_KEYS, type Attr, type ChainStmt, type CommentStmt, type DeviceStmt, type Endpoint, type Program, type SettingStmt, type SheetBlock, type Stmt, type Text, type WireBlock } from './ast';
import { lex, type Span, type Token } from './lexer';

export interface SyntaxError {
  message: string;
  span: Span;
}

class Bail extends Error {}

const NUMBER = /^-?\d+(\.\d+)?$/;

export function parse(source: string): { program: Program; errors: SyntaxError[] } {
  const { tokens, errors: lexErrors } = lex(source);
  const errors: SyntaxError[] = [...lexErrors];
  let p = 0;

  const peek = (n = 0) => tokens[Math.min(p + n, tokens.length - 1)];
  const next = () => tokens[p < tokens.length - 1 ? p++ : p];
  const isPunct = (t: Token, c: string) => t.kind === 'punct' && t.text === c;
  const isWord = (t: Token, w: string) => t.kind === 'word' && t.text === w;
  const text = (t: Token): Text => ({ value: t.text, span: t.span });
  const join = (a: Span, b: Span): Span => ({ start: a.start, end: b.end });
  const describe = (t: Token) => (t.kind === 'newline' ? '行末' : t.kind === 'eof' ? 'ファイルの終わり' : t.kind === 'link' ? `<${t.text}>` : t.kind === 'string' ? `"${t.text}"` : `「${t.text}」`);

  const fail = (message: string, span: Span): never => {
    errors.push({ message, span });
    throw new Bail();
  };
  const expectPunct = (c: string, what: string): Token => {
    const t = peek();
    if (!isPunct(t, c)) fail(`${what}（${describe(t)} があります）`, t.span);
    return next();
  };
  const skipNewlines = () => {
    while (peek().kind === 'newline') next();
  };
  /** 誤りのあった文の残りを読み飛ばす（行末まで。ブロックの閉じ括弧は残す） */
  const recover = () => {
    while (peek().kind !== 'newline' && peek().kind !== 'eof' && !isPunct(peek(), '}')) next();
  };
  const endOfStatement = () => {
    const t = peek();
    if (t.kind === 'newline') next();
    else if (t.kind !== 'eof' && !isPunct(t, '}')) fail(`文の終わりに余分な ${describe(t)} があります`, t.span);
  };

  /** 単語を 機器名.端子ID に分ける */
  const terminalOf = (t: Token): Endpoint => {
    if (t.dot <= 0 || t.dot >= t.text.length - 1) fail(`端子は「機器名.端子ID」と書きます（${describe(t)}）`, t.span);
    const device = t.text.slice(0, t.dot);
    const terminal = t.text.slice(t.dot + 1);
    // 桁の位置は引用符のない場合の目安（引用符を含む単語では全体を指す）
    const plain = t.span.end.line === t.span.start.line && t.span.end.col - t.span.start.col === [...t.text].length;
    const mid = plain ? { line: t.span.start.line, col: t.span.start.col + [...device].length } : t.span.start;
    return {
      kind: 'terminal',
      device: { value: device, span: plain ? { start: t.span.start, end: mid } : t.span },
      terminal: { value: terminal, span: plain ? { start: { line: mid.line, col: mid.col + 1 }, end: t.span.end } : t.span },
      span: t.span,
    };
  };

  /** 端子 1 つ、`機器名.[端子, …]`、リンク `<名前>` のいずれか（複数になることがある） */
  const parseEndpoints = (): Endpoint[] => {
    const t = peek();
    if (t.kind === 'link') {
      next();
      if (!t.text) fail('リンクの名前がありません（<P24> のように書きます）', t.span);
      return [{ kind: 'link', name: text(t), span: t.span }];
    }
    if (t.kind !== 'word') fail(`端子（機器名.端子ID）かリンク（<名前>）が必要です（${describe(t)} があります）`, t.span);
    next();
    // PS1.[R, S, T] … 同じ機器の端子の並び
    if (t.text.endsWith('.') && t.dot === t.text.length - 1 && isPunct(peek(), '[') && !peek().spaced) {
      next();
      const device: Text = { value: t.text.slice(0, -1), span: t.span };
      const out: Endpoint[] = [];
      for (;;) {
        const e = peek();
        if (e.kind !== 'word' && e.kind !== 'string') fail(`端子IDが必要です（${describe(e)} があります）`, e.span);
        next();
        const range = e.kind === 'word' ? /^(\d+)\.\.(\d+)$/.exec(e.text) : null;
        if (range) {
          const [a, b] = [Number(range[1]), Number(range[2])];
          if (Math.abs(b - a) > 512) fail(`範囲 ${e.text} が大きすぎます`, e.span);
          const step = a <= b ? 1 : -1;
          // 000..015 のように 0 で始まる同じ桁数の範囲は、0 埋めの端子 ID にする
          const width = range[1].length === range[2].length && (range[1].startsWith('0') || range[2].startsWith('0')) ? range[1].length : 0;
          for (let n = a; n !== b + step; n += step) {
            out.push({ kind: 'terminal', device, terminal: { value: String(n).padStart(width, '0'), span: e.span }, span: join(t.span, e.span) });
          }
        } else {
          out.push({ kind: 'terminal', device, terminal: text(e), span: join(t.span, e.span) });
        }
        if (isPunct(peek(), ',')) {
          next();
          continue;
        }
        expectPunct(']', '端子の並びを閉じる ] が必要です');
        break;
      }
      return out;
    }
    return [terminalOf(t)];
  };

  /** `--` の両側に書く端子の並び: 端子 1 つか、`[端子, 端子, …]` */
  const parseGroup = (): { endpoints: Endpoint[]; span: Span } => {
    const first = peek();
    if (isPunct(first, '[')) {
      next();
      const endpoints: Endpoint[] = [];
      for (;;) {
        endpoints.push(...parseEndpoints());
        if (isPunct(peek(), ',')) {
          next();
          continue;
        }
        const close = expectPunct(']', '端子の並びを閉じる ] が必要です');
        return { endpoints, span: join(first.span, close.span) };
      }
    }
    const endpoints = parseEndpoints();
    return { endpoints, span: join(first.span, endpoints[endpoints.length - 1].span) };
  };

  /** 電線の属性の並び（行末か `{` まで） */
  const parseAttrs = (): Attr[] => {
    const attrs: Attr[] = [];
    for (;;) {
      const t = peek();
      if (t.kind !== 'word' && t.kind !== 'string') break;
      next();
      if (isPunct(peek(), '=')) {
        next();
        const v = peek();
        if (v.kind !== 'word' && v.kind !== 'string') fail(`${t.text}= の後に値が必要です`, v.span);
        next();
        attrs.push({ key: text(t), value: text(v), span: join(t.span, v.span) });
      } else {
        attrs.push({ value: text(t), span: t.span });
      }
    }
    return attrs;
  };

  const parseChain = (labels: Text[], start: Span): ChainStmt => {
    const groups = [parseGroup()];
    for (;;) {
      // `--` の前後の改行は続きとして読む
      let ahead = 0;
      while (peek(ahead).kind === 'newline') ahead++;
      if (!isWord(peek(ahead), '--')) break;
      skipNewlines();
      next();
      skipNewlines();
      groups.push(parseGroup());
    }
    if (groups.length < 2) {
      const t = peek();
      fail(`電線は「端子 -- 端子」と書きます（-- の前後は空白で区切ります。${describe(t)} があります）`, t.span);
    }
    const attrs = parseAttrs();
    const last = attrs.length ? attrs[attrs.length - 1].span : groups[groups.length - 1].span;
    return { type: 'chain', labels, groups, attrs, span: join(start, last) };
  };

  const parseDevice = (parent?: Text): DeviceStmt => {
    const id = next();
    next(); // =
    const type = peek();
    if (type.kind !== 'word') fail(`= の後に機器種別が必要です（例: ${id.text} = mitsubishi.nv32-sv.3p）`, type.span);
    next();
    const stmt: DeviceStmt = { type: 'device', id: text(id), deviceType: text(type), params: [], children: [], span: join(id.span, type.span), ...(parent ? { on: parent } : {}) };
    if (isPunct(peek(), '(')) {
      next();
      while (!isPunct(peek(), ')')) {
        const key = peek();
        if (key.kind !== 'word') fail(`パラメータは「名前=値」と書きます（${describe(key)} があります）`, key.span);
        next();
        expectPunct('=', `パラメータ ${key.text} の後に = が必要です`);
        const value = peek();
        if (value.kind !== 'word' && value.kind !== 'string') fail(`パラメータ ${key.text} の値が必要です`, value.span);
        next();
        stmt.params.push({ key: text(key), value: text(value), quoted: value.kind === 'string' });
        if (isPunct(peek(), ',')) next();
      }
      stmt.span = join(stmt.span, next().span);
    }
    for (;;) {
      const t = peek();
      if (t.kind === 'string') {
        next();
        stmt.note = text(t);
      } else if (isWord(t, 'at')) {
        next();
        // 行末・ファイルの終わりは読み進めない（誤りの位置と、読み飛ばす範囲をその行にとどめる）
        const x = peek();
        if (x.kind !== 'word' || !NUMBER.test(x.text)) fail('at の後は「x,y」（数値）と書きます', x.kind === 'word' ? x.span : t.span);
        next();
        expectPunct(',', 'at の後は「x,y」と書きます');
        const y = peek();
        if (y.kind !== 'word' || !NUMBER.test(y.text)) fail('at の後は「x,y」（数値）と書きます', y.kind === 'word' ? y.span : t.span);
        next();
        stmt.at = { x: Number(x.text), y: Number(y.text) };
      } else if (isWord(t, 'slot')) {
        next();
        const n = peek();
        if (n.kind !== 'word' || !/^\d+$/.test(n.text) || Number(n.text) < 1) fail('slot の後は 1 以上の整数を書きます', n.kind === 'word' ? n.span : t.span);
        next();
        stmt.slot = Number(n.text);
      } else if (isWord(t, 'on')) {
        next();
        const host = peek();
        if (host.kind !== 'word' && host.kind !== 'string') fail('on の後に装着先の機器名が必要です', host.span);
        next();
        stmt.on = text(host);
      } else {
        break;
      }
      stmt.span = join(stmt.span, t.span);
    }
    // ブロックの中は装着するユニット（PLC の増設ユニット、マニホールドの連）。書いた順に位置 1, 2, … になる
    if (isPunct(peek(), '{')) {
      next();
      let slot = 0;
      for (;;) {
        skipNewlines();
        const t = peek();
        if (isPunct(t, '}')) {
          next();
          break;
        }
        if (t.kind === 'eof') fail(`${id.text} のブロックを閉じる } がありません`, id.span);
        try {
          if (!((t.kind === 'word' || t.kind === 'string') && isPunct(peek(1), '='))) fail(`機器のブロックの中には、装着するユニットの宣言（名前 = 機器種別）だけを書けます（${describe(t)} があります）`, t.span);
          const child = parseDevice(stmt.id);
          slot = child.slot ?? slot + 1;
          child.slot = slot;
          stmt.children.push(child);
          endOfStatement();
        } catch (e) {
          if (!(e instanceof Bail)) throw e;
          recover();
        }
      }
    }
    return stmt;
  };

  const parseBlockBody = (what: string, open: Token): Stmt[] => {
    const body: Stmt[] = [];
    for (;;) {
      skipNewlines();
      const t = peek();
      if (isPunct(t, '}')) {
        next();
        return body;
      }
      if (t.kind === 'eof') {
        errors.push({ message: `${what} を閉じる } がありません`, span: open.span });
        return body;
      }
      const s = parseStatement();
      if (s) body.push(s);
    }
  };

  const parseStatement = (): Stmt | undefined => {
    try {
      const t = peek();
      const n = peek(1);
      // 線番: の付いた配線
      if ((t.kind === 'word' || t.kind === 'string') && isPunct(n, ':')) {
        next();
        next();
        skipNewlines();
        const s = parseChain([text(t)], t.span);
        endOfStatement();
        return s;
      }
      // [線番, 線番, …]: の付いた配線（[ の後が「単語 , 」か「単語 ] :」のときだけ。端子の並びと区別する）
      if (isPunct(t, '[')) {
        let k = 1;
        const labels: Text[] = [];
        while (peek(k).kind === 'word' || peek(k).kind === 'string') {
          labels.push(text(peek(k)));
          k++;
          if (isPunct(peek(k), ',')) k++;
          else break;
        }
        if (labels.length && isPunct(peek(k), ']') && isPunct(peek(k + 1), ':')) {
          p += k + 2;
          skipNewlines();
          const s = parseChain(labels, t.span);
          endOfStatement();
          return s;
        }
      }
      if ((t.kind === 'word' || t.kind === 'string') && isPunct(n, '=')) {
        const s = parseDevice();
        endOfStatement();
        return s;
      }
      if (isWord(t, 'sheet') && (n.kind === 'word' || n.kind === 'string' || isPunct(n, '{'))) {
        next();
        const block: SheetBlock = { type: 'sheet', body: [], span: t.span };
        // sheet ID "名前" { / sheet "名前" { / sheet ID {。ID に空白などがあるときは、文字列を 2 つ続けて書く（1 つ目が ID）
        if (peek().kind === 'word' || (peek().kind === 'string' && peek(1).kind === 'string')) block.id = text(next());
        if (peek().kind === 'string') block.name = text(next());
        const open = expectPunct('{', 'sheet の後に { が必要です（例: sheet S1 "主回路" { … }）');
        block.span = join(t.span, open.span);
        if (!block.id && !block.name) fail('sheet にはシートの ID か名前が必要です（例: sheet "主回路" { … }）', block.span);
        block.body = parseBlockBody('sheet', open);
        return block;
      }
      if (isWord(t, 'wire') && n.kind !== 'eof' && !isWord(n, '--')) {
        next();
        const attrs = parseAttrs();
        const open = expectPunct('{', 'wire の後に { が必要です（例: wire KIV 3.5sq black { … }）');
        const block: WireBlock = { type: 'wire', attrs, body: [], span: join(t.span, open.span) };
        block.body = parseBlockBody('wire', open);
        return block;
      }
      if (isWord(t, 'comment')) {
        next();
        const target = parseEndpoints();
        const s = peek();
        if (s.kind !== 'string') fail('comment は「comment 機器名.端子ID "コメント"」と書きます', s.span);
        next();
        if (target.length !== 1) fail('comment の端子は 1 つだけ書きます', target[0].span);
        const stmt: CommentStmt = { type: 'comment', target: target[0], text: text(s), span: join(t.span, s.span) };
        endOfStatement();
        return stmt;
      }
      if (t.kind === 'word' && (SETTING_KEYS as readonly string[]).includes(t.text) && (n.kind === 'string' || n.kind === 'word') && !isWord(n, '--')) {
        next();
        next();
        const stmt: SettingStmt = { type: 'setting', key: text(t), value: text(n), span: join(t.span, n.span) };
        endOfStatement();
        return stmt;
      }
      if (isPunct(t, '}')) {
        next();
        fail('対応する { のない } です', t.span);
      }
      const s = parseChain([], t.span);
      endOfStatement();
      return s;
    } catch (e) {
      if (!(e instanceof Bail)) throw e;
      recover();
      return undefined;
    }
  };

  const body: Stmt[] = [];
  for (;;) {
    skipNewlines();
    if (peek().kind === 'eof') break;
    const before = p;
    const s = parseStatement();
    if (s) body.push(s);
    // 読み飛ばしで進まなかった場合（閉じ括弧だけが残ったなど）は 1 つ進めて止まらないようにする
    if (p === before) next();
  }
  return { program: { body }, errors };
}
