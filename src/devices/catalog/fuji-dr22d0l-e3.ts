import { AR22_LIT, FUJI_LED_CURRENT } from '../generic/fuji-ar22';
import { LED_24V_ACDC, buildPanelSwitch } from '../generic/panel-switch';

/**
 * 富士電機 Φ22 表示灯 DR22D0L-E3□（平形、LED 照光 AC/DC24V）。描画は押しボタンと同じ panel-switch.ts（左に正面のレンズ、右に背面の照光ユニット）。
 *
 * 出典: 富士電機 AR22・DR22 シリーズ カタログ（販売店掲載の写しの内容）: ランプ端子のユニットは黒。LED 照光 AC/DC24V は型式に E3 が付く。
 * 推定: ランプの端子 X1・X2、LED の電流（約 12mA）、色記号（青 = S）。
 */
export default buildPanelSwitch({
  type: 'fuji.dr22d0l-e3',
  name: '表示灯',
  model: 'DR22D0L-E3□',
  maker: '富士電機',
  description:
    '富士電機の Φ22 表示灯 DR22（平形、LED 照光、AC/DC24V（E3））。端子は X1・X2（推定。極性なし）。レンズの色は params の color（型式の □ に入る色記号）。' +
    'LED の電流（約 12mA）と端子の印字、青の色記号（S）は推定。',
  labelPrefix: 'PL',
  operator: 'illuminated',
  colors: AR22_LIT,
  units: [{ kind: 'led' }],
  led: { accepts: LED_24V_ACDC, current: FUJI_LED_CURRENT, note: 'AC/DC24V、極性なし' },
  caption: (c) => `DR22D0L-E3${c}`,
  ledCaption: 'AC/DC24V',
  estimated: 'ランプの端子 X1・X2、LED の電流（約 12mA）、青の色記号（S）は推定',
});
