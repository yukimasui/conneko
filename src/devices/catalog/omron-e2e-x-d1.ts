import type { DeviceDefinition, ParamValues, SignalSpec } from '../types';
import { proxBody, sensorCable } from '../keyence/sensor-parts';

/**
 * オムロン 近接センサ E2E NEXT の DC 2 線式（シールドタイプ、極性あり、NO、ケーブル 2m）。
 * サイズは params の size で M12（E2E-X3D1-N、検出距離 3mm）/ M18（E2E-X7D1-N、7mm）を選ぶ。
 *
 * 出典: オムロン E2E NEXT 仕様（ia.omron.com family/449 specification、データシート D126）
 *   DC 2 線式: 漏れ電流 0.8mA 以下、制御出力（開閉容量）3〜100mA、残留電圧 3V 以下（負荷電流 100mA・ケーブル 2m）、NO
 *   2022 年 10 月末に DC 2 線式は E2E NEXT に統合（E2E-X7D1S 2M の推奨代替は E2E-X7D1-N 2M）
 * 線色: 茶 = +側、青 = −側（極性あり）。PLC の入力回路に直列に入れる:
 *   COM が 0V（マイナスコモン）のときは 茶を +24V、青を入力へ。COM が +24V（プラスコモン）のときは 茶を入力、青を 0V へ。
 * 描画は KEYENCE の近接センサと同じ部品（src/devices/keyence/sensor-parts.ts）を使う。
 */

const W = 70;
const H = 196;

const SIZES: Record<number, { dia: number; len: number; dist: string; model: string }> = {
  12: { dia: 24, len: 62, dist: '3mm', model: 'E2E-X3D1-N' },
  18: { dia: 32, len: 68, dist: '7mm', model: 'E2E-X7D1-N' },
};

/** 2 線式の出力（漏れ電流 0.8mA 以下、残留電圧 3V 以下）。茶・青の両方に書く */
const TWO_WIRE: SignalSpec = { dir: 'out', kind: '2wire', leakCurrent: 0.8, residualVoltage: 3 };

const cable = sensorCable({
  cx: 35,
  y0: 100,
  yFan: 160,
  yEnd: 192,
  pitch: 14,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '（2線式 +側）', role: 'out', signal: TWO_WIRE, note: '2 線式の +側（茶）。マイナスコモンの入力なら +24V へ、プラスコモンの入力なら入力点へ' },
    { color: 'BU', label: '（2線式 −側）', role: 'out', signal: TWO_WIRE, note: '2 線式の −側（青）。マイナスコモンの入力なら入力点へ、プラスコモンの入力なら 0V へ' },
  ],
});

const svg = (p: ParamValues) => {
  const s = SIZES[Number(p.size)] ?? SIZES[12];
  const body = proxBody(35, 100 - 12 - s.len, s.dia, s.len, '#4a4d52');
  return `${cable.svg}${body.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">${s.model}・DC2線式 ${s.dist}</text>
  <text x="${35 + s.dia / 2 + 3}" y="${100 - s.len * 0.45}" font-family="sans-serif" font-size="3.4" fill="#555">M${p.size}</text>`;
};

const def: DeviceDefinition = {
  type: 'omron.e2e-x-d1',
  name: '近接センサ（DC2線式）',
  model: 'E2E-X3D1-N / E2E-X7D1-N（DC2線式 NO）',
  modelOf: (p) => `${(SIZES[Number(p.size)] ?? SIZES[12]).model} 2M`,
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの近接センサ E2E NEXT の DC 2 線式（シールドタイプ、極性あり、NO、ケーブル 2m）。サイズは params の size（M12: 検出距離 3mm・E2E-X3D1-N / M18: 7mm・E2E-X7D1-N）。' +
    '茶・青の 2 線を PLC の入力回路に直列に入れる: COM が 0V（マイナスコモン）のときは 茶を +24V・青を入力へ、COM が +24V（プラスコモン）のときは 茶を入力・青を 0V へ（極性があるので茶を + 側にする）。' +
    '開閉容量 3〜100mA、漏れ電流 0.8mA 以下、残留電圧 3V 以下。OFF でも漏れ電流が流れ、ON でも 3V 残るので、入力の OFF 電流・最小 ON 電圧と合うかを確かめる（チェックの two-wire-input）。' +
    '2 線式を使えない入力（KV-C64XC など）にはつながない。2 線とも 2 線式センサーの信号線（信号の種類 2wire）で、検出すると茶と青の間が導通する出力として扱う。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // 検出すると茶と青の間が導通する（開閉容量 100mA）
  links: [{ from: 'BN', to: 'BU', switch: 'output', ratedCurrent: 0.1 }],
  params: [
    {
      key: 'size',
      label: 'サイズ（ネジ径）',
      options: [
        { value: 12, label: 'M12（E2E-X3D1-N、3mm）' },
        { value: 18, label: 'M18（E2E-X7D1-N、7mm）' },
      ],
      default: 12,
    },
  ],
  estimated: '型式の末尾 -N と、M12 の型式（E2E-X3D1-N）・検出距離 3mm は資料の型式表から読み取った（M18 の E2E-X7D1-N は推奨代替の案内で確認）',
};

export default def;
