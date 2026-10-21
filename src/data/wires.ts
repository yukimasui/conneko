/**
 * 電線に関する基礎データ（電線種類・サイズ・許容電流・色・回路種別ごとの色の慣例）。
 *
 * ■ 参考にした出典
 *  [S1] 内線規程 JEAC 8001-2016 1340-1表（許容電流）・1340-2表（電流減少係数）
 *       … パナソニック「電線の種類」解説ページに抜粋あり
 *       https://www2.panasonic.biz/jp/basics/electric/electricity/cable-type/
 *  [S2] SWCC（旧 昭和電線）技術資料「許容電流」
 *       （IV / HIV・EM-IE は内線規程より、VV・CV・CVV は JCS 0168-2 より）
 *       https://www.swcc.co.jp/jpn/products/tec_information/pdf/kyoyou.pdf
 *  [S3] 太陽ケーブルテック KIV カタログ（空中1条・30℃、温度補正係数、多条布設の電流減少係数）
 *       https://www.wirecable-sales.com/pdf/219.pdf
 *  [S4] 太陽ケーブルテック VCT カタログ（JIS C 3312、空中1条・30℃）
 *       https://www.wirecable-sales.com/pdf/8.pdf
 *  [S5] 太陽ケーブルテック VCTF カタログ（JIS C 3306、空中1条・30℃）
 *       https://www.kyohritsu.com/eclib/OTHER/CATALOG/CABLE/vctf.pdf
 *  [S6] 東日京三 KIV / UL1007 カタログ（KIV: 気中1条・30℃、UL1007: 気中1条・40℃）
 *       https://www.wirecable-sales.com/pdf/7.pdf
 *  [S7] ミスミ UL1015 カタログ（空中1条・30℃ の計算値）
 *       https://vn.misumi-ec.com/pdf/el/1362.pdf
 *  [S8] KHD KIV カタログ（気中1条・30℃）  https://www.sds-kaeruya.com/download/KHD/KIV.pdf
 *       因幡電工 KIV 仕様書（30℃）          https://www.inaba.co.jp/jappy/assets/pdf/KIV_f1.pdf
 *  [S9] JIS B 9960-1:2019（IEC 60204-1:2016 対応）機械類の安全性－機械の電気装置－第1部
 *       13.2.2（保護導体の識別）、13.2.3（中性線の識別）、13.2.4（その他の導体の識別）
 *       解説: https://denkisetsubi.com/haisen-iro/
 *             https://www.kameyama-grp.co.jp/ks-ss/blog/%E5%88%B6%E5%BE%A1%E7%9B%A4%E5%86%85%E3%81%AE%E9%9B%BB%E7%B7%9A%E3%81%AE%E8%AD%98%E5%88%A5%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6/
 * [S10] JEM 1122:2023「配電盤・制御盤の電線及び配線方式」（盤内配線用絶縁電線の種類・被覆の色別・配線方式）
 *       https://www.jema-net.or.jp/engineering/JEM_JEM-TR/JEM1122.html
 *       ※本文は有償／会員限定のため未確認。旧版は「配電盤・制御盤の盤内低圧配線用電線」で、
 *         配線方式は旧 JEM 1132「配電盤・制御盤の配線方式」に分かれていた
 *         （例: 阪神水道企業団 一般仕様書 Ⅲ電気設備編 が JEM 1122 / JEM 1132 / JEM 1134 を引用）
 *       https://hansui.org/hansui-wp/wp-content/uploads/2020/03/%E6%A9%9F%E6%A2%B0%E3%83%BB%E9%9B%BB%E6%B0%97%E8%A8%AD%E5%82%99%E5%B7%A5%E4%BA%8B%E4%B8%80%E8%88%AC%E4%BB%95%E6%A7%98%E6%9B%B8%E2%85%A2%E9%9B%BB%E6%B0%97%E8%A8%AD%E5%82%99%E7%B7%A8.pdf
 * [S11] JEM 1134「配電盤・制御盤の交流の相及び直流の極性による器具並びに導体の配置と色別」
 * [S12] JIS C 0445（IEC 60445 対応: 機器の端子・導体端末及び導体の識別）
 *       IEC 60446（色又は数字による導体の識別。2010年に IEC 60445 第5版へ統合）
 *       https://en.wikipedia.org/wiki/IEC_60446
 *
 * ■ 許容電流の考え方（allowableCurrent が返す値）
 *  用途は「電線の許容電流 ≥ 保護機器の定格電流」のチェック（電技解釈・内線規程の考え方）。
 *  - 盤内配線用の絶縁電線（KIV / IV / HIV / EM-IE / UL1015 / UL1007）:
 *      内線規程 1340-1表の「がいし引き配線」（＝気中1条）の値は、配線ダクト内で束ねる盤内配線
 *      には危険側。そこで「同一の管、線び又はダクト内に収める場合の電線数 3以下」の欄
 *      （＝気中1条の値 × 電流減少係数 0.70、周囲温度30℃）を採用する。
 *      理由: (1) 内線規程自身がダクト内収納の値として示している、(2) 遮断器定格との対応が
 *      実務の選定（20A→3.5sq、30A→5.5sq、40A→8sq、60A→14sq、75A→22sq、100A→38sq）と一致する、
 *      (3) 4本以上の欄（0.63〜0.34）まで適用すると盤内の一般的な選定のほぼ全てが警告になり実用的でない。
 *      ダクト内の電線数が多い・盤内温度が高い場合は CONDUCTOR_COUNT_FACTORS と
 *      ambientCorrectionFactor() で更に低減すること。
 *  - 盤外配線用のケーブル（VCT / VCTF / CV / CVV）:
 *      JCS 0168-2 の標準条件「気中・暗きょ布設、周囲温度40℃、1条」の 3心 の値を採用
 *      （三相3線＋接地線の4心ケーブルでも通電は3心なので3心の値が該当する）。
 *      30℃の表しかないものはメーカーの温度補正係数 0.82（60℃絶縁、30℃→40℃）を掛けて換算した。
 *  - 計算で求めた値は小数点以下を切り捨て（安全側）。表に載っている値はそのまま使う。
 *  - 値が見つからない組み合わせは収録しない（allowableCurrent は undefined を返す）。
 */

