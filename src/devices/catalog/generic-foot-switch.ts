import type { DeviceDefinition } from '../types';
import { cContact } from '../generic/relay-socket';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * 汎用のフットスイッチ（足踏みスイッチ、1c 接点、モーメンタリ、保護カバーなし）。
 * 横から見た姿で、踏み板（滑り止めの溝）とベース、後ろの端子箱のネジ端子 COM・NC・NO を描く（盤の外の機器なので縮小）。
 *
 * 内部は 1c のマイクロスイッチ（踏むと COM-NO が閉じ、COM-NC が開く）。a 接点として使うなら COM-NO、b 接点なら COM-NC。
 * 接点の定格（AC250V 10A 程度）・端子の印字は汎用品の代表的な値で、特定の製品の資料で確かめたものではない（推定）。
 */

const W = 176;
const H = 92;
const TX = 156;
const YS = { COM: 24, NC: 46, NO: 68 };

const svg = `
  <defs>
    <linearGradient id="pedal-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
    <linearGradient id="base-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8dadc"/>
      <stop offset="1" stop-color="#8d9297"/>
    </linearGradient>
    <linearGradient id="box-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#1d1e20"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- ベース（床に置く金属の台） -->
  <path d="M6 ${H - 10} L12 ${H - 22} H140 V${H - 10} Z" fill="url(#base-{{uid}})" stroke="#5c6166" stroke-width="0.7"/>
  <rect x="6" y="${H - 10}" width="134" height="5" rx="1.5" fill="#2a2c2f"/>
  <!-- 踏み板（かかと側（右）のヒンジで支え、つま先側（左）が上がった斜めの板と滑り止めの溝） -->
  <path d="M10 ${H - 52} L128 ${H - 30} L126 ${H - 22} L12 ${H - 44} Z" fill="url(#pedal-{{uid}})" stroke="#111" stroke-width="0.8"/>
  ${Array.from({ length: 9 }, (_, i) => {
    const x = 20 + i * 11.5;
    const y = H - 48 + ((x - 10) * 22) / 118;
    return `<line x1="${x}" y1="${y - 2.6}" x2="${x - 1.2}" y2="${y + 3.2}" stroke="#808489" stroke-width="1.1"/>`;
  }).join('')}
  <!-- ヒンジとばね（つま先の下） -->
  <circle cx="127" cy="${H - 26}" r="4" fill="#9aa0a6" stroke="#333" stroke-width="0.6"/>
  <path d="M24 ${H - 22} l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5" fill="none" stroke="#666" stroke-width="1"/>
  ${text(64, H - 2, 'FOOT SWITCH', 4.6, '#444', 'normal')}
  <!-- 端子箱（後ろ） -->
  <rect x="${TX - 20}" y="8" width="34" height="${H - 16}" rx="3" fill="url(#box-{{uid}})" stroke="#000" stroke-width="0.7"/>
  ${screw(TX, YS.COM, 4.6, '#0b0b0c')}
  ${screw(TX, YS.NC, 4.6, '#0b0b0c')}
  ${screw(TX, YS.NO, 4.6, '#0b0b0c')}
  ${text(TX - 10, YS.COM + 1.8, 'C', 5, '#f2f2f2', 'bold', 'end')}
  ${text(TX - 10, YS.NC + 1.8, 'NC', 5, '#f2f2f2', 'bold', 'end')}
  ${text(TX - 10, YS.NO + 1.8, 'NO', 5, '#f2f2f2', 'bold', 'end')}
`;

const def: DeviceDefinition = {
  type: 'generic.foot-switch',
  name: 'フットスイッチ',
  model: 'フットスイッチ 1c',
  category: 'control',
  description:
    '汎用のフットスイッチ（足踏みスイッチ、1c 接点、モーメンタリ）。踏むと COM-NO（a 接点）が閉じ、COM-NC（b 接点）が開く。' +
    'プレス・かしめ機などの起動の指令に使う（危険のある機械では両手操作・安全回路と組み合わせる）。接点定格 AC250V 10A は汎用品の代表的な値（推定）。',
  labelPrefix: 'FS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'COM', label: 'C', note: '共通端子（COM-NC が b 接点、COM-NO が a 接点）', hint: 'COM', x: TX, y: YS.COM, side: 'right', role: 'signal', optional: true },
    { id: 'NC', label: 'NC', note: 'b 接点（踏むと開く）', hint: 'b 接点', x: TX, y: YS.NC, side: 'right', role: 'signal', optional: true },
    { id: 'NO', label: 'NO', note: 'a 接点（踏むと閉じる）', hint: 'a 接点', x: TX, y: YS.NO, side: 'right', role: 'signal', optional: true },
  ],
  links: cContact('COM', 'NC', 'NO', 10),
  // 展開図では押しボタンと同じ手動操作の接点として描く（足踏み操作の記号はない）
  schematic: { actuator: 'pushbutton' },
  estimated: '接点定格（AC250V 10A）と端子の印字（C・NC・NO）は汎用品の代表的な値で推定',
};

export default def;
