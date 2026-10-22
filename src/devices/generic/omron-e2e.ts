/**
 * オムロン 近接センサ E2E NEXT（DC 3 線式、シールドタイプ、2 倍距離の BASIC モデル、1 出力 NO、ケーブル 2m）の機器定義を作る。
 * NPN（C1）と PNP（B1D）で型式が分かれるので、出力形式ごとに別の機器にし、サイズ（M12 / M18）は params で選ぶ。
 *
 * 出典: オムロン E2E NEXT データシート（D121、files.omron.eu の d121_e2e_next_datasheet_en.pdf）
 *   定格（p.37）: 電源 DC10〜30V（リップル 10% 含む）、消費電流 16mA 以下、制御出力 200mA 以下、残留電圧 2V 以下、動作表示灯は橙
 *   入出力回路（p.46）: 茶 = +V、黒 = 出力（NO）、青 = 0V。NPN は負荷を +V と黒の間、PNP は黒と 0V の間につなぐ
 * 描画は KEYENCE の近接センサと同じ部品（src/devices/keyence/sensor-parts.ts）を使う。
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { proxBody, sensorCable } from '../keyence/sensor-parts';

const W = 70;
const H = 196;

const SIZES: Record<number, { dia: number; len: number; dist: string; freq: string; npn: string; pnp: string }> = {
  12: { dia: 24, len: 62, dist: '4mm', freq: '1kHz', npn: 'E2E-X4C112', pnp: 'E2E-X4B1D12' },
  18: { dia: 32, len: 68, dist: '8mm', freq: '500Hz', npn: 'E2E-X8C118', pnp: 'E2E-X8B1D18' },
};

export function buildE2E(output: 'npn' | 'pnp'): DeviceDefinition {
  const pnp = output === 'pnp';
  const cable = sensorCable({
    cx: 35,
    y0: 100,
    yFan: 160,
    yEnd: 192,
    pitch: 13,
    vmin: 10,
    vmax: 30,
    leads: [
      { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
      { color: 'BK', label: `出力 NO（${pnp ? 'PNP' : 'NPN'}）`, role: 'out', signal: { dir: 'out', kind: output } },
      { color: 'BU', label: '0V', role: 'minus' },
    ],
  });

  const svg = (p: ParamValues) => {
    const s = SIZES[Number(p.size)] ?? SIZES[12];
    const body = proxBody(35, 100 - 12 - s.len, s.dia, s.len, '#4a4d52');
    return `${cable.svg}${body.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">${pnp ? s.pnp : s.npn}・検出 ${s.dist}</text>
  <text x="${35 + s.dia / 2 + 3}" y="${100 - s.len * 0.45}" font-family="sans-serif" font-size="3.4" fill="#555">M${p.size}</text>`;
  };

  return {
    type: pnp ? 'omron.e2e-x-b1d' : 'omron.e2e-x-c1',
    name: '近接センサ（DC3線式）',
    model: pnp ? 'E2E-X4B1D12 / E2E-X8B1D18（PNP NO）' : 'E2E-X4C112 / E2E-X8C118（NPN NO）',
    maker: 'オムロン',
    category: 'sensor',
    description:
      `オムロンの近接センサ E2E NEXT（DC 3 線式、シールドタイプ、2 倍距離、${pnp ? 'PNP' : 'NPN'} オープンコレクタ 1 出力 NO、ケーブル 2m）。` +
      'サイズは params の size（M12: 検出距離 4mm・E2E-X4' + (pnp ? 'B1D12' : 'C112') + ' / M18: 8mm・E2E-X8' + (pnp ? 'B1D18' : 'C118') + '）。' +
      `茶を +24V、青を 0V、黒（出力）を PLC の入力につなぐ（${pnp ? 'PNP 出力なので PLC 入力の COM は 0V 側（マイナスコモン）' : 'NPN 出力なので PLC 入力の COM は +24V 側（プラスコモン）'}にする）。` +
      '電源 DC10〜30V、消費電流 16mA 以下、制御出力 200mA 以下（残留電圧 2V 以下）、動作表示灯（橙）は出力 ON で点灯。' +
      (pnp ? 'B1D は IO-Link（COM2）対応品で、IO-Link マスタにつながないときは普通の PNP 出力（SIO モード）として動く。' : ''),
    labelPrefix: 'PX',
    width: W,
    height: H,
    svg,
    terminals: cable.terminals,
    links: [{ from: 'BK', to: pnp ? 'BN' : 'BU', switch: 'output', ratedCurrent: 0.2 }],
    params: [
      {
        key: 'size',
        label: 'サイズ（ネジ径）',
        options: [
          { value: 12, label: `M12（${pnp ? SIZES[12].pnp : SIZES[12].npn}）` },
          { value: 18, label: `M18（${pnp ? SIZES[18].pnp : SIZES[18].npn}）` },
        ],
        default: 12,
      },
    ],
    loadCurrent: 0.016,
  };
}
