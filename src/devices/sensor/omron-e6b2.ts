/**
 * オムロン ロータリエンコーダ E6B2-C（インクリメンタル形、外径 φ40、軸 φ6、A・B・Z 相、コード引出し 2m）の機器定義を組み立てる。
 * 出力の種類で型式と芯線の数が変わるので、出力ごとに別の機器にし、分解能は params で選ぶ。
 *
 * 出典: オムロン E6B2-C 定格/性能 https://www.fa.omron.co.jp/products/family/487/specification/
 *       E6B2-C データシート（英文 CSM491、https://www.ia.omron.com/data_pdf/cat/e6b2-c_ds_e_6_3_csm491.pdf）の出力段回路・線色
 *   E6B2-CWZ6C（NPN オープンコレクタ出力）: 電源 DC5V −5%〜24V +15%（リップル P-P 5% 以下）、消費電流 80mA 以下、
 *     出力 印加電圧 DC30V 以下・シンク電流 35mA 以下・残留電圧 0.4V 以下（35mA 時）、最高応答周波数 100kHz、逆接・負荷短絡保護付
 *   E6B2-CWZ1X（ラインドライバ出力）: 電源 DC5V ±5%、消費電流 160mA 以下、出力 RS-422A 準拠のラインドライバ（AM26LS31 相当。受信側は AM26LS32 相当）
 *   線色: 茶 = 電源（+Vcc）、黒 = A 相、白 = B 相、橙 = Z 相、青 = 0V（COMMON）。ラインドライバの反転出力は 黒/赤 = /A、白/赤 = /B、橙/赤 = /Z
 *   電源投入時に約 9A の突入電流（約 0.3ms）が流れる
 * 外形は正面（軸側）から見た姿を 1mm ≒ 1.6px で描き、ケーブルは本体の側面（図の下）から出る。
 */
import type { DeviceDefinition, InternalLink, ParamValues } from '../types';
import type { Lead } from '../keyence/sensor-parts';
import { colorCable, striped, type ColorLead } from './parts';
import { WIRE_HEX } from '../keyence/sensor-parts';

export type E6b2Output = 'open-collector' | 'line-driver';

const W = 110;
const H = 178;
const CX = 55;
const CY = 52;

const RESOLUTIONS = [100, 200, 300, 360, 500, 600, 1000, 1800, 2000];

const look = (c: keyof typeof WIRE_HEX) => WIRE_HEX[c];

function body(model: string, res: number | string) {
  const holes = [0, 120, 240]
    .map((a) => {
      const r = (a - 90) * (Math.PI / 180);
      return `<circle cx="${+(CX + 24 * Math.cos(r)).toFixed(2)}" cy="${+(CY + 24 * Math.sin(r)).toFixed(2)}" r="2.2" fill="#1a1b1d" stroke="#6d7277" stroke-width="0.5"/>`;
    })
    .join('');
  return `
  <defs>
    <radialGradient id="e6body-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#4b4e53"/>
      <stop offset="1" stop-color="#151618"/>
    </radialGradient>
    <radialGradient id="e6flange-{{uid}}" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#f1f3f5"/>
      <stop offset="0.6" stop-color="#b9bec4"/>
      <stop offset="1" stop-color="#7d838a"/>
    </radialGradient>
  </defs>
  <!-- ケーブルの出口（側面のブッシュ） -->
  <rect x="${CX - 6}" y="${CY + 28}" width="12" height="14" rx="2" fill="#1d1e20" stroke="#0b0b0c" stroke-width="0.5"/>
  <!-- 本体（φ40） -->
  <circle cx="${CX}" cy="${CY}" r="32" fill="url(#e6body-{{uid}})" stroke="#050505" stroke-width="0.9"/>
  <!-- 取付面（フランジ）と取付ねじ穴 -->
  <circle cx="${CX}" cy="${CY}" r="28" fill="url(#e6flange-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  ${holes}
  <circle cx="${CX}" cy="${CY}" r="14" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.6"/>
  <circle cx="${CX}" cy="${CY}" r="10" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  <!-- 軸（φ6、Dカット） -->
  <path d="M${CX - 4.8} ${CY - 1.6} A4.8 4.8 0 1 1 ${CX + 4.8} ${CY - 1.6} Z" fill="#e9ecef" stroke="#55595e" stroke-width="0.5" transform="rotate(180 ${CX} ${CY})"/>
  <circle cx="${CX}" cy="${CY}" r="4.8" fill="none" stroke="#55595e" stroke-width="0.5"/>
  <text x="${CX}" y="${CY - 17}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#1b3f8f">OMRON</text>
  <text x="${CX}" y="${CY + 19}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#222">${model}</text>
  <text x="${CX}" y="${CY + 23.5}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#333">${res}P/R</text>`;
}

