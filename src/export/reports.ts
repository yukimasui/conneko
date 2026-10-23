/**
 * 図面から作る一覧（部品表・線番表・I/O 表）と CSV の書き出し。
 * 画面の接続リスト、印刷、CSV 保存で共通に使う。
 */
import { buildModel, key } from '../check/model';
import { getTubeColor, getTubeType, tubeModel } from '../data/tubes';
import { getWireColor } from '../data/wires';
import { hasEstimates } from '../devices/estimates';
import { deviceModel, paramLabel, type DeviceCategory, type DeviceDefinition } from '../devices/types';
import { CABLE_WIRE_TYPE, isTube, sheetOf, sheetsOf, type Diagram, type TerminalRef } from '../model/diagram';
import { computeBus, effectiveParams } from '../model/bus';
import { compareAddress, ioHosts, ioSystem } from '../model/io';
import { AIR_LINK_TYPE, LINK_TYPE } from '../model/ops';

type DefLookup = (type: string) => DeviceDefinition | undefined;

const collator = new Intl.Collator('ja', { numeric: true });

/* ---------------- 線番表（接続リスト） ---------------- */

export interface WireRow {
  id: string;
  sheet: string;
  sheetName: string;
  sheetIndex: number;
  wireNo: string;
  from: string;
  to: string;
  /** 電線の種類・太さ・色（ケーブルは「ケーブル」） */
  spec: string;
  wireType: string;
  sizeSq?: number;
  colorName?: string;
  colorHex?: string;
  /** ネットにある I/O コメント */
  note: string;
}

export interface LinkPlaces {
  /** 表示名（ネットワークリンクは先頭に「LAN 」） */
  name: string;
  places: { id: string; sheet: string; sheetName: string }[];
}

export function wireRows(d: Diagram, lookup: DefLookup): { rows: WireRow[]; links: LinkPlaces[] } {
  const sheets = sheetsOf(d);
  const sheetName = (id: string) => sheets.find((s) => s.id === id)?.name ?? id;
  const m = buildModel(d, lookup, () => {});
  const devices = new Map(d.devices.map((x) => [x.id, x]));
  const name = (r: TerminalRef) => {
    const dev = devices.get(r.device);
    const def = dev && lookup(dev.type);
    if (def?.netLabel) return `${def.name}「${String(dev!.params?.name ?? '')}」`;
    const t = m.terminals.get(key(r.device, r.terminal))?.terminal;
    return `${r.device}.${r.terminal}${t?.label && t.label !== r.terminal ? `（${t.label}）` : ''}`;
  };
  // ネット（常時導通の範囲）にある I/O コメント
  const commentOf = (r: TerminalRef) => {
    const notes = new Set<string>();
    for (const k of m.fixedMembers.get(m.fixed.find(key(r.device, r.terminal))) ?? []) {
      const [dev, term] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      const c = devices.get(dev)?.comments?.[term];
      if (c) notes.add(c);
    }
    return [...notes].join(' / ');
  };
  const rows: WireRow[] = d.wires.map((w) => {
    const dev = devices.get(w.from.device);
    const sheet = dev ? sheetOf(d, dev) : sheets[0].id;
    const cable = w.wireType === CABLE_WIRE_TYPE;
    const tube = isTube(w);
    const color = getWireColor(w.color);
    const tubeColor = getTubeColor(w.color);
    return {
      id: w.id,
      sheet,
      sheetName: sheetName(sheet),
      sheetIndex: sheets.findIndex((s) => s.id === sheet),
      wireNo: w.wireNo ?? '',
      from: name(w.from),
      to: name(w.to),
      spec: cable
        ? 'ケーブル'
        : tube
          ? `チューブ ${tubeModel(w.wireType, w.tubeOD ?? 6, w.color)}（φ${w.tubeOD ?? '?'} ${tubeColor?.name ?? w.color}）`
          : `${w.wireType} ${w.sizeSq}sq ${color?.name ?? w.color}`,
      wireType: cable ? 'ケーブル' : tube ? 'チューブ' : w.wireType,
      ...(cable ? {} : tube ? { colorName: tubeColor?.name ?? w.color, colorHex: tubeColor?.hex } : { sizeSq: w.sizeSq, colorName: color?.name ?? w.color, colorHex: color?.hex }),
      note: cable || tube ? '' : commentOf(w.from),
    };
  });
  rows.sort((a, b) => a.sheetIndex - b.sheetIndex || collator.compare(a.wireNo || '~', b.wireNo || '~') || collator.compare(a.id, b.id));
  const byName = new Map<string, LinkPlaces['places']>();
  for (const x of d.devices) {
    const def = lookup(x.type);
    if (!def?.netLabel) continue;
    const n = `${x.type === LINK_TYPE ? '' : x.type === AIR_LINK_TYPE ? 'AIR ' : 'LAN '}${String(x.params?.name ?? '').trim()}`;
    const s = sheetOf(d, x);
    byName.set(n, [...(byName.get(n) ?? []), { id: x.id, sheet: s, sheetName: sheetName(s) }]);
  }
  const links = [...byName].sort((a, b) => collator.compare(a[0], b[0])).map(([n, places]) => ({ name: n, places }));
  return { rows, links };
}

