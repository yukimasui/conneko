import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { sensorCable } from '../keyence/sensor-parts';
import { text } from '../generic/parts';

/**
 * オムロン フォトマイクロセンサ EE-SX67（溝形、コネクタ形、NPN 出力）にコネクタ付きコード EE-1006（2m）を差した状態。
 * 形状は params の model（EE-SX670 / EE-SX671 / EE-SX672）で選ぶ（電気的な仕様は同じ）。
 * 図は溝（スリット幅 5mm）を上に向けた側面（1mm ≒ 2.4px）。本体の下のコネクタから EE-1006 のコードが出て、先端の 4 本の芯線を端子にする。
 *
 * 出典: オムロン EE-SX47/67 データシート（CSM_EE-SX47_67_DS_E、CSM483）
 *   電源電圧 DC5〜24V ±10%、制御出力 NPN オープンコレクタ（負荷電源電圧 DC5〜24V、負荷電流 100mA 以下、残留電圧 0.8V 以下（100mA 時））、
 *   応答周波数 1kHz、表示灯 赤（入光時点灯）
 *   端子配列（EE-1006 の線色。IEC の色、カッコ内は旧色）: (1) 茶 +、(2) 桃 L、(3) 黒 OUT、(4) 青 −
 *   入光時 ON / 遮光時 ON: L と + を短絡すると入光時 ON、L を開放すると遮光時 ON。L を使わないときは芯線を切って絶縁する
 */

const W = 80;
const H = 196;

const CX = 40;

const cable = sensorCable({
  cx: CX,
  y0: 98,
  yFan: 156,
  yEnd: H - 4,
  pitch: 12,
  vmin: 4.5,
  vmax: 26.4,
  leads: [
    { color: 'BN', label: '+（DC5〜24V）', role: 'plus' },
    { color: 'PK', label: 'L（+ に短絡で入光時 ON）', role: 'nc' },
    { color: 'BK', label: 'OUT（NPN）', role: 'out', signal: { dir: 'out', kind: 'npn' } },
    { color: 'BU', label: '−（0V）', role: 'minus' },
  ],
});

const SHAPES: Record<string, string> = {
  '670': 'EE-SX670',
  '671': 'EE-SX671',
  '672': 'EE-SX672',
};

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="sxbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121314"/>
      <stop offset="0.3" stop-color="#3a3d41"/>
      <stop offset="1" stop-color="#141516"/>
    </linearGradient>
  </defs>
  ${cable.svg}
  <!-- 溝形の本体（2 本の腕の間がスリット 5mm） -->
  <path d="M${CX - 22} 20 H${CX - 6} V48 H${CX + 6} V20 H${CX + 22} V74 H${CX - 22} Z" fill="url(#sxbody-{{uid}})" stroke="#000" stroke-width="0.9"/>
  <!-- 投光・受光の窓（スリットの内側） -->
  <rect x="${CX - 7.5}" y="26" width="1.6" height="8" fill="#5b1212"/>
  <rect x="${CX + 5.9}" y="26" width="1.6" height="8" fill="#2a0e0e"/>
  <!-- 表示灯（赤、入光時点灯） -->
  <rect x="${CX + 12}" y="22" width="5" height="3" rx="0.8" fill="#ff3b30"/>
  <!-- 取付穴 -->
  <circle cx="${CX - 14}" cy="60" r="2.6" fill="#0b0b0c" stroke="#56595e" stroke-width="0.6"/>
  <circle cx="${CX + 14}" cy="60" r="2.6" fill="#0b0b0c" stroke="#56595e" stroke-width="0.6"/>
  ${text(CX, 58, 'OMRON', 3.2, '#d9dcdf')}
  ${text(CX, 69, SHAPES[String(p.model)] ?? 'EE-SX670', 3.4, '#d9dcdf')}
  <!-- コネクタ（本体の下）と EE-1006 のハウジング -->
  <rect x="${CX - 9}" y="74" width="18" height="8" rx="1" fill="#2a2c2f" stroke="#000" stroke-width="0.6"/>
  <rect x="${CX - 10}" y="82" width="20" height="14" rx="1.5" fill="#f1eee4" stroke="#8a857a" stroke-width="0.6"/>
  ${text(CX, 91, 'EE-1006', 3.2, '#333', 'normal')}
  ${text(CX + 18, 128, '2m', 3.4, '#555', 'normal')}
  ${text(W / 2, 7, `${SHAPES[String(p.model)] ?? 'EE-SX670'} + EE-1006・NPN`, 4.2, '#333', 'normal')}`;

const terminals = (p: ParamValues): TerminalDef[] =>
  cable.terminals(p).map((t) =>
    // L（桃）は + に短絡するときだけ配線する（開放で遮光時 ON）。0V にはつながない
    t.id === 'PK'
      ? {
          ...t,
          role: 'input' as const,
          accepts: { system: 'DC' as const, minVoltage: 4.5, maxVoltage: 26.4, conductors: ['+' as const] },
          optional: true,
          note: '動作モードの切換え。+（茶）に短絡すると入光時 ON、開放（芯線を切って絶縁）で遮光時 ON',
          hint: 'L 切換',
        }
      : t,
  );

const def: DeviceDefinition = {
  type: 'omron.ee-sx67',
  name: '光電センサ（フォトマイクロセンサ 溝形）',
  model: 'EE-SX670 / 671 / 672 + EE-1006（コネクタ付きコード 2m）',
  modelOf: (p) => `${SHAPES[String(p.model)] ?? 'EE-SX670'} + EE-1006 2M`,
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンのフォトマイクロセンサ EE-SX67（溝形・スリット幅 5mm、コネクタ形、NPN オープンコレクタ出力）に、コネクタ付きコード EE-1006（2m）を差した状態。' +
    '形状（取付けの向き）は params の model（EE-SX670 / EE-SX671 / EE-SX672）で選ぶ。溝の中を遮光板（ドグ）が通ると出力が切り換わる（原点・位置検出によく使う）。' +
    'EE-1006 の芯線は 茶 = +（DC5〜24V）、桃 = L（動作モード）、黒 = OUT（NPN）、青 = −（0V）。L を + に短絡すると入光時 ON、開放すると遮光時 ON（使わないときは芯線を切って絶縁する）。' +
    '出力は負荷電流 100mA 以下・残留電圧 0.8V 以下（100mA 時）で、PLC の入力はプラスコモン（COM を +24V）にする。消費電流 30mA 以下（推定）。表示灯（赤）は入光時に点灯。',
  labelPrefix: 'PH',
  width: W,
  height: H,
  svg,
  terminals,
  links: [{ from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.1 }],
  params: [
    {
      key: 'model',
      label: '形状（型式）',
      options: Object.entries(SHAPES).map(([value, label]) => ({ value, label })),
      default: '670',
    },
  ],
  loadCurrent: 0.03,
  estimated: '消費電流（30mA 以下とした。データシートの値を確かめられなかった）',
};

export default def;
