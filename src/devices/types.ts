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

/**
 * 数値を直接書くか、機器パラメータ（params）のキーを参照するか、パラメータから求める関数にする
 * （関数の引数は既定値を補完済みのパラメータ。軸数・容量・極数で変わる消費電流など）
 */
export type NumOrParam = number | { param: string } | ((params: ParamValues) => number);

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
 * - air: エアのポート（air を必ず指定）。エアのポートどうしをチューブでつなぐ。電気のチェックの対象外
 */
export type TerminalRole = 'line' | 'load' | 'pass' | 'supply' | 'input' | 'ground' | 'signal' | 'connector' | 'air';

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
  /**
   * つながっていなければ警告する（アクチュエーターのモーター・エンコーダー、1 軸コントローラーの MOT / PG など、
   * つながないと機器が働かないコネクタ）。省略時は、コネクタは未接続でも指摘しない
   */
  required?: boolean;
}

/**
 * エアのポートの用途。
 * - supply: エア源の出口（工場エアの供給口など。pressure を指定）
 * - in: 一次側（電磁弁の P、レギュレータの IN など。上流からエアを受ける）
 * - out: 二次側（レギュレータの OUT など。下流へエアを送る）
 * - work: 作業ポート（電磁弁の A・B、シリンダのポートなど。給気と排気の両方がある）
 * - exhaust: 排気ポート（電磁弁の R・EA・EB など。大気へ逃がす。未接続でも警告しない）
 * - pilot: パイロットポート（外部パイロット・パイロット操作の信号）
 * - vacuum: 真空ポート（真空発生器・吸着パッドなど）
 */
export type AirPortKind = 'supply' | 'in' | 'out' | 'work' | 'exhaust' | 'pilot' | 'vacuum';

/** エアのポートの仕様（role: 'air' の端子に指定） */
export interface AirPortSpec {
  kind: AirPortKind;
  /**
   * 適合チューブの外径[mm]（ワンタッチ管継手）。ねじポートで継手を別に付ける機器でも、付ける継手のチューブ外径を書く
   * （パラメータで選べる場合は { param }）。つないだチューブの外径と違えば警告する
   */
  tubeOD?: NumOrParam;
  /**
   * ポートのねじの呼び（'M5'、'Rc1/8'、'Rc1/4' など。表示・部品表用）。
   * ポートに継手付きの部品（直付けのスピードコントローラなど。accessories に書く）を付けたときは書かない
   * （チューブをつなぐのはその部品のワンタッチ管継手で、ねじのポートに付ける継手は要らない）
   */
  thread?: string;
  /**
   * おねじのポート（サイレンサ、エルボ形スピードコントローラのシリンダ側など）。相手のめねじのポートへ直接ねじ込むので、
   * つないだ線はチューブではなく直結として扱う（部品表・線番表のチューブに数えず、ねじの呼びの一致を確かめる）
   */
  male?: boolean;
  /** 供給圧力[MPa]（kind: 'supply'） */
  pressure?: NumOrParam;
  /** 使用圧力範囲[MPa]。届く圧力が範囲の外なら警告する */
  minPressure?: NumOrParam;
  maxPressure?: NumOrParam;
}

/**
 * 機器の中のエアの通り道（電磁弁の切り換え、レギュレータの減圧、継手の分岐など）。
 * エアの届く範囲と圧力の計算に使う（src/check/pneumatic.ts）。
 */
