/**
 * PLC の I/O 図（kind: 'io'）。ユニットごとに、端子・アドレス・コメントの表を左に並べ、各行から相手の機器
 * （接点・ランプ・コイルは記号、センサーなどは小さな箱）を通って右の電源側・戻り側の母線へ線を引く。
 * 同じ機器がほかの展開図に置いてあっても描く（I/O 図は同じ機器の別の見え方）。
 * 網は主回路の機器以外の中の常時導通を素通しにしたもの（端子台・リンクを飛ばして相手を探す）。
 */
import { key, type DefLookup, type Model } from '../../check/model';
import { ioHosts, ioSystem } from '../../model/io';
import type { Diagram } from '../../model/diagram';
import { pinNumber, splitIoLabel } from '../elements';
import type { Point, SchematicSheetOut, SymbolDef } from '../format';
import type { ElementEntry } from '../layout';
import { splitRail, type Rails } from '../model';
import { pinPoint } from '../place';
import { librarySymbol, textWidth } from '../symbols';
import { fitText, pageMaker, putLine, putText, type Column } from './table';

const COLUMNS: Column[] = [
  { title: '端子', width: 14, align: 'center' },
  { title: 'アドレス', width: 22, align: 'center' },
  { title: 'コメント', width: 50 },
];
const TABLE_X = 20;
const TABLE_W = COLUMNS.reduce((a, c) => a + c.width, 0);
const HEADER_TOP = 30;
const HEADER_H = 6;
/** 行の間隔（相手の機器の記号が入る高さ）[mm] */
const ROW_H = 10;
/** 相手の機器の左の端子の x */
const PARTNER_X = 140;
/** 相手として探す要素の種類（先にあるものを優先する） */
const PARTNER_KINDS = ['contact', 'coil', 'lamp', 'box'];

export interface IoContext {
  diagram: Diagram;
  lookup: DefLookup;
  model: Model;
  elements: ElementEntry[];
  /** 端子の網（端子台などを素通しにしたもの） */
  netOf(device: string, terminal: string): string;
  /** 網の線番 */
  wireNoOf(net: string): string;
  /** I/O 図で使う記号を展開図 JSON に加える */
  addSymbol(id: string, def: SymbolDef): void;
}

/** I/O 図にできる PLC（I/O を持つ親）の機器名 */
export function ioPlcHosts(diagram: Diagram, lookup: DefLookup): string[] {
  return ioHosts(diagram, lookup);
}

/** センサーなどの箱を、I/O 図用の小さな箱にする（信号の端子を左、電源の端子を右に） */
function fieldBox(device: string, model: string, left: string, right: string[]): SymbolDef {
  const W = 30;
  const primitives: SymbolDef['primitives'] = [
    { kind: 'line', points: [[2.5, -4], [W - 2.5, -4], [W - 2.5, 4], [2.5, 4]], closed: true },
    { kind: 'line', points: [[0, 0], [2.5, 0]] },
    { kind: 'text', at: [3.3, 0], text: left, height: 1.6, align: 'left' },
    { kind: 'text', at: [W / 2, 1.6], text: fitText(device, 14, 2.2), height: 2.2, align: 'center' },
    { kind: 'text', at: [W / 2, -1.6], text: fitText(model, 14, 1.6), height: 1.6, align: 'center' },
  ];
  const pins: Record<string, Point> = { [left]: [0, 0] };
  const pinDirs: Record<string, Point> = { [left]: [-1, 0] };
  const ys = right.length > 1 ? [2.5, -2.5] : [0];
  right.slice(0, 2).forEach((t, i) => {
    primitives.push({ kind: 'line', points: [[W - 2.5, ys[i]], [W, ys[i]]] }, { kind: 'text', at: [W - 3.3, ys[i]], text: t, height: 1.6, align: 'right' });
    pins[t] = [W, ys[i]];
    pinDirs[t] = [1, 0];
  });
  return { description: `I/O 図の機器（${device}）`, primitives, pins, pinDirs, attributes: [] };
}