export interface WireTypeSpec {
  /** JSON で使うID（例: 'KIV'） */
  id: string;
  name: string;
  description: string;
  /** 選択できる公称断面積[mm²]（AWG系は近いJISサイズ(sq)に換算） */
  sizes: number[];
  /** 準拠規格 */
  standard?: string;
  /** 導体最高許容温度[℃] */
  maxTempC?: number;
  /** 定格電圧[V] */
  ratedVoltage?: number;
  /** 主な用途: 盤内配線 / 盤外配線 */
  usage?: 'panel' | 'field';
  /** サイズの表示名（AWG 表記など）。キーは String(sizeSq) */
  sizeLabels?: Record<string, string>;
  /** allowableCurrent() の値の前提条件と出典 */
  allowableBasis?: string;
}

export interface WireColorSpec {
  /** JSON で使うID（例: 'black'） */
  id: string;
  name: string;
  hex: string;
  /** 2色線（緑/黄など）のストライプ色 */
  stripeHex?: string;
}

/**
 * 回路の種類
 * - ac-main: 交流主回路（動力回路）
 * - dc-main: 直流主回路（直流電源の一次側・直流モーター等の動力回路）
 * - ac-control: 交流制御回路
 * - dc-control: 直流制御回路（DC24V の PLC 入出力など）
 * - interlock: 主電源の断路器で切れない外部電源からの回路（インタロック回路等）
 * - neutral: 中性線（接地側電線）
 * - ground: 接地（保護導体 PE）
 */
export type CircuitKind = 'ac-main' | 'dc-main' | 'ac-control' | 'dc-control' | 'interlock' | 'neutral' | 'ground';

export interface CircuitColorRule {
  circuit: CircuitKind;
  name: string;
  /** 推奨される色ID（先頭が第一推奨） */
  colors: string[];
  note: string;
}

const PANEL_WIRE_BASIS =
  '周囲温度30℃、同一の管・線び・ダクト内に3本以下（内線規程 1340-1表 × 1340-2表 電流減少係数0.70）';
const CABLE_BASIS = '気中・暗きょ布設、周囲温度40℃、1条、3心（JCS 0168-2 の標準条件）';

