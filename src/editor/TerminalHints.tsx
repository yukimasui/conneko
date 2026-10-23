/**
 * 端子の案内: 選択中の機器の端子の横に出す吹き出しと、端子にマウスを乗せたときのポップアップ。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEdges } from '@xyflow/react';
import { terminalCallout, terminalPrinted } from '../devices/hint';
import type { ResolvedDevice } from '../devices/resolve';
import type { TerminalDef } from '../devices/types';
import { calloutSize, layoutCallouts, type CalloutInput } from './calloutLayout';
import type { WireFlowEdge } from './flow';
import { terminalFacts } from './terminalInfo';

/** 大きさを測る吹き出しのキー（向きと文字） */
const sizeKey = (side: string, text: string) => `${side}\u0000${text}`;

/**
 * 端子の横の吹き出し（機器の座標系で、端子から電線が出る向きの外側に置く）。
 * 端子が密集して吹き出しが重なるところは、一列に並べ直して引出線でつなぐ（calloutLayout）。
 * 並べる前に、吹き出しの実際の大きさ（縦書きは字形の送りが書体で変わる）を描画前に測る
 */
export function TerminalCallouts({ terminals }: { terminals: TerminalDef[] }) {
  const inputs = useMemo<CalloutInput[]>(
    () =>
      terminals.flatMap((t) => {
        const text = t.role === 'connector' ? undefined : terminalCallout(t);
        if (!text) return [];
        const short = terminalPrinted(t);
        return [{ id: t.id, side: t.side, x: t.x, y: t.y, text, ...(short !== text ? { short } : {}) }];
      }),
    [terminals],
  );
  // 測る文字の一覧（吹き出しの文字と、密集したときの短い文字）
  const samples = useMemo(() => {
    const m = new Map<string, { side: string; text: string }>();
    for (const c of inputs) for (const text of c.short ? [c.text, c.short] : [c.text]) m.set(sizeKey(c.side, text), { side: c.side, text });
    return [...m.entries()];
  }, [inputs]);
  const [measured, setMeasured] = useState<{ inputs: CalloutInput[]; sizes: Map<string, { w: number; h: number }> }>();
  const measureRef = useRef<HTMLDivElement>(null);
  const fresh = measured?.inputs === inputs;
  useLayoutEffect(() => {
    if (fresh || !measureRef.current) return;
    const sizes = new Map<string, { w: number; h: number }>();
    for (const el of measureRef.current.children) {
      const e = el as HTMLElement;
      sizes.set(e.dataset.key!, { w: e.offsetWidth, h: e.offsetHeight });
    }
    setMeasured({ inputs, sizes });
  }, [fresh, inputs]);
  const placed = useMemo(() => {
    if (!fresh) return [];
    const sizes = measured!.sizes;
    return layoutCallouts(inputs, (text, side) => sizes.get(sizeKey(side, text)) ?? calloutSize(text, side));
  }, [fresh, measured, inputs]);
  if (!fresh) {
    return (
      <div ref={measureRef} className="terminal-callout-measure" aria-hidden="true">
        {samples.map(([key, { side, text }]) => (
          <div key={key} data-key={key} className={`terminal-callout terminal-callout--${side}`}>
            {text}
          </div>
        ))}
      </div>
    );
  }
  const leaders = placed.filter((p) => p.leader);
  return (
    <>
      {leaders.length > 0 && (
        <svg className="terminal-callout-leaders" width="1" height="1" aria-hidden="true">
          {leaders.map((p) => (
            <polyline key={p.id} points={p.leader!.map(([x, y]) => `${x},${y}`).join(' ')} />
          ))}
        </svg>
      )}
      {placed.map((p) => (
        <div key={p.id} className={`terminal-callout terminal-callout--${p.side}`} style={{ left: p.ax, top: p.ay }}>
          {p.text}
        </div>
      ))}
    </>
  );
}

/** ポップアップの幅の目安（画面の右端で左側に出すかの判定に使う） */
const POPUP_WIDTH = 280;

/** 端子のポップアップ（画面の座標で出すため body に描く。拡大率によらず読める大きさにする） */
export function TerminalPopup(props: { device: string; terminal: TerminalDef; resolved: ResolvedDevice; comment?: string; anchor: DOMRect }) {
  const { device, terminal: t, anchor } = props;
  const edges = useEdges<WireFlowEdge>();
  const f = terminalFacts(t, props.resolved);
  const wires = edges.flatMap((e) =>
    e.source === device && e.sourceHandle === t.id
      ? [{ id: e.id, to: `${e.target}.${e.targetHandle}`, wireNo: e.data?.wireNo }]
      : e.target === device && e.targetHandle === t.id
        ? [{ id: e.id, to: `${e.source}.${e.sourceHandle}`, wireNo: e.data?.wireNo }]
        : [],
  );
  const right = anchor.right + 12 + POPUP_WIDTH < window.innerWidth;
  const top = anchor.top + anchor.height / 2;
  return createPortal(
    <div
      className="terminal-popup"
      style={right ? { left: anchor.right + 12, top } : { left: anchor.left - 12, top, transform: 'translate(-100%, -50%)' }}
      role="tooltip"
    >
      <div className="terminal-popup__head">
        <span className="terminal-popup__printed">
          {device}.{f.printed}
        </span>
        {f.hint && <span className="terminal-popup__hint">{f.hint}</span>}
      </div>
      {f.note && <div className="terminal-popup__note">{f.note}</div>}
      <div className="terminal-popup__row">{f.kind}</div>
      {f.power && <div className="terminal-popup__row">{f.power}</div>}
      {props.comment && <div className="terminal-popup__row">コメント: {props.comment}</div>}
      <div className={`terminal-popup__row${wires.length ? '' : ' muted'}`}>
        {wires.length ? wires.map((w) => <div key={w.id}>→ {w.to}{w.wireNo ? `（線番 ${w.wireNo}）` : ''}</div>) : '未接続'}
      </div>
    </div>,
    document.body,
  );
}
