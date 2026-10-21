/**
 * 図面データ（JSON交換フォーマット）の型と読み書き。
 *
 * 生成AIが読み書きしやすいよう、機器は id（= 機器名。例: 'ELB1'）で参照し、
 * 電線は from/to に { device, terminal } を持つ単純な構造にしている。
 */
import { DEFAULT_WIRE } from '../data/wires';
import type { ParamValues, TerminalSide } from '../devices/types';

export const DIAGRAM_FORMAT = 'conneko-diagram';
export const DIAGRAM_VERSION = 1;

/** コネクタどうしをつなぐケーブルの wireType（色・太さは使わない） */
export const CABLE_WIRE_TYPE = 'CABLE';

export interface DiagramDevice {
  /** 機器名（図面内で一意。例: 'ELB1'） */
  id: string;
  /** 機器種別（DeviceDefinition.type） */
  type: string;
  /** キャンバス上の位置（左上） */
  x: number;
  y: number;
  params?: ParamValues;
  /** 増設ユニットの連結・ベースユニットへの装着（装着先の機器名と位置。位置は 1 から） */
  mount?: Mount;
  /** 配置するシートのID（省略時は最初のシート） */
  sheet?: string;
  /** 端子・ピンごとのコメント（PLC の入出力のコメントなど。キーは端子IDまたはピンID） */
  comments?: Record<string, string>;
  /** 機器のコメント（何をするものか。例: 'ワーク検出（コンベア入口）'） */
  note?: string;
}

/** 図面のシート（回路の意味ごとに分けるタブ） */
export interface Sheet {
  id: string;
  name: string;
}

export interface Mount {
  device: string;
  slot: number;
}

export interface TerminalRef {
  device: string;
  terminal: string;
}

export interface DiagramWire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  /** 線番 */
  wireNo?: string;
  /** 電線色ID（src/data/wires.ts の WIRE_COLORS） */
  color: string;
  /** 太さ（公称断面積 mm²） */
  sizeSq: number;
  /** 電線の種類ID（src/data/wires.ts の WIRE_TYPES） */
  wireType: string;
  /** 配線の曲がり位置の調整量[px]。自動配置からのずれ */
  bend?: number;
  /**
   * 手で編集した経路（両端のスタブの先どうしの間の頂点。キャンバス上の座標）。
   * 指定すると自動の経路の代わりに、これを直交につないだ折れ線で描く
   */
  route?: { x: number; y: number }[];
  /** 端子から電線を出す向き（from 側・to 側）。省略時は自動（端子の向き。相手がリンクなら左右はリンクの側） */
  fromSide?: TerminalSide;
  toSide?: TerminalSide;
}

/** 図面全体の設定 */
export interface DiagramSettings {
  /** 安全機能に要求するパフォーマンスレベル（ISO 13849-1）。指定すると、それを下回る安全機器を警告する */
  requiredPL?: 'a' | 'b' | 'c' | 'd' | 'e';
}

export interface Diagram {
  devices: DiagramDevice[];
  wires: DiagramWire[];
  settings?: DiagramSettings;
  /** シート。省略時は 1 枚（DEFAULT_SHEET） */
  sheets?: Sheet[];
}

export const DEFAULT_SHEET: Sheet = { id: 'S1', name: 'シート1' };

/** 図面のシート一覧（未指定なら既定の 1 枚） */
export function sheetsOf(d: Diagram): Sheet[] {
  return d.sheets?.length ? d.sheets : [DEFAULT_SHEET];
}

/** 機器のシートID（未指定・存在しないシートなら最初のシート） */
export function sheetOf(d: Diagram, device: DiagramDevice): string {
  const sheets = sheetsOf(d);
  return device.sheet && sheets.some((s) => s.id === device.sheet) ? device.sheet : sheets[0].id;
}

export interface DiagramFile extends Diagram {
  format: typeof DIAGRAM_FORMAT;
  version: number;
  /** 図面の説明（任意） */
  title?: string;
}

export function emptyDiagram(): Diagram {
  return { devices: [], wires: [] };
}