export const WIRE_TYPES: WireTypeSpec[] = [
  {
    id: 'KIV',
    name: 'KIV',
    description: '電気機器用ビニル絶縁電線。盤内配線の標準（柔らかいより線）',
    sizes: [0.5, 0.75, 1.25, 2, 3.5, 5.5, 8, 14, 22, 38, 60, 100],
    standard: 'JIS C 3316',
    maxTempC: 60,
    ratedVoltage: 600,
    usage: 'panel',
    allowableBasis: `${PANEL_WIRE_BASIS}。1.25sq以上は内線規程（IV と同じ60℃ビニル）の値、0.5/0.75sq は太陽ケーブルテックの気中1条値×0.70`,
  },
  {
    id: 'IV',
    name: 'IV',
    description: '600Vビニル絶縁電線。建物の屋内配線（電線管内）用、盤内では主に太物',
    sizes: [2, 3.5, 5.5, 8, 14, 22, 38, 60, 100],
    standard: 'JIS C 3307',
    maxTempC: 60,
    ratedVoltage: 600,
    usage: 'panel',
    allowableBasis: `${PANEL_WIRE_BASIS}（SWCC 技術資料の内線規程表より）`,
  },
  {
    id: 'HIV',
    name: 'HIV',
    description: '600V二種ビニル絶縁電線（耐熱75℃）。発熱の多い盤や官公庁仕様の盤内配線に',
    sizes: [1.25, 2, 3.5, 5.5, 8, 14, 22, 38, 60, 100],
    standard: 'JIS C 3317',
    maxTempC: 75,
    ratedVoltage: 600,
    usage: 'panel',
    allowableBasis: `${PANEL_WIRE_BASIS}（SWCC 技術資料の内線規程 HIV 表より。1.25sq は参考値）`,
  },
  {
    id: 'EM-IE',
    name: 'EM-IE',
    description: '600V耐燃性ポリエチレン絶縁電線（エコ電線・75℃）。IV/HIV の環境配慮品',
    sizes: [1.25, 2, 3.5, 5.5, 8, 14, 22, 38, 60, 100],
    standard: 'JIS C 3612',
    maxTempC: 75,
    ratedVoltage: 600,
    usage: 'panel',
    allowableBasis: `${PANEL_WIRE_BASIS}（SWCC 技術資料では HIV と同じ表）`,
  },
  {
    id: 'UL1015',
    name: 'UL1015',
    description: 'UL/CSA 規格の耐熱ビニル電線（105℃・600V）。海外向け・UL 508A 対応盤の配線に',
    sizes: [0.3, 0.5, 0.75, 1.25, 2, 3.5, 5.5, 8],
    standard: 'UL 758 Style 1015',
    maxTempC: 105,
    ratedVoltage: 600,
    usage: 'panel',
    sizeLabels: {
      '0.3': 'AWG22', '0.5': 'AWG20', '0.75': 'AWG18', '1.25': 'AWG16',
      '2': 'AWG14', '3.5': 'AWG12', '5.5': 'AWG10', '8': 'AWG8',
    },
    allowableBasis: '周囲温度30℃、ミスミ UL1015 カタログの空中1条値 × 0.70（ダクト内3本以下相当）',
  },
  {
    id: 'UL1007',
    name: 'UL1007',
    description: 'UL/CSA 規格の機器内配線用ビニル電線（80℃・300V）。制御・信号線に',
    sizes: [0.2, 0.3, 0.5, 0.75, 1.25],
    standard: 'UL 758 Style 1007',
    maxTempC: 80,
    ratedVoltage: 300,
    usage: 'panel',
    sizeLabels: { '0.2': 'AWG24', '0.3': 'AWG22', '0.5': 'AWG20', '0.75': 'AWG18', '1.25': 'AWG16' },
    allowableBasis: '周囲温度40℃、東日京三 UL1007 カタログの気中1条値 × 0.70（ダクト内3本以下相当）',
  },
  {
    id: 'VCT',
    name: 'VCT',
    description: '600Vビニルキャブタイヤケーブル。盤外の機器（モーター等）への電源配線に',
    sizes: [0.75, 1.25, 2, 3.5, 5.5, 8, 14, 22, 38],
    standard: 'JIS C 3312',
    maxTempC: 60,
    ratedVoltage: 600,
    usage: 'field',
    allowableBasis: `${CABLE_BASIS}。太陽ケーブルテックの3心・30℃値 × 0.82（40℃換算）`,
  },
  {
    id: 'VCTF',
    name: 'VCTF',
    description: 'ビニルキャブタイヤ丸形コード（300V）。小型機器・センサー等の盤外配線に',
    sizes: [0.5, 0.75, 1.25, 2, 3.5],
    standard: 'JIS C 3306',
    maxTempC: 60,
    ratedVoltage: 300,
    usage: 'field',
    allowableBasis: `${CABLE_BASIS}。太陽ケーブルテックの3心・30℃値 × 0.82（40℃換算）。0.75sq は内線規程のコード許容電流 7A の方が小さいため 7A`,
  },
  {
    id: 'CV',
    name: 'CV',
    description: '600V架橋ポリエチレン絶縁ビニルシースケーブル（90℃）。盤への電源引込み・幹線に',
    sizes: [2, 3.5, 5.5, 8, 14, 22, 38, 60, 100, 150],
    standard: 'JIS C 3605',
    maxTempC: 90,
    ratedVoltage: 600,
    usage: 'field',
    allowableBasis: `${CABLE_BASIS}（SWCC 技術資料・JCS 0168-2 の 3心 1条 の欄）`,
  },
  {
    id: 'CVV',
    name: 'CVV',
    description: '制御用ビニル絶縁ビニルシースケーブル。盤間・現場機器との制御配線に（多心）',
    sizes: [1.25, 2, 3.5, 5.5, 8],
    standard: 'JIS C 3401',
    maxTempC: 60,
    ratedVoltage: 600,
    usage: 'field',
    allowableBasis: `${CABLE_BASIS}（SWCC 技術資料の 3心 の欄。4心以上はさらに小さい）`,
  },
];

