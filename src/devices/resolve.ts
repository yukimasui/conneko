/**
 * 機器定義をパラメータで確定させる（端子・ピン・内部経路の関数を評価し、数値を解決する）。
 *
 * 機器定義の terminals / pins / links はパラメータで変わる関数のことがあるため、
 * 定義を読む側（チェック・描画・AI用プロンプトなど）は必ず resolveDevice() を通す。
 */
import {
  paramsWithDefaults,
  resolveNum,
  type AcceptSpec,
  type AirLink,
  type AirPortKind,
  type CommonLimit,
  type ConnectorSpec,
  type DeviceDefinition,
  type InternalLink,
  type IoFormat,
  type ParamDependent,
  type ParamValues,
  type PinDef,
  type PneumaticHint,
  type PowerSystem,
  type SafetyChannelGroup,
  type TerminalFunction,
  type Conductor,
  type TerminalDef,
} from './types';

/** 数値に解決したエアのポートの仕様 */
export interface ResolvedAirPort {
  kind: AirPortKind;
  tubeOD?: number;
  thread?: string;
  pressure?: number;
  minPressure?: number;
  maxPressure?: number;
}

/** 数値に解決したエアの通り道 */
export interface ResolvedAirLink extends Omit<AirLink, 'regulate'> {
  regulate?: number;
}

/** 電圧を数値に解決した受電条件 */
export interface ResolvedAccept {
  system: PowerSystem;
  minVoltage: number;
  maxVoltage: number;
  conductors?: Conductor[];
}

export interface ResolvedDevice {
  def: DeviceDefinition;
  /** 既定値を補完したパラメータ */
  params: ParamValues;
  terminals: TerminalDef[];
  pins: PinDef[];
  links: InternalLink[];
  airLinks: ResolvedAirLink[];
  /** 端子ID（またはピンID） → 数値に解決したエアのポートの仕様（role: 'air' の端子・ピン） */
  air: Map<string, ResolvedAirPort>;
  safetyChannels: SafetyChannelGroup[];
  commonLimits: CommonLimit[];
  /** 空圧回路図での表し方（定義の pneumatic をパラメータで確定させたもの） */
  pneumatic?: PneumaticHint;
  /** パラメータに応じた大きさ[px]（定義の size。なければ width / height） */
  width: number;
  height: number;
  /** 端子IDまたはピンID → 受電条件（配列に正規化、電圧は数値） */
  accepts: Map<string, ResolvedAccept[]>;
  terminal(id: string): TerminalDef | undefined;
  pin(id: string): PinDef | undefined;
}

const cache = new WeakMap<DeviceDefinition, Map<string, ResolvedDevice>>();

const evaluate = <T,>(v: ParamDependent<T> | undefined, params: ParamValues, fallback: T): T =>
  v === undefined ? fallback : typeof v === 'function' ? (v as (p: ParamValues) => T)(params) : v;

/**
 * 入出力の先頭番号（ioIn / ioOut）の既定値を補う。装着していない場合は入力が 0 から、
 * 出力は入力と同じ番号の並び（KV・iQ-R）なら入力の後ろから、別に数える（FX）なら 0 から。
 */
function withIoDefaults(def: DeviceDefinition, p: ParamValues): ParamValues {
  const io = def.bus?.io;
  if (!io || (p.ioIn !== undefined && p.ioOut !== undefined)) return p;
  const ioIn = Number(p.ioIn ?? 0) || 0;
  const shared = io.format !== 'octal';
  const ioOut = p.ioOut !== undefined ? p.ioOut : shared ? ioIn + Math.ceil((io.inputs ?? 0) / 16) * 16 : 0;
  return { ...p, ioIn, ioOut };
}

/** 受電条件を配列に正規化し、電圧を数値に解決する */
export function resolveAccepts(
  accepts: AcceptSpec | AcceptSpec[] | undefined,
  def: DeviceDefinition,
  params: ParamValues | undefined,
): ResolvedAccept[] {
  if (!accepts) return [];
  return (Array.isArray(accepts) ? accepts : [accepts]).map((a) => ({
    system: a.system,
    minVoltage: resolveNum(a.minVoltage, def, params) ?? 0,
    maxVoltage: resolveNum(a.maxVoltage, def, params) ?? Infinity,
    ...(a.conductors ? { conductors: a.conductors } : {}),
  }));
}

/**
 * パラメータを確定させた機器定義を返す（同じ定義・パラメータの組は結果を使い回す）。
 * params には図面の機器の params（装着で決まる ioIn / ioOut を含めてよい）を渡す。
 */
