/**
 * 富士電機 標準形サーマルリレー TR シリーズ（新SC・NEO SC 用。TR-0N/3・TR-5-1N/3 など、3 素子）の機器定義を作る。
 *
 * 電磁接触器 SC の二次側に直結する（上部の接続ピン 1/L1・3/L2・5/L3 を SC の 2/T1・4/T2・6/T3 に差し込む）。
 * 下段の 2/T1・4/T2・6/T3 からモーターへ配線する。補助接点は 1a1b（95-96 が b 接点、97-98 が a 接点）。
 * 端子 ID は三菱電機 TH-T18 / TH-T25・富士電機 TK-E2 とそろえ、「サーマルリレー」のファミリーで機種を変えても電線はつながったまま。
 *
 * 電気的な表現は TK-E2 と同じ: 主回路は 1/L1 → 2/T1 などの保護の経路（protects）で、保護電流は整定範囲の上限（ヒーター呼び）。
 * 補助接点 95-96 は b 接点、97-98 は a 接点（トリップで切り換わる）。
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { FUJI_DEFS, fMark, fScrew, fText, fujiName } from './parts';

export interface FujiTrSpec {
  type: string;
  /** 銘板の型式（例: 'TR-0N/3'） */
  modelName: string;
  widthMm: number;
  heightMm: number;
  /** 整定電流の範囲 [最小, 最大][A] */
  ranges: [number, number][];
  /** 既定の整定範囲の上限[A] */
  defaultMax: number;
  /** 組み合わせる電磁接触器（説明文用） */
  contactors: string;
  description: string;
  estimated: string;
}

const fmt = (v: number) => String(v);

export function buildFujiTr(spec: FujiTrSpec): DeviceDefinition {
  const W = spec.widthMm * 2;
  const H = spec.heightMm * 2;
  const PIN_Y = 5;
  const BOT_Y = H - 16;
  // 主回路 3 極は左寄せ、補助接点 2 組は右側
  const mainPitch = (W - 34) / 3.2;
  const MAIN_X = [0, 1, 2].map((i) => +(12 + mainPitch * i).toFixed(1));
  const AUX_X = [+(W - 23).toFixed(1), +(W - 9).toFixed(1)];
  const AUX_TOP_Y = 34;
  const rangeOf = (max: number) => spec.ranges.find((r) => r[1] === max) ?? spec.ranges[spec.ranges.length - 1];
  const dialX = 22;
  const dialY = H / 2 - 2;

  const svg = (p: ParamValues) => {
    const [min, max] = rangeOf(Number(p.heater));
    const rangeText = `${fmt(min)}-${fmt(max)}A`;
    return `
  <defs>${FUJI_DEFS}
    <linearGradient id="pin-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9a5a2c"/>
      <stop offset="0.45" stop-color="#f0b080"/>
      <stop offset="1" stop-color="#8a4c22"/>
    </linearGradient>
    <radialGradient id="dial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c4c8cc"/>
    </radialGradient>
  </defs>
  <!-- 上部の接続ピン（電磁接触器の二次側の端子へ差し込む） -->
  ${MAIN_X.map(
    (x) => `
  <rect x="${x - 1.6}" y="${PIN_Y - 3}" width="3.2" height="${26 - PIN_Y}" rx="1" fill="url(#pin-{{uid}})" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${x - 4.5}" y="18" width="9" height="8" rx="1.2" fill="#2a2c2f"/>`,
  ).join('')}
  <!-- 本体 -->
  <rect x="1" y="24" width="${W - 2}" height="${H - 25}" rx="3" fill="url(#fbody-{{uid}})" stroke="#8d9196" stroke-width="0.9"/>
  <!-- 補助接点 97・95（上側） -->
  <rect x="${AUX_X[0] - 10}" y="25" width="${W - AUX_X[0] + 9}" height="19" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${fScrew(AUX_X[0], AUX_TOP_Y, 4.6)}
  ${fScrew(AUX_X[1], AUX_TOP_Y, 4.6)}
  ${fMark(AUX_X[0], 50, '97', 11)}
  ${fMark(AUX_X[1], 50, '95', 11)}
  ${fujiName(5, 32, 3.8)}
  ${fText(5, 41, spec.modelName, Math.min(6, (AUX_X[0] - 16) / (spec.modelName.length * 0.62)), '#1b1d20', 'bold', 'start')}
  <!-- 電流整定ダイヤル（RC）・リセットボタン・トリップ表示 -->
  <circle cx="${dialX}" cy="${dialY}" r="11.5" fill="#3a3d41"/>
  <circle cx="${dialX}" cy="${dialY}" r="10" fill="url(#dial-{{uid}})" stroke="#6c7076" stroke-width="0.6"/>
  <path d="M${dialX} ${dialY - 8} V${dialY - 2}" stroke="#c22" stroke-width="1.6" stroke-linecap="round"/>
  ${fText(dialX, dialY + 5, 'RC', 3.4, '#444')}
  ${fText(dialX, dialY + 16, rangeText, Math.min(3.8, 30 / (rangeText.length * 0.6)), '#222')}
  <rect x="${dialX + 15}" y="${dialY - 8}" width="16" height="14" rx="2" fill="#2f5fb3" stroke="#183a75" stroke-width="0.7"/>
  ${fText(dialX + 23, dialY + 1, 'RESET', 3, '#fff')}
  <rect x="${W - 22}" y="${dialY}" width="10" height="9" rx="1" fill="#16181a" stroke="#555" stroke-width="0.5"/>
  <rect x="${W - 20.2}" y="${dialY + 1.8}" width="6.4" height="5.4" rx="0.6" fill="#f2c200"/>
  ${fText(W - 17, dialY + 15, 'TRIP', 3.2, '#333')}
  <!-- 下段 端子 -->
  ${MAIN_X.map((x, i) => fMark(x, BOT_Y - 20, ['2/T1', '4/T2', '6/T3'][i], Math.min(16, mainPitch - 1.5))).join('')}
  ${fMark(AUX_X[0], BOT_Y - 20, '98', 11)}
  ${fMark(AUX_X[1], BOT_Y - 20, '96', 11)}
  <rect x="3" y="${BOT_Y - 13}" width="${W - 6}" height="27" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${MAIN_X.map((x) => fScrew(x, BOT_Y, Math.min(5.6, mainPitch / 2 - 2.4))).join('')}
  ${AUX_X.map((x) => fScrew(x, BOT_Y, 4.6)).join('')}