/**
 * 盤内配線で使う色。hex は画面上で見分けやすい色味（実物の色見本ではない）。
 * 白は背景に埋もれないよう、わずかに灰色寄りにしている。
 */
export const WIRE_COLORS: WireColorSpec[] = [
  { id: 'black', name: '黒', hex: '#1a1a1a' },
  { id: 'red', name: '赤', hex: '#d32f2f' },
  { id: 'blue', name: '青', hex: '#1e5bd8' },
  { id: 'light-blue', name: '水色', hex: '#4fb3e8' },
  { id: 'white', name: '白', hex: '#f5f5f5' },
  { id: 'gray', name: '灰', hex: '#8a8f98' },
  { id: 'yellow', name: '黄', hex: '#f2c81b' },
  { id: 'orange', name: '橙', hex: '#f08c1a' },
  { id: 'brown', name: '茶', hex: '#7b4a2a' },
  { id: 'green', name: '緑', hex: '#2e9d3a' },
  { id: 'green-yellow', name: '緑/黄', hex: '#2e9d3a', stripeHex: '#f2d21b' },
  { id: 'purple', name: '紫', hex: '#8e44ad' },
];

export const CIRCUIT_COLOR_RULES: CircuitColorRule[] = [
  {
    circuit: 'ac-main',
    name: '交流主回路',
    colors: ['black'],
    note:
      '【推奨】JIS B 9960-1（IEC 60204-1）13.2.4 で「黒: 交流及び直流の電力回路」が推奨色（"推奨"であり義務ではない）。' +
      '国内の盤製作でも主回路は黒が一般的（JEM 1122 の色別に従う盤が多いが本文は未確認）。' +
      '相の識別は JEM 1134 の色別（R=赤・S=白・T=青 など）を母線や相表示マークで行い、電線被覆は黒のままとするのが通例。',
  },
  {
    circuit: 'dc-main',
    name: '直流主回路',
    colors: ['black'],
    note:
      '【推奨】JIS B 9960-1（IEC 60204-1）13.2.4 で交流・直流を問わず電力回路は黒が推奨色。' +
      '極性の識別は JEM 1134（正極=赤・負極=青）に従い母線・マークで行うのが一般的。',
  },
  {
    circuit: 'ac-control',
    name: '交流制御回路',
    colors: ['red', 'yellow'],
    note:
      '【推奨】JIS B 9960-1（IEC 60204-1）13.2.4 で「赤: 交流制御回路」が推奨色。' +
      '【国内慣例】配電盤・受配電盤など JEM 1122 系の盤では制御回路に黄を使う例も多い（二次情報、規格本文は未確認）。' +
      'ただし IEC 系では緑/黄（保護導体）と紛らわしい単色の黄・緑は避けることが推奨される。',
  },
  {
    circuit: 'dc-control',
    name: '直流制御回路',
    colors: ['blue'],
    note:
      '【推奨】JIS B 9960-1（IEC 60204-1）13.2.4 で「青: 直流制御回路」が推奨色。' +
      'DC24V の PLC 入出力やセンサー電源など。国内の制御盤でも広く定着している慣例。' +
      '中性線にも青（明るい青）を使う IEC 系の盤では、混同しないよう注意する。',
  },
  {
    circuit: 'interlock',
    name: 'インタロック（外部電源）回路',
    colors: ['orange'],
    note:
      '【推奨】JIS B 9960-1（IEC 60204-1）13.2.4 で「橙: 5.3.5 の除外回路」が推奨色。' +
      '主電源の断路器を切っても外部から電圧が残る回路（他盤からのインタロック、保守用照明・コンセント等）を橙で示し、感電防止に役立てる。',
  },
  {
    circuit: 'neutral',
    name: '中性線（接地側電線）',
    colors: ['white', 'light-blue', 'gray'],
    note:
      '【国内慣例】内線規程・電技の考え方では接地側電線（単相100Vの N 等）は白（または灰）で識別するのが通例。' +
      '【規定】JIS B 9960-1（IEC 60204-1）13.2.3 / IEC 60445 では中性線を色で識別する場合は青（明るい青）とする（"shall"）。' +
      '輸出機など IEC 準拠の盤では水色を使う。',
  },
  {
    circuit: 'ground',
    name: '接地',
    colors: ['green-yellow', 'green'],
    note:
      '【規定】IEC 60445（JIS C 0445）・JIS B 9960-1（IEC 60204-1）13.2.2 で保護導体（PE）は緑/黄の2色で識別し、' +
      '緑/黄を他の用途に使ってはならない（推奨ではなく要求事項）。' +
      '【国内慣例】内線規程・JEM 1122 に従う国内の盤では緑単色の接地線も一般的に使われるため、緑も可とした。',
  },
];