/** E6B2-C の機器定義（output: NPN オープンコレクタの E6B2-CWZ6C / ラインドライバの E6B2-CWZ1X） */
export function buildE6b2(output: E6b2Output): DeviceDefinition {
  const ld = output === 'line-driver';
  const series = ld ? 'E6B2-CWZ1X' : 'E6B2-CWZ6C';
  const vmin = 4.75;
  const vmax = ld ? 5.25 : 27.6;
  const phase = (ph: 'A' | 'B' | 'Z', inv = false): Pick<Lead, 'label' | 'role' | 'signal' | 'note'> => ({
    label: `${inv ? '/' : ''}${ph} 相${inv ? '（反転）' : ''}`,
    role: 'out',
    signal: { dir: 'out', kind: ld ? 'line-driver' : 'npn' },
    note: ld
      ? `${inv ? '/' : ''}${ph} 相 出力（ラインドライバ。${ph} と /${ph} を 1 組のツイストペアで受信側へ）`
      : `${ph} 相 出力（NPN オープンコレクタ、シンク 35mA 以下）`,
  });
  const leads: ColorLead[] = [
    { id: 'BN', look: look('BN'), label: `+V（DC${ld ? '5V' : '5〜24V'}）`, role: 'plus' },
    { id: 'BK', look: look('BK'), ...phase('A') },
    ...(ld ? [{ id: 'BKRD', look: striped('BK'), ...phase('A', true) }] : []),
    { id: 'WH', look: look('WH'), ...phase('B') },
    ...(ld ? [{ id: 'WHRD', look: striped('WH'), ...phase('B', true) }] : []),
    { id: 'OG', look: look('OG'), ...phase('Z') },
    ...(ld ? [{ id: 'OGRD', look: striped('OG'), ...phase('Z', true) }] : []),
    { id: 'BU', look: look('BU'), label: '0V（COMMON）', role: 'minus' },
    { id: 'SH', look: look('SH'), label: 'シールド', role: 'shield', note: 'ケーブルのシールド（処理は取扱説明書の指示に従う。推定）' },
  ];
  const cable = colorCable({ cx: CX, y0: CY + 42, yFan: 132, yEnd: H - 4, pitch: ld ? 10.5 : 12, leads, vmin, vmax });
  // オープンコレクタの出力は ON で 0V（青）と導通する
  const links: InternalLink[] = ld ? [] : ['BK', 'WH', 'OG'].map((o) => ({ from: o, to: 'BU', switch: 'output', ratedCurrent: 0.035 }));
  const res = (p: ParamValues) => Number(p.resolution);

  return {
    type: ld ? 'omron.e6b2-cwz1x' : 'omron.e6b2-cwz6c',
    name: 'ロータリエンコーダ（インクリメンタル）',
    model: `${series}（${ld ? 'ラインドライバ出力' : 'NPN オープンコレクタ出力'}）`,
    modelOf: (p) => `${series} ${res(p)}P/R 2M`,
    maker: 'オムロン',
    category: 'sensor',
    description:
      `オムロンのロータリエンコーダ ${series}（インクリメンタル形、外径 φ40・軸 φ6、A・B・Z 相、${ld ? 'ラインドライバ出力（RS-422A 準拠）' : 'NPN オープンコレクタ出力'}、コード引出し 2m）。` +
      '軸の回転を A 相・B 相（90° ずれたパルス）と 1 回転 1 パルスの Z 相（原点）で出す。分解能は params の resolution（P/R = 1 回転のパルス数）で選ぶ。' +
      (ld
        ? '電源 DC5V ±5%（茶 +5V・青 0V。24V をつながない）、消費電流 160mA 以下。黒 A・黒/赤 /A、白 B・白/赤 /B、橙 Z・橙/赤 /Z を、ラインドライバ入力の高速カウンタ（KV-SH04PL など）へ組ごとにツイストペアでつなぐ（受信側は AM26LS32 相当）。'
        : '電源 DC5〜24V（茶 +・青 0V）、消費電流 80mA 以下。黒 A 相・白 B 相・橙 Z 相は NPN オープンコレクタ（印加電圧 DC30V 以下、シンク 35mA 以下、残留電圧 0.4V 以下）で、PLC の高速カウンタ入力（プラスコモン）につなぐ。') +
      '最高応答周波数 100kHz。電源投入時に約 9A の突入電流（約 0.3ms）が流れるので、電源の容量に注意する。' +
      'PNP オープンコレクタ出力（E6B2-CWZ5B）・電圧出力（E6B2-CWZ3E）もあるが、ここでは定義していない。',
    labelPrefix: 'PG',
    width: W,
    height: H,
    svg: (p) => `${cable.svg}${body(series, p.resolution)}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">${series} ${p.resolution}P/R・${ld ? 'ラインドライバ' : 'NPN OC'}</text>`,
    terminals: cable.terminals,
    links,
    params: [{ key: 'resolution', label: '分解能（P/R）', options: RESOLUTIONS.map((r) => ({ value: r, label: `${r}P/R` })), default: ld ? 1000 : 360 }],
    loadCurrent: ld ? 0.16 : 0.08,
    estimated: 'シールドの芯線の扱い（取扱説明書で確認できなかった）',
  };
}
