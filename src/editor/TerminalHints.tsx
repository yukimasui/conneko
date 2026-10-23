/**
 * 端子の案内: 選択中の機器の端子の横に出す吹き出しと、端子にマウスを乗せたときのポップアップ。
 */
import { createPortal } from 'react-dom';
import { useEdges } from '@xyflow/react';
import { terminalCallout } from '../devices/hint';
import type { ResolvedDevice } from '../devices/resolve';
import type { TerminalDef } from '../devices/types';
import type { WireFlowEdge } from './flow';
import { terminalFacts } from './terminalInfo';

/** 端子の横の吹き出し（機器の座標系で、端子から電線が出る向きの外側に置く） */
export function TerminalCallouts({ terminals }: { terminals: TerminalDef[] }) {
  return (
    <>
      {terminals.map((t) => {
        const text = t.role === 'connector' ? undefined : terminalCallout(t);
        return text ? (
          <div key={t.id} className={`terminal-callout terminal-callout--${t.side}`} style={{ left: t.x, top: t.y }}>
            {text}
          </div>
        ) : null;
      })}
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
