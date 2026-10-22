/**
 * 端子台接続図（kind: 'terminal'）。端子台ごとに、端子の両側の接続先と線番の表を作る。
 */
import { key, type Model } from '../../check/model';
import type { Diagram } from '../../model/diagram';
import type { Point, SchematicSheetOut } from '../format';
import type { ElementEntry } from '../layout';
import { textWidth } from '../symbols';


/** 表の列の幅[mm]: 接続先・線番・端子・線番・接続先 */
const TB_COLUMNS = [52, 20, 12, 20, 52];
const TB_WIDTH = TB_COLUMNS.reduce((a, b) => a + b, 0);
const TB_ROW = 6;
const TB_TITLE = 8;
const TB_GAP = 12;
/** 表を並べる範囲（y は下向き）。下は表題欄の上まで */
const TB_TOP = 20;
const TB_LEFT = 20;
const TB_TEXT = 2.5;

interface TerminalRow {
  no: string;
  left: { to: string; wireNo: string };
  right: { to: string; wireNo: string };
}

/**
 * 端子台接続図のページ。端子台ごとに、端子番号と、その端子の両側（端子 1 側 = 上段・ネジ、端子 2 側 = 下段・コネクタ）の
 * 接続先と線番の表を作り、列・ページに流して並べる。
 */