export function toDiagramFile(diagram: Diagram, title?: string): DiagramFile {
  return {
    format: DIAGRAM_FORMAT,
    version: DIAGRAM_VERSION,
    ...(title ? { title } : {}),
    ...(diagram.settings && Object.keys(diagram.settings).length ? { settings: diagram.settings } : {}),
    ...(diagram.sheets?.length ? { sheets: diagram.sheets } : {}),
    devices: diagram.devices.map((d) => ({
      id: d.id,
      type: d.type,
      x: Math.round(d.x),
      y: Math.round(d.y),
      ...(d.params && Object.keys(d.params).length ? { params: d.params } : {}),
      ...(d.mount ? { mount: d.mount } : {}),
      ...(d.sheet && diagram.sheets?.length ? { sheet: d.sheet } : {}),
      ...(d.comments && Object.keys(d.comments).length ? { comments: d.comments } : {}),
      ...(d.note ? { note: d.note } : {}),
    })),
    wires: diagram.wires.map((w) => ({
      id: w.id,
      from: w.from,
      to: w.to,
      ...(w.wireNo ? { wireNo: w.wireNo } : {}),
      color: w.color,
      sizeSq: w.sizeSq,
      wireType: w.wireType,
      ...(w.bend ? { bend: Math.round(w.bend) } : {}),
      ...(w.route ? { route: w.route.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) } : {}),
      ...(w.fromSide ? { fromSide: w.fromSide } : {}),
      ...(w.toSide ? { toSide: w.toSide } : {}),
    })),
  };
}

export class DiagramParseError extends Error {}

const isSide = (v: unknown): v is TerminalSide => v === 'top' || v === 'bottom' || v === 'left' || v === 'right';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseRef(v: unknown, where: string): TerminalRef {
  if (isObj(v) && typeof v.device === 'string' && typeof v.terminal === 'string') {
    return { device: v.device, terminal: v.terminal };
  }
  // AI が "ELB1.L1" のような文字列で書いてきた場合も受け付ける
  if (typeof v === 'string' && v.includes('.')) {
    const i = v.indexOf('.');
    return { device: v.slice(0, i), terminal: v.slice(i + 1) };
  }
  throw new DiagramParseError(`${where} は { "device": "...", "terminal": "..." } の形式で指定してください`);
}

/**
 * JSON文字列（または解析済みオブジェクト）を図面データとして読み込む。
 * 電線の id や属性が省略されている場合は補完する（AI が出力したデータを想定）。
 */
