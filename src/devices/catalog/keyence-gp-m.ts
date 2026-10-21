import type { DeviceDefinition, ParamValues } from '../types';
import { sensorCable } from '../keyence/sensor-parts';

/**
 * KEYENCE 高耐久圧力センサ GP-M シリーズ（GP-M001 / M010 / M025 / M100 / M250 / M400）。
 * 外形 ø34.2 × 86.7 mm（G3/4 ネジ込み、KEYENCE 外形寸法図より、1mm ≒ 2px）。上部に傾いた表示部（赤 4 桁 LED と黄色のボタン）、
 * 正面中ほどに M12 4ピンコネクタ、下部に六角とネジ部。
 *
 * 電源・I/O は M12 4ピンコネクタ。M12 接続ケーブル（別売）の標準線色で端子を定義する:
 *   1 茶 = DC10〜30V、2 白 = 出力2（制御出力 / アナログ 4〜20mA 切換）、3 青 = 0V、4 黒 = 出力1（制御出力）
 * ※ピン 1〜4 と機能の対応は M12 センサの標準的な割り当てによる推定（KEYENCE の入出力回路図は Web 非公開）。
 * 出典: https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/
 *       https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/dimensions/
 */

const W = 100;
const H = 236;
const CX = 40;
const TOP = 16;

const RANGES: Record<string, string> = {
  '001': '−100〜+100kPa',
  '010': '−0.1〜+1MPa',
  '025': '−0.1〜+2.5MPa',
  '100': '0〜10MPa',
  '250': '0〜25MPa',
  '400': '0〜40MPa',
};

const cable = sensorCable({
  cx: CX,
  y0: TOP + 92,
  yFan: 200,
  yEnd: 232,
  pitch: 12,
  centerX: 58,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10〜30V、M12 ピン1）', role: 'plus' },
    { color: 'WH', label: '出力2 制御出力 / アナログ 4〜20mA（M12 ピン2）', role: 'out' },
    { color: 'BU', label: '0V（M12 ピン3）', role: 'minus' },
    { color: 'BK', label: '出力1 制御出力（M12 ピン4）', role: 'out' },
  ],
});

