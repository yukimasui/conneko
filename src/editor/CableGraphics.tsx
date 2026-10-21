/**
 * ケーブル（MIL ケーブルなどの多芯ケーブル、LAN ケーブル）の描画。
 *
 * 多芯ケーブルは、コネクタ付近で色付きの芯線が広がって見え、それが黒いシースにまとまっていく見た目にする。
 */
import type { ConnectorSpec, TerminalSide } from '../devices/types';
import { DIR, polylineLength, slicePolyline, toRoundedPath, type Point } from './routing';

/** 芯線の色（JIS の識別色の並びに近い順） */
const CORE_COLORS = ['#8b5a2b', '#d32f2f', '#f57c00', '#f2d21b', '#2e9d3a', '#1e5bd8', '#7b3fb5', '#8c939b', '#f5f5f5', '#1a1a1a'];

/** コネクタから芯線がシースにまとまるまでの長さ */
export const FAN_LENGTH = 46;

interface End {
  point: Point;
  side: TerminalSide;
  connector: ConnectorSpec;
}

function plug(end: End, key: string) {
  const d = DIR[end.side];
  const n = { x: -d.y, y: d.x };
  const w = end.connector.width;
  const depth = end.connector.pins > 0 ? 12 : 9;
  const c = { x: end.point.x + d.x * (depth / 2), y: end.point.y + d.y * (depth / 2) };
  const horizontal = n.x !== 0;
  const rw = horizontal ? w : depth;
  const rh = horizontal ? depth : w;
  if (end.connector.pins === 0) {
    // RJ45 プラグ（半透明のブーツ）
    return (
      <g key={key}>
        <rect x={c.x - rw / 2} y={c.y - rh / 2} width={rw} height={rh} rx={2} fill="rgba(200,225,245,0.85)" stroke="#5f7d95" strokeWidth={1} />
      </g>
    );
  }
  return (
    <g key={key}>
      <rect x={c.x - rw / 2} y={c.y - rh / 2} width={rw} height={rh} rx={2} fill="#3b3f45" stroke="#1d1f22" strokeWidth={1} />
      <rect
        x={c.x - rw / 2 + (horizontal ? 3 : 2)}
        y={c.y - rh / 2 + (horizontal ? 2 : 3)}
        width={rw - (horizontal ? 6 : 4)}
        height={rh - (horizontal ? 4 : 6)}
        rx={1.5}
        fill="none"
        stroke="#6b7078"
        strokeWidth={1}
      />
      {/* 両端のロックレバー */}
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={c.x + n.x * s * (w / 2 + 2) - (horizontal ? 2 : rw / 2 - 1)}
          y={c.y + n.y * s * (w / 2 + 2) - (horizontal ? rh / 2 - 1 : 2)}
          width={horizontal ? 4 : rw - 2}
          height={horizontal ? rh - 2 : 4}
          rx={1}
          fill="#55595f"
        />
      ))}
    </g>
  );
}

function fanOut(end: End, key: string) {
  const d = DIR[end.side];
  const n = { x: -d.y, y: d.x };
  const count = Math.min(CORE_COLORS.length, Math.max(4, Math.round(end.connector.width / 7)));
  const spread = end.connector.width * 0.8;
  const start = 12;
  const p = (along: number, across: number) => ({ x: end.point.x + d.x * along + n.x * across, y: end.point.y + d.y * along + n.y * across });
  return (
    <g key={key}>
      {Array.from({ length: count }, (_, i) => {
        const off = count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1);
        const a = p(start, off);
        const c1 = p(start + 8, off);
        const c2 = p(FAN_LENGTH * 0.55, off * 0.15);
        const b = p(FAN_LENGTH, off * 0.05);
        const dPath = `M ${a.x} ${a.y} L ${c1.x} ${c1.y} C ${c2.x} ${c2.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
        const color = CORE_COLORS[i % CORE_COLORS.length];
        return (
          <g key={i}>
            <path d={dPath} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={2.6} strokeLinecap="round" />
            <path d={dPath} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

export function CableGraphics({ points, source, target }: { points: Point[]; source: End; target: End }) {
  const multiCore = source.connector.pins > 0;
  const total = polylineLength(points);
  if (!multiCore) {
    // LAN ケーブル
    const body = toRoundedPath(slicePolyline(points, 8, total - 8), 10);
    return (
      <>
        <path d={body} fill="none" stroke="#2f5f86" strokeWidth={6} strokeLinecap="round" />
        <path d={body} fill="none" stroke="#5b9bd5" strokeWidth={4} strokeLinecap="round" />
        {plug(source, 's')}
        {plug(target, 't')}
      </>
    );
  }
  const fan = Math.min(FAN_LENGTH, total / 2 - 2);
  const sheath = toRoundedPath(slicePolyline(points, fan - 2, total - fan + 2), 12);
  const cap = (from: number, to: number) => toRoundedPath(slicePolyline(points, from, to));
  return (
    <>
      {fanOut(source, 's')}
      {fanOut(target, 't')}
      <path d={sheath} fill="none" stroke="#0e0f10" strokeWidth={9} strokeLinecap="round" />
      <path d={sheath} fill="none" stroke="#2c2e31" strokeWidth={6} strokeLinecap="round" />
      <path d={sheath} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.6} strokeLinecap="round" />
      {/* シース端部の熱収縮チューブ */}
      <path d={cap(fan - 4, fan + 6)} fill="none" stroke="#111" strokeWidth={11} />
      <path d={cap(total - fan - 6, total - fan + 4)} fill="none" stroke="#111" strokeWidth={11} />
      {plug(source, 's')}
      {plug(target, 't')}
    </>
  );
}
