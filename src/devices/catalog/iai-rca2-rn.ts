import { actuatorConnector, actuatorDefs, BRAKE_PARAM, jointConnector, rodSvg } from '../iai/actuator';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * IAI ロボシリンダー RCA2-RN3NA / RN4NA（細小型ロッドタイプ、24V AC サーボモーター、インクリメンタル）。
 *
 * 出典: IAI 総合カタログ CJ9006 第 4 巻「RCA2-RN3NA」「RCA2-RN4NA」（型式項目・寸法図・適応コントローラー）、
 *       取扱説明書 MJ3671「RCA2 細小型ロッドタイプ」（1.4 モータ・エンコーダケーブル、3 コントローラとの接続）。
 * - モーター: RN3NA 10W、RN4NA 20W。本体の先端に取付け用のねじ（M24）、反対側からケーブル（約 300mm）が出て先端がケーブルジョイントコネクター。
 * - 適応コントローラー: A3 = ACON-CYB/PLB/POB、A5 = ACON-CB/CGB（ACON-CA・MCON も同じケーブル）、A6 = RCON・RSEL（RCON-AC）。
 * - ケーブル: 標準コネクターは A3/A5 が CB-APSEP-MPA□□□、A6 が CB-RCAPC-MPA□□□。小型コネクター仕様（CNS）は A3/A5 が CB-CAN-MPA□□□、A6 が CB-ADPC-MPA□□□。
 * - ブレーキ（オプション B）はモーター・エンコーダー一体型ケーブルを通してコントローラーが駆動する（別配線は不要）。
 *
 * Conneko ではコネクターの種類を ACON 系（'IAI-RCA-MPG'）と RCON-AC（'IAI-RCON-MPG-AC'）に分けた。A3 と A5 は同じ種類として扱う。
 */
const TYPES = [
  { value: 'RN3NA', watt: 10 },
  { value: 'RN4NA', watt: 20 },
];
const typeOf = (p: ParamValues) => TYPES.find((t) => t.value === String(p.type)) ?? TYPES[1];
const brakeOf = (p: ParamValues) => String(p.brake) === 'B';
const rcon = (p: ParamValues) => String(p.ctrl) === 'A6';

const W = 240;
const H = 50;
const CONN_X = 236;
const motorEnd = (p: ParamValues) => (brakeOf(p) ? 166 : 150);

const svg = (p: ParamValues) => {
  const t = typeOf(p);
  const me = motorEnd(p);
  return `
  ${actuatorDefs()}
  ${rodSvg({ W, H, bodyH: 27, rodX: 4, bodyX: 40, bodyEnd: 120, motorEnd: me, rodD: 6, model: `RCA2-${t.value}`, brake: brakeOf(p) })}
  <!-- 先端の取付けねじ（M24）と六角ナット -->
  <rect x="30" y="${H / 2 - 9.5}" width="12" height="19" fill="#c3c7cb" stroke="#7d8287" stroke-width="0.5"/>
  ${Array.from({ length: 6 }, (_, i) => `<line x1="${31 + i * 2}" y1="${H / 2 - 9.5}" x2="${31 + i * 2}" y2="${H / 2 + 9.5}" stroke="#9aa0a6" stroke-width="0.5"/>`).join('')}
  <rect x="24" y="${H / 2 - 12}" width="7" height="24" rx="0.8" fill="#b9bec3" stroke="#6f757b" stroke-width="0.6"/>
  <!-- ケーブル（約 300mm、短く描いた）とケーブルジョイントコネクター -->
  <path d="M${me} ${H / 2} C${me + 14} ${H / 2} ${me + 10} ${H / 2 + 8} ${me + 26} ${H / 2 + 8} H${CONN_X - 30} C${CONN_X - 22} ${H / 2 + 8} ${CONN_X - 24} ${H / 2} ${CONN_X - 15} ${H / 2}" fill="none" stroke="#141518" stroke-width="4" stroke-linecap="round"/>
  ${jointConnector(CONN_X, H / 2, 16, 11)}`;
};

const terminals = (p: ParamValues): TerminalDef[] => [
  {
    id: 'MPG',
    label: 'モーター・エンコーダー（ケーブルジョイントコネクター）',
    note: rcon(p)
      ? '適応コントローラー A6（RCON・RSEL の RCON-AC）の MPG へ、モーター・エンコーダー一体型ケーブル CB-RCAPC-MPA□□□（小型コネクター仕様は CB-ADPC-MPA□□□）でつなぐ'
      : '適応コントローラー A3/A5（ACON-CYB・ACON-CB/CGB・ACON-CA・MCON）の MPG へ、モーター・エンコーダー一体型ケーブル CB-APSEP-MPA□□□（小型コネクター仕様は CB-CAN-MPA□□□）でつなぐ',
    x: CONN_X,
    y: H / 2,
    side: 'right',
    role: 'connector',
    connector: rcon(p) ? actuatorConnector('IAI-RCON-MPG-AC', [], 11) : actuatorConnector('IAI-RCA-MPG', ['IAI-MCON-MOT'], 11),
  },
];

const def: DeviceDefinition = {
  type: 'iai.rca2-rn',
  name: 'ロボシリンダー 細小型ロッドタイプ（24V AC サーボ）',
  model: 'RCA2-RN',
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
      options: TYPES.map((t) => ({ value: t.value, label: `${t.value}（${t.watt}W）` })),
      default: 'RN4NA',
    },
    {
      key: 'ctrl',
      label: '適応コントローラー',
      options: [
        { value: 'A5', label: 'A5: ACON-CB/CGB（A3: ACON-CYB も同じ扱い）' },
        { value: 'A6', label: 'A6: RCON・RSEL（RCON-AC）' },
      ],
      default: 'A5',
    },
    BRAKE_PARAM,
  ],
  description:
    'IAI のロボシリンダー RCA2 細小型ロッドタイプ（24V AC サーボモーター 10W/20W）。本体から出たケーブルの先のケーブルジョイントコネクター（MPG）を、モーター・エンコーダー一体型ケーブルでコントローラーの MPG へつなぐ。' +
    '適応コントローラー（型式の記号）: A3 = ACON-CYB/PLB/POB、A5 = ACON-CB/CGB（ACON-CA・MCON にも同じケーブルでつながる）、A6 = RCON・RSEL の 24V ドライバーユニット RCON-AC。' +
    'ケーブル: A3/A5 は CB-APSEP-MPA（小型コネクター仕様 CNS は CB-CAN-MPA）、A6 は CB-RCAPC-MPA（CNS は CB-ADPC-MPA）。ブレーキ付き（オプション B）でも配線は変わらない。' +
    '送りねじに回り止めがないため、先端に外付けのガイドが必要。',
};

export default def;
