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
  /**
   * 出力の性質。省略時は 'power'。
   * - power: 電源（電源ユニットの出力など）
   * - ossd: 安全出力（OSSD。ライトカーテンや安全コントローラーの半導体出力）。OSSD どうしや電源と同じ電位になると短絡として扱う
   * - test: テスト出力（テストパルス。安全入力へ接点を通して戻す）
   */
  kind?: 'power' | 'ossd' | 'test';
}

/** 受電できる電源の条件（role: 'input' の端子に指定） */
export interface AcceptSpec {
  system: PowerSystem;
  /** 下限・上限電圧[V]。入力モードの切換などで変わる場合は { param } で参照する */
  minVoltage: NumOrParam;
  maxVoltage: NumOrParam;
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
  /**
   * ケーブルでつなげる別の種類のコネクタ（変換ケーブルがあるもの）。
   * 例: 三菱の FCN 40ピン（'FCN40'）に mates: ['MIL40'] と書くと MIL 40極の変換端子台へつなげる。ピンは同じ番号どうしが導通する
   */
  mates?: string[];
  /**
   * 通信プロトコル（例: ['ethernet', 'ethernet-ip']、['ethercat']）。
   * ケーブルでつないだ両端に指定があり、共通のプロトコルがなければ警告する
   */
  protocols?: string[];
  /**
   * ケーブルの描き方。省略時はピン数 0 なら 'lan'、それ以外は 'multicore'。
   * - multicore: 色付きの芯線が広がって黒いシースにまとまる多芯ケーブル（MIL など）
   * - lan: LAN ケーブル
   * - round: 丸形コネクタ（M8 / M12 など）付きのセンサーケーブル
   */
  style?: 'multicore' | 'lan' | 'round';
  /** ピン番号ごとの芯線の色ID（src/data/wires.ts の WIRE_COLORS）。ケーブルの芯線をこの色で描く */
  pinColors?: Record<number, string>;
  /**
   * 機器の正面に差すコネクタ（MIL・RJ-45 など）の場合 'front'。
   * プラグを正面から見た形（width × length）で端子位置を中心に描き、ケーブルはプラグの side 側の端から出す。
   * 省略時は side の向きに差し込む形で描く
   */
  facing?: 'front';
  /** facing: 'front' のときのプラグの長さ[px]（side 方向）。省略時は 12 */
  length?: number;
}

/**
 * 信号の種類（role: 'signal' の端子・ピンに指定すると、つないだ相手との相性をチェックする）。
 * - npn: NPN オープンコレクタ出力（ON で 0V へ引き込む。プラスコモンの入力に使う）
 * - pnp: PNP 出力（ON で +V を出す。マイナスコモンの入力に使う）
 * - contact: 無電圧接点の出力（どの入力にも使える）
 * - 2wire: 2線式センサー（電源線がなく、入力回路と電源の間に直列に入る）
 * - dc: DC 入力（シンク/ソースはコモンの配線で決まる）
 * - dry: 無電圧接点入力（機器内部の電源で検出する。外部から電圧をかけない）
 * - analog-v / analog-i: アナログ電圧 / 電流
 * - line-driver: ラインドライバ（差動）出力・入力
 */
export type SignalKind = 'npn' | 'pnp' | 'contact' | '2wire' | 'dc' | 'dry' | 'analog-v' | 'analog-i' | 'line-driver';

export interface SignalSpec {
  /** 'out': 信号を出す（センサーの出力線など）、'in': 信号を受ける（PLC の入力点など） */
  dir: 'out' | 'in';
  kind: SignalKind;
  /** 入力点（kind: 'dc'）のコモン端子のID。コモンが +V ならプラスコモン（NPN 用）、0V ならマイナスコモン（PNP 用）と判定する */
  common?: string;
  /** コモン端子がなく極性が決まっている入力の場合のコモンの極性（'+' はプラスコモン） */
  commonPolarity?: '+' | '-';
}

