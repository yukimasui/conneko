/**
 * ケーブル（MIL ケーブルなどの多芯ケーブル、LAN ケーブル）の描画。
 *
 * 多芯ケーブルは、コネクタ付近で色付きの芯線が広がって見え、それが黒いシースにまとまっていく見た目にする。
 */
import { getWireColor } from '../data/wires';
import { cableStyle } from '../devices/resolve';
import type { ConnectorSpec, TerminalSide } from '../devices/types';
import { HANDLE_DEPTH } from './DeviceNode';
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

/** プラグの奥行き（side 方向の長さ）と、ケーブルが出る位置（端子からの距離） */
function plugDepth(c: ConnectorSpec): { depth: number; exit: number } {
  if (c.facing === 'front') {
    // 端点は Handle の side 側の端（コネクタ中心から HANDLE_DEPTH / 2 の位置）
    const depth = c.length ?? 12;
    return { depth, exit: depth / 2 - HANDLE_DEPTH / 2 };
  }
  const depth = cableStyle(c) === 'multicore' ? 12 : cableStyle(c) === 'round' ? 14 : 9;
  return { depth, exit: depth };
}

function plug(end: End, key: string) {
  const d = DIR[end.side];
  const n = { x: -d.y, y: d.x };
  const style = cableStyle(end.connector);
  const w = style === 'round' ? Math.min(end.connector.width, 14) : end.connector.width;
  const { depth } = plugDepth(end.connector);
  // 正面向きのコネクタは端子位置を中心に、それ以外は端子から side の向きに描く
  const offset = end.connector.facing === 'front' ? -HANDLE_DEPTH / 2 : depth / 2;
  const c = { x: end.point.x + d.x * offset, y: end.point.y + d.y * offset };
  const horizontal = n.x !== 0;
  const rw = horizontal ? w : depth;
  const rh = horizontal ? depth : w;
  if (style === 'round') {
    // M8 / M12 などの丸形コネクタ（ローレット付きのナット）
    const knurl = Array.from({ length: 5 }, (_, i) => {
      const f = -0.35 + (0.7 * i) / 4;
      const x = c.x + n.x * f * w;
      const y = c.y + n.y * f * w;
      return horizontal ? (
        <line key={i} x1={x} y1={c.y - rh / 2 + 1.5} x2={x} y2={c.y + rh / 2 - 1.5} stroke="#8d939a" strokeWidth={0.8} />
      ) : (
        <line key={i} x1={c.x - rw / 2 + 1.5} y1={y} x2={c.x + rw / 2 - 1.5} y2={y} stroke="#8d939a" strokeWidth={0.8} />
      );
    });
    return (
      <g key={key}>
        <rect x={c.x - rw / 2} y={c.y - rh / 2} width={rw} height={rh} rx={2.5} fill="#c7ccd1" stroke="#6b7178" strokeWidth={1} />
        {knurl}
      </g>
    );
  }
  if (style === 'lan') {
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
      {/* 両端のロック（FCN はねじ、MIL はレバー） */}
      {end.connector.kind.startsWith('FCN')
        ? [-1, 1].map((s) => (
            <circle key={s} cx={c.x + n.x * s * (w / 2 + 3)} cy={c.y + n.y * s * (w / 2 + 3)} r={2.6} fill="#b9bec4" stroke="#55595f" strokeWidth={0.8} />
          ))
        : [-1, 1].map((s) => (
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

/** 芯線の色。pinColors があればピン番号順にその色、なければ識別色の並び */
function coreColors(c: ConnectorSpec): string[] {
  if (c.pinColors && Object.keys(c.pinColors).length) {
    return Object.entries(c.pinColors)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, id]) => getWireColor(id)?.hex ?? '#888');
  }
  const count = Math.min(CORE_COLORS.length, Math.max(4, Math.round(c.width / 7)));
  return CORE_COLORS.slice(0, count);
}

function fanOut(end: End, key: string) {
  const d = DIR[end.side];
  const n = { x: -d.y, y: d.x };
  const colors = coreColors(end.connector);
  const count = colors.length;
  const spread = Math.max(end.connector.width, 14) * 0.8;
  const start = plugDepth(end.connector).exit;
  const p = (along: number, across: number) => ({ x: end.point.x + d.x * along + n.x * across, y: end.point.y + d.y * along + n.y * across });
  return (
    <g key={key}>
      {Array.from({ length: count }, (_, i) => {
        const off = count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1);
        const a = p(start, off);
        const c1 = p(start + 8, off);
        const len = FAN_LENGTH + start - 12;
        const c2 = p(len * 0.55 + start * 0.3, off * 0.15);
        const b = p(len, off * 0.05);
        const dPath = `M ${a.x} ${a.y} L ${c1.x} ${c1.y} C ${c2.x} ${c2.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
        const color = colors[i];
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
  const style = cableStyle(source.connector);
  const total = polylineLength(points);
  const sExit = plugDepth(source.connector).exit;
  const tExit = plugDepth(target.connector).exit;
  if (style === 'round') {
    // センサーケーブル（灰色の丸いシース）
    const body = toRoundedPath(slicePolyline(points, sExit, total - tExit), 10);
    return (
      <>
        <path d={body} fill="none" stroke="#4b5056" strokeWidth={5} strokeLinecap="round" />
        <path d={body} fill="none" stroke="#9aa1a8" strokeWidth={3.4} strokeLinecap="round" />
        {plug(source, 's')}
        {plug(target, 't')}
      </>
    );
  }
  if (style === 'lan') {
    // LAN ケーブル
    const body = toRoundedPath(slicePolyline(points, sExit - 1, total - tExit + 1), 10);
    return (
      <>
        <path d={body} fill="none" stroke="#2f5f86" strokeWidth={6} strokeLinecap="round" />
        <path d={body} fill="none" stroke="#5b9bd5" strokeWidth={4} strokeLinecap="round" />
        {plug(source, 's')}
        {plug(target, 't')}
      </>
    );
  }
  const sFan = Math.min(FAN_LENGTH + sExit - 12, total / 2 - 2);
  const tFan = Math.min(FAN_LENGTH + tExit - 12, total / 2 - 2);
  const sheath = toRoundedPath(slicePolyline(points, sFan - 2, total - tFan + 2), 12);
  const cap = (from: number, to: number) => toRoundedPath(slicePolyline(points, from, to));
  return (
    <>
      {fanOut(source, 's')}
      {fanOut(target, 't')}
      <path d={sheath} fill="none" stroke="#0e0f10" strokeWidth={9} strokeLinecap="round" />
      <path d={sheath} fill="none" stroke="#2c2e31" strokeWidth={6} strokeLinecap="round" />
      <path d={sheath} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.6} strokeLinecap="round" />
      {/* シース端部の熱収縮チューブ */}
      <path d={cap(sFan - 4, sFan + 6)} fill="none" stroke="#111" strokeWidth={11} />
      <path d={cap(total - tFan - 6, total - tFan + 4)} fill="none" stroke="#111" strokeWidth={11} />
      {plug(source, 's')}
      {plug(target, 't')}
    </>
  );
}
