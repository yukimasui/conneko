import { actuatorConnector, actuatorDefs, actuatorEncoderPins, BRAKE_PARAM, cableH, encoder26Connector, jointConnector, sliderSvg } from '../iai/actuator';
import type { DeviceDefinition, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * IAI ロボシリンダー RCS4-SA（スライダータイプ、200V AC サーボモーター、バッテリーレスアブソ）。
 *
 * 出典: IAI 総合カタログ CJ9006 第 3 巻「RCS4-SA4C/SA6C/SA7C/SA8C」（型式項目・寸法図）、第 8 巻の SCON-CB・SCON2・XSEL・XSEL2 の
 *       「メンテナンス部品（ケーブル）」、取扱説明書 MJ3769「RCS4 スライダータイプ」（3.1 コントローラーとの接続、3.2 モーター・エンコーダーケーブル）。
 * - 本体幅・モーター: SA4C 40mm・60W、SA6C 60mm・100W、SA7C 70mm・200W、SA8C 90mm・400W。
 * - モーター側の端面からモーターケーブルとエンコーダーケーブルの 2 本（各 約 300mm）が出て、先端がケーブルジョイントコネクター。
 * - 適応コントローラー: T2 = SCON-CB/CGB・SCON-CAL・MSCON・SSEL・XSEL-P/Q/R/S/RA/SA（モーターケーブル CB-RCC-MA□□□）、
 *   T4 = RCON・RSEL・SCON2・XSEL2（CB-RCC1-MA□□□）。エンコーダーケーブルはどちらも CB-X1-PA□□□（標準でロボットケーブル）。
 * - エンコーダーケーブルのピン（コントローラー側 10226、26 ピン）: 20 BKR−・21 BKR+ がブレーキの電源。
 *   ブレーキ付き（オプション B）は、コントローラーのブレーキ電源（SCON-CB の BK+・PWR−、SCON2・XSEL の BK+・BK−）に DC24V を供給する。
 *
 * 見た目: 長さ方向は縮めて描いた（ストロークは代表的な長さ、ケーブルは短く描いた）。
 */
const TYPES = [
  { value: 'SA4C', bodyMm: 40, watt: 60 },
  { value: 'SA6C', bodyMm: 60, watt: 100 },
  { value: 'SA7C', bodyMm: 70, watt: 200 },
  { value: 'SA8C', bodyMm: 90, watt: 400 },
];
const typeOf = (p: ParamValues) => TYPES.find((t) => t.value === String(p.type)) ?? TYPES[1];
const brakeOf = (p: ParamValues) => String(p.brake) === 'B';
const t4 = (p: ParamValues) => String(p.ctrl) === 'T4';

const W = 320;
const H = 72;
const BASE_END = 180;
const motorEnd = (p: ParamValues) => (brakeOf(p) ? 270 : 250);
const CONN_X = 316;
const MOT_Y = H / 2 - 11;
const PG_Y = H / 2 + 11;

const svg = (p: ParamValues) => {
  const t = typeOf(p);
  const me = motorEnd(p);
  return `
  ${actuatorDefs()}
  ${sliderSvg({ W, H, bodyW: t.bodyMm * 0.7, baseEnd: BASE_END, motorEnd: me, model: `RCS4-${t.value}`, brake: brakeOf(p) })}
  <!-- モーターケーブル・エンコーダーケーブル（先端はケーブルジョイントコネクター） -->
  <path d="M${me} ${H / 2 - 3} C${me + 12} ${H / 2 - 3} ${me + 8} ${MOT_Y} ${me + 22} ${MOT_Y} H${CONN_X - 16}" fill="none" stroke="#141518" stroke-width="5" stroke-linecap="round"/>
  <path d="M${me} ${H / 2 + 3} C${me + 12} ${H / 2 + 3} ${me + 8} ${PG_Y} ${me + 22} ${PG_Y} H${CONN_X - 16}" fill="none" stroke="#141518" stroke-width="4.4" stroke-linecap="round"/>
  ${cableH(me - 1, me + 3, H / 2, 12)}
  ${jointConnector(CONN_X, MOT_Y, 17, 12)}
  ${jointConnector(CONN_X, PG_Y, 17, 11)}
  <text x="${CONN_X - 8.5}" y="${MOT_Y - 7.5}" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#3a3c40">MOT</text>
  <text x="${CONN_X - 8.5}" y="${PG_Y + 10.5}" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#3a3c40">PG</text>`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const motorCable = t4(p) ? 'CB-RCC1-MA□□□（ロボットケーブル CB-X2-MA□□□）' : 'CB-RCC-MA□□□（-RB）';
  const ctrls = t4(p) ? 'SCON2・RCON-SC・XSEL2' : 'SCON-CB・XSEL-RA/SA・XSEL-P/Q';
  return [
    {
      id: 'MOT',
      label: 'モーター（U/V/W/PE）',
      note: `モーターケーブルのケーブルジョイントコネクター。適応コントローラー ${t4(p) ? 'T4' : 'T2'}（${ctrls}）の MOT（XSEL は M1〜）へモーターケーブル ${motorCable} でつなぐ`,
      x: CONN_X,
      y: MOT_Y,
      side: 'right',
      role: 'connector',
      connector: t4(p) ? actuatorConnector('IAI-SCON2-MOT', ['IAI-XSEL2-MOT'], 12) : actuatorConnector('IAI-SCON-MOT', ['IAI-XSEL-MOT'], 12),
    },
    {
      id: 'PG',
      label: 'エンコーダー',
      note: `エンコーダーケーブルのケーブルジョイントコネクター。コントローラーの PG（XSEL は PG1〜）へエンコーダーケーブル CB-X1-PA□□□ でつなぐ${brakeOf(p) ? '（ブレーキの電源 BK+・BK− もこのケーブルを通る）' : ''}`,
      x: CONN_X,
      y: PG_Y,
      side: 'right',
      role: 'connector',
      connector: encoder26Connector('IAI-SCON-PG', ['IAI-XSEL-PG'], 11),
    },
  ];
};

const pins = (p: ParamValues): PinDef[] => actuatorEncoderPins('PG', brakeOf(p));

const def: DeviceDefinition = {
  type: 'iai.rcs4-sa',
  name: 'ロボシリンダー スライダータイプ（200V AC サーボ）',
  model: 'RCS4-SA',
  maker: 'IAI',
  category: 'load',
  labelPrefix: 'AX',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  params: [
    {
      key: 'type',
      label: 'タイプ',
      options: TYPES.map((t) => ({ value: t.value, label: `${t.value}（本体幅 ${t.bodyMm}mm、${t.watt}W）` })),
      default: 'SA6C',
    },
    {
      key: 'ctrl',
      label: '適応コントローラー',
      options: [
        { value: 'T2', label: 'T2: SCON-CB・XSEL-RA/SA・XSEL-P/Q（MSCON・SSEL）' },
        { value: 'T4', label: 'T4: SCON2・RCON・RSEL・XSEL2' },
      ],
      default: 'T2',
    },
    BRAKE_PARAM,
  ],
  description:
    'IAI のロボシリンダー RCS4 スライダータイプ（200V AC サーボモーター 60〜400W、バッテリーレスアブソ）。モーター側の端面からモーターケーブル（MOT）とエンコーダーケーブル（PG）の 2 本が出ていて、それぞれコントローラーの MOT・PG へ専用ケーブルでつなぐ。' +
    '適応コントローラー（型式の記号）: T2 = SCON-CB/CGB・XSEL-RA/SA・XSEL-P/Q など（モーターケーブル CB-RCC-MA）、T4 = SCON2・RCON（RCON-SC）・RSEL・XSEL2（CB-RCC1-MA）。エンコーダーケーブルは CB-X1-PA。' +
    'ブレーキ付き（オプション B）は、ブレーキの電源 DC24V をコントローラーのブレーキ電源端子（SCON-CB は BK+・PWR−、SCON2・XSEL・XSEL2 は BK+・BK−）に供給する。' +
    'Conneko ではエンコーダーケーブルのピン 21（BK+）・20（BK−）をブレーキの受電にしているので、ブレーキ電源を配線し忘れると「電源が来ていません」と指摘される（RCON-SC は連結で供給されるため対象外）。',
};

export default def;