/**
 * 端子の機能（安全回路のチェックに使う。role とは独立）。
 * - safety-input: 安全入力（Si0、T12 など）
 * - test-output: テスト出力（テストパルス。T0、T11 など）
 * - ossd: 安全出力（半導体出力）
 * - safety-contact: 安全出力のリレー接点（13-14 など）
 * - aux-output: 補助出力（非安全）
 * - edm: 外部機器監視（EDM）入力・フィードバックループ
 * - reset: 手動リセット入力（押しボタンをつなぐ）
 * - reset-auto: 自動リセットにする端子（配線すると自動リセットになる。G9SA の A-B 間の短絡など）
 * - start / muting: スタート・ミューティング入力
 * - unlock-solenoid: 通電で解錠するソレノイド（スプリングロック式の電磁ロック）
 * - lock-solenoid: 通電で施錠するソレノイド（ソレノイドロック式の電磁ロック）
 */
export type TerminalFunction =
  | 'safety-input'
  | 'test-output'
  | 'ossd'
  | 'safety-contact'
  | 'aux-output'
  | 'edm'
  | 'reset'
  | 'reset-auto'
  | 'start'
  | 'muting'
  | 'unlock-solenoid'
  | 'lock-solenoid';

/** 端子とコネクタのピンに共通の項目 */
interface TerminalBase {
  /** 端子の印字（表示用。省略時は id） */
  label?: string;
  /** 端子の機能・用途の説明（例: 'COM0'、'安全入力 CH1'）。label は印字、note は意味を書く */
  note?: string;
  role: TerminalRole;
  supply?: SupplySpec;
  /** 受電できる電源の条件。AC と DC のどちらも受けられる端子（リレー出力のコモンなど）は配列で書き、いずれかを満たせばよい */
  accepts?: AcceptSpec | AcceptSpec[];
  /** 信号の種類（role: 'signal' の端子） */
  signal?: SignalSpec;
  /** 安全回路での機能 */
  function?: TerminalFunction | TerminalFunction[];
  /** 2 チャンネル構成の安全回路でのチャンネル番号 */
  channel?: 1 | 2;
  /** true の場合、未接続でも警告しない（予備端子・補助接点など） */
  optional?: boolean;
}

export interface TerminalDef extends TerminalBase {
  /** 機器内で一意な端子ID（例: 'L1', 'T1', 'A1', '+V'） */
  id: string;
  /** 端子位置（SVG座標。ネジの中心付近） */
  x: number;
  y: number;
  /** 電線が出ていく向き */
  side: TerminalSide;
  connector?: ConnectorSpec;
}

/**
 * 機器内部の導通経路（ブレーカーの極、端子台の上下、接点、出力など）。
 * 電圧の伝搬と保護電流の計算に使う。
 *
 * switch を指定した経路は開閉する。チェックでは、
 * - 電源が届くか・電圧が合うかは、すべての接点と出力が閉じた状態（動作中）で確認する
 * - 短絡は、常時の状態・通常時（b 接点だけが閉）・機器ごとに 1 台ずつ動作させた状態（その機器の a 接点・出力が閉、b 接点が開）で確認する
 */
export interface InternalLink {
  from: string;
  to: string;
  /** true の場合 from → to の一方向のみ（保護機器の line → load など） */
  directed?: boolean;
  /** true の場合、この経路を通った先は機器の protectionCurrent で保護されているとみなす */
  protects?: boolean;
  /**
   * 開閉する経路の種類。省略時は常に導通（ブレーカーの極、端子台など）。
   * - NO: a 接点（通常は開、動作で閉）
   * - NC: b 接点（通常は閉、動作で開）
   * - output: PLC・センサーなどの出力（ON で導通）。from に出力点、to にコモン（または出力素子の基準側）を書く
   */
  switch?: 'NO' | 'NC' | 'output';
  /** 直接開路動作（IEC 60947-5-1 附属書 K、⊕ マーク）の接点。イネーブルスイッチの a 接点（強制開離）にも付ける */
  directOpening?: boolean;
  /** 強制ガイド接点（IEC 61810-3）・ミラー接点（IEC 60947-4-1 附属書 F） */
  linked?: 'force-guided' | 'mirror';
  /** 出力・接点 1 点の定格電流[A]。switch: 'output' の経路では、出力点につないだ負荷の定格電流の合計と比較する */
  ratedCurrent?: NumOrParam;
}

