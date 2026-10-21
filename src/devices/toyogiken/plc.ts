/**
 * 東洋技研の PLC 対応コネクタ端子台（記名板の印字と回路が PLC 各社のピン配置に合わせてある）。
 * コネクタの空きピン（三菱電機の A03・A04・B03・B04 など）は端子台から省かれ、信号が左から順に並ぶ。
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildConnectorBlock, type Rows, type Series } from './connector-block';
import { fcnPinLabel, melsecMilPinLabel } from './rows';

const kvPinLabel = (n: number) => {
  // MIL 標準ピン n → KEYENCE のピン No.（奇数 n → (n+1)/2、偶数 n → n/2+17）
  const k = n % 2 === 1 ? (n + 1) / 2 : n / 2 + 17;
  return `MIL ピン ${n}（KEYENCE No.${k}）`;
};

export interface PlcBlockSpec {
  type: string;
  model: string | ((p: ParamValues) => string);
  series: Series;
  widthMm: number;
  connector: 'MIL' | 'FCN';
  poles: number;
  rows: Rows | ((p: ParamValues) => Rows);
  params?: ParamDef[];
  description: string;
  /** 出典 URL */
  source: string;
}

/** KEYENCE（KV-8000 / 7000 / 5000 / 3000 / Nano）の MIL 34 極 I/O ユニット用 */
export function buildKeyenceBlock(s: PlcBlockSpec): DeviceDefinition {
  return buildConnectorBlock({
    ...s,
    name: 'PLC用コネクタ端子台（KEYENCE）',
    pinLabel: kvPinLabel,
    description:
      `${s.description} 記名板は KEYENCE のピン配置どおり（000〜015 = ピン No.1〜16、COM0 = No.17、100〜115 = No.18〜33、COM1 = No.34）。` +
      `000・100 などの印字はユニット内の番号で、実際のリレー番号はユニットの先頭番号から数える（先頭が R000 なら 000 → R000、100 → R100）。` +
      `KV-C32XC / KV-C32TC / KV-C64XC / KV-NC32EX などと MIL⇔MIL 34 極ケーブル（東洋技研 KB34N-1H1H など）でつなぐ。出典: ${s.source}`,
  });
}

/** 三菱電機（MELSEC iQ-R / Q / L、富士電機 MICREX-SX）の 40 ピン 32 点 I/O ユニット用 */
export function buildMelsecBlock(s: PlcBlockSpec): DeviceDefinition {
  const cable =
    s.connector === 'FCN'
      ? 'I/O ユニットとは FCN⇔FCN ケーブル（東洋技研 KB40N-4F4F など）でつなぐ。'
      : 'I/O ユニット（FCN 40 ピン）とは FCN⇔MIL ケーブル（東洋技研 KB40N-4F1H など）でつなぐ。' +
        'ピン ID は三菱電機の I/O ユニット（RX41C4 など）の CN1 と同じ規則（三菱の B20 = ピン 1、A20 = ピン 2、…、A01 = ピン 40）で、' +
        'conneko の FCN40−MIL40 のケーブルで同じ信号どうしがつながる。' +
        '※東洋技研の結線図では、FCN⇔MIL ケーブルを通した MIL コネクタのピン番号は三菱の B_k = 2k、A_k = 2k−1（B20 = MIL ピン 40）。';
  return buildConnectorBlock({
    ...s,
    name: 'PLC用コネクタ端子台（三菱電機）',
    pinLabel: s.connector === 'FCN' ? fcnPinLabel : melsecMilPinLabel,
    description:
      `${s.description} 記名板は三菱電機の 32 点ユニットのピン配置どおり（00〜0F = B20〜B05、10〜1F = A20〜A05、B01・B02 = 出力ユニットの +V（入力ユニットの COM）、A01・A02 = 出力ユニットの 0V（COM））。` +
      `00〜1F の印字はユニット内の番号で、実際の入出力番号はユニットの先頭番号を足したもの（先頭 X20 のユニットなら 00 → X20）。` +
      `RX41C4 / RX41C6HS / RY41NT2P / RY41PT1P / QX41 / QY41P / LX41C4 / LY41NT1P などに対応。${cable}出典: ${s.source}`,
  });
}
