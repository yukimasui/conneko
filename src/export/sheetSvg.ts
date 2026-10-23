/**
 * シートを 1 枚の SVG にする（印刷・PDF・画像保存用）。
 * 機器は定義の SVG、電線は画面と同じ経路の計算（editor/geometry.ts）で描く。
 * 画面の多芯ケーブルの芯線の広がりなどは省き、印刷で読みやすい形にする。
 */
import { getWireColor } from '../data/wires';
import { instantiateSvg } from '../devices/registry';
import { deviceModel, deviceSize, type DeviceDefinition, type ParamValues } from '../devices/types';
import { cableStyle } from '../devices/resolve';
import { linkSidesOf, wireLayout, wirePoints } from '../editor/geometry';
import { DIR, toRoundedPath, type Point } from '../editor/routing';
import { tubeStrokes } from '../editor/tubeStyle';
import { wireWidth } from '../editor/WireEdge';
import { computeBus, effectiveParams, mountedPositions } from '../model/bus';
import { CABLE_WIRE_TYPE, isTube, sheetOf, sheetsOf, type Diagram, type DiagramDevice } from '../model/diagram';
import { linkKey } from '../model/ops';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface SheetSvgOptions {
  /** 線番（マークチューブ）を描く */
  markers?: boolean;
  /** 機器のコメントを描く */
  notes?: boolean;
}

export interface SheetSvg {
  svg: string;
  width: number;
  height: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MARGIN = 30;
/** 機器名のラベル・コメントのぶん、機器の上に空ける高さ */
const LABEL_SPACE = 34;

/** シートの機器（装着したユニットは親に並べた位置） */
function sheetDevices(d: Diagram, sheetId: string, lookup: DefLookup): DiagramDevice[] {
  const pos = mountedPositions(d.devices, lookup);
  return d.devices.filter((x) => sheetOf(d, x) === sheetId).map((x) => ({ ...x, ...(pos.get(x.id) ?? {}) }));
}

export function renderSheetSvg(d: Diagram, sheetId: string, lookup: DefLookup, opts: SheetSvgOptions = {}): SheetSvg {
  const { markers = true, notes = true } = opts;
  const bus = computeBus(d.devices, lookup);
  const devices = sheetDevices(d, sheetId, lookup);
  const ids = new Set(devices.map((x) => x.id));
  const wires = d.wires.filter((w) => ids.has(w.from.device) && ids.has(w.to.device));
  const base = new Map<string, ParamValues | undefined>(d.devices.map((x) => [x.id, effectiveParams(x, bus)]));
  const sides = linkSidesOf(devices, wires, (id) => base.get(id), lookup);
  const paramsOf = (id: string) => (sides.has(id) ? { ...base.get(id), side: sides.get(id)! } : base.get(id));
  const { geometry, lanes } = wireLayout(devices, wires, paramsOf, lookup);

  // 範囲（機器、ラベル、電線の折れ線）
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const x of devices) {
    const def = lookup(x.type);
    if (!def) continue;
    grow(x.x, x.y - (def.netLabel ? 4 : LABEL_SPACE + (notes && x.note ? 18 : 0)));
    const size = deviceSize(def, paramsOf(x.id));
    grow(x.x + Math.max(size.width, 120), x.y + size.height + (def.netLabel ? 16 : 4));
  }
  const paths = wires.flatMap((w) => {
    const geo = geometry.get(w.id);
    if (!geo) return [];
    const pts = wirePoints(w, geo, lanes);
    for (const p of pts) grow(p.x, p.y);
    return [{ w, geo, pts }];
  });
  if (!Number.isFinite(minX)) {
    minX = minY = 0;
    maxX = 400;
    maxY = 200;
  }
  const W = Math.ceil(maxX - minX + MARGIN * 2);
  const H = Math.ceil(maxY - minY + MARGIN * 2);
  const ox = MARGIN - minX;
  const oy = MARGIN - minY;
  const tx = (p: Point) => ({ x: p.x + ox, y: p.y + oy });