export interface AirLink {
  from: string;
  to: string;
  /** true の場合 from → to の一方向のみ（レギュレータの IN → OUT、逆止弁など） */
  directed?: boolean;
  /** 減圧する通り道の二次側の設定圧力[MPa]（レギュレータ）。from → to の向きに、この圧力を上限にして通す */
  regulate?: NumOrParam;
  /**
   * 切り換わる通り道（電磁弁の P→A など）。届く範囲は、すべての位置の通り道を合わせて求める。
   * - on: ソレノイドに通電した位置（またはパイロットで切り換えた位置）で通る
   * - off: 通電していない位置（スプリングで戻った位置）で通る
   * - always: どの位置でも通る（3 位置のプレッシャセンタの中立など、位置を問わず通る経路）
   */
  valve?: 'on' | 'off' | 'always';
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
  /**
   * 端子の短い呼び名（例: 'コイル+'、'COM1'、'NO1'、'+V'、'一次 R'）。選択中の機器の端子の横に吹き出しで出す。
   * 8 文字程度まで。省略時は note の括弧より前を使う（hint.ts の terminalHint）
   */
  hint?: string;
  role: TerminalRole;
  supply?: SupplySpec;
  /** 受電できる電源の条件。AC と DC のどちらも受けられる端子（リレー出力のコモンなど）は配列で書き、いずれかを満たせばよい */
  accepts?: AcceptSpec | AcceptSpec[];
  /** 信号の種類（role: 'signal' の端子） */
  signal?: SignalSpec;
  /** エアのポートの仕様（role: 'air'） */
  air?: AirPortSpec;
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
  /**
   * ネジ端子でつなぐ通信（DeviceNet・CC-Link など）の通信線の端子: 同じポートに属する端子をまとめる名前（例: 'NET1'）と通信方式。
   * 電線（と端子台）でつながった相手の機器の通信線の端子と、共通の通信方式がなければ警告する（protocol-mismatch）
   */
  port?: string;
  protocols?: string[];
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
/**
 * 出力の電流の上限（合計）。次のどちらかで、合計する出力を決める。
 * - common: コモン端子ごと。switch: 'output' の経路のうち to がこの端子のものを合計する
 * - outputs: 出力点のグループ（出力の端子 ID・ピン ID の一覧）。switch: 'output' の経路のうち from がこの一覧にあるものを合計する
 *   （「8 点で 400mA」「2 出力合計 100mA」のように、コモンとは別に決まる上限）
 */
export interface CommonLimit {
  common?: string;
  outputs?: string[];
  /** 指摘に書くグループの名前（例: '出力 300〜307'）。省略時はコモン端子の名前、または出力の端子の一覧 */
  label?: string;
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
    /**
     * 装着したユニットのエアのポートを、親のポートにつなぐ通路（マニホールドの SUP・EXH の通路）。
     * 「ユニットのポートID → 親のポートID」で書く（例: { P: 'P', EA: 'R', EB: 'R' }）。
     * ユニットのポートは、画面に出さないエアのポート（pins に role: 'air' で書いたもの）でも、ふつうの端子でもよい。
     * エアのチェック（src/check/pneumatic.ts）は、この通路を内部のチューブとみなしてエアの届く範囲を求める
     */
    airGallery?: Record<string, string>;
    /**
     * 装着したユニット（位置の順）から、親のパラメータを求める（マニホールドの連数・A/B ポートの継手の表記など）。
     * 返した値は親の params に加わり（図面で明示した params が優先）、modelOf・svg で使える。引数の params は既定値を補完済み
     */
    fromUnits?: (units: { type: string; def: DeviceDefinition; params: ParamValues }[]) => ParamValues;
    /**
     * 通信タイプ（シリアル伝送）のマニホールド: SI ユニットの出力を、装着した電磁弁のソレノイドへ連の順に割り付ける（src/model/bus.ts）。
     * 出力番号は 0 から、連 1（D 側）から順に、各連の A 側・B 側の順に数える。割り付けた番号は連の params の solA / solB に入る。
     * 連のソレノイドの数は、連の機器の pneumatic.valve.operators（'solenoid' の数）で数える
     */
    serial?: SerialOutputSpec;
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

/** 通信タイプのマニホールドの SI ユニットの出力（BusSpec.host.serial） */
export interface SerialOutputSpec {
  /**
   * 配線。'double' はどの連も 2 点（ダブル配線。シングルの弁の B 側とブランクプレートの連は空き）、
   * 'specified' は連の弁のソレノイドの数（配線指定。シングル 1 点、ダブル・3 位置 2 点、ブランクプレート 1 点）。
   * パラメータで選ぶ場合は { param }（値は 'double' / 'specified'）
   */
  wiring: 'double' | 'specified' | { param: string };
  /** SI ユニットの出力点数（パラメータで変わる場合は関数。引数は既定値を補完済みのパラメータ）。割り付けた点数がこれを超えると指摘する */
  outputs: number | ((params: ParamValues) => number);
  /** SI ユニットの型式（I/O 表・部品表に書く）。引数は既定値を補完済みのパラメータ */
  unitModel: (params: ParamValues) => string;
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
  /**
   * このパラメータが意味を持つか（例: オートスイッチ「なし」のときのスイッチの個数・リード線の長さは意味を持たない）。
   * false のときはプロパティに出さず、部品表の仕様にも書かない。引数は既定値を補完済みのパラメータ。省略時は常に意味を持つ
   */
  relevant?: (params: ParamValues) => boolean;
  /** 部品表の仕様に書くときの名前（パラメータで意味が変わるもの。例: スピコンを直付けしたときのチューブ外径）。省略時は label */
  specLabel?: (params: ParamValues) => string;
  /**
   * ほかのパラメータの値で変わる選択肢（例: RCP6 の高推力タイプでは適応コントローラーが P4 / P6）。引数は既定値を補完済みのパラメータ。
   * 返す値は options の値の一部にする（表示名は変えてよい）。options は全部の値の一覧として、検索・型式の検査などに使う。
   * いまの値が返した選択肢にないときは、プロパティで変えたときに選べる最初の値に直し、チェックで指摘する（param-unavailable）
   */
  optionsFor?: (params: ParamValues) => ParamOption[];
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
  | 'air-supply'
  | 'valve'
  | 'actuator'
  | 'air-fitting'
  | 'link';

/**
 * コネクタのピン（画面上の端子としては表示しない）。
 * id は '<コネクタ端子ID>#<ピン番号>'（例: 'CN1#1'）。links から参照できる。
 * role: 'air' のピンは、画面に出さないエアのポート（マニホールドに装着する電磁弁の P・EA・EB など）。id は自由で、
 * airLinks から参照し、親の bus.host.airGallery で親のポートにつなぐ
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
  /** 型式（例: 'NV32-SV 3P'）。パラメータで型式が変わる機器は、シリーズの代表の型式を書き、modelOf で組み立てる */
  model: string;
  /**
   * パラメータから組み立てた型式（例: シリンダのチューブ内径・ストロークから 'CDM2B25-100Z'）。
   * 画面の機器名の横・部品表・AI 用の説明に使う。省略時は model。引数は既定値を補完済みのパラメータ
   */
  modelOf?: (params: ParamValues) => string;
  maker?: string;
  category: DeviceCategory;
  description?: string;
  /** 自動採番する機器名の接頭辞（例: 'ELB' → ELB1, ELB2…） */
  labelPrefix: string;
  /** 大きさ[px]。size があるときは、パラメータの既定値での大きさ（パレット・置いた直後の位置に使う） */
  width: number;
  height: number;
  /**
   * パラメータで大きさが変わる機器（ストロークで長さが変わるシリンダなど）の大きさ。引数は既定値を補完済みのパラメータ。
   * 利用側は deviceSize() か resolveDevice() の width / height を通して読む。既定値では width / height と同じ値を返すこと
   */
  size?: (params: ParamValues) => { width: number; height: number };
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
  /** 機器の中のエアの通り道 */
  airLinks?: ParamDependent<AirLink[]>;
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
  /**
   * コネクタ付きのケーブル（センサー用の片側コネクタケーブルなど）。
   * コネクタから引いたときの候補（model/mates.ts）は、引いた側と同じ分類の機器を除くが、ケーブルは同じ分類でも候補に出す
   */
  cable?: boolean;
  /**
   * メーカーの資料で確認できなかった推定の値の説明（例: '電源端子の並びは推定'）。
   * 書いた機器（または説明・端子の説明に「推定」とある機器）は、画面・部品表・チェック結果に「推定を含む」と表示する
   */
  estimated?: string;
  /** 展開図の記号に切り出すときの補足（自動の切り出しで決めきれない機器だけに書く。src/schematic/elements.ts） */
  schematic?: SchematicHint;
  /**
   * 空圧回路図（JIS B 0125-1 / ISO 1219-1 の記号）での表し方。エア機器に書く。
   * オートスイッチの有無などパラメータで変わる場合は関数にする（利用側は resolveDevice() の pneumatic を読む）
   */
  pneumatic?: ParamDependent<PneumaticHint>;
  /**
   * 機器に付ける付属品（シリンダのポートに直付けしたスピードコントローラなど）。部品表に機器とは別の行で載る。
   * パラメータで変わる場合は関数にする（利用側は deviceAccessories() を通して読む）
   */
  accessories?: ParamDependent<Accessory[]>;
}

/** 機器の付属品（部品表の 1 行。同じメーカー・型式・仕様のものは数をまとめる） */
export interface Accessory {
  model: string;
  name: string;
  /** 省略時は機器のメーカー */
  maker?: string;
  /** 部品表の分類（省略時は機器と同じ） */
  category?: DeviceCategory;
  /** 部品表の仕様欄 */
  spec?: string;
  /** 付ける端子の ID（部品表の機器名の欄に「CY1.HEAD」のように書く）。省略時は機器名 */
  terminal?: string;
  /** 数（省略時は 1） */
  qty?: number;
  /** 推定の値を含む */
  estimated?: boolean;
}

/**
 * 空圧回路図の記号の種類と、記号のポート名。ports には「記号のポート名 → 端子ID」を書く。
 * - source: 空気圧源（out）
 * - filter / mist-separator / lubricator / regulator / filter-regulator: エアフィルタ・ミストセパレータ・ルブリケータ・減圧弁（in, out）
 * - frl: 3 点セット（units の順に左から並べる簡略でない記号。in, out）
 * - residual-valve: 残圧排気弁（3 ポート手動弁。in, out, exh）
 * - shutoff: 止め弁・ボール弁（in, out）
 * - check-valve: 逆止弁（in → out の向きに流れる。in, out）
 * - speed-controller: 速度制御弁（絞り＋逆止弁。in → out が自由流れ、out → in が絞られる流れ。in, out）
 * - valve: 方向制御弁（ISO のポート番号 '1'(P) '2'(B / 3 ポートは A) '4'(A) '3'(EB / 3 ポートは R) '5'(EA)、パイロット '12' '14'）
 * - cylinder: シリンダ（head: ヘッド側＝押す側、rod: ロッド側＝引く側。単動は使う側だけ）
 * - gripper: エアチャック（open, close） / rotary: ロータリアクチュエータ（a, b）
 * - silencer: サイレンサ（in） / pressure-switch: 圧力スイッチ（in） / gauge: 圧力計（in）
 * - tee: 分岐継手（a, b, c） / manifold: マニホールド（sup, exh。装着した電磁弁をまとめる）
 * - vacuum-ejector: 真空エジェクタ（in, vac, exh） / vacuum-pad: 吸着パッド（vac）
 */
export type PneumaticSymbolKind =
  | 'source'
  | 'filter'
  | 'mist-separator'
  | 'lubricator'
  | 'regulator'
  | 'filter-regulator'
  | 'frl'
  | 'residual-valve'
  | 'shutoff'
  | 'check-valve'
  | 'speed-controller'
  | 'valve'
  | 'cylinder'
  | 'gripper'
  | 'rotary'
  | 'silencer'
  | 'pressure-switch'
  | 'gauge'
  | 'tee'
  | 'manifold'
  | 'vacuum-ejector'
  | 'vacuum-pad';

/** 方向制御弁の操作方式 */
export type ValveOperator = 'solenoid' | 'pilot' | 'manual' | 'mechanical' | 'spring';

export interface PneumaticHint {
  symbol: PneumaticSymbolKind;
  /** 記号のポート名 → 端子ID（上の一覧のポート名） */
  ports: Record<string, string>;
  /** 方向制御弁（symbol: 'valve'） */
  valve?: {
    /** ポート数（3 ポート弁・5 ポート弁） */
    ways: 2 | 3 | 5;
    positions: 2 | 3;
    /** 左側（14 側、A 側）と右側（12 側、B 側）の操作方式。シングルソレノイドは { a: 'solenoid', b: 'spring' } */
    operators: { a: ValveOperator; b: ValveOperator };
    /** 3 位置の中立: クローズドセンタ・エキゾーストセンタ・プレッシャセンタ */
    center?: 'closed' | 'exhaust' | 'pressure';
    /** 常時開（3 ポート弁で通電していないとき 1→2 が通じる） */
    normallyOpen?: boolean;
    /** ソレノイドの電気端子（記号の横にソレノイドの名前を書くため。a・b 側の + 端子の ID） */
    solenoids?: { a?: string; b?: string };
  };
  /** シリンダ（symbol: 'cylinder'） */
  cylinder?: {
    acting: 'double' | 'single-push' | 'single-pull';
    /** 両ロッド */
    doubleRod?: boolean;
    /** クッション付き */
    cushion?: boolean;
    /** マグネット内蔵（オートスイッチ付き） */
    magnet?: boolean;
    /** オートスイッチの電気端子（記号の横にスイッチの名前を書くため。ヘッド側・ロッド側の出力端子の ID） */
    switches?: { head?: string; rod?: string };
  };
  /**
   * アクチュエータのオートスイッチ（記号の横にスイッチの位置と PLC の入出力番号を書く）。label は検出する位置（'開'・'閉'・'A 端' など）、
   * terminal は出力端子の ID。シリンダは cylinder.switches でもよい
   */
  switches?: { label: string; terminal: string }[];
  /** 3 点セット（symbol: 'frl'）の構成（左＝一次側から） */
  units?: ('filter' | 'mist-separator' | 'regulator' | 'lubricator' | 'filter-regulator')[];
  /** 圧力計付き（減圧弁・3 点セット） */
  gauge?: boolean;
  /**
   * アクチュエータのポートに直付けした速度制御弁（記号のポート名 → 制御方式と型式）。
   * 回路図では、ポートとチューブの間に速度制御弁の記号を描く（メータアウトは弁 → アクチュエータが自由流れ）
   */
  speedControllers?: Record<string, { control: 'meter-out' | 'meter-in'; model: string }>;
}

/**
 * 接点の操作の種類（展開図で接点の記号を描き分ける）。
 * - pushbutton: 押しボタン（イネーブルスイッチを含む）
 * - emergency: 非常停止（きのこ形の押しボタン）
 * - pull: 引き操作（ロープ式非常停止スイッチ）
 * - limit: リミットスイッチ・インタロックスイッチ（機械的に操作される）
 * - thermal: 熱動（サーマルリレーの接点。サーマルリレーは指定しなくてもこれになる）
 */
export type ContactActuator = 'pushbutton' | 'emergency' | 'pull' | 'limit' | 'thermal';

export interface SchematicHint {
  /** この機器の a 接点・b 接点の操作の種類。省略時はリレー・電磁接触器の接点 */
  actuator?: ContactActuator;
  /** 遮断器の極に漏電検出を付けて描く（漏電遮断器） */
  earthLeakage?: boolean;
  /** 明示する要素（コイル・表示灯・電動機）。ここに書いた端子は自動の切り出しに使わない */
  elements?: { kind: 'coil' | 'lamp' | 'motor'; terminals: string[] }[];
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
  if (typeof v === 'function') {
    const n = v(paramsWithDefaults(def, params));
    return Number.isFinite(n) ? n : undefined;
  }
  const raw = params?.[v.param] ?? def.params?.find((p) => p.key === v.param)?.default;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** パラメータに応じた型式（modelOf があれば組み立てたもの） */
export function deviceModel(def: DeviceDefinition, params: ParamValues | undefined): string {
  return def.modelOf ? def.modelOf(paramsWithDefaults(def, params)) : def.model;
}

/** パラメータに応じた付属品（accessories があれば求めたもの） */
export function deviceAccessories(def: DeviceDefinition, params: ParamValues | undefined): Accessory[] {
  const a = def.accessories;
  if (!a) return [];
  return typeof a === 'function' ? a(paramsWithDefaults(def, params)) : a;
}

/** パラメータに応じた機器の大きさ（size があれば求めたもの） */
export function deviceSize(def: DeviceDefinition, params: ParamValues | undefined): { width: number; height: number } {
  return def.size ? def.size(paramsWithDefaults(def, params)) : { width: def.width, height: def.height };
}

/** 既定値を補完したパラメータを返す */
export function paramsWithDefaults(def: DeviceDefinition, params: ParamValues | undefined): ParamValues {
  const out: ParamValues = {};
  for (const p of def.params ?? []) out[p.key] = p.default;
  return { ...out, ...params };
}

/** パラメータの選択肢の表示名（label がなければ値＋単位）。params を渡すと、ほかのパラメータで変わる表示名（optionsFor）を使う */
export function paramLabel(def: DeviceDefinition, key: string, value: number | string, params?: ParamValues): string {
  const p = def.params?.find((x) => x.key === key);
  const list = p && params ? paramOptions(def, p, params) : p?.options;
  const opt = list?.find((o) => o.value === value) ?? p?.options.find((o) => o.value === value);
  return opt?.label ?? `${value}${p?.unit ?? ''}`;
}

/** いまのパラメータで選べる選択肢（optionsFor があればそれ、なければ options） */
export function paramOptions(def: DeviceDefinition, p: ParamDef, params: ParamValues | undefined): ParamOption[] {
  return p.optionsFor ? p.optionsFor(paramsWithDefaults(def, params)) : p.options;
}

/** いまのパラメータで選べない値になっているパラメータ（選択式だけ） */
export function unavailableParams(def: DeviceDefinition, params: ParamValues | undefined): { param: ParamDef; value: number | string }[] {
  const full = paramsWithDefaults(def, params);
  return (def.params ?? [])
    .filter((p) => p.input !== 'text' && p.optionsFor)
    .filter((p) => !paramOptions(def, p, full).some((o) => o.value === full[p.key]))
    .map((p) => ({ param: p, value: full[p.key] }));
}

/**
 * 選べない値になったパラメータを、選べる値に直す（既定値が選べれば既定値、なければ最初の値）。
 * ほかのパラメータを変えて選択肢が変わったときに使う。直すものがなければ params をそのまま返す
 */
export function fixUnavailableParams(def: DeviceDefinition, params: ParamValues | undefined): ParamValues | undefined {
  let out = params;
  for (let i = 0; i < 4; i++) {
    const bad = unavailableParams(def, out);
    if (!bad.length) return out;
    for (const { param } of bad) {
      const opts = paramOptions(def, param, out);
      const next = opts.find((o) => o.value === param.default) ?? opts[0];
      if (next) out = { ...out, [param.key]: next.value };
    }
  }
  return out;
}
