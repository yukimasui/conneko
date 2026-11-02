import type { DeviceDefinition } from '../types';
import { buildIqrNetworkUnit } from './mitsubishi-rj71en71';

/**
 * 三菱電機 MELSEC iQ-R シリーズ CC-Link IE フィールドネットワーク マスタ・ローカルユニット RJ71GF11-T2。
 * 外形は RJ71EN71 と同じ（W27.8 × H106 × D110 mm）。RJ-45 ポート 2 個（P1・P2、1000BASE-T）。
 * マスタ局として、リモート I/O・サーボアンプ・インバーターなどの CC-Link IE フィールド機器をライン・スター・リング形でつなぐ。
 * 入出力番号を 32 点占有する。
 */
const def: DeviceDefinition = buildIqrNetworkUnit({
  type: 'mitsubishi.rj71gf11-t2',
  model: 'RJ71GF11-T2',
  name: 'PLC 通信ユニット（CC-Link IE フィールド）',
  labelPrefix: 'CCIEF',
  leds: [{ t: 'RUN', on: 'g' }, { t: 'ERR' }, { t: 'MST', on: 'g' }, { t: 'D LINK', on: 'g' }, { t: 'SD/RD' }, { t: 'L ERR' }],
  badge: 'CC-Link IE Field',
  protocols: ['cc-link-ie-field'],
  load5V: 0.82,
  points: 32,
  description:
    '三菱電機 MELSEC iQ-R シリーズの CC-Link IE フィールドネットワーク マスタ・ローカルユニット（RJ-45 × 2 ポート P1・P2、1000BASE-T）。マスタ局にすると、リモート I/O（NZ2GF 形など）・サーボアンプ・インバーターなどの CC-Link IE フィールド対応機器を、カテゴリ 5e 以上のシールド付き LAN ケーブル（スイッチングハブは CC-Link IE フィールド対応品）でライン・スター・リング形につなぐ。ユニットのパラメータでマスタ局・ローカル局を選ぶ。ベースユニットの入出力スロットに装着し、入出力番号を 32 点占有する。内部消費電流 DC5V 0.82A。',
});

export default def;