function safe(s: string) {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

export function ioPages(
  sheet: { id: string; name: string; plc?: string; units?: string[]; rails?: Rails },
  ctx: IoContext,
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const make = pageMaker(sheet, paper);
  const { width: W, height: H } = paper;
  const hosts = ioPlcHosts(ctx.diagram, ctx.lookup);
  const host = sheet.plc && hosts.includes(sheet.plc) ? sheet.plc : hosts[0];
  const system = host ? ioSystem(ctx.diagram, host, ctx.lookup) : undefined;
  if (!system) {
    putText(make.newPage(), 20, 24, '図面に I/O を持つ PLC がありません', { height: 3.5 });
    return make.pages;
  }
  const railNet = (ref?: string) => {
    const r = ref ? splitRail(ref) : undefined;
    return r ? ctx.netOf(r.device, r.terminal) : undefined;
  };
  const rails = [
    { x: W - 60, ref: sheet.rails?.supply, net: railNet(sheet.rails?.supply) },
    { x: W - 50, ref: sheet.rails?.common, net: railNet(sheet.rails?.common) },
  ].filter((r) => r.net);
  const railOf = (net: string) => rails.find((r) => r.net === net);
  const rowsPerPage = Math.max(1, Math.floor((H - HEADER_TOP - HEADER_H - 50) / ROW_H));

  for (const unit of system.units) {
    if (sheet.units && !sheet.units.includes(unit.device.id)) continue;
    const entries = ctx.elements.filter((e) => e.device === unit.device.id);
    const info = ctx.model.devices.get(unit.device.id);
    if (!info) continue;
    // 表の行: 入出力点と、コモン・電源などの残りの端子（機器定義の並び）
    const inEntry = new Map<string, ElementEntry>();
    for (const e of entries) for (const t of Object.keys(e.element.pinOf)) inEntry.set(t, e);
    const order = [...info.r.terminals.filter((t) => t.role !== 'connector'), ...info.r.pins].map((t) => t.id).filter((t) => inEntry.has(t));
    const point = new Map(unit.points.map((p) => [p.terminal, p]));
    const rows = order.map((t) => {
      const p = point.get(t);
      const label = (info.r.terminal(t) ?? info.r.pin(t))?.label ?? t;
      const { addr, pin } = splitIoLabel(label, t);
      return {
        t,
        no: pin || pinNumber(t),
        addr: p ? p.address : addr,
        comment: p?.comment ?? '',
        net: ctx.netOf(unit.device.id, t),
        connections: p?.connections.map((c) => c.name) ?? [],
      };
    });

    for (let start = 0; start < rows.length; start += rowsPerPage) {
      const page = make.newPage();
      const up = (x: number, y: number): Point => [x, H - y];
      const chunk = rows.slice(start, start + rowsPerPage);
      const title = `${host}  ${unit.device.id}  ${unit.def.model}（${unit.def.name}）`;
      putText(page, TABLE_X, 22, rows.length > rowsPerPage ? `${title}  ${start + 1}〜${start + chunk.length} 行` : title, { height: 3, layer: 'TAG' });
      // 表
      let cx = TABLE_X;
      for (const c of COLUMNS) {
        putText(page, cx + c.width / 2, HEADER_TOP + HEADER_H / 2, c.title, { align: 'center' });
        cx += c.width;
      }
      const top = HEADER_TOP;
      const bottom = HEADER_TOP + HEADER_H + chunk.length * ROW_H;
      putLine(page, [[TABLE_X, top], [TABLE_X + TABLE_W, top], [TABLE_X + TABLE_W, bottom], [TABLE_X, bottom]], 'FRAME', true);
      cx = TABLE_X;
      for (const c of COLUMNS.slice(0, -1)) {
        cx += c.width;
        putLine(page, [[cx, top], [cx, bottom]]);
      }
      for (let i = 0; i < chunk.length; i++) putLine(page, [[TABLE_X, HEADER_TOP + HEADER_H + i * ROW_H], [TABLE_X + TABLE_W, HEADER_TOP + HEADER_H + i * ROW_H]]);

      const railYs: number[] = [];
      const toRail = (from: Point, net: string) => {
        const rail = railOf(net);
        if (!rail) return false;
        page.polylines.push({ points: [from, [rail.x, from[1]]], layer: 'WIRE' });
        page.dots.push({ at: [rail.x, from[1]], layer: 'WIRE' });
        railYs.push(from[1]);
        return true;
      };
      const wireNo = (a: Point, b: Point, net: string) => {
        const no = ctx.wireNoOf(net);
        if (no) page.texts.push({ at: [(a[0] + b[0]) / 2, a[1] + 1.8], text: no, height: 2.2, layer: 'WIRENO' });
      };

      chunk.forEach((row, i) => {
        const y = HEADER_TOP + HEADER_H + i * ROW_H + ROW_H / 2;
        putText(page, TABLE_X + COLUMNS[0].width / 2, y, row.no, { align: 'center' });
        putText(page, TABLE_X + COLUMNS[0].width + COLUMNS[1].width / 2, y, row.addr, { align: 'center', layer: 'TAG' });
        putText(page, TABLE_X + COLUMNS[0].width + COLUMNS[1].width + 1, y, fitText(row.comment, COLUMNS[2].width - 2), {});
        const pin = up(TABLE_X + TABLE_W, y);
        // コモン・電源の端子が母線の網なら、まっすぐ母線へ
        if (toRail(pin, row.net)) {
          wireNo(pin, [railOf(row.net)!.x, pin[1]], row.net);
          return;
        }
        // 相手の機器（ほかの機器で、同じ網の端子を持つ要素）。最初の 1 つを記号で描き、残りは名前を添える
        const partners: { e: ElementEntry; t: string }[] = [];
        for (const kind of PARTNER_KINDS) {
          for (const e of ctx.elements) {
            if (e.device === unit.device.id || e.element.kind !== kind || e.def.category === 'plc') continue;
            const t = Object.keys(e.element.pinOf).find((x) => ctx.netOf(e.device, x) === row.net);
            if (t) partners.push({ e, t });
          }
        }
        const partner = partners[0];
        if (partner) {
          // 記号にしなかった相手（2 つ目からの機器と、リンクなど記号にならないつなぎ先）
          const rest = [
            ...new Set([
              ...partners.slice(1).map((p) => p.e.device).filter((d) => d !== partner.e.device),
              ...row.connections.filter((c) => !partners.some((p) => c.startsWith(`${p.e.device}.`))),
            ]),
          ];
          if (rest.length) {
            page.texts.push({ at: [pin[0] + 1, pin[1] - 2], text: fitText(`ほかに ${rest.join('・')}`, PARTNER_X - TABLE_X - TABLE_W - 2, 1.8), height: 1.8, align: 'left', layer: 'TAG' });
          }
        }
        if (!partner) {
          // 相手が記号にならない（リンクの先など）ときは、つながる先の名前を書く
          if (row.connections.length) {
            const end: Point = [pin[0] + 8, pin[1]];
            page.polylines.push({ points: [pin, end], layer: 'WIRE' });
            page.texts.push({ at: [end[0] + 1, end[1]], text: `→ ${fitText(row.connections.join(' / '), 80, 2.2)}`, height: 2.2, align: 'left', layer: 'TAG' });
          }
          return;
        }
        const { e, t } = partner;
        const at = up(PARTNER_X, y);
        page.polylines.push({ points: [pin, at], layer: 'WIRE' });
        wireNo(pin, at, row.net);
        if (e.element.kind === 'box') {
          // 箱: 信号の端子を左、母線につながる端子を右に並べ替えた小さな箱
          // 1 台に複数のスイッチがある機器（オートスイッチ付きシリンダの 'SW1.BK' など）は、同じスイッチの端子だけを出す。箱に出せる端子は 2 つまで
          const group = t.includes('.') ? t.slice(0, t.indexOf('.') + 1) : '';
          const right = Object.keys(e.element.pinOf)
            .filter((x) => x !== t && (!group || x.startsWith(group)) && railOf(ctx.netOf(e.device, x)))
            .sort((a, b) => rails.indexOf(railOf(ctx.netOf(e.device, a))!) - rails.indexOf(railOf(ctx.netOf(e.device, b))!))
            .slice(0, 2);
          const def = fieldBox(e.device, e.def.model, t, right);
          const id = `iobox_${safe(e.device)}_${safe(t)}_${safe(right.join('_'))}`;
          ctx.addSymbol(id, def);
          page.inserts.push({ symbol: id, at, layer: 'SYMBOL', attributes: {} });
          for (const x of right) {
            const p = pinPoint(def, x, at);
            toRail(p, ctx.netOf(e.device, x));
            wireNo(p, [railOf(ctx.netOf(e.device, x))!.x, p[1]], ctx.netOf(e.device, x));
          }
          return;
        }
        // 2 端子の記号: I/O の網の端子が左（端子 1）になるよう、必要なら端子を入れ替える
        const def = librarySymbol(e.element.symbol)!;
        const flip = e.element.pinOf[t] === '2';
        const other = Object.keys(e.element.pinOf).find((x) => x !== t)!;
        const attrs: Record<string, string> = { ...e.element.attributes, TAG: e.device };
        if (flip) [attrs.T1, attrs.T2] = [e.element.attributes.T2, e.element.attributes.T1];
        ctx.addSymbol(e.element.symbol, def);
        page.inserts.push({ symbol: e.element.symbol, at, layer: 'SYMBOL', attributes: attrs });
        const p2 = pinPoint(def, '2', at);
        const net2 = ctx.netOf(e.device, other);
        if (toRail(p2, net2)) wireNo(p2, [railOf(net2)!.x, p2[1]], net2);
        else {
          const end: Point = [p2[0] + 8, p2[1]];
          page.polylines.push({ points: [p2, end], layer: 'WIRE' });
          const info2 = ctx.model.terminals.get(key(e.device, other));
          page.texts.push({ at: [end[0] + 1, end[1]], text: `→ ${e.device}.${info2?.terminal.id ?? other}`, height: 2.2, align: 'left', layer: 'TAG' });
        }
      });

      // 母線
      const ys = [...railYs, H - (HEADER_TOP + HEADER_H)];
      const railTop = Math.max(...ys) + 2;
      const railBottom = Math.min(...ys, H - bottom) - 4;
      for (const r of rails) {
        page.polylines.push({ points: [[r.x, railTop], [r.x, railBottom]], layer: 'WIRE' });
        const ref = splitRail(r.ref!)!;
        const terminal = ctx.model.terminals.get(key(ref.device, ref.terminal))?.terminal;
        const label = ctx.wireNoOf(r.net!) || terminal?.label || terminal?.id || '';
        page.texts.push({ at: [r.x, railTop + 3], text: label, height: 2.5, align: textWidth(label, 2.5) > 8 ? 'right' : 'center', layer: 'TAG' });
      }
    }
  }
  if (!make.pages.length) putText(make.newPage(), 20, 24, '選んだユニットに I/O がありません', { height: 3.5 });
  return make.pages;
}
