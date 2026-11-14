/**
 * 配線言語（.cnk）のコンパイルと電気的なチェックをまとめて行い、結果をソースの位置つきの診断にする。
 *
 * 構文・名前の解決に誤りがなければ、できた図面データに既存の配線チェック（src/check）をかけ、
 * 指摘を、その電線・機器を書いた行に戻す。プログラミング言語のコンパイラの「型エラー」にあたる。
 */
import { checkDiagram, type CheckIssue } from '../check/checkDiagram';
import { compile, type CompileOptions, type CompileResult, type Diagnostic } from './compile';
import type { Span } from './lexer';

export interface CheckResult extends CompileResult {
  /** 配線チェックの指摘（構文・名前の解決に誤りがあるときは空） */
  issues: CheckIssue[];
}

const before = (a: Span | undefined, b: Span | undefined) => {
  if (!a || !b) return (a ? 0 : 1) - (b ? 0 : 1);
  return a.start.line - b.start.line || a.start.col - b.start.col;
};

export function checkSource(source: string, options: CompileOptions): CheckResult {
  const result = compile(source, options);
  const diagnostics: Diagnostic[] = [...result.diagnostics].sort((a, b) => before(a.span, b.span));
  if (!result.ok) return { ...result, diagnostics, issues: [] };

  const issues = checkDiagram(result.diagram, options.lookup);
  const order = { error: 0, warning: 1, info: 2 };
  const checked = issues.map((issue): Diagnostic => {
    const places = [
      ...issue.wires.map((id) => ({ label: id, span: result.map.wires.get(id) })),
      ...issue.devices.map((id) => ({ label: id, span: result.map.devices.get(id) })),
    ].filter((p): p is { label: string; span: Span } => !!p.span);
    // 指摘の位置: 文中で名指しされた電線 > いちばん後ろの行に書いた電線（同じネットに後から足した電線が原因のことが多い）> 最初の機器
    const wirePlaces = places.filter((p) => issue.wires.includes(p.label));
    const named = wirePlaces.find((p) => new RegExp(`(^|[^A-Za-z0-9])${p.label}([^A-Za-z0-9]|$)`).test(issue.message));
    const latest = wirePlaces.reduce<(typeof places)[number] | undefined>((best, p) => (!best || before(best.span, p.span) < 0 ? p : best), undefined);
    const first = named ?? latest ?? places[0];
    const rest = places.filter((p) => p !== first);
    // 同じ行を指すものは 1 つにまとめる
    const seen = new Set(first ? [first.span.start.line] : []);
    const related = rest.filter((p) => !seen.has(p.span.start.line) && seen.add(p.span.start.line));
    return {
      severity: issue.severity,
      code: issue.rule,
      message: issue.message,
      phase: 'check',
      ...(first ? { span: first.span } : {}),
      ...(related.length ? { related: related.slice(0, 4) } : {}),
      ...(issue.estimated ? { estimated: true } : {}),
    };
  });
  checked.sort((a, b) => order[a.severity] - order[b.severity] || before(a.span, b.span));
  return { ...result, diagnostics: [...diagnostics, ...checked], issues };
}

const SEVERITY_NAMES = { error: 'error', warning: 'warning', info: 'info' } as const;

/** 画面上の幅（全角は 2 桁と数える。^ の位置を合わせるため） */
function displayWidth(s: string): number {
  let w = 0;
  for (const c of s) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(c) ? 2 : 1;
  return w;
}

/**
 * コンパイラ風の表示にする。
 *
 *   conveyor.cnk:12:3: error[unknown-terminal]: ELB1（NV32-SV）に端子 7 はありません…
 *      12 |   ELB1.7 -- MC1.1/L1
 *         |   ^^^^^^
 */
export function formatDiagnostic(d: Diagnostic, source: string, file = ''): string {
  const head = `${SEVERITY_NAMES[d.severity]}[${d.code}]: ${d.message}${d.estimated ? '（推定を含む）' : ''}`;
  if (!d.span) return `${file ? `${file}: ` : ''}${head}`;
  const { start, end } = d.span;
  const lines = source.split('\n');
  const text = (lines[start.line - 1] ?? '').replace(/\r$/, '').replace(/\t/g, ' ');
  const chars = [...text];
  const lead = displayWidth(chars.slice(0, start.col - 1).join(''));
  const until = end.line === start.line ? end.col - 1 : chars.length;
  const width = Math.max(1, displayWidth(chars.slice(start.col - 1, until).join('')));
  const gutter = String(start.line).padStart(5);
  const out = [`${file ? `${file}:` : ''}${start.line}:${start.col}: ${head}`, `${gutter} | ${text}`, `${' '.repeat(5)} | ${' '.repeat(lead)}${'^'.repeat(width)}`];
  for (const r of d.related ?? []) out.push(`${' '.repeat(5)} = 関連: ${r.label}（${r.span.start.line} 行目）`);
  return out.join('\n');
}

/** 診断の件数のまとめ（例: 「エラー 2 件、警告 1 件」） */
export function summarize(diagnostics: Diagnostic[]): string {
  const n = (s: Diagnostic['severity']) => diagnostics.filter((d) => d.severity === s).length;
  const parts = [n('error') ? `エラー ${n('error')} 件` : '', n('warning') ? `警告 ${n('warning')} 件` : '', n('info') ? `注意 ${n('info')} 件` : ''].filter(Boolean);
  return parts.length ? parts.join('、') : '指摘なし';
}
