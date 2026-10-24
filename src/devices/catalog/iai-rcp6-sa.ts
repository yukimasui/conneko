import { actuatorDefs, BRAKE_PARAM, endReceptacle, rcp6Connector, rcp6CtrlParam, sliderSvg } from '../iai/actuator';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * IAI ロボシリンダー RCP6-SA（スライダータイプ、パルスモーター、バッテリーレスアブソ）。コントローラー別置の RCP6。
 *
 * 出典: IAI 総合カタログ CJ9006 第 3 巻「RCP6-SA4C/SA6C/SA7C/SA8C」（型式項目・寸法図・適応コントローラー・ケーブル長価格表）、
 *       取扱説明書 MJ3749「RCP6 スライダータイプ」（3.1 コントローラーとの接続、3.2 モーター・エンコーダーケーブル）。
 * - 本体幅: SA4C 40mm（35P モーター）、SA6C 60mm（42P）、SA7C 70mm（56P）、SA8C 90mm（56SP 高推力）。
 * - 適応コントローラー: P3 = PCON・MSEL、P5 = RCON・RSEL（SA8C は P4 = PCON-CFB/CGFB・MSEL-PCF/PGF、P6 = RCON・RSEL）。
 * - モーター・エンコーダー一体型ケーブル: PCON・MCON・MSEL は CB-CAN-MPA□□□（SA8 は CB-CFA3-MPA□□□）、
 *   RCON・RSEL は CB-ADPC-MPA□□□（SA8 は変換ケーブル CB-CAN-AJ002 を併用）。アクチュエーター側はヒロセ DF62 24 ピン。
 * - ブレーキ（オプション B）はモーター・エンコーダー一体型ケーブルの BK+・BK− で、コントローラーが駆動する（別配線は不要）。
 *
 * 見た目: 長さ方向は縮めて描いた（ストロークは代表的な長さ）。
 */
const TYPES = [
  { value: 'SA4C', bodyMm: 40, motor: '35P', high: false },
  { value: 'SA6C', bodyMm: 60, motor: '42P', high: false },
  { value: 'SA7C', bodyMm: 70, motor: '56P', high: false },
  { value: 'SA8C', bodyMm: 90, motor: '56SP', high: true },
];
const typeOf = (p: ParamValues) => TYPES.find((t) => t.value === String(p.type)) ?? TYPES[1];
const brakeOf = (p: ParamValues) => String(p.brake) === 'B';

const W = 300;
const H = 72;
const BASE_END = 200;
const motorEnd = (p: ParamValues) => (brakeOf(p) ? 282 : 262);

const svg = (p: ParamValues) => {
  const t = typeOf(p);
  const me = motorEnd(p);
  return `
  ${actuatorDefs()}
  ${sliderSvg({ W, H, bodyW: t.bodyMm * 0.7, baseEnd: BASE_END, motorEnd: me, model: `RCP6-${t.value}`, brake: brakeOf(p) })}
  ${endReceptacle(me, H / 2)}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const t = typeOf(p);
  const c = rcp6Connector(String(p.ctrl), t.high);
  return [
    {
      id: 'MPG',
      label: 'モーター・エンコーダー（DF62 24 ピン）',
      note: `モーター側の端面のモーター・エンコーダーコネクター。適応コントローラー ${c.code} のコントローラーの MPG へ、モーター・エンコーダー一体型ケーブル ${c.cable} でつなぐ`,
      x: motorEnd(p) + 6,
      y: H / 2,
      side: 'right',
      role: 'connector',
      connector: c.spec,
    },
  ];
};

const def: DeviceDefinition = {
  type: 'iai.rcp6-sa',
  name: 'ロボシリンダー スライダータイプ（パルスモーター）',
  model: 'RCP6-SA',
  maker: 'IAI',
  category: 'load',
  labelPrefix: 'AX',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'type',
      label: 'タイプ',
      options: TYPES.map((t) => ({ value: t.value, label: `${t.value}（本体幅 ${t.bodyMm}mm、${t.motor}${t.high ? ' 高推力' : ''} パルスモーター）` })),
      default: 'SA6C',
    },
    rcp6CtrlParam((p) => typeOf(p).high),
    BRAKE_PARAM,
  ],
  description:
    'IAI のロボシリンダー RCP6 スライダータイプ（パルスモーター、バッテリーレスアブソ）。コントローラーとはモーター・エンコーダー一体型ケーブル 1 本でつなぐ（モーター側の端面のコネクター MPG）。' +
    '適応コントローラー（型式の記号）: P3 = PCON-CB/CGB・PCON-CYB・MSEL・MCON（ケーブル CB-CAN-MPA）、P5 = RCON・RSEL の 24V ドライバーユニット RCON-PC（CB-ADPC-MPA）。' +
    '高推力の SA8C（56SP モーター）は P4 = PCON-CFB/CGFB・MSEL-PCF/PGF（CB-CFA3-MPA）、P6 = RCON-PCF（CB-ADPC-MPA＋変換ケーブル CB-CAN-AJ002）。' +
    'ブレーキ付き（オプション B）でも、ブレーキの電源は一体型ケーブルを通してコントローラーから供給されるため、配線は変わらない（コントローラーの BK はブレーキ強制解除用）。' +
    '電源は持たず、モーター電流はコントローラー側の負荷電流（PCON-CB の「モーター」のパラメーター）で扱う。',
};

export default def;