/** コモンあたりの電流の上限（出力ユニットの「8A/コモン」など） */
export interface CommonLimit {
  /** コモン端子のID。switch: 'output' の経路のうち to がこの端子のものを合計する */
  common: string;
  /** 上限電流[A] */
  current: NumOrParam;
}

/**
 * 安全回路のチャンネルの組（2 チャンネル入力、OSSD1/OSSD2 など）。
 * 入力は、テスト出力（source）から接点を通って入力（input）へ戻る組を書く。
 */
export interface SafetyChannelGroup {
  /** 機器内で一意な名前（例: 'IN'、'Si0-1'、'OSSD'） */
  id: string;
  label?: string;
  kind: 'input' | 'output';
  /**
   * 入力の想定（kind: 'input'）。省略時は 'nc-nc'。どちらも受けられる入力は配列で書く（例: ['nc-nc', 'ossd']）。
   * - nc-nc: 2 つの b 接点（等価入力。非常停止など）
   * - nc-no: b 接点と a 接点（非等価入力）。channels[0] が b 接点、channels[1] が a 接点
   * - ossd: OSSD 出力機器（ライトカーテンなど）を直接つなぐ入力
   */
  mode?: SafetyInputMode | SafetyInputMode[];
  /**
   * 入力の使い方（2 チャンネルの組、EDM・リセットなど）を機器の設定・プログラムで決める場合 true
   * （安全コントローラーの汎用安全入力など）。片側だけの配線や別チャンネルのテスト出力の使用は、注意（info）にとどめる
   */
  configurable?: boolean;
  channels: {
    /** 安全入力の端子ID（kind: 'input'） */
    input?: string;
    /** その入力へ戻すテスト出力（または入力用電源）の端子ID */
    source?: string;
    /** 安全出力の端子ID（kind: 'output'）。接点出力は負荷側・電源側のどちらの端子でもよい */
    output?: string;
  }[];
}

/** 機器の安全性能 */
export interface SafetyRating {
  /** ISO 13849-1 のパフォーマンスレベル（最大） */
  pl?: 'a' | 'b' | 'c' | 'd' | 'e';
  /** ISO 13849-1 のカテゴリ（最大） */
  category?: 'B' | '1' | '2' | '3' | '4';
  /** IEC 62061 / IEC 61508 の SIL（SIL CL） */
  sil?: 1 | 2 | 3;
  /** IEC 61496 のタイプ（ライトカーテン・レーザスキャナなど人を検出する保護装置） */
  esType?: 2 | 3 | 4;
  /** B10d（10% が危険側故障に至るまでの動作回数。スイッチ・接触器など。表示用） */
  b10d?: number;
  /** 準拠規格（表示用） */
  standards?: string[];
}

export type SafetyInputMode = 'nc-nc' | 'nc-no' | 'ossd';

/**
 * 入出力番号の表し方（先頭番号の表示と、ラベル作成の補助に使う）。
 * - kv: KEYENCE のリレー番号（16点 = 1チャネル。例: R000、R1015）
 * - hex: 16進（三菱 iQ-R・Q。例: X00、Y1F）
 * - octal: 8進（三菱 FX。例: X0、Y17）
 */
export type IoFormat = 'kv' | 'hex' | 'octal';

/**
 * 増設ユニットの連結・ベースユニットへの装着（バス）。
 * 図面の機器に mount（装着先と位置）を書くと、親の横（または中）に並べて描き、
 * 内部電源の収支チェックと入出力の先頭番号の自動割付けを行う。
 */
