/**
 * オムロン Φ22 押しボタンスイッチ・セレクタスイッチ A22N シリーズの機器定義を作る。
 *
 * 出典: オムロン A22N/M22N/A30N データシート（files.omron.eu の a254_a22n_m22n_a30n_pushbutton_selector_switch_and_indicator_datasheet_en.pdf）
 *   端子（p.16・p.31 Terminal Arrangement / Terminal Connection Diagrams、裏から見た図 BOTTOM VIEW）:
 *     接点ブロックは位置によらず b 接点が 1-2、a 接点が 3-4 と印字。照光ユニットは中央（ユニット位置 2）で上が X1、下が X2。
 *     裏から見ると左からユニット位置 3・2・1 の順に並ぶ（例: 102 照光品は 1/2（b 接点）| X1/X2 | 3/4（a 接点））。
 *   接点構成の記号（p.20）: 3 桁がユニット位置 1・2・3 の接点（1 = NO、2 = NC、0 = なし）。例: 102 = 位置 1 が NO、位置 3 が NC
 *   セレクタの接点の動作（p.21 Contact Configuration Table）:
 *     2 ノッチ 100: 位置 1 の NO が「2」（右）で閉。3 ノッチ 101: 位置 1 の NO が「1」（左）で閉、位置 3 の NO が「2」（右）で閉
 *   定格: AC-15 AC240V 3A・AC120V 6A、DC-13 DC24V 4A、最小適用負荷 DC5V 10mA。LED 24V AC/DC ±10%、約 12mA（赤・橙・黄・青）/ 約 5mA（白・緑）
 *   接点ブロックの色: a 接点 = 青、b 接点 = 橙
 */
import { A22N_RATING, LED_24V_ACDC, buildPanelSwitch, type ColorOption, type ContactBlock, type Unit } from './panel-switch';

/** 照光なしのボタンの色（不透明） */
export const A22N_OPAQUE: ColorOption[] = [
  { tint: 'green', code: 'NG' },
  { tint: 'red', code: 'NR' },
  { tint: 'yellow', code: 'NY' },
  { tint: 'white', code: 'NW' },
  { tint: 'blue', code: 'NA' },
  { tint: 'black', code: 'NB' },
];

/** 照光のボタンの色（透明）。LED の色記号は 2 文字目 */
export const A22N_LIT: ColorOption[] = [
  { tint: 'green', code: 'TG' },
  { tint: 'red', code: 'TR' },
  { tint: 'yellow', code: 'TY' },
  { tint: 'white', code: 'TW' },
  { tint: 'blue', code: 'TA' },
  { tint: 'orange', code: 'TO' },
];

/** セレクタのつまみの色 */
export const A22NS_KNOB: ColorOption[] = [
  { tint: 'black', code: 'NB' },
  { tint: 'red', code: 'NR' },
  { tint: 'green', code: 'NG' },
];

const NC: ContactBlock = { kind: 'NC', top: '1', bottom: '2' };
const NO: ContactBlock = { kind: 'NO', top: '3', bottom: '4' };

/** 平形・モーメンタリの押しボタン A22NN-BNM-□A-G□□□ */
export function buildA22nn(contacts: '100' | '002' | '102') {
  const units: Unit[] = contacts === '100' ? [NO] : contacts === '002' ? [NC] : [NC, NO];
  const what = contacts === '100' ? '1a（a 接点 3-4）' : contacts === '002' ? '1b（b 接点 1-2）' : '1a1b（b 接点 1-2・a 接点 3-4）';
  const use = contacts === '100' ? '運転・リセットなどの指令' : contacts === '002' ? '停止の指令（自己保持回路を切る）' : '運転・停止のどちらにも';
  return buildPanelSwitch({
    type: `omron.a22nn-bnm-g${contacts}`,
    name: '押しボタンスイッチ',
    model: `A22NN-BNM-□A-G${contacts}`,
    maker: 'オムロン',
    description:
      `オムロンの Φ22 押しボタンスイッチ A22N（樹脂ベゼル・フラット形、モーメンタリ、照光なし）。接点 ${what}。${use}使う。` +
      `ボタンの色は params の color（型式の □ に入る色記号）。接点定格 ${A22N_RATING}。`,
    labelPrefix: 'PB',
    operator: 'flush',
    colors: contacts === '002' ? [A22N_OPAQUE[1], ...A22N_OPAQUE.filter((_, i) => i !== 1)] : A22N_OPAQUE,
    units,
    caption: (c) => `A22NN-BNM-${c}A-G${contacts}`,
    actuator: 'pushbutton',
    rating: A22N_RATING,
  });
}