`;
  };

  const top = spec.ranges[spec.ranges.length - 1][1];
  return {
    type: spec.type,
    name: 'サーマルリレー',
    model: spec.modelName,
    modelOf: (p) => {
      const [min, max] = rangeOf(Number(p.heater));
      return `${spec.modelName} ${fmt(min)}-${fmt(max)}A`;
    },
    maker: '富士電機',
    category: 'contactor',
    description: spec.description,
    estimated: spec.estimated,
    labelPrefix: 'THR',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: '1/L1', hint: '一次側', note: `接続ピン（${spec.contactors} の 2/T1 へ差し込む）`, x: MAIN_X[0], y: PIN_Y, side: 'top', role: 'line' },
      { id: '3/L2', hint: '一次側', note: `接続ピン（${spec.contactors} の 4/T2 へ差し込む）`, x: MAIN_X[1], y: PIN_Y, side: 'top', role: 'line' },
      { id: '5/L3', hint: '一次側', note: `接続ピン（${spec.contactors} の 6/T3 へ差し込む）`, x: MAIN_X[2], y: PIN_Y, side: 'top', role: 'line' },
      { id: '2/T1', hint: '二次 U', note: '二次側（モーターの U へ）', x: MAIN_X[0], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '4/T2', hint: '二次 V', note: '二次側（モーターの V へ）', x: MAIN_X[1], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '6/T3', hint: '二次 W', note: '二次側（モーターの W へ）', x: MAIN_X[2], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '97', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
      { id: '95', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
      { id: '98', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
      { id: '96', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    ],
    links: [
      { from: '1/L1', to: '2/T1', directed: true, protects: true },
      { from: '3/L2', to: '4/T2', directed: true, protects: true },
      { from: '5/L3', to: '6/T3', directed: true, protects: true },
      { from: '95', to: '96', switch: 'NC' },
      { from: '97', to: '98', switch: 'NO' },
    ],
    params: [
      {
        // 保護電流には整定範囲の上限を使う（整定はモーターの定格電流に合わせる）
        key: 'heater',
        label: '整定電流の範囲',
        unit: 'A',
        options: spec.ranges.map(([min, max]) => ({ value: max, label: `${fmt(min)}〜${fmt(max)}A` })),
        default: spec.ranges.some((r) => r[1] === spec.defaultMax) ? spec.defaultMax : top,
      },
    ],
    protectionCurrent: { param: 'heater' },
  };
}

/** 富士電機の標準形サーマルリレーの整定電流の範囲（ヒーター呼び。0.1〜13A は TR-0N/3 と TR-5-1N/3 で共通） */
export const FUJI_TR_RANGES_13: [number, number][] = [
  [0.1, 0.15],
  [0.13, 0.2],
  [0.15, 0.24],
  [0.2, 0.3],
  [0.24, 0.36],
  [0.3, 0.45],
  [0.36, 0.54],
  [0.48, 0.72],
  [0.64, 0.96],
  [0.8, 1.2],
  [0.95, 1.45],
  [1.4, 2.2],
  [1.7, 2.6],
  [2.2, 3.4],
  [2.8, 4.2],
  [4, 6],
  [5, 8],
  [6, 9],
  [7, 11],
  [9, 13],
];