const svg = (p: ParamValues) => {
  const m = String(p.model);
  const r = 34.2;
  return `
  <defs>
    <linearGradient id="gpsus-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.35" stop-color="#f2f4f6"/>
      <stop offset="0.7" stop-color="#b8bdc2"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
    <linearGradient id="gphead-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1d20"/>
      <stop offset="0.4" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
  </defs>
  <!-- 表示部（樹脂ヘッド） -->
  <path d="M${CX - r} ${TOP + 18} Q${CX - r} ${TOP} ${CX} ${TOP} Q${CX + r} ${TOP} ${CX + r} ${TOP + 18} V${TOP + 62} H${CX - r} Z" fill="url(#gphead-{{uid}})" stroke="#0a0a0b" stroke-width="0.8"/>
  <rect x="${CX - 12}" y="${TOP - 3}" width="24" height="7" rx="3" fill="#f5c400" stroke="#9a7a00" stroke-width="0.5"/>
  <rect x="${CX - 24}" y="${TOP + 10}" width="48" height="22" rx="3" fill="#0b0b0c" stroke="#55585c" stroke-width="0.6"/>
  <text x="${CX}" y="${TOP + 27}" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="#ff3b30">0.500</text>
  <text x="${CX - 21}" y="${TOP + 9}" font-family="sans-serif" font-size="3" fill="#c9ccd0">OUT1</text>
  <text x="${CX + 21}" y="${TOP + 9}" text-anchor="end" font-family="sans-serif" font-size="3" fill="#c9ccd0">OUT2</text>
  <rect x="${CX - 20}" y="${TOP + 36}" width="9" height="5" rx="1.5" fill="#55585d"/>
  <rect x="${CX - 4.5}" y="${TOP + 36}" width="9" height="5" rx="1.5" fill="#55585d"/>
  <rect x="${CX + 11}" y="${TOP + 36}" width="9" height="5" rx="1.5" fill="#55585d"/>
  <text x="${CX}" y="${TOP + 50}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#e6e7e9" letter-spacing="0.3">KEYENCE</text>
  <rect x="${CX - r}" y="${TOP + 56}" width="${r * 2}" height="3" fill="#c8262a"/>
  <!-- ステンレス胴体 -->
  <rect x="${CX - r}" y="${TOP + 62}" width="${r * 2}" height="58" fill="url(#gpsus-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  <text x="${CX - 30}" y="${TOP + 70}" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#444">GP-M${m}</text>
  <!-- 六角・ネジ部（G3/4） -->
  <path d="M${CX - 30} ${TOP + 120} H${CX + 30} V${TOP + 142} H${CX - 30} Z" fill="url(#gpsus-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  <line x1="${CX - 10}" y1="${TOP + 120}" x2="${CX - 10}" y2="${TOP + 142}" stroke="#7b8187" stroke-width="0.6"/>
  <line x1="${CX + 10}" y1="${TOP + 120}" x2="${CX + 10}" y2="${TOP + 142}" stroke="#7b8187" stroke-width="0.6"/>
  <rect x="${CX - 24}" y="${TOP + 142}" width="48" height="31" fill="url(#gpsus-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  ${Array.from({ length: 12 }, (_, i) => `<line x1="${CX - 24}" y1="${TOP + 145 + i * 2.4}" x2="${CX + 24}" y2="${TOP + 146 + i * 2.4}" stroke="#8d9297" stroke-width="0.5"/>`).join('')}
  <text x="${CX}" y="${TOP + 182}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#555">G3/4・${RANGES[m] ?? ''}</text>
  ${cable.svg}
  <!-- M12 コネクタに差したケーブルのプラグ（正面から見たローレットナット） -->
  <circle cx="${CX}" cy="${TOP + 90}" r="9.5" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.6"/>
  ${Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8; return `<line x1="${+(CX + 7.6 * Math.cos(a)).toFixed(2)}" y1="${+(TOP + 90 + 7.6 * Math.sin(a)).toFixed(2)}" x2="${+(CX + 9.4 * Math.cos(a)).toFixed(2)}" y2="${+(TOP + 90 + 9.4 * Math.sin(a)).toFixed(2)}" stroke="#7a7f84" stroke-width="0.6"/>`; }).join('')}
  <circle cx="${CX}" cy="${TOP + 90}" r="6.4" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.5"/>
  <text x="${CX + 12}" y="${TOP + 86}" font-family="sans-serif" font-size="3" fill="#444">M12</text>`;
};

const def: DeviceDefinition = {
  type: 'keyence.gp-m',
  name: '圧力センサ',
  model: 'GP-M シリーズ',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE の高耐久圧力センサ GP-M シリーズ（ゲージ圧、G3/4 ネジ込み、気体・液体）。型式（定格圧力範囲）は params の model で選ぶ（001: −100〜+100kPa、010: −0.1〜+1MPa、025: −0.1〜+2.5MPa、100: 0〜10MPa、250: 0〜25MPa、400: 0〜40MPa）。電源・I/O は M12 4ピンコネクタで、M12 ケーブル（別売）の茶 = +24V、青 = 0V、黒 = 出力1（NPN/PNP 切換のオープンコレクタ 30V 250mA）、白 = 出力2（制御出力またはアナログ 4〜20mA を切換）。アナログ出力は PLC のアナログ入力ユニット（電流入力）へ。電源 DC10〜30V、消費電流 50mA 以下（出力を除く）。ピンと線色の対応は M12 センサの標準割り当てによる推定。',
  labelPrefix: 'PS',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  params: [
    {
      key: 'model',
      label: '型式（定格圧力範囲）',
      options: Object.entries(RANGES).map(([value, r]) => ({ value, label: `GP-M${value}（${r}）` })),
      default: '010',
    },
  ],
  loadCurrent: 0.05,
};

export default def;
