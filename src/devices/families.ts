/**
 * 機器のファミリー（パレットに出す大くくりの機器）。
 *
 * パレットには型式ごとの機器定義ではなく「漏電ブレーカー」「電磁弁」「マニホールド」のような大くくりのファミリーを並べ、
 * メーカー・シリーズ・極数などの細かい違いは、置くときの「機種を選ぶ」ダイアログ（src/editor/DevicePicker.tsx）か
 * 置いたあとのプロパティ（機種の変更）で選ぶ。
 *
 * ファミリーは機器定義の一般名称・分類から、FAMILY_RULES の上から順に最初に合ったものに決める。
 * どのルールにも合わない機器は、一般名称ごとに 1 つのファミリーになる（新しい機器を足しても、パレットから消えることはない）。
 * 図面の JSON には今までどおり機器定義の type を書く（ファミリーは画面の分け方だけ）。
 */
import { deviceDefinitions } from './registry';
import { paramsWithDefaults, type DeviceCategory, type DeviceDefinition } from './types';

/** ダイアログで機種を絞り込む観点（メーカー・極数・切換えの種類など） */
export interface FamilyFacet {
  label: string;
  /** 機器の値（表示する文字列）。undefined の機器はこの観点の対象外 */
  value: (d: DeviceDefinition) => string | undefined;
}

export interface FamilyRule {
  id: string;
  name: string;
  /** パレットの分類。省略時は機器定義の分類 */
  category?: DeviceCategory;
  /** 検索用の別名（現場の通称など） */
  keywords?: string[];
  test: (d: DeviceDefinition) => boolean;
  /** 置くときに最初に選んでおく機器の type。省略時は並べた順の先頭 */
  default?: string;
  /** メーカー・種類のほかに絞り込む観点 */
  facets?: FamilyFacet[];
  /** パレットの分類の一覧には出さない（検索では出す）。ほかの画面（バルブエディタなど）から置くもの */
  hidden?: boolean;
}

export interface DeviceFamily {
  id: string;
  name: string;
  category: DeviceCategory;
  keywords: string[];
  /** 属する機器（メーカー・名前・型式の順） */
  members: DeviceDefinition[];
  /** 最初に選んでおく機器 */
  defaultType: string;
  /** 絞り込みの観点（メーカー・種類を含む。2 つ以上の値があるものだけ） */
  facets: FamilyFacet[];
  /** パレットの並び順（FAMILY_RULES の順。ルールに合わないものは後ろ） */
  order: number;
  hidden: boolean;
}

const named = (re: RegExp, category?: DeviceCategory) => (d: DeviceDefinition) => re.test(d.name) && (!category || d.category === category);

