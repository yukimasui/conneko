/**
 * 機器（ノード）定義の型。
 *
 * 1機器 = 1ファイル（src/devices/catalog/ 配下）で DeviceDefinition を default export する。
 * catalog 配下のファイルは registry.ts が自動で読み込むため、登録作業は不要。
 *
 * 座標系: SVG の viewBox は "0 0 width height"。目安として 1mm ≒ 2px で実寸比を保つ
 * （盤外機器など実寸が大きすぎるものは見やすさ優先で縮小してよい）。
 */

/** 電源の種別 */
export type PowerSystem = 'AC' | 'DC';

/**
 * 導体（相・極性）の識別。
 * R/S/T: 三相の各相、L/N: 単相の電圧側/中性線、+/-: 直流、PE: 保護接地
 */
export type Conductor = 'R' | 'S' | 'T' | 'L' | 'N' | '+' | '-' | 'PE';

/** 数値を直接書くか、機器パラメータ（params）のキーを参照する */
export type NumOrParam = number | { param: string };

/** 端子から電線が出ていく向き */
export type TerminalSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * 端子の役割。
 * - line: 電源側（一次側）。保護機器では line → load の向きに電流が流れる
 * - load: 負荷側（二次側）
 * - pass: 向きのない中継端子（端子台など）
 * - supply: 電源の出力端子（supply を必ず指定）
 * - input: 電力を受け取る端子（モーター、コイル、電源ユニット入力など。accepts を指定）
 * - ground: 接地端子
 * - signal: 信号端子（接点・センサー出力など。電源チェックの対象外）
 * - connector: コネクタ（MIL コネクタ、LAN ポートなど）。同じ種類のコネクタどうしをケーブルでつなぐ
 */
export type TerminalRole = 'line' | 'load' | 'pass' | 'supply' | 'input' | 'ground' | 'signal' | 'connector';

/** 電源出力の仕様（role: 'supply' の端子に指定） */
export interface SupplySpec {
  system: PowerSystem;
  /** 公称電圧[V]（三相200Vなら200、DC24Vなら24） */
  voltage: NumOrParam;
  conductor: Conductor;
  /** 出力の電流制限[A]（電源ユニットの定格出力電流など）。電線太さチェックの保護電流として扱う */
  limitCurrent?: NumOrParam;
}

/** 受電できる電源の条件（role: 'input' の端子に指定） */
export interface AcceptSpec {
  system: PowerSystem;
  minVoltage: number;
  maxVoltage: number;
  /** 接続してよい導体。省略時は system に応じて PE 以外すべて */
  conductors?: Conductor[];
}

/** コネクタの仕様（role: 'connector' の端子に指定） */
export interface ConnectorSpec {
  /** コネクタの種類。同じ種類どうしだけケーブルでつなげる（例: 'MIL40', 'RJ45'） */
  kind: string;
  /**
   * ピン数。ケーブルでつなぐと、両端の同じ番号のピンどうしが導通する。
   * 通信用（LAN など）で電気的なピンを扱わない場合は 0。
   */
  pins: number;
  /** コネクタの幅[px]（side に直交する方向）。ケーブルの芯線をこの幅に広げて描く */
  width: number;
}

export interface TerminalDef {
  /** 機器内で一意な端子ID（例: 'L1', 'T1', 'A1', '+V'） */
  id: string;
  /** 端子の印字（表示用。省略時は id） */
  label?: string;
  /** 端子位置（SVG座標。ネジの中心付近） */
  x: number;
  y: number;
  /** 電線が出ていく向き */
  side: TerminalSide;
  role: TerminalRole;
  supply?: SupplySpec;
  accepts?: AcceptSpec;
  connector?: ConnectorSpec;
  /** true の場合、未接続でも警告しない（予備端子・補助接点など） */
  optional?: boolean;
}

/**
 * 機器内部の導通経路（ブレーカーの極、端子台の上下など）。
 * 電圧の伝搬と保護電流の計算に使う。接点は「閉」とみなす。
 */
