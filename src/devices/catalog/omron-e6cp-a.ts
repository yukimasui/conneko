import type { DeviceDefinition, InternalLink } from '../types';
import { sensorCable, type Lead, type WireColor } from '../keyence/sensor-parts';

/**
 * オムロン ロータリエンコーダ E6CP-A（アブソリュート形、外径 φ50、分解能 256（8 ビット）、グレイ 2 進、NPN オープンコレクタ、コード 2m）。
 * 型式 E6CP-AG5C 256P/R 2M（電源 DC12〜24V）。
 *
 * 出典: オムロン E6CP-AG5C 256P/R 2M 製品ページ（fa.omron.co.jp）・E6CP-A 定格/性能（ia.omron.com family/494）、
 *       E6CP-A データシート CSM_E6CP-A_DS_E（入出力段回路・線色）、販売店の型式表（モノタロウ・RS）
 * - 電源 DC12V −10%〜24V +15%（10.8〜27.6V）、消費電流 70mA 以下（電源投入時に約 8A・約 0.3ms の突入電流）
 * - 出力 8 ビット（グレイ 2 進、コード No.0〜255）、負論理（H = 0、L = 1）、NPN オープンコレクタ、シンク電流 16mA 以下
 * - 線色: 赤 = +V（DC12〜24V）、黒 = 0V（COMMON）、茶 2⁰、橙 2¹、黄 2²、緑 2³、青 2⁴、紫 2⁵、灰 2⁶、白 2⁷
 *   （一般の DC センサーと違い、青は出力の 1 本で 0V ではない）
 * 端子 ID は芯線の色略号（RD・BK・BN・OG・YE・GN・BU・VT・GY・WH）。
 * 推定: 外形の見た目（出力の印加電圧の上限は資料で確かめられず、書いていない）。
 */

const W = 150;
const H = 196;
const CX = 75;
const CY = 52;

const BITS: [WireColor, number][] = [
  ['BN', 0],
  ['OG', 1],
  ['YE', 2],
  ['GN', 3],
  ['BU', 4],
  ['VT', 5],
  ['GY', 6],
  ['WH', 7],
];
const SUP = '⁰¹²³⁴⁵⁶⁷';

const leads: Lead[] = [
  { color: 'RD', label: '+V（DC12〜24V）', role: 'plus', note: '電源 +（DC12〜24V）。赤（一般の DC センサーの茶ではない）' },
  { color: 'BK', label: '0V', role: 'minus', note: '電源 0V（COMMON）。黒' },
  ...BITS.map(
    ([c, b]): Lead => ({
      color: c,
      label: `2${SUP[b]}`,
      role: 'out',
      signal: { dir: 'out', kind: 'npn' },
      note: `出力 2${SUP[b]}（ビット ${b}。グレイ 2 進・負論理（L = 1）、NPN オープンコレクタ、シンク 16mA 以下）。PLC の入力（プラスコモン）へ${b === 4 ? '。青は 0V ではない' : ''}`,
    }),
  ),
];
const cable = sensorCable({ cx: CX, y0: CY + 40, yFan: 150, yEnd: H - 3, pitch: 13, vmin: 10.8, vmax: 27.6, leads });

const svg = `
  <defs>
    <radialGradient id="e6cp-body-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#5a5e64"/>
      <stop offset="1" stop-color="#1b1c1f"/>
    </radialGradient>
    <radialGradient id="e6cp-face-{{uid}}" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#3e4247"/>
      <stop offset="1" stop-color="#202225"/>
    </radialGradient>
  </defs>
  <!-- ケーブルの出口（側面のブッシュ） -->
  <rect x="${CX - 7}" y="${CY + 34}" width="14" height="14" rx="2" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  ${cable.svg}
  <!-- 本体（φ50、樹脂） -->
  <circle cx="${CX}" cy="${CY}" r="40" fill="url(#e6cp-body-{{uid}})" stroke="#050505" stroke-width="0.9"/>
  <circle cx="${CX}" cy="${CY}" r="34" fill="url(#e6cp-face-{{uid}})" stroke="#55595e" stroke-width="0.6"/>
  <!-- 取付け用のサーボマウント溝・ねじ穴 -->
  ${[45, 165, 285]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(CX + 26 * Math.cos(r)).toFixed(2)}" cy="${(CY + 26 * Math.sin(r)).toFixed(2)}" r="2.4" fill="#0e0f10" stroke="#6d7277" stroke-width="0.5"/>`;
    })
    .join('')}
  <circle cx="${CX}" cy="${CY}" r="13" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.6"/>
  <circle cx="${CX}" cy="${CY}" r="9" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  <!-- 軸（φ6） -->
  <circle cx="${CX}" cy="${CY}" r="4.8" fill="#e9ecef" stroke="#55595e" stroke-width="0.5"/>
  <text x="${CX}" y="${CY - 18}" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#e8ecf5">OMRON</text>
  <text x="${CX}" y="${CY + 21}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f2f2f2">E6CP-AG5C</text>
  <text x="${CX}" y="${CY + 26.5}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#d6d6d6">ABSOLUTE 256P/R</text>
  <text x="${W - 4}" y="${CY + 54}" text-anchor="end" font-family="sans-serif" font-size="3.2" fill="#555">グレイ 2 進 8 ビット・NPN</text>
`;

const links: InternalLink[] = BITS.map(([c]) => ({ from: c, to: 'BK', switch: 'output', ratedCurrent: 0.016 }));

const def: DeviceDefinition = {
  type: 'omron.e6cp-a',
  name: 'ロータリエンコーダ（アブソリュート）',
  model: 'E6CP-AG5C 256P/R 2M',
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンのアブソリュート形ロータリエンコーダ E6CP-A（外径 φ50、軸 φ6、分解能 256・8 ビット、グレイ 2 進、負論理、NPN オープンコレクタ、コード 2m）。電源を切っても軸の位置（0〜255）が分かるので、原点復帰なしで回転テーブル・カムの角度を PLC へ入れられる。' +
    '電源 DC12〜24V（赤 +V・黒 0V。一般の DC センサーの茶・青と違う）、消費電流 70mA 以下。出力は 茶 2⁰・橙 2¹・黄 2²・緑 2³・青 2⁴・紫 2⁵・灰 2⁶・白 2⁷ の 8 本（シンク 16mA 以下）で、PLC の入力 8 点（プラスコモン）へつなぎ、PLC でグレイコードを 2 進に変換する。' +
    '負論理なので、入力が ON（出力トランジスタが ON）のビットが 1。青の芯線は出力（2⁴）で、0V につながない。',
  labelPrefix: 'EN',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  links,
  loadCurrent: 0.07,
  estimated: '外形の見た目（φ50 の樹脂の本体・ケーブルの出口の位置は概略）',
};

export default def;
