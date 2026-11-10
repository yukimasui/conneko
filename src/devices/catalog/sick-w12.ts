import type { DeviceDefinition, ParamValues } from '../types';
import { OUTPUT_PARAM, leadPins, outName, roundConnector, roundMale, sensorOutputLinks, switchedOut, type Lead } from '../keyence/sensor-parts';

/**
 * SICK 小形光電センサ W12-3 の背景抑制形（BGS）WTB12-3P2431（PNP）/ WTB12-3N2431（NPN）、M12 4 ピンのコネクタ。
 * 出力形式は params の output で選ぶ。
 *
 * 出典: SICK データシート WTB12-3P2431（1041411）・WL12-3P2431（1041436）・WTF12-3P2431（1041404）、SICK の製品ページ
 * - 検出距離 20〜350mm（背景抑制）、電源 DC10〜30V、消費電流 45mA、出力電流 100mA 以下、応答時間 330µs 以下、ライト / ダーク ON
 * - 出力は相補出力（Q と Q̄ の 2 本）。接続図 CD-083: ピン 1 茶 L+、2 白、3 青 M、4 黒（IEC 60947-5-2 の標準の割付け）
 * 推定: ピン 4 = Q（ライト ON）、ピン 2 = Q̄（ダーク ON）の割付け（資料の抜粋では 2・4 のどちらが Q̄ か読み取れなかった。SICK の相補出力の通例による）、
 *       NPN 品（WTB12-3N2431）の仕様は PNP 品と同じとした、外形の見た目。
 */

const W = 70;
const H = 120;
const TIP_Y = 92;
const male = roundMale(35, TIP_Y, 'M12');

const leads: Lead[] = [
  { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
  { color: 'WH', label: '出力 Q̄（ダーク ON。推定）', role: 'out', signal: switchedOut, note: '相補出力の Q̄（遮光で ON。ピン 2 = Q̄ は推定）' },
  { color: 'BU', label: '0V', role: 'minus' },
  { color: 'BK', label: '出力 Q（ライト ON）', role: 'out', signal: switchedOut, note: '相補出力の Q（検出（入光）で ON。100mA 以下）' },
];

const modelOf = (p: ParamValues) => (p.output === 'P' ? 'WTB12-3P2431' : 'WTB12-3N2431');

function svg(p: ParamValues) {
  return `
  <defs>
    <linearGradient id="w12-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4b4f55"/>
      <stop offset="1" stop-color="#22252a"/>
    </linearGradient>
  </defs>
  <!-- 本体（W12 のハウジング。左が検出面） -->
  <rect x="8" y="18" width="54" height="${TIP_Y - 18}" rx="3" fill="url(#w12-{{uid}})" stroke="#0b0c0d" stroke-width="0.9"/>
  <!-- 検出面（投光・受光の窓） -->
  <rect x="8" y="22" width="9" height="40" rx="1.2" fill="#121315" stroke="#000" stroke-width="0.5"/>
  <rect x="9.5" y="25" width="6" height="15" rx="1" fill="#5a1a14"/>
  <rect x="9.5" y="43" width="6" height="15" rx="1" fill="#1c1d1f" stroke="#444" stroke-width="0.4"/>
  <!-- 取付穴 -->
  <circle cx="30" cy="70" r="3.2" fill="#0d0e0f" stroke="#6d7277" stroke-width="0.5"/>
  <circle cx="48" cy="70" r="3.2" fill="#0d0e0f" stroke="#6d7277" stroke-width="0.5"/>
  <!-- 上面: 表示灯・距離設定 -->
  <rect x="24" y="14" width="7" height="4" rx="1" fill="#f2b417" stroke="#6a4e00" stroke-width="0.4"/>
  <rect x="34" y="14" width="7" height="4" rx="1" fill="#36c24a" stroke="#0d4a15" stroke-width="0.4"/>
  <circle cx="52" cy="16" r="3" fill="#c9cdd1" stroke="#555" stroke-width="0.4"/>
  <text x="40" y="34" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#f2f2f2">SICK</text>
  <text x="40" y="42" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#d6d6d6">W12-3</text>
  <text x="40" y="54" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#bbb">BGS 350mm</text>
  ${male.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.2" fill="#333">${modelOf(p)}</text>
  <text x="${W / 2}" y="12" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">背景抑制 20〜350mm・${outName(p)} 相補</text>`;
}

const def: DeviceDefinition = {
  type: 'sick.w12',
  name: '光電センサ（反射型）',
  model: 'WTB12-3P2431 / WTB12-3N2431（背景抑制、M12 コネクタ）',
  modelOf,
  maker: 'SICK',
  category: 'sensor',
  description:
    'SICK の小形光電センサ W12-3 の背景抑制形 WTB12-3P2431（PNP）/ WTB12-3N2431（NPN）。検出距離 20〜350mm で、背景の影響を受けにくい。出力形式は params の output で選ぶ。' +
    '電源 DC10〜30V、消費電流 45mA、出力電流 100mA 以下、応答時間 330µs 以下。M12 4 ピンのコネクタ（ピン 1 茶 +V、2 白 Q̄、3 青 0V、4 黒 Q）で、センサーケーブル（generic.m12-4p-cable など）でつなぐ。' +
    '出力は相補出力で、黒 Q が検出（入光）で ON、白 Q̄ がその反対（遮光で ON。割付けは推定）。ふつうは黒だけを PLC の入力へつなぐ。' +
    'PNP は PLC 入力の COM を 0V（マイナスコモン）、NPN は COM を +24V（プラスコモン）にする。',
  labelPrefix: 'PH',
  width: W,
  height: H,
  svg,
  terminals: [{ id: 'CN', label: 'M12 4ピン コネクタ（オス）', x: male.tip.x, y: male.tip.y, side: 'bottom', role: 'connector', connector: roundConnector('M12') }],
  pins: leadPins('CN', leads, 10, 30),
  links: sensorOutputLinks(['CN#2', 'CN#4'], 0.1, { plus: 'CN#1', minus: 'CN#3' }),
  params: [{ ...OUTPUT_PARAM, default: 'P' }],
  loadCurrent: 0.045,
  estimated: 'ピン 2 = Q̄（ダーク ON）・ピン 4 = Q（ライト ON）の割付け、NPN 品（WTB12-3N2431）の定格は PNP 品と同じとした、外形の見た目',
};

export default def;
