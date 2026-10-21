/**
 * 図面データ（JSON交換フォーマット）の型と読み書き。
 *
 * 生成AIが読み書きしやすいよう、機器は id（= 機器名。例: 'ELB1'）で参照し、
 * 電線は from/to に { device, terminal } を持つ単純な構造にしている。
 */
import { DEFAULT_WIRE } from '../data/wires';
import type { ParamValues } from '../devices/types';

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
}

export interface Diagram {
  devices: DiagramDevice[];
  wires: DiagramWire[];
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
    devices: diagram.devices.map((d) => ({
      id: d.id,
      type: d.type,
      x: Math.round(d.x),
      y: Math.round(d.y),
      ...(d.params && Object.keys(d.params).length ? { params: d.params } : {}),
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
    })),
  };
}

export class DiagramParseError extends Error {}

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
    };
  });
  return { devices, wires };
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