export interface InternalLink {
  from: string;
  to: string;
  /** true の場合 from → to の一方向のみ（保護機器の line → load など） */
  directed?: boolean;
  /** true の場合、この経路を通った先は機器の protectionCurrent で保護されているとみなす */
  protects?: boolean;
}

export interface ParamOption {
  value: number | string;
  label?: string;
}

/** 機器ごとに変更できるパラメータ（定格電流など） */
export interface ParamDef {
  key: string;
  label: string;
  unit?: string;
  options: ParamOption[];
  default: number | string;
}

export type DeviceCategory =
  | 'power-source'
  | 'breaker'
  | 'contactor'
  | 'power-supply'
  | 'terminal'
  | 'load'
  | 'control'
  | 'plc'
  | 'sensor';

/**
 * コネクタのピン（画面上の端子としては表示しない）。
 * id は '<コネクタ端子ID>#<ピン番号>'（例: 'CN1#1'）。links から参照できる。
 */
export interface PinDef {
  id: string;
  /** ピンの名称（例: 'X000', 'COM', '+24V'） */
  label?: string;
  role: Exclude<TerminalRole, 'connector'>;
  supply?: SupplySpec;
  accepts?: AcceptSpec;
  optional?: boolean;
}

export interface DeviceDefinition {
  /** 機器種別の一意なID（例: 'mitsubishi.nv32-sv.3p'）。JSONの type に使う */
  type: string;
  /** 一般名称（例: '漏電遮断器'） */
  name: string;
  /** 型式（例: 'NV32-SV 3P'） */
  model: string;
  maker?: string;
  category: DeviceCategory;
  description?: string;
  /** 自動採番する機器名の接頭辞（例: 'ELB' → ELB1, ELB2…） */
  labelPrefix: string;
  width: number;
  height: number;
  /**
   * SVG の中身（<svg> タグの内側）。viewBox="0 0 width height" で描画される。
   * id 属性（グラデーション等）は複数配置時に衝突するため、必ず '{{uid}}' を含めること
   * （例: id="grad-{{uid}}" / fill="url(#grad-{{uid}})"）。描画時に機器ごとの値へ置換される。
   * 外部画像・フォント・<script> は使わない。
   *
   * パラメータで見た目を変える場合（定格電流の表示など）は関数にする。引数は既定値を補完済みのパラメータ。
   */
  svg: string | ((params: ParamValues) => string);
  terminals: TerminalDef[];
  /** コネクタのピン定義（ピンごとの名称・電気的仕様） */
  pins?: PinDef[];
  links?: InternalLink[];
  params?: ParamDef[];
  /** 保護機器の定格（遮断）電流[A]。protects: true の経路に適用 */
  protectionCurrent?: NumOrParam;
  /** 負荷の定格電流[A]（モーターなど）。上流の保護機器との整合チェックに使う */
  loadCurrent?: NumOrParam;
  /**
   * 互いに異なる導体で給電されるべき端子のグループ。
   * 例: 三相モーター [['U','V','W']]、単相入力 [['L','N']]
   */
  distinctGroups?: string[][];
}

export type ParamValues = Record<string, number | string>;

/** NumOrParam を実際の値に解決する */
export function resolveNum(
  v: NumOrParam | undefined,
  def: DeviceDefinition,
  params: ParamValues | undefined,
): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'number') return v;
  const raw = params?.[v.param] ?? def.params?.find((p) => p.key === v.param)?.default;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 既定値を補完したパラメータを返す */
export function paramsWithDefaults(def: DeviceDefinition, params: ParamValues | undefined): ParamValues {
  const out: ParamValues = {};
  for (const p of def.params ?? []) out[p.key] = p.default;
  return { ...out, ...params };
}

/** パラメータの選択肢の表示名（label がなければ値＋単位） */
export function paramLabel(def: DeviceDefinition, key: string, value: number | string): string {
  const p = def.params?.find((x) => x.key === key);
  const opt = p?.options.find((o) => o.value === value);
  return opt?.label ?? `${value}${p?.unit ?? ''}`;
}
