import { memo, useCallback, useRef } from 'react';
import { EdgeLabelRenderer, Position, useReactFlow, type EdgeProps } from '@xyflow/react';
import { isTubeType, tubeModel } from '../data/tubes';
import { getWireColor } from '../data/wires';
import type { TerminalSide } from '../devices/types';
import { useEditorContext } from './EditorContext';
import type { DeviceFlowNode, WireFlowEdge } from './flow';
import { CableGraphics } from './CableGraphics';
import { DIRECT_STROKES, tubeStrokes } from './tubeStyle';
import {
  autoInner,
  DIR,
  manualRoute,
  orthogonalize,
  pointAtLength,
  polylineLength,
  routeWire,
  simplifyRoute,
  toRoundedPath,
  type Point,
} from './routing';

/** 線番マーカーを端子から離す距離 */
const MARKER_GAP = 15;

const SIDE: Record<Position, TerminalSide> = {
  [Position.Top]: 'top',
  [Position.Bottom]: 'bottom',
  [Position.Left]: 'left',
  [Position.Right]: 'right',
};

/** 線分をドラッグするときの吸着: グリッド（5px）と、ほかの頂点の座標（6px 以内） */
const SNAP = 5;
const ALIGN = 6;

type Drag = { k: number; work: Point[]; horizontal: boolean; start: number; base: number };

/** 電線の太さ[sq]を描く線の太さ[px]にする（細い線どうしでも見分けられるよう、太さに応じてはっきり変える） */
export function wireWidth(sizeSq: number): number {
  return Math.min(10, 1.2 + Math.pow(Math.max(sizeSq, 0.3), 0.6) * 1.1);
}

const isHorizontal = (a: Point, b: Point) => Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) >= 0.5;

