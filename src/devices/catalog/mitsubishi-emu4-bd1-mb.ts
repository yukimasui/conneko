import type { DeviceDefinition, TerminalDef } from '../types';
import { defs, logo, screw } from '../mitsubishi/ms-t';

/**
 * 三菱電機 エネルギー計測ユニット（簡易計測ユニット）EMU4-BD1-MB（EcoMonitorLight、基本計測タイプ、MODBUS RTU 通信）。
 * 盤の主幹・分岐の電流・電圧・電力・電力量を計測し、前面の液晶に表示して RS-485（MODBUS RTU）で上位へ送る。
 *
 * 端子（取扱説明書の端子の説明）:
 *   電圧入力 P1・P2・P3（110V・220V は直接つなげる。それより高い電圧は VT を通す）、補助電源 MA・MB、
 *   電流入力 1k・1L・3k・3L（専用電流センサ EMU-CT□ の二次出力をつなぐ。5A の CT の二次は EMU-CT5-A を通す）、
 *   RS-485 の 485+・485−・SLD。
 * 相線式は単相 2 線・単相 3 線・三相 3 線（三相 3 線は 1 相目と 3 相目の電流を計る）。
 *
 * 出典: 三菱電機 EMU4-BD1-MB / EMU4-HD1-MB 取扱説明書（詳細編）IB63771（端子の名称・相線式・直接つなげる電圧）。
 * 推定: 外形（同じ取扱説明書の EMU4-HD1-MB の表にある 75 × 90mm とした）、端子の並び、補助電源の消費（HD1 の 10VA とした）。
 */

const W = 150;
const H = 180;
const TOP_Y = 16;
const BOT_Y = H - 16;
const TOP: { id: string; x: number }[] = [
  { id: 'P1', x: 16 },
  { id: 'P2', x: 36 },
  { id: 'P3', x: 56 },
  { id: 'MA', x: 106 },
  { id: 'MB', x: 126 },
];
const BOT: { id: string; label: string; x: number }[] = [
  { id: '1k', label: '1k', x: 14 },
  { id: '1L', label: '1L', x: 33 },
  { id: '3k', label: '3k', x: 52 },
  { id: '3L', label: '3L', x: 71 },
  { id: '485+', label: '485+', x: 98 },
  { id: '485-', label: '485−', x: 117 },
  { id: 'SLD', label: 'SLD', x: 136 },
];

const svg = `
  ${defs}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#body-{{uid}})" stroke="#8d897f" stroke-width="1.2"/>
  <!-- 上段: 電圧入力・補助電源 -->
  <rect x="4" y="4" width="${W - 8}" height="25" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${TOP.map((t) => screw(t.x, TOP_Y, 5)).join('')}
  ${TOP.map((t) => `<text x="${t.x}" y="37" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">${t.id}</text>`).join('')}
  <text x="36" y="44" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">VOLTAGE INPUT</text>
  <text x="116" y="44" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">AUX AC100-240V</text>
  <!-- 前面: 液晶表示とボタン -->
  <rect x="8" y="50" width="${W - 16}" height="${H - 100}" rx="3" fill="#f3f1ec" stroke="#a7a399" stroke-width="0.8"/>
  ${logo(13, 54)}
  <text x="${W - 13}" y="60" text-anchor="end" font-family="sans-serif" font-size="4" font-style="italic" font-weight="bold" fill="#555">EcoMonitorLight</text>
  <rect x="18" y="66" width="${W - 36}" height="34" rx="2" fill="#2b2f2c" stroke="#111" stroke-width="0.8"/>
  <rect x="21" y="69" width="${W - 42}" height="28" rx="1" fill="#b9cbb0"/>
  <text x="${W - 36}" y="90" text-anchor="end" font-family="monospace" font-size="13" font-weight="bold" fill="#1d2a1a">12.34</text>
  <text x="${W - 34}" y="90" font-family="sans-serif" font-size="5" font-weight="bold" fill="#1d2a1a">kW</text>
  <text x="24" y="77" font-family="sans-serif" font-size="4" fill="#1d2a1a">P</text>
  ${[0, 1, 2, 3]
    .map(
      (i) => `<rect x="${24 + i * 27}" y="103" width="20" height="8" rx="2" fill="#4a4d52" stroke="#222" stroke-width="0.5"/>
  <text x="${34 + i * 27}" y="116" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">${['DISPLAY', 'RESET', 'SET', 'ENTER'][i]}</text>`,
    )
    .join('')}
  <text x="13" y="126" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#222">EMU4-BD1-MB</text>
  <!-- 下段: 電流入力・RS-485 -->
  <text x="42" y="${H - 38}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">CURRENT INPUT</text>
  <text x="117" y="${H - 38}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">MODBUS RTU</text>
  ${BOT.map((t) => `<text x="${t.x}" y="${H - 31}" text-anchor="middle" font-family="sans-serif" font-size="${t.label.length > 3 ? 4 : 5}" font-weight="bold" fill="#333">${t.label}</text>`).join('')}
  <rect x="4" y="${H - 29}" width="${W - 8}" height="25" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${BOT.map((t) => screw(t.x, BOT_Y, 4.8)).join('')}
