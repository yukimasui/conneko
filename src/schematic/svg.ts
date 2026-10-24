/**
 * 展開図 JSON（conneko-schematic）のシートを SVG に描く。
 *
 * Python（DXF）と同じ図形の定義から描くので、エディタのプレビューと DXF の見た目が一致する。
 * 展開図 JSON は y が上向きなので、シート全体を上下反転した座標系で描き、文字だけを反転し直す。
 */
import type { Point, Primitive, SchematicExport, SchematicSheetOut, SymbolDef, TextAlign } from './format';

/** 線の太さ[mm] */
const STROKE = 0.25;
/** 破線の模様[mm]（Python の線種 CONNEKO_DASH と同じ） */
const DASH = '1 0.5';
/** 文字の高さ（DXF の文字高さ＝大文字の高さ）から SVG の font-size への倍率 */
const FONT_SCALE = 1 / 0.72;
const FONT = "'MS Gothic','Noto Sans CJK JP','Noto Sans JP',sans-serif";

const n = (v: number) => String(Math.round(v * 1000) / 1000);

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ANCHOR: Record<TextAlign, string> = { left: 'start', center: 'middle', right: 'end' };

function textSvg(at: Point, s: string, height: number, align: TextAlign = 'center', rotation = 0, color = 'currentColor'): string {
  if (!s) return '';
  // 上下反転した座標系の中で、文字だけを反転し直す（回転は反時計回り）
  const rot = rotation ? ` rotate(${n(-rotation)})` : '';
  return (
    `<text transform="translate(${n(at[0])} ${n(at[1])}) scale(1 -1)${rot}" font-size="${n(height * FONT_SCALE)}" ` +
    `text-anchor="${ANCHOR[align]}" dominant-baseline="central" fill="${color}" stroke="none">${escape(s)}</text>`
  );
}

function primitiveSvg(p: Primitive): string {
  switch (p.kind) {
    case 'line': {
      const pts = p.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
      const dash = p.dashed ? ` stroke-dasharray="${DASH}"` : '';
      return p.closed ? `<polygon points="${pts}"${dash}/>` : `<polyline points="${pts}"${dash}/>`;
    }
    case 'circle':
      return `<circle cx="${n(p.center[0])}" cy="${n(p.center[1])}" r="${n(p.r)}"/>`;
    case 'arc': {
      const rad = (a: number) => (a * Math.PI) / 180;
      const [cx, cy] = p.center;
      const sweep = (((p.end - p.start) % 360) + 360) % 360 || 360;
      const x1 = cx + p.r * Math.cos(rad(p.start));
      const y1 = cy + p.r * Math.sin(rad(p.start));
      const x2 = cx + p.r * Math.cos(rad(p.end));
      const y2 = cy + p.r * Math.sin(rad(p.end));
      // y が上向きの座標系なので、反時計回りは sweep-flag = 1
      return `<path d="M${n(x1)} ${n(y1)} A${n(p.r)} ${n(p.r)} 0 ${sweep > 180 ? 1 : 0} 1 ${n(x2)} ${n(y2)}"/>`;
    }
    case 'text':
      return textSvg(p.at, p.text, p.height, p.align);
  }
}

/**
 * 記号の回転で、属性の文字が逆さ（180°）か上から読む向き（270°）になるか。
 * そうなる文字は 180° 回して読める向き（0° か下から読む 90°）にする（Python の upside_down と同じ）
 */
export function upsideDown(rotation = 0): boolean {
  const r = ((Math.round(rotation) % 360) + 360) % 360;
  return r === 180 || r === 270;
}

const SWAP_ALIGN: Record<TextAlign, TextAlign> = { left: 'right', center: 'center', right: 'left' };

/**
 * 記号を、属性の値を入れて描く（記号の座標系。y は上向き）。rotation は配置したときの記号の回転で、
 * 逆さになる属性の文字は 180° 回し、左寄せ・右寄せを入れ替えて記号の外側へ伸ばす
 */
export function symbolSvg(def: SymbolDef, attributes: Record<string, string> = {}, tagColor = 'currentColor', rotation = 0): string {
  const body = def.primitives.map(primitiveSvg).join('');
  const flip = upsideDown(rotation);
  const attrs = def.attributes
    .map((a) => textSvg(a.at, attributes[a.tag] ?? '', a.height, flip ? SWAP_ALIGN[a.align ?? 'center'] : a.align, flip ? 180 : 0, tagColor))
    .join('');
  return body + attrs;
}

/** レイヤーの色（画面用。AutoCAD の色番号のうち使うものだけ） */
const LAYER_COLORS: Record<number, string> = { 1: '#d00', 2: '#b58900', 3: '#1a8f3a', 4: '#0aa', 5: '#22c', 6: '#b0b', 7: '#111' };

/** シートの図形（viewBox = "0 0 用紙の幅 高さ" の <svg> の中に入れる <g>）。y は下向きの画面の座標にして描く */
export function sheetSvgBody(doc: SchematicExport, sheet: SchematicSheetOut): string {
  const color = (layer: string) => LAYER_COLORS[doc.layers[layer]?.color ?? 7] ?? '#111';
  const { height } = sheet.paper;
  const parts: string[] = [];
  for (const pl of sheet.polylines) {
    parts.push(`<g stroke="${color(pl.layer)}">${primitiveSvg({ kind: 'line', points: pl.points, closed: pl.closed, dashed: pl.dashed })}</g>`);
  }
  for (const ins of sheet.inserts) {
    const def = doc.symbols[ins.symbol];
    if (!def) continue;
    const rot = ins.rotation ? ` rotate(${n(ins.rotation)})` : '';
    parts.push(
      `<g transform="translate(${n(ins.at[0])} ${n(ins.at[1])})${rot}" stroke="${color(ins.layer)}" color="${color(ins.layer)}">` +
        symbolSvg(def, ins.attributes, color('TAG'), ins.rotation) +
        '</g>',
    );
  }
  for (const d of sheet.dots) parts.push(`<circle cx="${n(d.at[0])}" cy="${n(d.at[1])}" r="0.6" fill="${color(d.layer)}" stroke="none"/>`);
  for (const t of sheet.texts) parts.push(textSvg(t.at, t.text, t.height, t.align, t.rotation, color(t.layer)));
  return (
    `<g transform="translate(0 ${height}) scale(1 -1)" fill="none" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT}">` +
    parts.join('') +
    '</g>'
  );
}

/** シートを 1 枚の SVG にする（白い背景つき） */
export function sheetSvg(doc: SchematicExport, sheet: SchematicSheetOut): string {
  const { width, height } = sheet.paper;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    sheetSvgBody(doc, sheet) +
    '</svg>'
  );
}