function WireEdgeView({ id, data, selected, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps<WireFlowEdge>) {
  const { lanes, geometry, wireSeverity, showMarkers } = useEditorContext();
  const geo = geometry.get(id);
  const isCable = !!(geo?.sConnector && geo.tConnector);
  const { setEdges, screenToFlowPosition } = useReactFlow<DeviceFlowNode, WireFlowEdge>();
  const bend = data?.bend ?? 0;
  const lane = bend ? 0 : (lanes.get(id) ?? 0);
  const offset = lane + bend;

  // 端子から電線を出す向き。端子の向きと違う向きに出す場合は、端子の中心から出す
  const sSide = geo?.sSide ?? SIDE[sourcePosition];
  const tSide = geo?.tSide ?? SIDE[targetPosition];
  const sPt = geo && sSide !== SIDE[sourcePosition] ? geo.sCenter : { x: sourceX, y: sourceY };
  const tPt = geo && tSide !== SIDE[targetPosition] ? geo.tCenter : { x: targetX, y: targetY };
  const ends = {
    sx: sPt.x,
    sy: sPt.y,
    sSide,
    tx: tPt.x,
    ty: tPt.y,
    tSide,
    sStub: geo?.sStub,
    tStub: geo?.tStub,
  };
  // 手で編集した経路があればそれを、なければ自動の経路を使う
  const manual = data?.route ? manualRoute(ends, data.route) : null;
  const points = manual ? manual.points : routeWire(ends, offset).points;
  const inner = manual ? manual.inner : autoInner(ends, offset);
  const path = toRoundedPath(points);
  const color = getWireColor(data?.color ?? 'black');
  const hex = color?.hex ?? '#1a1a1a';
  const severity = wireSeverity.get(id);
  const mid = pointAtLength(points, polylineLength(points) / 2);

  const setRoute = useCallback(
    (route: Point[] | undefined) => {
      setEdges((edges) =>
        edges.map((ed) => (ed.id === id && ed.data ? { ...ed, data: { ...ed.data, bend: undefined, route: route?.map((p) => ({ x: p.x, y: p.y })) } } : ed)),
      );
    },
    [setEdges, id],
  );

  // 線分 k（inner[k]〜inner[k+1]）を、線分に直交する向きに動かす。
  // ドラッグ中に頂点が増えてつまみが入れ替わるため、移動はウィンドウで受け取る
  const drag = useRef<Drag | null>(null);
  const onPointerDown = (k: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const work = inner.map((p) => ({ ...p }));
    let seg = k;
    const horizontal = isHorizontal(work[seg], work[seg + 1]);
    // 両端（スタブの先）は動かせないので、端の線分を動かすときは頂点を足して段を作る
    if (seg === 0) {
      work.splice(1, 0, { ...work[0] });
      seg = 1;
    }
    if (seg + 1 === work.length - 1) work.splice(work.length - 1, 0, { ...work[work.length - 1] });
    const p0 = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    drag.current = { k: seg, work, horizontal, start: horizontal ? p0.y : p0.x, base: horizontal ? work[seg].y : work[seg].x };
    let last = work;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      let v = Math.round((d.base + (d.horizontal ? p.y : p.x) - d.start) / SNAP) * SNAP;
      // ほかの頂点（スタブの先など）とそろう位置に吸い付ける
      const others = d.work.filter((_, i) => i !== d.k && i !== d.k + 1).map((q) => (d.horizontal ? q.y : q.x));
      const hit = others.find((o) => Math.abs(o - v) <= ALIGN);
      if (hit !== undefined) v = hit;
      if (!moved && v === d.base) return;
      moved = true;
      last = d.work.map((q, i) => (i === d.k || i === d.k + 1 ? (d.horizontal ? { ...q, y: v } : { ...q, x: v }) : q));
      setRoute(last.slice(1, -1));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // 一直線にそろった頂点は取り除く（曲がりが減る）
      if (moved) setRoute(simplifyRoute(last).slice(1, -1));
      // ドラッグ中につまみが作り直されると、離したときのクリックがキャンバスに届いて選択が外れるため、1 回だけ止める
      if (moved) {
        const stop = (ev: MouseEvent) => ev.stopPropagation();
        window.addEventListener('click', stop, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // ダブルクリックした線分を中点で 2 つに分ける（曲げられる場所が増える）
  const splitSegment = (k: number) => {
    const a = inner[k];
    const b = inner[k + 1];
    const m = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    const work = [...inner.slice(0, k + 1), m, ...inner.slice(k + 1)];
    setRoute(work.slice(1, -1));
  };
  // ダブルクリックした角を取り除く（その次の頂点と一緒に消して段をなくす）
  const removeCorner = (j: number) => {
    const work = inner.filter((_, i) => i !== j && !(i === j + 1 && j + 1 < inner.length - 1));
    setRoute(simplifyRoute(orthogonalize(work, sSide === 'top' || sSide === 'bottom')).slice(1, -1));
  };

  const width = wireWidth(data?.sizeSq ?? 2);
  const isTube = !!data && isTubeType(data.wireType);

  return (
    <>
      {severity === 'error' && <path d={path} className="wire__alert" />}
      {selected && <path d={path} className="wire__selected" />}
      {isCable ? (
        <CableGraphics
          points={points}
          source={{ point: sPt, side: sSide, connector: geo!.sConnector! }}
          target={{ point: tPt, side: tSide, connector: geo!.tConnector! }}
        />
      ) : isTube ? (
        (geo?.direct ? DIRECT_STROKES : tubeStrokes(data.color, data.tubeOD)).map((st, i) => (
          <path key={i} d={path} fill="none" stroke={st.stroke} strokeWidth={st.width} strokeOpacity={st.opacity} strokeLinecap="round" strokeLinejoin="round" />
        ))
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
            [sPt.x, sPt.y, sSide],
            [tPt.x, tPt.y, tSide],
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
            style={{ transform: `translate(-50%, -100%) translate(${mid.x}px, ${mid.y - 10}px)` }}
          >
            {data?.wireNo || id}
            <span className="wire-label__spec">
              {isCable
                ? ` ケーブル（${geo?.sConnector?.kind}）`
                : isTube
                  ? geo?.direct
                    ? ' 直結（ねじ込み）'
                    : ` ${tubeModel(data.wireType, data.tubeOD ?? 6, data.color)}（φ${data.tubeOD ?? '?'}）`
                  : ` ${data?.wireType ?? ''} ${data?.sizeSq ?? ''}sq`}
            </span>
          </div>
        )}
        {selected &&
          inner.slice(0, -1).map((a, k) => {
            const b = inner[k + 1];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len < 14) return null;
            const horizontal = isHorizontal(a, b);
            return (
              <div
                key={`s${k}`}
                className={`wire-grip nodrag nopan ${horizontal ? 'is-horizontal' : 'is-vertical'}`}
                style={{ transform: `translate(-50%, -50%) translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2}px)` }}
                onPointerDown={onPointerDown(k)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  splitSegment(k);
                }}
                title="ドラッグで線分を移動、ダブルクリックで曲がりを増やす"
              />
            );
          })}
        {selected &&
          manual &&
          inner.slice(1, -1).map((p, i) => (
            <div
              key={`c${i}`}
              className="wire-corner nodrag nopan"
              style={{ transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                removeCorner(i + 1);
              }}
              title="ダブルクリックで曲がりを減らす"
            />
          ))}
      </EdgeLabelRenderer>
    </>
  );
}

export const WireEdge = memo(WireEdgeView);
