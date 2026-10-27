import type { DeviceDefinition, ParamValues } from '../types';
import { OUTPUT_PARAM, leadPins, outName, proxBody, roundConnector, roundMale, sensorOutputLinks, switchedOut, type Lead } from '../keyence/sensor-parts';

/**
 * オムロン 近接センサ E2E NEXT（DC 3 線式、シールドタイプ、2 倍距離の BASIC モデル、1 出力 NO）の M12 コネクタタイプ（-M1）。
 * コード引出しタイプ（omron.e2e-x-c1 / omron.e2e-x-b1d）と同じ本体で、ケーブルの代わりに本体の後ろに M12 4 ピンのオスコネクタが付く。
 * 出力形式（NPN: E2E-X□C1□-M1 / PNP: E2E-X□B1D□-M1）とサイズ（M12 / M18）を params で選ぶ。
 *
 * 出典: オムロン E2E NEXT データシート（D121）定格: 電源 DC10〜30V、消費電流 16mA 以下、制御出力 200mA 以下、残留電圧 2V 以下
 *       https://industrial.omron.pt/pt/products/E2E-X4C112-M1（E2E-X4C112-M1: M12, 4mm, DC 3-wire, NPN NO, M12 connector）
 *       オムロン 置換えのお知らせ（E2A → E2E NEXT）: コネクタタイプのピンの割付けは NPN NO の E2A と同じ
 *       （ピン 1 = +V（茶）、3 = 0V（青）、4 = 出力（黒）。IEC 60947-5-2 の標準の割付け）
 * PNP（B1D、IO-Link 対応）の -M1 のピン 2 は資料で確かめられず、未使用とした（推定）。
 */

const W = 70;
const H = 128;

const SIZES: Record<number, { dia: number; len: number; dist: string; npn: string; pnp: string }> = {
  12: { dia: 24, len: 62, dist: '4mm', npn: 'E2E-X4C112-M1', pnp: 'E2E-X4B1D12-M1' },
  18: { dia: 32, len: 68, dist: '8mm', npn: 'E2E-X8C118-M1', pnp: 'E2E-X8B1D18-M1' },
};

const leads: Lead[] = [
  { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
  { color: 'WH', label: '未使用', role: 'nc', note: '未使用（何もつながない。PNP の B1D は推定）' },
  { color: 'BU', label: '0V', role: 'minus' },
  { color: 'BK', label: '出力 NO（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut },
];

const size = (p: ParamValues) => SIZES[Number(p.size)] ?? SIZES[12];
const modelOf = (p: ParamValues) => (p.output === 'P' ? size(p).pnp : size(p).npn);

const TIP_Y = 100;
const male = roundMale(35, TIP_Y, 'M12');

function svg(p: ParamValues) {
  const s = size(p);
  const body = proxBody(35, TIP_Y - 12 - s.len, s.dia, s.len, '#4a4d52');
  return `${body.svg}${male.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">${modelOf(p)}</text>
  <text x="${W / 2}" y="12.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#555">検出 ${s.dist}・${outName(p)}・M12 コネクタ</text>
  <text x="${35 + s.dia / 2 + 3}" y="${TIP_Y - 12 - s.len * 0.45}" font-family="sans-serif" font-size="3.4" fill="#555">M${p.size}</text>`;
}

const def: DeviceDefinition = {
  type: 'omron.e2e-x.m12',
  name: '近接センサ（DC3線式）',
  model: 'E2E-X4C112-M1 / E2E-X8C118-M1（NPN）・E2E-X4B1D12-M1 / E2E-X8B1D18-M1（PNP）M12 コネクタ',
  modelOf,
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの近接センサ E2E NEXT（DC 3 線式、シールドタイプ、2 倍距離、オープンコレクタ 1 出力 NO）の M12 コネクタタイプ。' +
    '出力形式は params の output（NPN: E2E-X□C1□-M1 / PNP: E2E-X□B1D□-M1）、サイズは size（M12: 検出距離 4mm / M18: 8mm）で選ぶ。' +
    'M12 のピン 1 = +24V、3 = 0V、4 = 出力（2 は未使用）。センサーケーブル（generic.m12-4p-cable など、ピン 1 茶・2 白・3 青・4 黒）でつなぐ。' +
    'NPN は PLC 入力の COM を +24V（プラスコモン）、PNP は COM を 0V（マイナスコモン）にする。' +
    '電源 DC10〜30V、消費電流 16mA 以下、制御出力 200mA 以下（残留電圧 2V 以下）、動作表示灯（橙）は出力 ON で点灯。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: [{ id: 'CN', label: 'M12 4ピン コネクタ（オス）', x: male.tip.x, y: male.tip.y, side: 'bottom', role: 'connector', connector: roundConnector('M12') }],
  pins: leadPins('CN', leads, 10, 30),
  links: sensorOutputLinks(['CN#4'], 0.2, { plus: 'CN#1', minus: 'CN#3' }),
  params: [
    { key: 'size', label: 'サイズ（ネジ径）', options: [{ value: 12, label: 'M12（検出距離 4mm）' }, { value: 18, label: 'M18（検出距離 8mm）' }], default: 12 },
    OUTPUT_PARAM,
  ],
  loadCurrent: 0.016,
  estimated: 'PNP（B1D、IO-Link 対応）の M12 コネクタのピン 2 の割付け（未使用とした）',
};

export default def;