/* ---------------- 部品表 ---------------- */

export interface BomRow {
  category: DeviceCategory;
  maker: string;
  model: string;
  name: string;
  /** パラメータ（定格電流など）の表示 */
  spec: string;
  qty: number;
  /** 機器名（PS1, ELB1 …） */
  ids: string[];
  /** 推定の値を含む機器定義 */
  estimated: boolean;
}

const CATEGORY_ORDER: DeviceCategory[] = [
  'power-source',
  'breaker',
  'contactor',
  'power-supply',
  'plc',
  'safety',
  'control',
  'sensor',
  'load',
  'terminal',
  'network',
  'air-supply',
  'valve',
  'actuator',
  'air-fitting',
  'link',
];
/** 部品表に入れないパラメータ（装着で決まるもの・リンクの向きなど） */
const NOT_SPEC = new Set(['ioIn', 'ioOut', 'side', 'name']);

export function bomRows(d: Diagram, lookup: DefLookup): BomRow[] {
  const groups = new Map<string, BomRow>();
  // 型式は装着で決まるパラメータ（マニホールドの連数など）も使って組み立てる
  const bus = computeBus(d.devices, lookup);
  for (const x of d.devices) {
    const def = lookup(x.type);
    if (!def || def.category === 'link') continue;
    const model = deviceModel(def, effectiveParams(x, bus));
    const spec = (def.params ?? [])
      .filter((p) => !NOT_SPEC.has(p.key))
      .map((p) => `${p.label} ${paramLabel(def, p.key, x.params?.[p.key] ?? p.default)}`)
      .join('、');
    const k = `${def.type}|${model}|${spec}`;
    const g = groups.get(k) ?? {
      category: def.category,
      maker: def.maker ?? '汎用',
      model,
      name: def.name,
      spec,
      qty: 0,
      ids: [],
      estimated: hasEstimates(def),
    };
    g.qty++;
    g.ids.push(x.id);
    groups.set(k, g);
  }
  // チューブ（種類・外径・色ごとの本数。長さは図面にないので本数だけ）
  for (const w of d.wires) {
    if (!isTube(w)) continue;
    const od = w.tubeOD ?? 6;
    const model = tubeModel(w.wireType, od, w.color);
    const k = `tube|${model}`;
    const g = groups.get(k) ?? {
      category: 'air-fitting' as DeviceCategory,
      maker: 'SMC',
      model,
      name: getTubeType(w.wireType)?.name ?? 'チューブ',
      spec: `外径 φ${od}、${getTubeColor(w.color)?.name ?? w.color}（本数。長さは現物合わせ）`,
      qty: 0,
      ids: [],
      estimated: false,
    };
    g.qty++;
    g.ids.push(w.id);
    groups.set(k, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, ids: g.ids.sort(collator.compare) }))
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        collator.compare(a.maker, b.maker) ||
        collator.compare(a.model, b.model) ||
        collator.compare(a.spec, b.spec),
    );
}

/* ---------------- I/O 表 ---------------- */

export interface IoRow {
  host: string;
  unit: string;
  model: string;
  address: string;
  dir: '入力' | '出力';
  comment: string;
  connections: string;
  via: string;
}

export function ioRows(d: Diagram, lookup: DefLookup): IoRow[] {
  const rows: IoRow[] = [];
  for (const host of ioHosts(d, lookup)) {
    for (const u of ioSystem(d, host, lookup)?.units ?? []) {
      for (const p of [...u.points].sort((a, b) => compareAddress(a.address, b.address))) {
        rows.push({
          host,
          unit: u.device.id,
          model: u.def.model,
          address: p.address,
          dir: p.dir === 'in' ? '入力' : '出力',
          comment: p.comment,
          connections: p.connections.map((c) => c.name).join('、'),
          via: p.via.join('・'),
        });
      }
    }
  }
  return rows;
}

/* ---------------- CSV ---------------- */

/** CSV の文字列（Excel で文字化けしないよう先頭に BOM、改行は CRLF） */
export function toCsv(header: string[], rows: (string | number | undefined)[][]): string {
  const cell = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function bomCsv(d: Diagram, lookup: DefLookup): string {
  return toCsv(
    ['メーカー', '型式', '名称', '仕様', '数量', '機器名', '備考'],
    bomRows(d, lookup).map((r) => [r.maker, r.model, r.name, r.spec, r.qty, r.ids.join(' '), r.estimated ? '機器データに推定の値を含む' : '']),
  );
}

export function wireCsv(d: Diagram, lookup: DefLookup): string {
  return toCsv(
    ['シート', '線番', '接続元', '接続先', '種類', '太さ(sq)', '色', 'コメント'],
    wireRows(d, lookup).rows.map((r) => [r.sheetName, r.wireNo, r.from, r.to, r.wireType, r.sizeSq, r.colorName, r.note]),
  );
}

export function ioCsv(d: Diagram, lookup: DefLookup): string {
  return toCsv(
    ['PLC', 'ユニット', '型式', '番号', '入出力', 'コメント', '接続先', '経由'],
    ioRows(d, lookup).map((r) => [r.host, r.unit, r.model, r.address, r.dir, r.comment, r.connections, r.via]),
  );
}
