/**
 * 表を描くシート（部品表・ユニット構成図・表紙の目次など）の共通部品。
 * 座標は y が下向き（用紙の左上が原点）で受け取り、展開図 JSON の y が上向きの座標に直して書く。
 */
import type { Point, SchematicSheetOut, TextAlign } from '../format';
import { textWidth } from '../symbols';

export interface Column {
  title: string;
  /** 列の幅[mm] */
  width: number;
  align?: TextAlign;
}

export const TABLE_TEXT = 2.5;
export const TABLE_ROW = 6;

/** 列の幅に収まらない文字は末尾を「…」にする */
export function fitText(text: string, width: number, height = TABLE_TEXT): string {
  if (textWidth(text, height) <= width) return text;
  let out = '';
  for (const ch of text) {
    if (textWidth(`${out}${ch}…`, height) > width) break;
    out += ch;
  }
  return `${out}…`;
}

/** シートのページを作る（2 ページ目からは ID と名前に番号を付ける） */
export function pageMaker(sheet: { id: string; name: string }, paper: { width: number; height: number }) {
  const pages: SchematicSheetOut[] = [];
  const newPage = () => {
    const n = pages.length;
    const page: SchematicSheetOut = {
      id: n ? `${sheet.id}-${n + 1}` : sheet.id,
      name: n ? `${sheet.name}（${n + 1}）` : sheet.name,
      source: sheet.id,
      paper,
      inserts: [],
      polylines: [],
      dots: [],
      texts: [],
    };
    pages.push(page);
    return page;
  };
  return { pages, newPage };
}

/** y が下向きの点を、ページの y が上向きの点にする */
export const upOf = (page: SchematicSheetOut) => (x: number, y: number): Point => [x, page.paper.height - y];

/** 文字を書く（y は下向き。at は文字の高さの中央） */
export function putText(page: SchematicSheetOut, x: number, y: number, text: string, opts: { height?: number; align?: TextAlign; layer?: string } = {}) {
  if (!text) return;
  page.texts.push({ at: upOf(page)(x, y), text, height: opts.height ?? TABLE_TEXT, align: opts.align ?? 'left', layer: opts.layer ?? 'TEXT' });
}

/** 線を引く（y は下向き） */
export function putLine(page: SchematicSheetOut, points: [number, number][], layer = 'FRAME', closed = false) {
  const up = upOf(page);
  page.polylines.push({ points: points.map(([x, y]) => up(x, y)), layer, ...(closed ? { closed: true } : {}) });
}

/** 表の 1 行（見出しの行か中身の行）を書く */
function rowTexts(page: SchematicSheetOut, x: number, y: number, columns: Column[], cells: string[], rowH: number) {
  let cx = x;
  columns.forEach((c, i) => {
    // 文字の幅は目安なので、列の幅より少し狭く収める
    const text = fitText(cells[i] ?? '', c.width - 3.5);
    const align = c.align ?? 'left';
    const tx = align === 'left' ? cx + 1 : align === 'right' ? cx + c.width - 1 : cx + c.width / 2;
    putText(page, tx, y + rowH / 2, text, { align });
    cx += c.width;
  });
}

/** 表の罫線（top から bottom まで、行の高さ rowH ごと） */
function grid(page: SchematicSheetOut, x: number, top: number, bottom: number, columns: Column[], rowH: number) {
  const width = columns.reduce((a, c) => a + c.width, 0);
  putLine(page, [[x, top], [x + width, top], [x + width, bottom], [x, bottom]], 'FRAME', true);
  let cx = x;
  for (const c of columns.slice(0, -1)) {
    cx += c.width;
    putLine(page, [[cx, top], [cx, bottom]]);
  }
  for (let ry = top + rowH; ry < bottom - 0.01; ry += rowH) putLine(page, [[x, ry], [x + width, ry]]);
}

export interface TableSection {
  /** 表の上に書く見出し（省略可） */
  title?: string;
  columns: Column[];
  rows: string[][];
}

/**
 * 表を用紙の左上から列に流して並べ、収まらなければ次の列・次のページへ続ける（見出しに「（続き）」を付ける）。
 * top は最初のページで表を書きはじめる y（下向き）。
 */
export function flowTables(
  make: ReturnType<typeof pageMaker>,
  sections: TableSection[],
  opts: { top?: number; left?: number; gap?: number; rowH?: number; bottomMargin?: number } = {},
) {
  const rowH = opts.rowH ?? TABLE_ROW;
  const left = opts.left ?? 20;
  const gap = opts.gap ?? 12;
  const firstTop = opts.top ?? 20;
  let page = make.pages[make.pages.length - 1] ?? make.newPage();
  const W = page.paper.width;
  const bottom = page.paper.height - (opts.bottomMargin ?? 40);
  const width = Math.max(...sections.map((s) => s.columns.reduce((a, c) => a + c.width, 0)));
  const columns = Math.max(1, Math.floor((W - 2 * left + gap) / (width + gap)));
  let column = 0;
  let y = firstTop;
  const nextColumn = () => {
    column++;
    y = 20;
    if (column >= columns) {
      page = make.newPage();
      column = 0;
    }
  };
  const x0 = () => left + column * (width + gap);
  for (const sec of sections) {
    const titleH = sec.title ? 8 : 0;
    if (y + titleH + 2 * rowH > bottom) nextColumn();
    const header = (title?: string) => {
      if (title) putText(page, x0(), y + titleH / 2, title, { height: 3, layer: 'TAG' });
      y += titleH;
      const top = y;
      rowTexts(page, x0(), y, sec.columns, sec.columns.map((c) => c.title), rowH);
      y += rowH;
      return top;
    };
    let top = header(sec.title);
    for (const cells of sec.rows) {
      if (y + rowH > bottom) {
        grid(page, x0(), top, y, sec.columns, rowH);
        nextColumn();
        top = header(sec.title ? `${sec.title}（続き）` : undefined);
      }
      rowTexts(page, x0(), y, sec.columns, cells, rowH);
      y += rowH;
    }
    grid(page, x0(), top, y, sec.columns, rowH);
    y += gap / 2;
  }
}