export function terminalPages(
  sh: { id: string; name: string; blocks?: string[] },
  diagram: Diagram,
  model: Model,
  elements: ElementEntry[],
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const { width: W, height: H } = paper;
  const up = (x: number, y: number): Point => [x, H - y];
  const blocks = [...new Set(elements.filter((e) => e.def.category === 'terminal').map((e) => e.device))].filter(
    (d) => !sh.blocks || sh.blocks.includes(d),
  );
  const cableName = (a: string, b: string) => {
    const [da, ta] = a.split(':');
    const [db, tb] = b.split(':');
    const ca = ta.split('#')[0];
    const cb = tb.split('#')[0];
    const w = diagram.wires.find(
      (x) =>
        (x.from.device === da && x.from.terminal === ca && x.to.device === db && x.to.terminal === cb) ||
        (x.to.device === da && x.to.terminal === ca && x.from.device === db && x.from.terminal === cb),
    );
    return w?.wireNo ?? '';
  };
  /** 接続先の名前（リンクはリンクの名前。長すぎるときは端子 ID だけ） */
  const nameOf = (k: string) => {
    const info = model.terminals.get(k);
    if (!info) return k.replace(':', '.');
    if (info.def.netLabel) return `リンク「${String(info.device.params?.[info.def.netLabel.param] ?? '').trim()}」`;
    const base = `${info.device.id}.${info.terminal.id}`;
    const label = info.terminal.label;
    const full = label && label !== info.terminal.id ? `${base}（${label}）` : base;
    return textWidth(full, TB_TEXT) <= TB_COLUMNS[0] - 4 ? full : base;
  };
  const side = (keys: string[]) => {
    const to: string[] = [];
    const nos: string[] = [];
    for (const k of keys) {
      for (const w of model.wiresAt.get(k) ?? []) {
        const other = key(w.from.device, w.from.terminal) === k ? key(w.to.device, w.to.terminal) : key(w.from.device, w.from.terminal);
        to.push(nameOf(other));
        if (w.wireNo) nos.push(w.wireNo);
      }
      for (const [a, b] of model.cablePairs) {
        if (a !== k && b !== k) continue;
        const other = a === k ? b : a;
        to.push(nameOf(other));
        const c = cableName(a, b);
        if (c) nos.push(c);
      }
    }
    return { to: [...new Set(to)].join(' / '), wireNo: [...new Set(nos)].join(',') };
  };

  const pages: SchematicSheetOut[] = [];
  const newPage = () => {
    const n = pages.length;
    const page: SchematicSheetOut = { id: n ? `${sh.id}-${n + 1}` : sh.id, name: n ? `${sh.name}（${n + 1}）` : sh.name, source: sh.id, paper, inserts: [], polylines: [], dots: [], texts: [] };
    pages.push(page);
    return page;
  };
  const columns = Math.max(1, Math.floor((W - 2 * TB_LEFT + TB_GAP) / (TB_WIDTH + TB_GAP)));
  const bottom = H - 40;
  let page = newPage();
  let column = 0;
  let y = TB_TOP;
  const nextColumn = () => {
    column++;
    y = TB_TOP;
    if (column >= columns) {
      page = newPage();
      column = 0;
    }
  };
  const x0 = () => TB_LEFT + column * (TB_WIDTH + TB_GAP);
  /** 表の見出し（端子台の名前と列の名前）を書き、表の上端の y を返す */
  const header = (title: string) => {
    const x = x0();
    page.texts.push({ at: up(x, y + TB_TITLE / 2), text: title, height: 3, align: 'left', layer: 'TAG' });
    y += TB_TITLE;
    const top = y;
    const names = ['接続先', '線番', '端子', '線番', '接続先'];
    let cx = x;
    names.forEach((n, i) => {
      page.texts.push({ at: up(cx + TB_COLUMNS[i] / 2, y + TB_ROW / 2), text: n, height: TB_TEXT, layer: 'TEXT' });
      cx += TB_COLUMNS[i];
    });
    y += TB_ROW;
    return top;
  };
  /** 表の枠と罫線（top から今の y まで） */
  const grid = (top: number) => {
    const x = x0();
    page.polylines.push({ points: [up(x, top), up(x + TB_WIDTH, top), up(x + TB_WIDTH, y), up(x, y)], closed: true, layer: 'FRAME' });
    let cx = x;
    for (const w of TB_COLUMNS.slice(0, -1)) {
      cx += w;
      page.polylines.push({ points: [up(cx, top), up(cx, y)], layer: 'FRAME' });
    }
    for (let ry = top + TB_ROW; ry < y - 0.01; ry += TB_ROW) page.polylines.push({ points: [up(x, ry), up(x + TB_WIDTH, ry)], layer: 'FRAME' });
  };

  if (!blocks.length) {
    page.texts.push({ at: up(TB_LEFT, TB_TOP + 4), text: '図面に端子台がありません', height: 3.5, align: 'left', layer: 'TEXT' });
    return pages;
  }
  for (const device of blocks) {
    const entries = elements.filter((e) => e.device === device && e.element.kind === 'terminal');
    if (!entries.length) continue;
    const def = entries[0].def;
    const rowsData: TerminalRow[] = entries.map((e) => {
      const byPin = (pin: string) => Object.entries(e.element.pinOf).filter(([, p]) => p === pin).map(([t]) => key(device, t));
      return { no: e.element.attributes.T1 ?? e.element.key, left: side(byPin('1')), right: side(byPin('2')) };
    });
    const title = `${device}  ${def.name}（${def.model}）`;
    if (y + TB_TITLE + 2 * TB_ROW > bottom) nextColumn();
    let top = header(title);
    for (const r of rowsData) {
      if (y + TB_ROW > bottom) {
        grid(top);
        nextColumn();
        top = header(`${title}（続き）`);
      }
      const x = x0();
      const cy = y + TB_ROW / 2;
      const cells: [number, string, 'left' | 'center' | 'right'][] = [
        [x + TB_COLUMNS[0] - 1, r.left.to, 'right'],
        [x + TB_COLUMNS[0] + TB_COLUMNS[1] / 2, r.left.wireNo, 'center'],
        [x + TB_COLUMNS[0] + TB_COLUMNS[1] + TB_COLUMNS[2] / 2, r.no, 'center'],
        [x + TB_WIDTH - TB_COLUMNS[4] - TB_COLUMNS[3] / 2, r.right.wireNo, 'center'],
        [x + TB_WIDTH - TB_COLUMNS[4] + 1, r.right.to, 'left'],
      ];
      for (const [cx, text, align] of cells) if (text) page.texts.push({ at: up(cx, cy), text, height: TB_TEXT, align, layer: 'TEXT' });
      y += TB_ROW;
    }
    grid(top);
    y += TB_GAP / 2;
  }
  return pages;
}
