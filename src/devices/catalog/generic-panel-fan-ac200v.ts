import type { DeviceDefinition } from '../types';

/**
 * 盤用換気ファン（AC200V 単相、□120mm 角形軸流ファン＋フィンガーガード）。
 * アルミダイカスト枠の四隅に取付穴、中央に羽根とハブ、手前にワイヤー製のフィンガーガード。
 * 電源は枠下部のファストン端子 2 本から取る（実機はリード線引出しのものも多い）。
 * 縮尺は 1mm ≒ 1.25px（□120mm → 150px）。
 */

const W = 150;
const H = 170;
const S = 150;
const C = S / 2;
const TY = 162;
const TERMINALS = [
  { id: 'L1', x: 98 },
  { id: 'L2', x: 120 },
];

/** 羽根 7 枚（ハブから外周へ反った形） */
const blades = (() => {
  let s = '';
  for (let i = 0; i < 7; i++) {
    const a = (i * 360) / 7;
    s += `<path d="M${C} ${C - 20} C${C + 14} ${C - 30} ${C + 22} ${C - 50} ${C + 10} ${C - 62} C${C - 6} ${C - 56} ${C - 14} ${C - 40} ${C - 12} ${C - 20} Z" fill="url(#blade-{{uid}})" stroke="#111" stroke-width="0.6" transform="rotate(${a.toFixed(1)} ${C} ${C})"/>`;
  }
  return s;
})();

/** フィンガーガードの放射状スポーク */
const spokes = (() => {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const a = ((i * 90 + 45) * Math.PI) / 180;
    const x1 = C + Math.cos(a) * 22;
    const y1 = C + Math.sin(a) * 22;
    const x2 = C + Math.cos(a) * 67;
    const y2 = C + Math.sin(a) * 67;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#wire-{{uid}})" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return s;
})();

const hole = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="5" fill="#3a3f44" stroke="#7a8086" stroke-width="0.8"/>`;

const svg = `
  <defs>
    <linearGradient id="frame-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef0f2"/>
      <stop offset="0.5" stop-color="#c4c9ce"/>
      <stop offset="1" stop-color="#9aa1a8"/>
    </linearGradient>
    <radialGradient id="duct-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="#1c1f22"/>
      <stop offset="1" stop-color="#3a3f44"/>
    </radialGradient>
    <linearGradient id="blade-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a5f64"/>
      <stop offset="1" stop-color="#26292c"/>
    </linearGradient>
    <radialGradient id="hub-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#4c5156"/>
      <stop offset="1" stop-color="#1e2124"/>
    </radialGradient>
    <linearGradient id="wire-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="1" stop-color="#9ea4aa"/>
    </linearGradient>
    <linearGradient id="tab-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b8892e"/>
      <stop offset="0.5" stop-color="#f3d27a"/>
      <stop offset="1" stop-color="#b8892e"/>
    </linearGradient>
  </defs>

  <!-- ファストン端子（枠下部から突き出す） -->
  ${TERMINALS.map(
    (t) => `
  <rect x="${t.x - 7}" y="${S - 4}" width="14" height="8" rx="1" fill="#2a2d30"/>
  <rect x="${t.x - 3.5}" y="${S + 3}" width="7" height="${TY - S + 3}" rx="0.8" fill="url(#tab-{{uid}})" stroke="#7a5a18" stroke-width="0.6"/>
  <circle cx="${t.x}" cy="${TY}" r="1.4" fill="#7a5a18"/>`,
  ).join('')}

  <!-- 枠（アルミダイカスト） -->
  <rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="7" fill="url(#frame-{{uid}})" stroke="#6d747b" stroke-width="1.2"/>
  ${hole(10, 10)}${hole(S - 10, 10)}${hole(10, S - 10)}${hole(S - 10, S - 10)}

  <!-- 通風口と羽根 -->
  <circle cx="${C}" cy="${C}" r="70" fill="url(#duct-{{uid}})" stroke="#80878e" stroke-width="1"/>
  ${blades}
  <circle cx="${C}" cy="${C}" r="22" fill="url(#hub-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <!-- ハブの銘板ラベル -->
  <circle cx="${C}" cy="${C}" r="15" fill="#e8e4d8" stroke="#888" stroke-width="0.6"/>
  <text x="${C}" y="${C - 2}" text-anchor="middle" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#222">AC200V</text>
  <text x="${C}" y="${C + 6}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#444">50/60Hz</text>

  <!-- フィンガーガード -->
  <g fill="none" stroke="url(#wire-{{uid}})" stroke-width="2">
    <circle cx="${C}" cy="${C}" r="34"/>
    <circle cx="${C}" cy="${C}" r="48"/>
    <circle cx="${C}" cy="${C}" r="61"/>
  </g>
  <circle cx="${C}" cy="${C}" r="67" fill="none" stroke="url(#wire-{{uid}})" stroke-width="2.6"/>
  <circle cx="${C}" cy="${C}" r="22" fill="none" stroke="url(#wire-{{uid}})" stroke-width="2.4"/>
  ${spokes}

  <!-- 端子名 -->
  ${TERMINALS.map((t, i) => `<text x="${t.x + (i === 0 ? -6 : 6)}" y="${TY + 2}" text-anchor="${i === 0 ? 'end' : 'start'}" font-family="sans-serif" font-size="6" fill="#333">${i + 1}</text>`).join('')}
`;

const def: DeviceDefinition = {
  type: 'generic.panel-fan.ac200v',
  name: '盤用換気ファン',
  model: '□120mm AC200V',
  category: 'load',
  description:
    '制御盤の換気用の角形軸流ファン（□120mm、単相AC200V、フィンガーガード付き）。2本の電源端子に異なる相（R-S など）を接続する。',
  labelPrefix: 'FAN',
  width: W,
  height: H,
  svg,
  terminals: TERMINALS.map((t) => ({
    id: t.id,
    hint: 'AC200V入力',
    x: t.x,
    y: TY,
    side: 'bottom' as const,
    role: 'input' as const,
    accepts: { system: 'AC' as const, minVoltage: 200, maxVoltage: 230 },
  })),
  // □120mm AC200V ファンの代表的な定格電流（50/60Hz で 0.07〜0.1A 程度）
  loadCurrent: 0.1,
  distinctGroups: [['L1', 'L2']],
  schematic: { elements: [{ kind: 'motor', terminals: ['L1', 'L2'] }] },
};

export default def;
