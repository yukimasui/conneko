import { useEffect, useMemo, useRef, useState } from 'react';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { checkSource, summarize, type CheckResult } from '../lang/check';
import type { Diagnostic } from '../lang/compile';
import { printDiagram } from '../lang/print';
import type { Diagram } from '../model/diagram';

interface Props {
  /** いま開いている図面（言語に書かない配置は、ここから引き継ぐ） */
  diagram: Diagram;
  /** 「図面に反映」で、コンパイルした図面を渡す */
  onApply: (diagram: Diagram) => void;
  onClose: () => void;
}

const SEVERITY_LABEL = { error: 'エラー', warning: '警告', info: '注意' } as const;

const CHEAT_SHEET = `// 機器:  名前 = 機器種別(パラメータ=値, …) "コメント"
ELB1 = mitsubishi.nv32-sv.3p(ratedCurrent=20)
// 電線:  線番: 端子 -- 端子   色 太さ 種類
R1: ELB1.2 -- MC1.1/L1  black 3.5sq KIV
// 並んだ電線（同じ本数どうしを順につなぐ）
[R, S, T]: PS1.[R, S, T] -- ELB1.[1, 3, 5]
// 渡り配線（端子から端子へ続ける）
P24: PSU1.+V1 -- PL1.X1 -- PL2.X1
// 電線の既定（ブロックの中の電線に付く）
wire KIV 0.75sq blue { … }
// リンク（名前が同じどうしがつながる。別のシートへ渡す）
PSU1.+V1 -- <P24>
// シート / 装着（PLC のユニット、マニホールドの連）
sheet "主回路" { … }
PLC1 = keyence.kv-8000.cpu { IN1 = keyence.kv-c32xc.input }`;

/** 行・桁（文字数）を、テキストエリアの位置（UTF-16 の単位）にする */
function offsetOf(text: string, line: number, col: number): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) offset += lines[i].length + 1;
  return offset + [...(lines[line - 1] ?? '')].slice(0, col - 1).join('').length;
}

/**
 * 配線言語（.cnk）のエディタ。いまの図面を言語のソースにして見せ、書き換えるたびにコンパイルとチェックをして、
 * 指摘を行番号つきで出す。「図面に反映」で図面を入れ替える（機器の位置などの配置は、同じ名前の機器・同じ端子の電線から引き継ぐ）。
 */
export function LangDialog({ diagram, onApply, onClose }: Props) {
  const initial = useMemo(() => printDiagram(diagram, { lookup: getDeviceDefinition }), [diagram]);
  const [text, setText] = useState(initial);
  const [result, setResult] = useState<CheckResult | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);

  // 入力が止まってからコンパイルする
  useEffect(() => {
    const timer = window.setTimeout(() => setResult(checkSource(text, { lookup: getDeviceDefinition, defs: deviceDefinitions, base: diagram })), result ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, diagram]);

  const lineCount = useMemo(() => text.split('\n').length, [text]);
  const marks = useMemo(() => {
    const m = new Map<number, Diagnostic['severity']>();
    const rank = { error: 0, warning: 1, info: 2 };
    for (const d of result?.diagnostics ?? []) {
      if (!d.span) continue;
      const cur = m.get(d.span.start.line);
      if (!cur || rank[d.severity] < rank[cur]) m.set(d.span.start.line, d.severity);
    }
    return m;
  }, [result]);

  const jump = (d: Diagnostic) => {
    const ta = area.current;
    if (!ta || !d.span) return;
    const from = offsetOf(text, d.span.start.line, d.span.start.col);
    const to = Math.max(from + 1, offsetOf(text, d.span.end.line, d.span.end.col));
    ta.focus();
    ta.setSelectionRange(from, to);
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    ta.scrollTop = Math.max(0, (d.span.start.line - 4) * lineHeight);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      area.current?.select();
    }
  };

  const diagnostics = result?.diagnostics ?? [];
  const compileErrors = diagnostics.filter((d) => d.phase === 'compile' && d.severity === 'error').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lang" onClick={(e) => e.stopPropagation()}>
        <h2>
          配線言語 <span className="lang__badge">試験的</span>
        </h2>
        <p className="muted">
          いまの図面を、機器と電線を文字で書いた形にしたものです。書き換えるとその場でコンパイルし、誤りを行番号つきで示します。
          機器の位置などの配置は書きません（「図面に反映」で、同じ名前の機器・同じ端子の電線の配置を引き継ぎます）。
        </p>
        <div className="lang__body">
          <div className="lang__editor">
            <div className="lang__gutter" ref={gutter} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className={marks.has(i + 1) ? `is-${marks.get(i + 1)}` : undefined}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={area}
              value={text}
              spellCheck={false}
              wrap="off"
              onChange={(e) => setText(e.target.value)}
              onScroll={(e) => {
                if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={(e) => {
                // Tab で字下げ（フォーカスを移さない）
                if (e.key !== 'Tab' || e.shiftKey) return;
                e.preventDefault();
                const ta = e.currentTarget;
                const { selectionStart: a, selectionEnd: b } = ta;
                setText(`${text.slice(0, a)}  ${text.slice(b)}`);
                window.requestAnimationFrame(() => ta.setSelectionRange(a + 2, a + 2));
              }}
              autoFocus
            />
          </div>
          <div className="lang__side">
            <div className="lang__summary">{result ? summarize(diagnostics) : 'コンパイル中…'}</div>
            <ul className="lang__issues">
              {diagnostics.map((d, i) => (
                <li key={i} className={`is-${d.severity}`}>
                  <button type="button" onClick={() => jump(d)} disabled={!d.span} title={d.span ? 'クリックすると、その行を選びます' : undefined}>
                    <span className="lang__where">
                      {SEVERITY_LABEL[d.severity]}
                      {d.span ? ` ${d.span.start.line}:${d.span.start.col}` : ''}
                    </span>
                    <span className="lang__rule">{d.code}</span>
                    <span className="lang__message">
                      {d.message}
                      {d.estimated ? '（推定を含む）' : ''}
                      {d.related?.length ? `〔関連: ${d.related.map((r) => `${r.span.start.line} 行目`).join('、')}〕` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <details className="lang__help">
              <summary>書き方</summary>
              <pre>{CHEAT_SHEET}</pre>
            </details>
          </div>
        </div>
        <div className="modal__actions">
          <span className="lang__note muted">
            {compileErrors ? `構文・名前のエラーが ${compileErrors} 件あるため、図面に反映できません` : text === initial ? '' : '変更があります'}
          </span>
          <button type="button" onClick={copy} title="ソースをクリップボードにコピーします">コピー</button>
          <button type="button" onClick={() => setText(initial)} disabled={text === initial} title="いまの図面から作ったソースに戻します">元に戻す</button>
          <button type="button" onClick={onClose}>閉じる</button>
          <button type="button" className="primary" onClick={() => result?.ok && onApply(result.diagram)} disabled={!result?.ok || !!compileErrors}>
            図面に反映
          </button>
        </div>
      </div>
    </div>
  );
}