`;

const voltageIn = (id: string, x: number, n: number, optional = false): TerminalDef => ({
  id,
  hint: `電圧 ${n} 相`,
  note: `電圧入力 ${n} 相目（110V・220V は直接、それより高い電圧は VT の二次をつなぐ）${optional ? '。単相 2 線では使わない' : ''}`,
  x,
  y: TOP_Y,
  side: 'top',
  role: 'input',
  accepts: { system: 'AC', minVoltage: 90, maxVoltage: 242 },
  // 電圧入力は計測用（補助電源とは別の回路）。消費はごくわずか
  loadCurrent: 0.002,
  ...(optional ? { optional: true } : {}),
});

const def: DeviceDefinition = {
  type: 'mitsubishi.emu4-bd1-mb',
  name: '電力計測ユニット',
  model: 'EMU4-BD1-MB',
  maker: '三菱電機',
  category: 'control',
  description:
    '三菱電機のエネルギー計測ユニット EMU4-BD1-MB（EcoMonitorLight 基本計測タイプ、MODBUS RTU）。単相 2 線・単相 3 線・三相 3 線の電流・電圧・電力・電力量を計測して前面に表示し、RS-485 で上位へ送る。' +
    '電圧入力 P1・P2・P3 は 110V・220V なら直接、補助電源 MA・MB は AC100〜240V。電流入力 1k・1L・3k・3L には専用電流センサ（EMU-CT50 など。5A の CT の二次は EMU-CT5-A）の二次をつなぐ。',
  estimated: '外形（EMU4-HD1-MB の 75 × 90mm とした）、端子の並び、補助電源の消費（10VA）は推定。',
  labelPrefix: 'EMU',
  width: W,
  height: H,
  svg,
  terminals: [
    voltageIn('P1', TOP[0].x, 1),
    voltageIn('P2', TOP[1].x, 2, true),
    voltageIn('P3', TOP[2].x, 3),
    { id: 'MA', hint: '補助電源', note: '補助電源 AC100〜240V', x: TOP[3].x, y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 85, maxVoltage: 264 } },
    { id: 'MB', hint: '補助電源', note: '補助電源 AC100〜240V', x: TOP[4].x, y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 85, maxVoltage: 264 } },
    { id: '1k', hint: '電流 1 k', note: '電流入力 1 相目の k（専用電流センサの二次）', x: BOT[0].x, y: BOT_Y, side: 'bottom', role: 'signal' },
    { id: '1L', hint: '電流 1 l', note: '電流入力 1 相目の l（専用電流センサの二次）', x: BOT[1].x, y: BOT_Y, side: 'bottom', role: 'signal' },
    { id: '3k', hint: '電流 3 k', note: '電流入力 3 相目の k（専用電流センサの二次。単相 2 線では使わない）', x: BOT[2].x, y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '3L', hint: '電流 3 l', note: '電流入力 3 相目の l（専用電流センサの二次。単相 2 線では使わない）', x: BOT[3].x, y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '485+', label: '485+', hint: 'RS-485 +', note: 'MODBUS RTU の通信線 +', x: BOT[4].x, y: BOT_Y, side: 'bottom', role: 'signal', optional: true, port: 'RS485', protocols: ['modbus-rtu'] },
    { id: '485-', label: '485−', hint: 'RS-485 −', note: 'MODBUS RTU の通信線 −', x: BOT[5].x, y: BOT_Y, side: 'bottom', role: 'signal', optional: true, port: 'RS485', protocols: ['modbus-rtu'] },
    { id: 'SLD', hint: 'シールド', note: '通信線のシールド', x: BOT[6].x, y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ],
  distinctGroups: [['MA', 'MB'], ['P1', 'P2', 'P3']],
  // 補助電源 10VA（AC100V で約 0.1A）
  loadCurrent: 0.1,
};

export default def;
