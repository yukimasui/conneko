/**
 * PLC のユニット構成図（kind: 'rack'）。CPU・ベースユニットと装着したユニットを位置の順に並べた図と、
 * 位置・型式・入出力番号の範囲・内部電源の消費の表、内部電源の収支を書く。
 */
import type { DefLookup, Model } from '../../check/model';
import { ioName } from '../../devices/resolve';
import { resolveNum } from '../../devices/types';
import type { DiagramDevice } from '../../model/diagram';
import type { SchematicSheetOut } from '../format';
import { fitText, flowTables, pageMaker, putLine, putText, type Column } from './table';

const BOX_W = 32;
const HOST_W = 40;
const BOX_H = 62;
const BOX_TOP = 34;
const LEFT = 25;

const COLUMNS: Column[] = [
  { title: '位置', width: 16, align: 'center' },
  { title: '機器名', width: 22 },
  { title: '型式', width: 42 },
  { title: '名称', width: 60 },
  { title: '入力', width: 48 },
  { title: '出力', width: 48 },
  { title: '内部電源の消費', width: 40 },
];

const ROLE_NAMES: Record<string, string> = { power: '電源', cpu: 'CPU' };

/** 入出力番号の範囲（例: 'R000〜R115（32 点）'） */
function range(format: Parameters<typeof ioName>[0], dir: 'in' | 'out', start: number, count: number): string {
  if (!count) return '';
  return `${ioName(format, dir, start)}〜${ioName(format, dir, start + count - 1)}（${count} 点）`;
}

/** 文字列を幅に収まるよう 2 行に分ける */
function twoLines(text: string, width: number, height: number): string[] {
  if (fitText(text, width, height) === text) return [text];
  const chars = [...text];
  for (let i = chars.length - 1; i > 0; i--) {
    const head = chars.slice(0, i).join('');
    if (fitText(head, width, height) === head) return [head, fitText(chars.slice(i).join(''), width, height)];
  }
  return [fitText(text, width, height)];
}

/** ユニット構成図にできる PLC（ユニットを装着できる親）の機器名 */
export function rackHosts(model: Model): string[] {
  return [...model.bus.groups.keys()];
}

export function rackPages(
  sheet: { id: string; name: string; plc?: string },
  model: Model,
  lookup: DefLookup,
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const make = pageMaker(sheet, paper);
  const page = make.newPage();
  const groups = model.bus.groups;
  const group = (sheet.plc ? groups.get(sheet.plc) : undefined) ?? [...groups.values()][0];
  if (!group) {
    putText(page, 20, 24, '図面に PLC（ユニットを装着できる CPU・ベースユニットなど）がありません', { height: 3.5 });
    return make.pages;
  }
  const hostDef = lookup(group.host.type);
  putText(page, 20, 20, `${group.host.id}  ${hostDef?.model ?? group.host.type} のユニット構成`, { height: 4, layer: 'TAG' });

  const units: DiagramDevice[] = [group.host, ...group.members];
  const rows: string[][] = [];
  let x = LEFT;
  let y = BOX_TOP;
  units.forEach((u) => {
    const def = lookup(u.type);
    if (!def) return;
    const params = { ...u.params, ...model.bus.params.get(u.id) };
    const isHost = u === group.host;
    const w = isHost ? HOST_W : BOX_W;
    if (x + w > paper.width - 20) {
      x = LEFT;
      y += BOX_H + 10;
    }
    const slot = isHost ? '本体' : String(u.mount?.slot ?? '');
    const role = def.bus?.role ? ROLE_NAMES[def.bus.role] ?? def.bus.role : '';
    const io = def.bus?.io;
    const inputs = io?.inputs ?? 0;
    const outputs = io?.outputs ?? 0;
    const reserve = io?.reserve ?? 0;
    // 占有するだけの点数（内部リレーなど）は入力の後ろ
    const reserveRange = io ? range(io.format, 'in', Number(params.ioIn ?? 0) + inputs, reserve) : '';
    const inRange = io ? [range(io.format, 'in', Number(params.ioIn ?? 0), inputs), reserveRange && `占有 ${reserveRange}`].filter(Boolean).join(' ') : '';
    const outRange = io ? range(io.format, 'out', Number(params.ioOut ?? 0), outputs) : '';
    const load = Object.entries(def.bus?.load ?? {})
      .map(([rail, v]) => `${rail} ${resolveNum(v, def, params) ?? 0}A`)
      .join('・');

    // ユニットの図
    putLine(page, [[x, y], [x + w, y], [x + w, y + BOX_H], [x, y + BOX_H]], 'SYMBOL', true);
    putLine(page, [[x, y + 8], [x + w, y + 8]], 'SYMBOL');
    const cx = x + w / 2;
    putText(page, cx, y + 4, isHost ? '本体' : `位置 ${slot}${role ? `（${role}）` : ''}`, { height: 2.2, align: 'center' });
    putText(page, cx, y + 13, u.id, { height: 3, align: 'center', layer: 'TAG' });
    putText(page, cx, y + 19, fitText(def.model, w - 2, 2.2), { height: 2.2, align: 'center' });
    twoLines(def.name, w - 2, 2).forEach((line, i) => putText(page, cx, y + 25 + i * 3.5, line, { height: 2, align: 'center' }));
    let ty = y + 36;
    for (const [label, text] of [[inputs ? '入力' : '占有', inputs ? inRange : reserveRange], ['出力', outRange]] as const) {
      if (!text) continue;
      putText(page, cx, ty, label, { height: 2, align: 'center' });
      putText(page, cx, ty + 3.5, fitText(text.replace(/（.*$/, ''), w - 2, 2), { height: 2, align: 'center' });
      ty += 9;
    }
    x += w;
    rows.push([slot, u.id, def.model, def.name, inRange, outRange, load]);
  });

  // 表と内部電源の収支
  const tableTop = y + BOX_H + 12;
  flowTables(make, [{ title: 'ユニットの一覧', columns: COLUMNS, rows }], { top: tableTop });
  const last = make.pages[make.pages.length - 1];
  const budgetY = last === page ? tableTop + 8 + (rows.length + 1) * 6 + 8 : 20;
  group.rails.forEach((r, i) => {
    const over = r.load > r.supply;
    putText(last, 20, budgetY + i * 5, `内部電源 ${r.rail}: 消費 ${Math.round(r.load * 1000) / 1000}A / 供給 ${r.supply}A${over ? '（容量を超えています）' : ''}`, {
      height: 2.5,
      layer: over ? 'TAG' : 'TEXT',
    });
  });
  return make.pages;
}