export function parseDiagram(input: string | unknown): Diagram {
  let raw: unknown = input;
  if (typeof input === 'string') {
    // コードブロックで囲まれた AI の出力もそのまま貼れるようにする
    const text = input.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new DiagramParseError(`JSONとして読み込めません: ${(e as Error).message}`);
    }
  }
  if (!isObj(raw)) throw new DiagramParseError('図面データはオブジェクトである必要があります');
  if (raw.format !== undefined && raw.format !== DIAGRAM_FORMAT) {
    throw new DiagramParseError(`format が "${DIAGRAM_FORMAT}" ではありません`);
  }
  if (!Array.isArray(raw.devices)) throw new DiagramParseError('devices が配列ではありません');
  const wiresRaw = raw.wires ?? [];
  if (!Array.isArray(wiresRaw)) throw new DiagramParseError('wires が配列ではありません');

  const devices: DiagramDevice[] = raw.devices.map((d, i) => {
    if (!isObj(d) || typeof d.id !== 'string' || typeof d.type !== 'string') {
      throw new DiagramParseError(`devices[${i}] に id と type が必要です`);
    }
    return {
      id: d.id,
      type: d.type,
      x: typeof d.x === 'number' ? d.x : i * 200,
      y: typeof d.y === 'number' ? d.y : 0,
      ...(isObj(d.params) ? { params: d.params as ParamValues } : {}),
      ...(parseMount(d.mount) ?? {}),
      ...(typeof d.sheet === 'string' && d.sheet ? { sheet: d.sheet } : {}),
      ...(typeof d.note === 'string' && d.note.trim() ? { note: d.note } : {}),
      ...(isObj(d.comments) ? { comments: Object.fromEntries(Object.entries(d.comments).filter(([, v]) => typeof v === 'string')) as Record<string, string> } : {}),
    };
  });
  const ids = new Set<string>();
  for (const d of devices) {
    if (ids.has(d.id)) throw new DiagramParseError(`機器名 "${d.id}" が重複しています`);
    ids.add(d.id);
  }

  const usedWireIds = new Set<string>();
  const wires: DiagramWire[] = wiresRaw.map((w, i) => {
    if (!isObj(w)) throw new DiagramParseError(`wires[${i}] がオブジェクトではありません`);
    let id = typeof w.id === 'string' && w.id ? w.id : '';
    if (!id || usedWireIds.has(id)) id = nextWireId(usedWireIds);
    usedWireIds.add(id);
    return {
      id,
      from: parseRef(w.from, `wires[${i}].from`),
      to: parseRef(w.to, `wires[${i}].to`),
      ...(typeof w.wireNo === 'string' && w.wireNo ? { wireNo: w.wireNo } : {}),
      color: typeof w.color === 'string' ? w.color : DEFAULT_WIRE.color,
      sizeSq: typeof w.sizeSq === 'number' ? w.sizeSq : DEFAULT_WIRE.sizeSq,
      wireType: typeof w.wireType === 'string' ? w.wireType : DEFAULT_WIRE.wireType,
      ...(typeof w.bend === 'number' ? { bend: w.bend } : {}),
      ...(isSide(w.fromSide) ? { fromSide: w.fromSide } : {}),
      ...(isSide(w.toSide) ? { toSide: w.toSide } : {}),
      ...(Array.isArray(w.route)
        ? { route: w.route.filter((p): p is { x: number; y: number } => isObj(p) && typeof p.x === 'number' && typeof p.y === 'number').map((p) => ({ x: p.x, y: p.y })) }
        : {}),
    };
  });
  const settings: DiagramSettings = {};
  if (isObj(raw.settings) && typeof raw.settings.requiredPL === 'string' && /^[a-e]$/.test(raw.settings.requiredPL)) {
    settings.requiredPL = raw.settings.requiredPL as DiagramSettings['requiredPL'];
  }
  // シートは { "id", "name" } の配列。name だけ・文字列だけでも受け付ける
  const sheets: Sheet[] = [];
  if (Array.isArray(raw.sheets)) {
    raw.sheets.forEach((v, i) => {
      const id = isObj(v) && typeof v.id === 'string' && v.id ? v.id : typeof v === 'string' ? v : `S${i + 1}`;
      const name = isObj(v) && typeof v.name === 'string' && v.name ? v.name : typeof v === 'string' ? v : `シート${i + 1}`;
      if (!sheets.some((s) => s.id === id)) sheets.push({ id, name });
    });
  }
  return {
    devices,
    wires,
    ...(Object.keys(settings).length ? { settings } : {}),
    ...(sheets.length ? { sheets } : {}),
  };
}

/** mount は { "device": "PLC1", "slot": 1 } のほか "PLC1" や "PLC1#2" の文字列も受け付ける */
function parseMount(v: unknown): { mount: Mount } | undefined {
  if (isObj(v) && typeof v.device === 'string' && v.device) {
    const slot = Number(v.slot);
    return { mount: { device: v.device, slot: Number.isFinite(slot) && slot > 0 ? Math.round(slot) : 1 } };
  }
  if (typeof v === 'string' && v) {
    const [device, slot] = v.split('#');
    return { mount: { device, slot: Number(slot) > 0 ? Math.round(Number(slot)) : 1 } };
  }
  return undefined;
}

/** 未使用の電線ID（W1, W2, …）を返す */
export function nextWireId(used: Iterable<string>): string {
  const set = new Set(used);
  let n = 1;
  while (set.has(`W${n}`)) n++;
  return `W${n}`;
}

/** 接頭辞から未使用の機器名（ELB1, ELB2, …）を返す */
export function nextDeviceId(prefix: string, used: Iterable<string>): string {
  const set = new Set(used);
  let n = 1;
  while (set.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