export interface BusSpec {
  /** バスの種類。同じ種類の親にだけ装着できる（例: 'kv-8000'、'kv-nano'、'melsec-iq-r'、'melsec-fx5'） */
  kind: string;
  /** 他のユニットを装着できる親（CPU・ベースユニット・KV-EC01 など）の場合に指定 */
  host?: {
    /** 装着できるユニットのバスの種類。省略時は kind と同じもの（例: KV-X の CPU に KV-8000 用の増設ユニットも装着できるなら ['kv-x', 'kv-8000']） */
    accepts?: string[];
    /** 装着できるユニット数 */
    slots?: number;
    /** 装着したユニットを並べる位置（親の左上からの座標）。省略時は親の右隣 */
    origin?: { x: number; y: number };
    /**
     * 位置ごとの x 座標（origin からの距離。slotX[0] が位置 1）。ベースユニットのようにスロットの位置が決まっている場合に書く。
     * 省略時は、装着したユニットの幅の分だけ詰めて並べる
     */
    slotX?: number[];
    /** 特定の種類のユニット専用の位置（例: { 1: 'power', 2: 'cpu' }）。ほかの位置は入出力などのユニット用 */
    slotRoles?: Record<number, string>;
    /** 入出力番号の割付け */
    numbering?: {
      /** 'shared': 入力と出力で同じ番号の並び（KV・iQ-R）、'separate': 入力と出力を別々に数える（FX5） */
      mode: 'shared' | 'separate';
      /** 1 ユニットが占有する点数の単位（KV・iQ-R は 16、FX5 は 8） */
      unit: number;
      /** 最初のユニットの先頭番号（点数）。省略時は親の io の点数の後ろから */
      start?: { input?: number; output?: number };
      /** 空きスロットが占有する点数（iQ-R の初期設定は 16）。省略時は空きスロットを詰めて数える */
      emptySlot?: number;
    };
  };
  /** 専用の位置に装着するユニットの種類（host.slotRoles と対応。例: 'power'、'cpu'） */
  role?: string;
  /** バスへ供給する内部電源の容量[A]（例: { '5V': 6.5 }） */
  supply?: Record<string, NumOrParam>;
  /** バスから消費する内部電源の電流[A]（例: { '5V': 0.12 }） */
  load?: Record<string, NumOrParam>;
  /** 入出力の点数と番号の表し方。装着すると params の ioIn / ioOut（先頭番号の点数）が自動で決まる */
  io?: { inputs?: number; outputs?: number; format: IoFormat };
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
  /** 'select'（既定）: options から選ぶ。'text': 自由に入力する（options は空でよい） */
  input?: 'select' | 'text';
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
  | 'sensor'
  | 'safety'
  | 'network'
  | 'link';

/**
 * コネクタのピン（画面上の端子としては表示しない）。
 * id は '<コネクタ端子ID>#<ピン番号>'（例: 'CN1#1'）。links から参照できる。
 */
export interface PinDef extends TerminalBase {
  id: string;
  role: Exclude<TerminalRole, 'connector'>;
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
  /**
   * 端子・ピン・内部経路は、パラメータで変わる場合（先頭入出力番号でラベルが変わる、NPN/PNP で信号の種類が変わるなど）は
   * パラメータを受け取って配列を返す関数にする。引数は既定値を補完済みのパラメータ（装着で決まる ioIn / ioOut を含む）。
   * 利用側は resolve.ts の resolveDevice() を通して読む。
   */
  terminals: ParamDependent<TerminalDef[]>;
  /** コネクタのピン定義（ピンごとの名称・電気的仕様） */
  pins?: ParamDependent<PinDef[]>;
  links?: ParamDependent<InternalLink[]>;
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
  /**
   * リンク（他のシートへ電線を飛ばす記号）の場合に指定する。param に書いた名前が同じリンクどうしの terminal が導通する。
   */
  netLabel?: { param: string; terminal: string };
  /** コモンあたりの電流の上限 */
  commonLimits?: ParamDependent<CommonLimit[]>;
  /** 安全回路のチャンネルの組 */
  safetyChannels?: ParamDependent<SafetyChannelGroup[]>;
  /** 安全性能 */
  safety?: SafetyRating;
  /** 増設ユニットの連結・ベースユニットへの装着 */
  bus?: BusSpec;
}

export type ParamValues = Record<string, number | string>;

/** 固定値か、パラメータから求める関数 */
export type ParamDependent<T> = T | ((params: ParamValues) => T);

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
