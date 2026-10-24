import { actuatorDefs, BRAKE_PARAM, endReceptacle, rcp6Connector, rcp6CtrlParam, rodSvg } from '../iai/actuator';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * IAI ロボシリンダー RCP6-RA（ロッドタイプ、パルスモーター、バッテリーレスアブソ）。コントローラー別置の RCP6。
 *
 * 出典: IAI 総合カタログ CJ9006 第 4 巻「RCP6-RA4C/RA6C/RA7C/RA8C」（型式項目・寸法図・適応コントローラー）、
 *       取扱説明書 MJ3751「RCP6 ロッドタイプ」。
 * - 本体幅: RA4C 40mm（35P モーター）、RA6C 60mm（42P）、RA7C 70mm（56P）、RA8C 90mm（60P 高推力）。ロッド径 φ20・25・30・40mm。
 * - 適応コントローラー: P3 = PCON・MSEL、P5 = RCON・RSEL（RA8C は P4 = PCON-CFB/CGFB、P6 = RCON・RSEL）。
 * - ケーブルはスライダータイプと同じ（CB-CAN-MPA / CB-CFA3-MPA / CB-ADPC-MPA）。モーター側の端面から出る。
 *
 * 見た目: 横から見た図。長さ方向は縮めて描いた（ストロークは代表的な長さ）。
 */
const TYPES = [
  { value: 'RA4C', bodyMm: 40, motor: '35P', rodMm: 20, high: false },
  { value: 'RA6C', bodyMm: 60, motor: '42P', rodMm: 25, high: false },
  { value: 'RA7C', bodyMm: 70, motor: '56P', rodMm: 30, high: false },
  { value: 'RA8C', bodyMm: 90, motor: '60P', rodMm: 40, high: true },
];
const typeOf = (p: ParamValues) => TYPES.find((t) => t.value === String(p.type)) ?? TYPES[1];
const brakeOf = (p: ParamValues) => String(p.brake) === 'B';

const W = 300;
const H = 72;
const motorEnd = (p: ParamValues) => (brakeOf(p) ? 282 : 262);

const svg = (p: ParamValues) => {
  const t = typeOf(p);
  const me = motorEnd(p);
  return `
  ${actuatorDefs()}
  ${rodSvg({ W, H, bodyH: t.bodyMm * 0.7, rodX: 4, bodyX: 44, bodyEnd: 200, motorEnd: me, rodD: t.rodMm * 0.55, model: `RCP6-${t.value}`, brake: brakeOf(p) })}
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
  type: 'iai.rcp6-ra',
  name: 'ロボシリンダー ロッドタイプ（パルスモーター）',
  model: 'RCP6-RA',
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
      default: 'RA6C',
    },
    rcp6CtrlParam((p) => typeOf(p).high),
    BRAKE_PARAM,
  ],
  description:
    'IAI のロボシリンダー RCP6 ロッドタイプ（パルスモーター、バッテリーレスアブソ）。コントローラーとはモーター・エンコーダー一体型ケーブル 1 本でつなぐ（モーター側の端面のコネクター MPG）。' +
    '適応コントローラー（型式の記号）: P3 = PCON-CB/CGB・PCON-CYB・MSEL・MCON（ケーブル CB-CAN-MPA）、P5 = RCON・RSEL の 24V ドライバーユニット RCON-PC（CB-ADPC-MPA）。' +
    '高推力の RA8C（60P モーター）は P4 = PCON-CFB/CGFB（CB-CFA3-MPA）、P6 = RCON-PCF（CB-ADPC-MPA＋変換ケーブル CB-CAN-AJ002）。' +
    'ブレーキ付き（オプション B）でも、ブレーキの電源は一体型ケーブルを通してコントローラーから供給されるため、配線は変わらない。',
};

export default def;