  const out: string[] = [];
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // 機器
  const sheets = sheetsOf(d);
  const peers = new Map<string, string[]>();
  for (const x of d.devices) {
    const def = lookup(x.type);
    if (!def?.netLabel) continue;
    const k = linkKey(x.type, String(x.params?.name ?? '').trim());
    peers.set(k, [...(peers.get(k) ?? []), sheetOf(d, x)]);
  }
  for (const x of devices) {
    const def = lookup(x.type);
    if (!def) continue;
    const px = x.x + ox;
    const py = x.y + oy;
    const inner = instantiateSvg(def, `p-${sheetId}-${x.id}`, paramsOf(x.id));
    const { width, height } = deviceSize(def, paramsOf(x.id));
    out.push(`<svg x="${px}" y="${py}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible">${inner}</svg>`);
    if (def.netLabel) {
      // リンク: 相手のあるシート
      const k = linkKey(x.type, String(paramsOf(x.id)?.name ?? '').trim());
      const others = [...new Set((peers.get(k) ?? []).filter((s) => s !== sheetId))].map((s) => sheets.find((v) => v.id === s)?.name ?? s);
      const text = others.length ? `→ ${others.join('、')}` : (peers.get(k)?.length ?? 0) > 1 ? '→ このシート' : '相手なし';
      out.push(`<text x="${px + 6}" y="${py + height + 11}" font-family="sans-serif" font-size="9" fill="#1d4ed8">${esc(text)}</text>`);
      continue;
    }
    out.push(
      `<text x="${px}" y="${py - 8}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#111827">${esc(x.id)}<tspan font-size="9" font-weight="normal" fill="#6b7280" dx="6">${esc(deviceModel(def, paramsOf(x.id)))}</tspan></text>`,
    );
    if (notes && x.note) {
      const w = Math.min(240, 14 + x.note.length * 10);
      out.push(`<rect x="${px}" y="${py - 42}" width="${w}" height="16" rx="8" fill="#fff8db" stroke="#f1d27a"/>`);
      out.push(`<text x="${px + 8}" y="${py - 30.5}" font-family="sans-serif" font-size="10" font-weight="bold" fill="#713f12">${esc(x.note)}</text>`);
    }
  }

  // 電線（機器の上に描く）
  for (const { w, geo, pts } of paths) {
    const d0 = toRoundedPath(pts.map(tx));
    if (w.wireType === CABLE_WIRE_TYPE && geo.sConnector && geo.tConnector) {
      const lan = cableStyle(geo.sConnector) === 'lan';
      const round = cableStyle(geo.sConnector) === 'round';
      const color = lan ? '#5b9bd5' : round ? '#9aa1a8' : '#2c2e31';
      out.push(`<path d="${d0}" fill="none" stroke="#111" stroke-width="${lan ? 6 : 8}" stroke-linecap="round"/>`);
      out.push(`<path d="${d0}" fill="none" stroke="${color}" stroke-width="${lan ? 4 : 6}" stroke-linecap="round"/>`);
      if (w.wireNo) {
        const mid = tx(pts[Math.floor(pts.length / 2)]);
        out.push(`<rect x="${mid.x - 3 - w.wireNo.length * 3}" y="${mid.y - 7}" width="${6 + w.wireNo.length * 6}" height="12" rx="2" fill="#fffbe6" stroke="#b8a660"/>`);
        out.push(`<text x="${mid.x}" y="${mid.y + 2.5}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold">${esc(w.wireNo)}</text>`);
      }
      continue;
    }
    if (isTube(w)) {
      for (const st of tubeStrokes(w.color, w.tubeOD)) {
        out.push(`<path d="${d0}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}"${st.opacity !== undefined ? ` stroke-opacity="${st.opacity}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`);
      }
      continue;
    }
    const color = getWireColor(w.color);
    const width = wireWidth(w.sizeSq);
    out.push(`<path d="${d0}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="${width + 1.6}" stroke-linecap="round"/>`);
    out.push(`<path d="${d0}" fill="none" stroke="${color?.hex ?? '#1a1a1a'}" stroke-width="${width}" stroke-linecap="round"/>`);
    if (color?.stripeHex) out.push(`<path d="${d0}" fill="none" stroke="${color.stripeHex}" stroke-width="${width}" stroke-dasharray="6 6"/>`);
    if (markers && w.wireNo) {
      for (const [c, side] of [
        [geo.sCenter, geo.sSide],
        [geo.tCenter, geo.tSide],
      ] as const) {
        const p = tx({ x: c.x + DIR[side].x * 15, y: c.y + DIR[side].y * 15 });
        const vertical = side === 'top' || side === 'bottom';
        const len = 6 + w.wireNo.length * 5.2;
        out.push(
          `<g transform="translate(${p.x} ${p.y})${vertical ? ' rotate(-90)' : ''}"><rect x="${-len / 2}" y="-5.5" width="${len}" height="11" rx="2" fill="#fbfbf7" stroke="#b9bfc8"/><text x="0" y="3" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1f2933">${esc(w.wireNo)}</text></g>`,
        );
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out.join('\n')}</svg>`;
  return { svg, width: W, height: H };
}
