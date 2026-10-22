import { actuatorConnector, actuatorDefs, jointConnector } from '../iai/actuator';
import { iaiLogo, n2 } from '../iai/parts';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * IAI ロボシリンダー RCD-RA1DA（ミニシリンダー、ロッドタイプ、DC ブラシレスモーター 3W、インクリメンタル）。
 *
 * 出典: IAI 総合カタログ CJ9006 第 4 巻「RCD-RA1DA」（型式項目・寸法図・適応コントローラー）、
 *       第 8 巻「ACON-CB/DCON-CB メンテナンス部品（ケーブル）」、取扱説明書 MJ3721「RCD ミニシリンダー」。
 * - 本体 φ10mm（取付け用ナット M10×1.0）、ロッド φ5mm、ストローク 10〜30mm。本体の後端から約 220mm のケーブルが出て、先端がコネクター（15.8 × 15.1mm）。
 * - 適応コントローラー: D5 = DCON-CB/CGB・DCON-CYB/PLB/POB（DCON-CA・MCON も）、D6 = RCON・RSEL（RCON-DC）。
 *   旧型式の D3（DSEP）はケーブルが CB-CA-MPA□□□ になる。
 * - ケーブル: D5 は CB-CAN-MPA□□□（-RB）、D6 は CB-ADPC-MPA□□□（-RB）。最長 10m。ブレーキはない。
 *
 * 見た目: 小さいので実物より大きめ（1mm ≒ 1.5px）に描いた。ケーブルは短く描いた。
 */
const rcon = (p: ParamValues) => String(p.ctrl) === 'D6';

const W = 230;
const H = 34;
const CY = H / 2;
const CONN_X = 226;

const svg = `
  ${actuatorDefs()}
  <!-- ロッド（φ5）と先端ナット（M4） -->
  <rect x="9" y="${CY - 3.7}" width="26" height="7.4" fill="url(#actrod-{{uid}})" stroke="#6f757b" stroke-width="0.5"/>
  <rect x="3" y="${CY - 6}" width="7" height="12" rx="0.8" fill="#b9bec3" stroke="#6f757b" stroke-width="0.6"/>
  <!-- 取付け用ナット（M10） -->
  <rect x="34" y="${CY - 10.5}" width="6" height="21" rx="0.8" fill="#b9bec3" stroke="#6f757b" stroke-width="0.6"/>
  <!-- 本体（φ10、ねじ部とモーター部） -->
  <rect x="40" y="${CY - 7.5}" width="22" height="15" fill="#c3c7cb" stroke="#7d8287" stroke-width="0.6"/>
  ${Array.from({ length: 9 }, (_, i) => `<line x1="${41 + i * 2.4}" y1="${CY - 7.5}" x2="${41 + i * 2.4}" y2="${CY + 7.5}" stroke="#9aa0a6" stroke-width="0.5"/>`).join('')}
  <rect x="62" y="${CY - 7.5}" width="66" height="15" rx="2" fill="url(#actalu-{{uid}})" stroke="#7d8287" stroke-width="0.7"/>
  <circle cx="98" cy="${CY}" r="1.6" fill="#7a7f84"/>
  ${iaiLogo(80, CY + 2.2, 6, '#1a1a1a')}
  <text x="114" y="${CY + 1.6}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#1a1a1a">RCD</text>
  <rect x="127" y="${CY - 4}" width="8" height="8" rx="1.6" fill="#2b2d31"/>
  <!-- ケーブル（約 220mm、短く描いた）とコネクター -->
  <path d="M135 ${CY} C150 ${CY} 146 ${CY + 6} 160 ${CY + 6} H190 C198 ${CY + 6} 196 ${CY} ${n2(CONN_X - 22)} ${CY}" fill="none" stroke="#141518" stroke-width="3.2" stroke-linecap="round"/>
  ${jointConnector(CONN_X, CY, 22, 15)}`;

const terminals = (p: ParamValues): TerminalDef[] => [
  {
    id: 'MPG',
    label: 'モーター・エンコーダー（コネクター）',
    note: rcon(p)
      ? '適応コントローラー D6（RCON・RSEL の RCON-DC）の MPG へ、モーター・エンコーダー一体型ケーブル CB-ADPC-MPA□□□（-RB）でつなぐ'
      : '適応コントローラー D5（DCON-CB/CGB・DCON-CYB・DCON-CA・MCON）の MPG へ、モーター・エンコーダー一体型ケーブル CB-CAN-MPA□□□（-RB）でつなぐ',
    x: CONN_X,
    y: CY,
    side: 'right',
    role: 'connector',
    connector: rcon(p) ? actuatorConnector('IAI-RCON-MPG-DC', [], 14) : actuatorConnector('IAI-RCD-MPG', ['IAI-MCON-MOT'], 14),
  },
];

const def: DeviceDefinition = {
  type: 'iai.rcd-ra1da',
  name: 'ロボシリンダー ミニシリンダー（DC ブラシレス）',
  model: 'RCD-RA1DA',
  maker: 'IAI',
  category: 'load',
  labelPrefix: 'AX',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'ctrl',
      label: '適応コントローラー',
      options: [
        { value: 'D5', label: 'D5: DCON-CB/CGB・DCON-CYB' },
        { value: 'D6', label: 'D6: RCON・RSEL（RCON-DC）' },
      ],
      default: 'D5',
    },
  ],
  description:
    'IAI のロボシリンダー RCD-RA1DA（φ10mm のミニシリンダー、DC ブラシレスモーター 3W、ストローク 10〜30mm）。本体から出たケーブルの先のコネクター（MPG）を、モーター・エンコーダー一体型ケーブルでコントローラーの MPG へつなぐ。' +
    '適応コントローラー（型式の記号）: D5 = DCON-CB/CGB・DCON-CYB/PLB/POB（DCON-CA・MCON にも同じケーブル CB-CAN-MPA でつながる）、D6 = RCON・RSEL の 24V ドライバーユニット RCON-DC（CB-ADPC-MPA）。ブレーキはない。',
};

export default def;
