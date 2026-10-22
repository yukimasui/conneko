import type { DeviceDefinition } from '../types';
import { SCREW_GRADIENT, ncSymbol, noSymbol, screw, text } from '../generic/parts';

/**
 * オムロン 2 回路リミットスイッチ WLCA2-2（WL シリーズ、オーバトラベル形ローラ・レバー R38、1b1a のダブルブレーク）。
 * 上にローラ・レバーの付いたヘッド、下にアルミダイカストのスイッチボックスを描き、ボックスのカバーを外した状態で
 * 中の端子 1・2（b 接点）、3・4（a 接点）が見える概念図。縮尺は 1mm ≒ 1.6px（レバーは短めに描く）。
 *
 * 出典: オムロン WL データシート（CSM_WL_DS_E_19_8、files.omron.eu の wl_two-circuit_limit_switch_datasheet_en.pdf）
 *   接点形式 Za（ダブルブレーク 1NC + 1NO、2 回路は電気的に別）: NC = 1-2、NO = 3-4
 *   定格（標準負荷）: AC125/250V 10A（抵抗・誘導）、DC30V 6A（抵抗）、DC125V 0.8A
 *   WLCA2-2: オーバトラベル形（応動角 25°±5°、OT 60° 以上）
 * 新しい WL-N シリーズ（WLCA2-2-N）は端子番号が NC 11-12・NO 13-14 になるので別の機器になる。
 */

const W = 110;
const H = 190;

/** スイッチボックス */
const BX = 20;
const BY = 72;
const BW = 70;
const BH = 108;
/** 端子（左の列が b 接点、右の列が a 接点） */
const LX = 40;
const RX = 70;
const T1Y = 98;
const T2Y = 156;

const svg = `
  <defs>
    <linearGradient id="alu-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7f858b"/>
      <stop offset="0.25" stop-color="#c9cdd1"/>
      <stop offset="0.7" stop-color="#aab0b5"/>
      <stop offset="1" stop-color="#6c7277"/>
    </linearGradient>
    <linearGradient id="head-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6f757b"/>
      <stop offset="0.3" stop-color="#bfc4c8"/>
      <stop offset="1" stop-color="#666c72"/>
    </linearGradient>
    <radialGradient id="roller-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#f4f4f4"/>
      <stop offset="0.6" stop-color="#9aa0a6"/>
      <stop offset="1" stop-color="#4f555b"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>

  <!-- ローラ・レバー（ヘッドの軸から左上へ） -->
  <path d="M55 46 L22 16" stroke="#3a3d40" stroke-width="7" stroke-linecap="round"/>
  <path d="M55 46 L22 16" stroke="#9aa0a6" stroke-width="4.4" stroke-linecap="round"/>
  <circle cx="22" cy="16" r="11" fill="url(#roller-{{uid}})" stroke="#3a3d40" stroke-width="0.8"/>
  <circle cx="22" cy="16" r="3" fill="#5f656b" stroke="#2c2f32" stroke-width="0.5"/>

  <!-- ヘッド（回転軸） -->
  <rect x="32" y="34" width="46" height="40" rx="4" fill="url(#head-{{uid}})" stroke="#40454a" stroke-width="0.8"/>
  <circle cx="55" cy="46" r="8" fill="#5a6066" stroke="#2c2f32" stroke-width="0.8"/>
  <circle cx="55" cy="46" r="3.4" fill="#c9cdd1" stroke="#40454a" stroke-width="0.6"/>
  <circle cx="38" cy="68" r="2" fill="#8d9297" stroke="#40454a" stroke-width="0.4"/>
  <circle cx="72" cy="68" r="2" fill="#8d9297" stroke="#40454a" stroke-width="0.4"/>

  <!-- スイッチボックス（アルミダイカスト、カバーを外した状態） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4" fill="url(#alu-{{uid}})" stroke="#4a4f54" stroke-width="0.9"/>
  <rect x="${BX + 6}" y="${BY + 8}" width="${BW - 12}" height="${BH - 24}" rx="2" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.6"/>
  <!-- 内部のスイッチ（黒い樹脂のケースと端子） -->
  <rect x="${BX + 10}" y="${BY + 13}" width="${BW - 20}" height="${BH - 34}" rx="1.5" fill="#2e3033"/>
  ${screw(LX, T1Y, 5, '#b9b4a4')}
  ${screw(LX, T2Y, 5, '#b9b4a4')}
  ${screw(RX, T1Y, 5, '#b9b4a4')}
  ${screw(RX, T2Y, 5, '#b9b4a4')}
  ${text(LX - 10.5, T1Y + 2, '1', 6, '#f2f2f2')}
  ${text(LX - 10.5, T2Y + 2, '2', 6, '#f2f2f2')}
  ${text(RX + 10.5, T1Y + 2, '3', 6, '#f2f2f2')}
  ${text(RX + 10.5, T2Y + 2, '4', 6, '#f2f2f2')}
  ${text(LX, T1Y + 14, 'NC', 4.6, '#ff8a80')}
  ${ncSymbol(LX, T1Y + 16, '#e8e8e8')}
  ${text(RX, T1Y + 14, 'NO', 4.6, '#9be7a6')}
  ${noSymbol(RX, T1Y + 16, '#e8e8e8')}
  <!-- 電線管の口（G1/2） -->
  <rect x="45" y="${BY + BH - 2}" width="20" height="8" rx="1" fill="#8d9297" stroke="#4a4f54" stroke-width="0.6"/>
  ${text(55, BY + BH - 6, 'OMRON WLCA2-2', 4.2, '#2a2c2f')}
`;

const RATING = 'AC250V 10A / DC30V 6A（抵抗負荷）';

const def: DeviceDefinition = {
  type: 'omron.wlca2-2',
  name: 'リミットスイッチ',
  model: 'WLCA2-2',
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの 2 回路リミットスイッチ WL シリーズ WLCA2-2（オーバトラベル形ローラ・レバー R38、IP67、電線管口 G1/2）。' +
    '接点はダブルブレークの 1b1a（b 接点 1-2・a 接点 3-4。2 回路は電気的に分かれているので別の電圧の回路にも使える）。' +
    `定格 ${RATING}、AC125V 10A、DC125V 0.8A。ドグでレバーが押されると 1-2 が開き 3-4 が閉じる。` +
    'WL-N シリーズ（WLCA2-2-N）は端子番号が 11-12・13-14 なので別の機器。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1', label: '1', note: `b 接点 1-2。${RATING}`, x: LX, y: T1Y, side: 'left', role: 'signal', optional: true },
    { id: '2', label: '2', note: `b 接点 1-2。${RATING}`, x: LX, y: T2Y, side: 'left', role: 'signal', optional: true },
    { id: '3', label: '3', note: `a 接点 3-4。${RATING}`, x: RX, y: T1Y, side: 'right', role: 'signal', optional: true },
    { id: '4', label: '4', note: `a 接点 3-4。${RATING}`, x: RX, y: T2Y, side: 'right', role: 'signal', optional: true },
  ],
  links: [
    { from: '1', to: '2', switch: 'NC' },
    { from: '3', to: '4', switch: 'NO' },
  ],
  schematic: { actuator: 'limit' },
  estimated: 'スイッチボックスの中の端子 1〜4 の位置（左の列に 1・2、右の列に 3・4）は推定（データシートは端子番号と接点形式のみ）',
};

export default def;