/** 一般名称の括弧の中（「電磁弁（ダブルソレノイド）」→「ダブルソレノイド」）。括弧がなければ undefined */
const paren = (d: DeviceDefinition) => /（(.+)）/.exec(d.name)?.[1];
/** 型式の極数（'3P' など） */
const poles = (d: DeviceDefinition) => /(\d)P\b/.exec(d.model)?.[1]?.concat('P');
/** 型式の先頭（シリーズ。'NV32-SV 3P' → 'NV32-SV'） */
const series = (d: DeviceDefinition) => d.model.split(/[\s（(+]/)[0];
/** コネクタの極数（'40 極'。いちばん多いもの） */
function connectorPins(d: DeviceDefinition): string | undefined {
  const ts = typeof d.terminals === 'function' ? d.terminals(paramsWithDefaults(d, undefined)) : d.terminals;
  const n = Math.max(0, ...ts.map((t) => t.connector?.pins ?? 0));
  return n ? `${n} 極` : undefined;
}
/** 操作コイルの電圧（AC200V・DC24V など） */
const coil = (d: DeviceDefinition) => /\b(AC|DC)\s?(\d+)/.exec(d.model)?.slice(1, 3).join('').concat('V');

export const FAMILY_RULES: FamilyRule[] = [
  // --- 電源・保護 ---
  { id: 'power-source', name: '電源（受電）', test: (d) => d.category === 'power-source', default: 'generic.power-source.3p200v' },
  {
    id: 'elb',
    name: '漏電ブレーカー',
    keywords: ['漏電遮断器', 'ELB', 'NV'],
    test: named(/^漏電遮断器/),
    default: 'mitsubishi.nv32-sv.3p',
    facets: [{ label: '用途', value: (d) => paren(d) ?? '一般' }, { label: '極数', value: poles }, { label: 'シリーズ', value: series }],
  },
  {
    id: 'mccb',
    name: 'ノーヒューズブレーカー',
    keywords: ['ノーヒューズ遮断器', '配線用遮断器', 'MCCB', 'NFB', 'NF'],
    test: named(/^ノーヒューズ遮断器/),
    default: 'mitsubishi.nf32-sv.3p',
    facets: [{ label: '用途', value: (d) => paren(d) ?? '一般' }, { label: '極数', value: poles }, { label: 'シリーズ', value: series }],
  },
  { id: 'cp', name: 'サーキットプロテクタ', keywords: ['CP'], test: named(/^サーキットプロテクタ/), default: 'mitsubishi.cp30-ba.2p', facets: [{ label: '極数', value: poles }] },
  { id: 'fuse', name: 'ヒューズホルダ', keywords: ['ヒューズ', '筒形ヒューズ', 'FUSE'], test: named(/^ヒューズホルダ/), default: 'generic.fuse-holder.2p', facets: [{ label: '極数', value: poles }] },
  { id: 'spd', name: 'サージ保護デバイス', keywords: ['SPD', '避雷器', 'サージプロテクタ', 'サージアブソーバ'], test: named(/^サージ保護デバイス/), default: 'generic.spd.1p', facets: [{ label: '相', value: paren }] },
  { id: 'noise-filter', name: 'ノイズフィルタ', keywords: ['ラインフィルタ', 'EMC フィルタ', 'NF'], test: named(/^ノイズフィルタ/), default: 'generic.noise-filter.1p', facets: [{ label: '相', value: paren }] },
  { id: 'transformer', name: '制御用トランス', keywords: ['トランス', '変圧器', '操作トランス', '絶縁トランス'], test: named(/^制御用トランス/) },
  // --- 開閉器・リレー ---
  {
    id: 'mc',
    name: '電磁接触器',
    keywords: ['マグネットスイッチ', 'マグネット', 'MC', 'コンタクタ'],
    test: named(/^電磁接触器/),
    default: 'mitsubishi.s-t21.ac200v',
    facets: [{ label: '操作コイル', value: coil }, { label: 'フレーム', value: series }],
  },
  { id: 'thr', name: 'サーマルリレー', keywords: ['THR', '過負荷'], test: named(/^サーマルリレー/), default: 'mitsubishi.th-t18' },
  { id: 'contactor-relay', name: 'コンタクタリレー', keywords: ['電磁継電器'], test: named(/^電磁継電器/), facets: [{ label: '操作コイル', value: coil }] },
  {
    id: 'relay',
    name: 'リレー',
    keywords: ['CR', 'ミニチュアリレー'],
    test: named(/^(リレー|スリムリレー)/),
    default: 'omron.my2n.dc24',
    facets: [{ label: '接点', value: paren }, { label: '操作コイル', value: coil }],
  },
  { id: 'safety-relay-fg', name: 'フォースガイドリレー', keywords: ['強制ガイド', 'セーフティリレー'], test: named(/フォースガイドリレー|強制ガイド式リレー/) },
  { id: 'ssr', name: 'ソリッドステートリレー', keywords: ['SSR'], test: named(/ソリッドステート/) },
  {
    id: 'timer',
    name: 'タイマー',
    test: named(/^タイマー/),
    default: 'omron.h3y-2.dc24',
    facets: [{ label: '取付け', value: (d) => (/DIN/.test(d.name) ? 'DIN レール' : /ソケット/.test(d.name) ? 'ソケット' : undefined) }],
  },
  // --- 電源ユニット ---
  { id: 'dc-psu', name: 'DC24V 電源', keywords: ['スイッチング電源', '直流電源', 'パワーサプライ'], test: named(/スイッチング電源|^DC24V 電源/), default: 'generic.psu.dc24v' },
  { id: 'plc-psu', name: 'PLC 電源ユニット', test: named(/^PLC 電源ユニット/), hidden: true },
  // --- 端子台・ケーブル ---
  { id: 'terminal-block', name: '端子台', test: named(/^端子台/), default: 'generic.terminal-block.6p' },
  {
    id: 'mil-terminal',
    name: 'MIL 変換端子台',
    keywords: ['MIL', 'コネクタ端子台', '中継端子台'],
    test: named(/^MILコネクタ変換端子台/),
    default: 'generic.mil-terminal-block.40p',
    facets: [{ label: '極数', value: (d) => connectorPins(d) }],
  },
  { id: 'plc-terminal', name: 'PLC 用コネクタ端子台', keywords: ['FCN', '変換端子台', 'コネクタ端子台'], test: named(/PLC用コネクタ端子台|FCNコネクタ変換端子台/) },
  { id: 'common-terminal', name: 'コモン端子台', test: named(/^コモン端子台/) },
  {
    id: 'harness',
    name: 'ケーブル（片側バラ線）',
    keywords: ['ハーネス', 'バラ線', 'フラットケーブル'],
    test: (d) => d.category === 'terminal' && /ケーブル/.test(d.name),
  },
  // --- 負荷 ---
  { id: 'motor', name: 'モーター', keywords: ['電動機', '誘導電動機'], test: named(/電動機/) },
  { id: 'inverter', name: 'インバーター', keywords: ['インバータ', 'VFD'], test: named(/^インバーター/) },
  { id: 'fan', name: '換気ファン', keywords: ['ファン', '盤用換気扇'], test: named(/ファン/, 'load') },
  { id: 'robocylinder', name: 'ロボシリンダー', keywords: ['電動シリンダ', '電動アクチュエータ', 'IAI'], test: named(/^ロボシリンダー/) },
  { id: 'elecylinder', name: 'エレシリンダー', keywords: ['電動シリンダ', 'IAI'], test: named(/^エレシリンダー/) },
  // --- 操作・表示 ---
  { id: 'pushbutton', name: '押しボタンスイッチ', keywords: ['PB', '押釦'], test: named(/押しボタンスイッチ/, 'control') },
  { id: 'selector', name: 'セレクタスイッチ', keywords: ['切替スイッチ', 'COS'], test: named(/^セレクタスイッチ/) },
  { id: 'lamp', name: '表示灯', keywords: ['パイロットランプ', 'PL'], test: named(/^表示灯/) },
  { id: 'buzzer', name: 'ブザー', test: named(/^ブザー/) },
  {
    id: 'signal-tower',
    name: '積層信号灯',
    keywords: ['シグナルタワー', 'パトライト', '積層表示灯', 'タワーライト', '回転灯'],
    test: named(/^積層信号灯/),
    default: 'patlite.lr6',
    facets: [{ label: '大きさ', value: paren }],
  },
  { id: 'foot-switch', name: 'フットスイッチ', keywords: ['足踏みスイッチ', 'フットペダル'], test: named(/^フットスイッチ/) },
  {
    id: 'temp-controller',
    name: '温度調節器',
    keywords: ['温調', '温調器', 'デジタル調節計', 'E5CC'],
    test: named(/^温度調節器/),
    facets: [{ label: '制御出力', value: paren }],
  },
  { id: 'hmi', name: 'タッチパネル', keywords: ['HMI', 'タッチパネルディスプレイ', 'GOT', 'VT'], test: named(/^タッチパネル/) },
  { id: 'iai-position', name: 'ポジションコントローラー（IAI）', keywords: ['ロボシリンダー', 'コントローラー'], test: named(/^ポジションコントローラー|^多軸ポジションコントローラー/) },
  { id: 'iai-runit', name: 'R-unit（IAI）', keywords: ['RCON', 'ロボシリンダー'], test: named(/^R-unit/) },
  // --- PLC ---
  // PLC: パレットには CPU（メーカーごと）とリモート I/O だけを出し、増設ユニット・ベース・電源は PLC エディタで足す
  {
    id: 'plc-cpu-mitsubishi',
    name: 'PLC CPU（三菱電機）',
    keywords: ['シーケンサ', 'PLC', 'CPU', 'MELSEC', 'iQ-R', 'FX5'],
    test: (d) => d.category === 'plc' && d.maker === '三菱電機' && /CPUユニット/.test(d.name),
    default: 'mitsubishi.r04cpu',
  },
  {
    id: 'plc-cpu-keyence',
    name: 'PLC CPU（KEYENCE）',
    keywords: ['シーケンサ', 'PLC', 'CPU', 'KV'],
    test: (d) => d.category === 'plc' && d.maker === 'KEYENCE' && /CPUユニット/.test(d.name),
    default: 'keyence.kv-8000.cpu',
  },
  {
    id: 'plc-cpu-omron',
    name: 'PLC CPU（オムロン）',
    keywords: ['シーケンサ', 'PLC', 'CPU', 'NX1P', 'Sysmac'],
    test: (d) => d.category === 'plc' && d.maker === 'オムロン' && /CPUユニット/.test(d.name),
    default: 'omron.nx1p2-1140dt',
  },
  { id: 'remote-io', name: 'リモート I/O', keywords: ['EtherCAT', 'カプラ', 'リモートIO', '分散 I/O'], test: named(/通信ユニット（カプラ）/) },
  { id: 'plc-analog', name: 'PLC アナログ・温度ユニット', keywords: ['アナログ', '温調'], test: named(/^PLC .*(アナログ|温度)/), hidden: true },
  {
    id: 'plc-comm',
    name: 'PLC 通信ユニット',
    keywords: ['Ethernet', 'EtherCAT', 'シリアル', 'RS-232C', 'DeviceNet'],
    test: (d) => d.category === 'plc' && /通信|Ethernet|DeviceNet|データ/.test(d.name),
    hidden: true,
  },
  { id: 'plc-motion', name: 'PLC 位置決め・カウンタユニット', keywords: ['モーション', '位置決め', 'カウンタ'], test: named(/^PLC .*(モーション|位置決め|カウンタ)/), hidden: true },
  {
    id: 'plc-io',
    name: 'PLC 入出力ユニット',
    keywords: ['入力ユニット', '出力ユニット', 'I/O ユニット', 'DI', 'DO'],
    test: named(/^PLC .*(入力|出力|入出力)ユニット/),
    default: 'keyence.kv-c32xc.input',
    hidden: true,
    facets: [
      { label: '入出力', value: (d) => (/入出力/.test(d.name) ? '入出力' : /入力/.test(d.name) ? '入力' : '出力') },
      { label: '点数', value: (d) => (d.bus?.io ? `${(d.bus.io.inputs ?? 0) + (d.bus.io.outputs ?? 0)} 点` : undefined) },
    ],
  },
  { id: 'plc-base', name: 'PLC ベースユニット', test: named(/^PLC (ベースユニット|ブランクカバー)/), hidden: true },
  { id: 'iai-program', name: 'プログラムコントローラー（IAI）', category: 'control', keywords: ['SEL', 'IAI'], test: named(/プログラムコントローラー/) },
  // --- センサー ---
  {
    id: 'photo',
    name: '光電センサ',
    keywords: ['光電', 'フォトセンサ', '透過', '反射'],
    test: named(/^光電センサ（/),
    facets: [
      { label: '検出方式', value: paren },
      { label: 'シリーズ', value: (d) => /^[A-Z]{2}-[A-Z]+/.exec(d.model)?.[0] },
      { label: '接続', value: (d) => (/M12/.test(d.model) ? 'M12 コネクタ' : /M8/.test(d.model) ? 'M8 コネクタ' : /ケーブル|^[A-Z-]+\d/.test(d.model) ? 'ケーブル' : undefined) },
    ],
  },
  {
    id: 'laser',
    name: 'レーザセンサ',
    keywords: ['レーザ', 'TOF'],
    test: named(/^レーザセンサ（/),
    facets: [
      { label: '方式', value: paren },
      { label: '接続', value: (d) => (/M12/.test(d.model) ? 'M12 コネクタ' : /M8/.test(d.model) ? 'M8 コネクタ' : 'ケーブル') },
    ],
  },
  { id: 'proximity', name: '近接センサ', keywords: ['近接スイッチ', '近接'], test: named(/^近接センサ/) },
  { id: 'amp', name: 'センサアンプ', keywords: ['ファイバ', 'ファイバアンプ', 'アンプ'], test: (d) => d.category === 'sensor' && /アンプ/.test(d.name) },
  { id: 'limit', name: 'リミットスイッチ', keywords: ['LS'], test: named(/^リミットスイッチ/) },
  { id: 'pressure-sensor', name: '圧力センサ', test: named(/^圧力センサ/) },
  { id: 'temp-sensor', name: '温度センサ', keywords: ['熱電対', '測温抵抗体', 'Pt100', 'K 熱電対', 'TC'], test: named(/^(熱電対|測温抵抗体)/) },
  { id: 'flow-sensor', name: '流量センサ', test: named(/^流量センサ/) },
  { id: 'sensor-cable', name: 'センサーケーブル', keywords: ['M8', 'M12', 'コネクタケーブル'], test: named(/センサー用コネクタケーブル/) },
  // --- 安全機器 ---
  { id: 'estop', name: '非常停止スイッチ', keywords: ['非常停止', 'EMG', '非停'], test: named(/非常停止/) },
  {
    id: 'interlock',
    name: 'セーフティインタロックスイッチ',
    keywords: ['ドアスイッチ', 'インターロック', '安全スイッチ'],
    test: named(/インタロックスイッチ|安全リミットスイッチ|非接触ドアスイッチ$/),
  },
  { id: 'light-curtain', name: 'セーフティライトカーテン', keywords: ['ライトカーテン', 'エリアセンサ'], test: named(/ライトカーテン/), facets: [{ label: '送受', value: (d) => (/送光/.test(d.name) ? '送光器' : '受光器') }] },
  { id: 'scanner', name: 'セーフティレーザスキャナ', test: named(/レーザスキャナ/) },
  { id: 'enable', name: 'イネーブルスイッチ', test: named(/^イネーブルスイッチ/) },
  { id: 'safety-controller', name: 'セーフティコントローラ', keywords: ['安全コントローラ'], test: named(/セーフティコントローラ|安全コントローラ/) },
  {
    id: 'safety-relay',
    name: 'セーフティリレーユニット',
    keywords: ['安全リレー', 'セーフティモジュール', '両手操作'],
    test: named(/セーフティリレーユニット|^安全リレー|セーフティモジュール|両手操作コントローラ|ドアスイッチコントローラ/),
  },
  // --- ネットワーク ---
  { id: 'hub', name: 'スイッチングハブ', keywords: ['HUB', 'ハブ', 'LAN'], test: named(/スイッチングハブ/) },
  // --- エア ---
  { id: 'air-source', name: 'エア源', keywords: ['工場エア', 'コンプレッサ'], test: named(/^エア源/) },
  { id: 'frl', name: '3 点セット（F.R.L.）', keywords: ['FRL', '2点セット', 'エア3点セット'], test: named(/点セット/), default: 'smc.ac' },
  {
    id: 'air-prep',
    name: 'フィルタ・レギュレータ（単体）',
    keywords: ['減圧弁', 'フィルタ', 'ルブリケータ', 'ミストセパレータ'],
    test: named(/^(エアフィルタ|ミストセパレータ|ルブリケータ|レギュレータ|フィルタレギュレータ)/),
    default: 'smc.ar',
  },
  { id: 'residual', name: '残圧排気弁', keywords: ['3ポート手動弁', 'VHS'], test: named(/^残圧排気弁/) },
  {
    id: 'solenoid-valve',
    name: '電磁弁',
    keywords: ['ソレノイドバルブ', 'SV', '5ポート弁'],
    test: named(/^電磁弁/),
    default: 'smc.sy3120-5lz',
    facets: [
      { label: '切換え', value: (d) => paren(d) },
      { label: '取付け', value: (d) => d.name.split('・')[1] ?? '単体（ボディ配管）' },
      { label: 'シリーズ', value: (d) => /^SY\d/.exec(d.model)?.[0]?.concat('000') },
    ],
  },
  {
    id: 'manifold',
    name: 'マニホールド',
    keywords: ['マニホ', 'バルブマニホールド', 'SI ユニット', '省配線', 'EtherCAT', 'EtherNet/IP', 'PROFINET'],
    test: named(/^マニホールド/),
    default: 'smc.ss5y3-41',
    facets: [
      { label: '配線', value: (d) => (d.bus?.host?.serial ? '通信（SI ユニット付き）' : '個別配線') },
      { label: 'シリーズ', value: (d) => /^SS5Y(\d)/.exec(d.model)?.[1]?.replace(/^(\d)$/, 'SY$1000') },
    ],
  },
  { id: 'manifold-blank', name: 'ブランクプレート（マニホールド用）', test: named(/^ブランクプレート/), hidden: true },
  { id: 'cylinder', name: 'エアシリンダ', keywords: ['シリンダ', 'エアシリ'], test: (d) => d.category === 'actuator' && /シリンダ/.test(d.name), default: 'smc.cm2' },
  { id: 'gripper', name: 'エアチャック', keywords: ['チャック', 'ハンド'], test: named(/^エアチャック/) },
  { id: 'rotary', name: 'ロータリアクチュエータ', keywords: ['ロータリテーブル', 'ロータリ'], test: (d) => d.category === 'actuator' && /ロータリ/.test(d.name) },
  { id: 'speed-controller', name: 'スピードコントローラ', keywords: ['スピコン', '速度制御弁'], test: named(/^スピードコントローラ/), facets: [{ label: '形', value: paren }] },
  { id: 'fitting', name: '継手', keywords: ['ワンタッチ管継手', 'ユニオン', 'ティー', 'レデューサ'], test: named(/継手|^ユニオン/) },
  { id: 'silencer', name: 'サイレンサ', keywords: ['消音器'], test: named(/^サイレンサ/) },
  { id: 'pressure-switch', name: '圧力スイッチ', test: named(/圧力スイッチ/) },
  { id: 'vacuum', name: '真空機器', keywords: ['真空', 'エジェクタ', '吸着パッド'], test: named(/^真空|^吸着パッド/) },
];

const MAKER_ORDER = (d: DeviceDefinition) => d.maker ?? '';

/** ファミリーの中はメーカー・型式の順に並べる（SY3120・SY3140・SY3220… のように、型式の数字の順がシリーズ・種類の順になる） */
const byModel = (a: DeviceDefinition, b: DeviceDefinition) =>
  MAKER_ORDER(a).localeCompare(MAKER_ORDER(b), 'ja') || a.model.localeCompare(b.model, 'ja', { numeric: true }) || a.name.localeCompare(b.name, 'ja');

const MAKER_FACET: FamilyFacet = { label: 'メーカー', value: (d) => d.maker ?? '汎用' };
const KIND_FACET: FamilyFacet = { label: '種類', value: (d) => d.name };

/** 機器定義の一覧からファミリーを作る（テスト用に一覧を差し替えられる） */
export function buildFamilies(defs: DeviceDefinition[], rules: FamilyRule[] = FAMILY_RULES): DeviceFamily[] {
  const groups = new Map<string, { rule?: FamilyRule; name: string; category: DeviceCategory; members: DeviceDefinition[] }>();
  for (const d of defs) {
    const rule = rules.find((r) => r.test(d));
    const id = rule?.id ?? `name:${d.name}`;
    const g = groups.get(id) ?? { rule, name: rule?.name ?? d.name, category: rule?.category ?? d.category, members: [] };
    g.members.push(d);
    groups.set(id, g);
  }
  return [...groups].map(([id, g]) => {
    const members = g.members.sort(byModel);
    const custom = g.rule?.facets ?? [];
    // 観点ごとの値が 2 つ以上ある観点だけを使う（「種類」はほかの観点で分けきれるなら省く）
    const distinct = (f: FamilyFacet) => new Set(members.map(f.value).filter((v) => v !== undefined)).size;
    const facets = [MAKER_FACET, ...custom].filter((f) => distinct(f) > 1);
    const sig = (d: DeviceDefinition) => facets.map((f) => f.value(d) ?? '').join('\u0000');
    if (new Set(members.map(sig)).size < members.length && distinct(KIND_FACET) > 1) facets.push(KIND_FACET);
    const def = g.rule?.default && members.some((m) => m.type === g.rule!.default) ? g.rule.default : members[0].type;
    const order = g.rule ? rules.indexOf(g.rule) : rules.length;
    return { id, name: g.name, category: g.category, keywords: g.rule?.keywords ?? [], members, defaultType: def, facets, order, hidden: !!g.rule?.hidden };
  });
}

export const deviceFamilies: DeviceFamily[] = buildFamilies(deviceDefinitions);

const familyByType = new Map(deviceFamilies.flatMap((f) => f.members.map((m) => [m.type, f] as const)));

/**
 * ダイアログの機種のカードに出す短い名前（ファミリーの中で違う点だけ。例: 電磁弁なら「ダブルソレノイド・マニホールド用」）。
 * メーカーとシリーズは型式と一緒に出すので除く。違う点がなければ一般名称
 */
export function variantLabel(f: DeviceFamily, d: DeviceDefinition): string {
  const parts = f.facets.filter((x) => x !== MAKER_FACET && x !== KIND_FACET && x.label !== 'シリーズ' && x.label !== 'フレーム').map((x) => x.value(d));
  const text = parts.filter((v): v is string => !!v).join('・');
  return text || d.name;
}

/** 機器定義の type が属するファミリー */
export function familyOf(type: string): DeviceFamily | undefined {
  return familyByType.get(type);
}