/**
 * 新しく引く電線の既定値。
 * 国内の機械制御盤の主回路で最も多く使われる KIV 2sq・黒。
 * （許容電流 18A のため、20A 以上の保護機器の二次側では太線への変更が必要になる）
 */
export const DEFAULT_WIRE = { wireType: 'KIV', sizeSq: 2, color: 'black' } as const;

/**
 * 許容電流[A]。キーは String(sizeSq)。前提条件は各 WireTypeSpec.allowableBasis を参照。
 *
 * 元データ（参考・気中1条 30℃）:
 *   内線規程 IV がいし引き: 2→27, 3.5→37, 5.5→49, 8→61, 14→88, 22→115, 38→162, 60→217, 100→298
 *   （KIV でも太陽ケーブルテック[S3]・KHD[S8] は同値。東日京三[S6]・因幡電工[S8] は
 *     0.75→12, 1.25→16, 2→22, 3.5→33, 5.5→45, 8→57 と小さめで、メーカー間でばらつきがある）
 */
const ALLOWABLE: Record<string, Record<string, number>> = {
  // 内線規程「同一の管・線び・ダクト内 3以下」の欄 [S1][S2]。
  // 1.25sq は内線規程の参考値（括弧書き）。0.5/0.75sq は [S3] の気中1条値 9.6A / 12A × 0.70 を切り捨て。
  KIV: {
    '0.5': 6, '0.75': 8, '1.25': 13, '2': 18, '3.5': 25, '5.5': 34,
    '8': 42, '14': 61, '22': 80, '38': 113, '60': 152, '100': 208,
  },
  // 内線規程 IV「3以下」の欄 [S2]
  IV: { '2': 18, '3.5': 25, '5.5': 34, '8': 42, '14': 61, '22': 80, '38': 113, '60': 152, '100': 208 },
  // 内線規程 HIV（75℃）「3以下」の欄 [S2]。1.25sq は参考値（括弧書き）。
  HIV: { '1.25': 16, '2': 23, '3.5': 31, '5.5': 41, '8': 52, '14': 75, '22': 98, '38': 138, '60': 185, '100': 254 },
  // SWCC 技術資料で HIV と同じ表 [S2]
  'EM-IE': { '1.25': 16, '2': 23, '3.5': 31, '5.5': 41, '8': 52, '14': 75, '22': 98, '38': 138, '60': 185, '100': 254 },
  // [S7] 30℃ 空中1条: AWG22 7, 20 9, 18 13, 16 18, 14 23, 12 32, 10 43, 8 66 → × 0.70 切り捨て。
  // 結果は NEC 240.4(D) の小電線の過電流保護上限（AWG14=15A, 12=20A, 10=30A）とも整合する。
  UL1015: { '0.3': 4, '0.5': 6, '0.75': 9, '1.25': 12, '2': 16, '3.5': 22, '5.5': 30, '8': 46 },
  // [S6] 40℃ 気中1条: AWG24 5, 22 7, 20 9, 18 12, 16 17 → × 0.70 切り捨て
  UL1007: { '0.2': 3, '0.3': 4, '0.5': 6, '0.75': 8, '1.25': 11 },
  // [S4] 30℃ 3心: 0.75 10, 1.25 14, 2 19, 3.5 28, 5.5 36, 8 44, 14 62, 22 83, 38 110 → × 0.82 切り捨て。
  // JCS 0168-2 の VV 3心 40℃（2→15, 3.5→21, 5.5→28, 8→36, 14→50, 22→66, 38→93）[S2] とほぼ一致。
  VCT: { '0.75': 8, '1.25': 11, '2': 15, '3.5': 22, '5.5': 29, '8': 36, '14': 50, '22': 68, '38': 90 },
  // [S5] 30℃ 3心: 0.5 7, 0.75 10, 1.25 13, 2 17, 3.5 25 → × 0.82 切り捨て。
  // 0.75sq は内線規程のコード許容電流（0.75→7A, 1.25→12A, 2→17A、30℃）の方が小さいので 7A。
  VCTF: { '0.5': 5, '0.75': 7, '1.25': 10, '2': 13, '3.5': 20 },
  // JCS 0168-2 600V CV 気中・暗きょ 40℃ 3心 1条 [S2]
  CV: { '2': 23, '3.5': 33, '5.5': 44, '8': 54, '14': 76, '22': 100, '38': 140, '60': 190, '100': 260, '150': 340 },
  // CVV 気中・暗きょ 40℃ 1条 3心 [S2]（2心: 1.25→13, 2→18, 3.5→25, 5.5→33, 8→42。10心: 1.25→6, 2→9 …）
  CVV: { '1.25': 11, '2': 15, '3.5': 21, '5.5': 28, '8': 36 },
};

