/**
 * 富士電機 Φ22 コマンドスイッチ AR22（押しボタン・照光押しボタン）の機器定義を作る。描画と端子は panel-switch.ts（オムロン A22N と同じ作り）。
 *
 * 出典:
 *   富士電機 AR22・DR22 シリーズ カタログ（販売店掲載の写しの内容）: 接点構成の記号 10 = 1a、01 = 1b、11 = 1a1b。
 *     接点ブロックの色は a 接点 = 青、b 接点 = 赤、照光ユニット（ランプ端子）= 黒。接点ブロックの端子番号は ①-② と ③-④ の組
 *   型式（販売店の掲載）: AR22F0R-11□（平形 Φ24、モーメンタリ、1a1b）、LED 照光 AC/DC24V は型式に E3 が付く（AR22F0L-11E3□ など）
 * 推定: b 接点が ①-②、a 接点が ③-④ であること、背面の並び（裏から見て左から b 接点・照光・a 接点）、ランプ端子 X1・X2、
 *   LED の電流（約 12mA）、ボタンの色記号（青 = S）。接点の定格は資料で確かめられなかった。
 */
import type { ColorOption, ContactBlock } from './panel-switch';
import { LED_24V_ACDC, buildPanelSwitch } from './panel-switch';

/** ボタンの色（照光なし）。B = 黒、S = 青（推定） */
export const AR22_OPAQUE: ColorOption[] = [
  { tint: 'green', code: 'G' },
  { tint: 'red', code: 'R' },
  { tint: 'yellow', code: 'Y' },
  { tint: 'white', code: 'W' },
  { tint: 'black', code: 'B' },
  { tint: 'blue', code: 'S' },
];

/** 照光の色 */
export const AR22_LIT: ColorOption[] = [
  { tint: 'green', code: 'G' },
  { tint: 'red', code: 'R' },
  { tint: 'yellow', code: 'Y' },
  { tint: 'white', code: 'W' },
  { tint: 'blue', code: 'S' },
];

/** 接点ブロックの色（富士電機: a 接点 = 青、b 接点 = 赤） */
export const FUJI_UNIT_COLORS = {
  NO: { body: '#2f68c4', edge: '#1a3f80', ink: '#1a3f80' },
  NC: { body: '#d63a2a', edge: '#7e1a10', ink: '#a5221a' },
};

/** LED 照光（E3、AC/DC24V）の電流[A]（推定） */
export const FUJI_LED_CURRENT = 0.012;

const NC: ContactBlock = { kind: 'NC', top: '1', bottom: '2' };
const NO: ContactBlock = { kind: 'NO', top: '3', bottom: '4' };

const ESTIMATE =
  '端子番号（b 接点 1-2、a 接点 3-4）・背面の並び・照光ユニットの端子 X1/X2・LED の電流（約 12mA）・青の色記号（S）は推定。接点の定格は未確認';

/** 平形・モーメンタリの押しボタン 1a1b（AR22F0R-11□） */
export function buildAr22f0r11() {
  return buildPanelSwitch({
    type: 'fuji.ar22f0r-11',
    name: '押しボタンスイッチ',
    model: 'AR22F0R-11□',
    maker: '富士電機',
    description:
      '富士電機の Φ22 押しボタンスイッチ AR22（平形 Φ24 ベゼル、モーメンタリ、照光なし）。接点 1a1b（b 接点 1-2・a 接点 3-4。推定）。' +
      '運転・停止のどちらにも使う。ボタンの色は params の color（型式の □ に入る色記号）。接点ブロックは a 接点が青、b 接点が赤。' +
      '端子番号と背面の並び、青の色記号は推定。接点の定格は富士電機の資料で確かめること。',
    labelPrefix: 'PB',
    operator: 'flush',
    colors: AR22_OPAQUE,
    units: [NC, NO],
    caption: (c) => `AR22F0R-11${c}`,
    actuator: 'pushbutton',
    unitColors: FUJI_UNIT_COLORS,
    estimated: ESTIMATE,
  });
}

/** LED 照光押しボタン（平形・モーメンタリ、1a1b、AC/DC24V）AR22F0L-11E3□ */
export function buildAr22f0l11e3() {
  return buildPanelSwitch({
    type: 'fuji.ar22f0l-11e3',
    name: '照光押しボタンスイッチ',
    model: 'AR22F0L-11E3□',
    maker: '富士電機',
    description:
      '富士電機の Φ22 照光押しボタンスイッチ AR22（平形、モーメンタリ、LED 照光 AC/DC24V（E3））。接点 1a1b（b 接点 1-2・a 接点 3-4。推定）。' +
      'LED は X1・X2（推定。極性なし）で、接点とは別の回路として配線する。ボタンと LED の色は params の color。' +
      '端子番号と背面の並び、LED の電流（約 12mA）は推定。接点の定格は富士電機の資料で確かめること。',
    labelPrefix: 'PBL',
    operator: 'illuminated',
    colors: AR22_LIT,
    units: [NC, { kind: 'led' }, NO],
    led: { accepts: LED_24V_ACDC, current: FUJI_LED_CURRENT, note: 'AC/DC24V、極性なし' },
    caption: (c) => `AR22F0L-11E3${c}`,
    actuator: 'pushbutton',
    unitColors: FUJI_UNIT_COLORS,
    ledCaption: 'AC/DC24V',
    estimated: ESTIMATE,
  });
}