export function resolveDevice(def: DeviceDefinition, params?: ParamValues): ResolvedDevice {
  const cacheKey = params ? JSON.stringify(params) : '';
  let byParams = cache.get(def);
  if (!byParams) cache.set(def, (byParams = new Map()));
  const hit = byParams.get(cacheKey);
  if (hit) return hit;

  const p = withIoDefaults(def, paramsWithDefaults(def, params));
  const terminals = evaluate(def.terminals, p, []);
  const pins = evaluate(def.pins, p, []);
  const links = evaluate(def.links, p, []);
  const airLinks = evaluate(def.airLinks, p, []).map((l) => ({ ...l, regulate: resolveNum(l.regulate, def, p) }));
  const safetyChannels = evaluate(def.safetyChannels, p, []);
  const commonLimits = evaluate(def.commonLimits, p, []);
  const pneumatic = evaluate<PneumaticHint | undefined>(def.pneumatic, p, undefined);
  const size = def.size ? def.size(p) : { width: def.width, height: def.height };
  const accepts = new Map<string, ResolvedAccept[]>();
  for (const t of [...terminals, ...pins]) {
    if (t.accepts) accepts.set(t.id, resolveAccepts(t.accepts, def, p));
  }
  const air = new Map<string, ResolvedAirPort>();
  // 画面に出さないエアのポート（role: 'air' のピン）も含める
  for (const t of [...terminals, ...pins]) {
    if (!t.air) continue;
    const a = t.air;
    air.set(t.id, {
      kind: a.kind,
      ...(a.thread ? { thread: a.thread } : {}),
      tubeOD: resolveNum(a.tubeOD, def, p),
      pressure: resolveNum(a.pressure, def, p),
      minPressure: resolveNum(a.minPressure, def, p),
      maxPressure: resolveNum(a.maxPressure, def, p),
    });
  }
  const tById = new Map(terminals.map((t) => [t.id, t]));
  const pById = new Map(pins.map((x) => [x.id, x]));
  const resolved: ResolvedDevice = {
    def,
    params: p,
    terminals,
    pins,
    links,
    airLinks,
    air,
    safetyChannels,
    commonLimits,
    ...(pneumatic ? { pneumatic } : {}),
    width: size.width,
    height: size.height,
    accepts,
    terminal: (id) => tById.get(id),
    pin: (id) => pById.get(id),
  };
  // パラメータの組み合わせは限られるが、念のため上限を設ける
  if (byParams.size > 200) byParams.clear();
  byParams.set(cacheKey, resolved);
  return resolved;
}

/** 2 つのコネクタをケーブルでつなげるか（同じ種類、または mates で変換ケーブルが使える） */
export function connectorsMate(a: ConnectorSpec, b: ConnectorSpec): boolean {
  return a.kind === b.kind || !!a.mates?.includes(b.kind) || !!b.mates?.includes(a.kind);
}

/** ケーブルの描き方 */
export function cableStyle(c: ConnectorSpec): NonNullable<ConnectorSpec['style']> {
  return c.style ?? (c.pins === 0 ? 'lan' : 'multicore');
}

/**
 * 入出力番号の表記を返す。n は先頭からの点数（ioIn / ioOut に offset を足したもの）。
 * - kv: R + チャネル番号 + 2 桁のビット番号（n = 37 → 'R205'）
 * - hex: X/Y + 2 桁以上の 16 進（n = 31 → 'X1F'）
 * - octal: X/Y + 8 進（n = 15 → 'X17'）
 */
export function ioName(format: IoFormat, dir: 'in' | 'out', n: number): string {
  if (format === 'kv') return `R${Math.floor(n / 16)}${String(n % 16).padStart(2, '0')}`;
  const prefix = dir === 'in' ? 'X' : 'Y';
  if (format === 'hex') return prefix + n.toString(16).toUpperCase().padStart(2, '0');
  return prefix + n.toString(8);
}

/** ioName の逆変換（'R1000' → 160、'X20' → 32（hex）/ 16（octal））。読めなければ undefined */
export function parseIoName(format: IoFormat, text: string): number | undefined {
  const s = text.trim().toUpperCase();
  if (/^\d+$/.test(s) && format !== 'kv') return parseInt(s, format === 'hex' ? 16 : 8);
  if (format === 'kv') {
    const m = /^R?(\d*?)(\d{1,2})$/.exec(s);
    if (!m) return undefined;
    const bit = Number(m[2]);
    return bit < 16 ? Number(m[1] || 0) * 16 + bit : undefined;
  }
  const m = /^[XY]?([0-9A-F]+)$/.exec(s);
  if (!m) return undefined;
  const n = parseInt(m[1], format === 'hex' ? 16 : 8);
  return Number.isNaN(n) || (format === 'octal' && /[89A-F]/.test(m[1])) ? undefined : n;
}

/** 端子の機能を配列で返す */
export function functionsOf(t: { function?: TerminalFunction | TerminalFunction[] }): TerminalFunction[] {
  return t.function === undefined ? [] : Array.isArray(t.function) ? t.function : [t.function];
}
