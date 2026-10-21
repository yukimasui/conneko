import { memo, useCallback, useRef } from 'react';
import { EdgeLabelRenderer, Position, useReactFlow, type EdgeProps } from '@xyflow/react';
import { getWireColor } from '../data/wires';
import type { TerminalSide } from '../devices/types';
import { useEditorContext } from './EditorContext';
import type { DeviceFlowNode, WireFlowEdge } from './flow';
import { CableGraphics } from './CableGraphics';
import { DIR, routeWire, toRoundedPath } from './routing';

/** 線番マーカーを端子から離す距離 */
const MARKER_GAP = 15;

const SIDE: Record<Position, TerminalSide> = {
  [Position.Top]: 'top',
  [Position.Bottom]: 'bottom',
  [Position.Left]: 'left',
  [Position.Right]: 'right',
};

function WireEdgeView({ id, data, selected, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps<WireFlowEdge>) {
  const { lanes, geometry, wireSeverity, showMarkers } = useEditorContext();
  const geo = geometry.get(id);
  const isCable = !!(geo?.sConnector && geo.tConnector);
  const { setEdges, screenToFlowPosition } = useReactFlow<DeviceFlowNode, WireFlowEdge>();
  const bend = data?.bend ?? 0;
  const lane = bend ? 0 : (lanes.get(id) ?? 0);
  const offset = lane + bend;

  const route = routeWire(
    {
      sx: sourceX,
      sy: sourceY,
      sSide: SIDE[sourcePosition],
      tx: targetX,
      ty: targetY,
      tSide: SIDE[targetPosition],
      sStub: geo?.sStub,
      tStub: geo?.tStub,
    },
    offset,
  );
  const path = toRoundedPath(route.points);
  const color = getWireColor(data?.color ?? 'black');
  const hex = color?.hex ?? '#1a1a1a';
  const severity = wireSeverity.get(id);
  const mid = { x: (route.midA.x + route.midB.x) / 2, y: (route.midA.y + route.midB.y) / 2 };

  // 中間セグメントのドラッグで曲がり位置を調整する
  const drag = useRef<{ start: number; base: number } | null>(null);
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      drag.current = { start: route.horizontalMid ? p.y : p.x, base: offset };
    },
    [screenToFlowPosition, route.horizontalMid, offset],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const delta = (route.horizontalMid ? p.y : p.x) - drag.current.start;
      // 0 だと「未調整」扱いになるため、わずかにずらす
      const next = Math.round(drag.current.base + delta) || 0.5;
      setEdges((edges) => edges.map((ed) => (ed.id === id && ed.data ? { ...ed, data: { ...ed.data, bend: next } } : ed)));
    },
    [screenToFlowPosition, route.horizontalMid, setEdges, id],
  );
  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);
  const resetBend = useCallback(() => {
    setEdges((edges) => edges.map((ed) => (ed.id === id && ed.data ? { ...ed, data: { ...ed.data, bend: undefined } } : ed)));
  }, [setEdges, id]);

  const width = 2 + Math.min(data?.sizeSq ?? 2, 8) * 0.25;

  return (
    <>
      {severity === 'error' && <path d={path} className="wire__alert" />}
      {selected && <path d={path} className="wire__selected" />}
      {isCable ? (
        <CableGraphics
          points={route.points}
          source={{ point: { x: sourceX, y: sourceY }, side: SIDE[sourcePosition], connector: geo!.sConnector! }}
          target={{ point: { x: targetX, y: targetY }, side: SIDE[targetPosition], connector: geo!.tConnector! }}
        />
      ) : (
        <>
        <path d={path} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={width + 1.6} strokeLinecap="round" />
        <path d={path} fill="none" stroke={hex} strokeWidth={width} strokeLinecap="round" />
        {color?.stripeHex && (
          <path d={path} fill="none" stroke={color.stripeHex} strokeWidth={width} strokeDasharray="6 6" />
        )}
        </>
      )}
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} className="react-flow__edge-interaction" />
      <EdgeLabelRenderer>
        {data?.wireNo &&
          !isCable &&
          showMarkers &&
          ([
            [sourceX, sourceY, SIDE[sourcePosition]],
            [targetX, targetY, SIDE[targetPosition]],
          ] as const).map(([x, y, side], i) => (
            // 実物のマークチューブのように、端子の近くに線番を表示する
            <div
              key={i}
              className={`wire-marker${severity ? ` has-${severity}` : ''}${side === 'top' || side === 'bottom' ? ' is-vertical' : ''}`}
              style={{ transform: `translate(${x + DIR[side].x * MARKER_GAP}px, ${y + DIR[side].y * MARKER_GAP}px) translate(-50%, -50%)${side === 'top' || side === 'bottom' ? ' rotate(-90deg)' : ''}` }}
            >
              {data.wireNo}
            </div>
          ))}
        {isCable && data?.wireNo && !selected && (
          <div className="wire-label cable-tag" style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}>
            {data.wireNo}
          </div>
        )}
        {selected && (
          <div
            className={`wire-label is-selected${severity ? ` has-${severity}` : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y + (route.horizontalMid ? -12 : 0)}px)` }}
          >
            {data?.wireNo || id}
            <span className="wire-label__spec">{isCable ? ` ケーブル（${geo?.sConnector?.kind}）` : ` ${data?.wireType ?? ''} ${data?.sizeSq ?? ''}sq`}</span>
          </div>
        )}
        {selected && (
          <div
            className={`wire-grip nodrag nopan ${route.horizontalMid ? 'is-horizontal' : 'is-vertical'}`}
            style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={resetBend}
            title="ドラッグで曲がり位置を調整（ダブルクリックで自動に戻す）"
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const WireEdge = memo(WireEdgeView);