/** 許容電流[A]。データがない組み合わせは undefined */
export function allowableCurrent(wireType: string, sizeSq: number): number | undefined {
  return ALLOWABLE[wireType]?.[String(sizeSq)];
}

export function getWireColor(id: string): WireColorSpec | undefined {
  return WIRE_COLORS.find((c) => c.id === id);
}

/**
 * 同一の管・線び・ダクト内に収める絶縁電線の本数ごとの電流減少係数（気中1条の値に掛ける）。
 * 内線規程 1340-2表 [S1]（太陽ケーブルテック KIV カタログ [S3] にも同じ表）。
 * allowableCurrent() の盤内配線用の値は既に「3本以下」の 0.70 を掛けた値なので、
 * 本数が多い場合は (係数 / 0.70) を掛けると換算できる。
 */
export const CONDUCTOR_COUNT_FACTORS: { maxCount: number; factor: number }[] = [
  { maxCount: 3, factor: 0.7 },
  { maxCount: 4, factor: 0.63 },
  { maxCount: 6, factor: 0.56 },
  { maxCount: 15, factor: 0.49 },
  { maxCount: 40, factor: 0.43 },
  { maxCount: 60, factor: 0.39 },
  { maxCount: Infinity, factor: 0.34 },
];

/**
 * 周囲温度の補正係数 √((T1 − T2') / (T1 − T2))  [S2]
 * T1: 導体（絶縁体）最高許容温度、T2: 表の周囲温度、T2': 実際の周囲温度。
 * 例: 60℃絶縁・30℃基準の表を40℃で使う → √(20/30) ≈ 0.82
 */
export function ambientCorrectionFactor(maxTempC: number, tableAmbientC: number, ambientC: number): number {
  if (ambientC >= maxTempC) return 0;
  return Math.sqrt((maxTempC - ambientC) / (maxTempC - tableAmbientC));
}