/** 照光押しボタン（平形・モーメンタリ、1a、LED 24V AC/DC）A22NL-BNM-T□A-G100-□C */
export function buildA22nl100() {
  return buildPanelSwitch({
    type: 'omron.a22nl-bnm-g100-c',
    name: '照光押しボタンスイッチ',
    model: 'A22NL-BNM-T□A-G100-□C',
    maker: 'オムロン',
    description:
      'オムロンの Φ22 照光押しボタンスイッチ A22N（樹脂ベゼル・フラット形、モーメンタリ、LED 照光 24V AC/DC）。接点 1a（a 接点 3-4）。' +
      'LED は X1・X2（極性なし、24V AC/DC ±10%、約 12mA（赤・橙・黄・青）/ 約 5mA（白・緑））で、接点とは別の回路として配線する。' +
      `ボタンと LED の色は params の color。接点定格 ${A22N_RATING}。`,
    labelPrefix: 'PBL',
    operator: 'illuminated',
    colors: A22N_LIT,
    // 裏から見て左からユニット位置 3（なし）・2（照光ユニット）・1（a 接点）
    units: [{ kind: 'led' }, NO],
    led: { accepts: LED_24V_ACDC, current: 0.012, note: '24V AC/DC、極性なし' },
    caption: (c) => `A22NL-BNM-${c}A-G100-${c.slice(1)}C`,
    actuator: 'pushbutton',
    rating: A22N_RATING,
  });
}

/** セレクタスイッチ（つまみ形、手動復帰）。2 ノッチ 1a（右で閉）A22NS-2BM-□A-G100-NN / 3 ノッチ 2a（左・右）A22NS-3BM-□A-G101-NN */
export function buildA22ns(positions: 2 | 3) {
  const two = positions === 2;
  const units: Unit[] = two
    ? [{ ...NO, note: '「2」（右）で閉、「1」（左）で開' }]
    : [
        // 裏から見て左がユニット位置 3（右で閉）、右がユニット位置 1（左で閉）。どちらも 3-4 と印字されるので ID に位置を付ける
        { kind: 'NO', top: 'P3-3', bottom: 'P3-4', topLabel: '3', bottomLabel: '4', note: 'ユニット位置 3。「2」（右）で閉' },
        { kind: 'NO', top: 'P1-3', bottom: 'P1-4', topLabel: '3', bottomLabel: '4', note: 'ユニット位置 1。「1」（左）で閉' },
      ];
  return buildPanelSwitch({
    type: two ? 'omron.a22ns-2bm-g100' : 'omron.a22ns-3bm-g101',
    name: two ? 'セレクタスイッチ（2 ノッチ）' : 'セレクタスイッチ（3 ノッチ）',
    model: two ? 'A22NS-2BM-□A-G100-NN' : 'A22NS-3BM-□A-G101-NN',
    maker: 'オムロン',
    description: two
      ? 'オムロンの Φ22 セレクタスイッチ A22N（つまみ形、2 ノッチ 90°、手動復帰、照光なし）。接点 1a（3-4）が「2」（右）で閉じ、「1」（左）で開く。' +
        `手動・自動の切換などに使う。つまみの色は params の color。接点定格 ${A22N_RATING}。`
      : 'オムロンの Φ22 セレクタスイッチ A22N（つまみ形、3 ノッチ 左・中・右 各 45°、手動復帰、照光なし）。接点 2a: ユニット位置 1 の a 接点（端子 ID P1-3・P1-4、印字 3-4）が「1」（左）で閉、' +
        'ユニット位置 3 の a 接点（P3-3・P3-4、印字 3-4）が「2」（右）で閉、中「0」では両方開。2 つの接点ブロックはどちらも 3-4 と印字されるので、端子 ID にユニット位置を付けた。' +
        `正転・停止・逆転の切換などに使う。つまみの色は params の color。接点定格 ${A22N_RATING}。`,
    labelPrefix: 'COS',
    operator: two ? 'selector2' : 'selector3',
    positions: two ? ['1', '2'] : ['1', '0', '2'],
    colors: A22NS_KNOB,
    units,
    caption: (c) => (two ? `A22NS-2BM-${c}A-G100-NN` : `A22NS-3BM-${c}A-G101-NN`),
    rating: A22N_RATING,
  });
}
