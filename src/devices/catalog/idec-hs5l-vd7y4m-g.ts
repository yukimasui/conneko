import type { DeviceDefinition, TerminalDef } from '../types';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * IDEC 小形電磁ロック式セーフティインタロックスイッチ HS5L-VD7Y4M-G（ソレノイドロック＝通電で施錠、ソレノイド DC24V、表示灯付き）。
 * 黒い本体の上に金属のヘッド（アクチュエータ挿入口）、本体の中ほどに端子台（カバーを外した状態で描く）。1mm ≒ 1.2px。
 *
 * 接点（取扱説明書の VD 形の接点構成。アクチュエータ挿入・施錠の状態）:
 *   扉監視 11-12・21-22（b 接点 2 回路）、ロック監視 41-42・51-52（b 接点 2 回路）、ソレノイド A1・A2（全形式共通）
 *   安全回路の入力は、扉監視とロック監視を直列にして 2 チャンネルにする（11-12 → 41-42 で CH1、21-22 → 51-52 で CH2）
 * 定格: 接点 AC125V / DC30V 2.5A、施錠保持力 1400N、IP67。
 * 出典: IDEC HS5L 取扱説明書（manualshive の写し、VD 形の接点 11-12・21-22・41-42・51-52 と直列の配線例）、
 *       DigiKey・RS の型式表（DPST-NC × 2、2.5A 125VAC / 30VDC、24VDC、1400N、ソレノイドロック）
 */

const W = 120;
const H = 232;

/** 本体（幅 35mm → 42px） */
const BX = 39;
const BY = 18;
const BW = 42;
const BH = 196;

/** 端子台（2 列 × 5 段。並びは推定） */
const ROWS: [string, string][] = [
  ['A1', 'A2'],
  ['11', '12'],
  ['21', '22'],
  ['41', '42'],
  ['51', '52'],
];
const COL_X = [BX + 11, BX + BW - 11];
const ROW_Y0 = 102;
const ROW_PITCH = 18;

const LABELS: Record<string, string> = {
  A1: 'A1（ソレノイド −、0V）',
  A2: 'A2（ソレノイド +、DC24V。通電で施錠）',
  '11': '11（扉監視 b 接点 1）',
  '12': '12（扉監視 b 接点 1）',
  '21': '21（扉監視 b 接点 2）',
  '22': '22（扉監視 b 接点 2）',
  '41': '41（ロック監視 b 接点 1）',
  '42': '42（ロック監視 b 接点 1）',
  '51': '51（ロック監視 b 接点 2）',
  '52': '52（ロック監視 b 接点 2）',
};
const HINTS: Record<string, string> = {
  A1: 'ソレノイド−',
  A2: 'ソレノイド+',
  '11': '扉監視1',
  '12': '扉監視1',
  '21': '扉監視2',
  '22': '扉監視2',
  '41': 'ロック監視1',
  '42': 'ロック監視1',
  '51': 'ロック監視2',
  '52': 'ロック監視2',
};

const svg = `
  <defs>
    <linearGradient id="hs5lbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16171a"/>
      <stop offset="0.15" stop-color="#2e3135"/>
      <stop offset="0.85" stop-color="#2a2d31"/>
      <stop offset="1" stop-color="#121315"/>
    </linearGradient>
    <linearGradient id="hs5lmetal-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d939a"/>
      <stop offset="0.5" stop-color="#e3e6e9"/>
      <stop offset="1" stop-color="#858b92"/>
    </linearGradient>
    <radialGradient id="hs5lled-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#d9ffd9"/>
      <stop offset="0.5" stop-color="#3ddc5a"/>
      <stop offset="1" stop-color="#16872c"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>

  <!-- 金属ヘッド（上面にアクチュエータ挿入口） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="30" rx="2" fill="url(#hs5lmetal-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <rect x="${BX + 13}" y="${BY - 3}" width="16" height="7" rx="1" fill="#2b2b2b"/>
  <rect x="${BX + 8}" y="${BY + 9}" width="26" height="12" rx="1.5" fill="#1d1e20"/>
  <!-- 本体 -->
  <rect x="${BX}" y="${BY + 30}" width="${BW}" height="${BH - 30}" rx="3" fill="url(#hs5lbody-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <!-- 表示灯（ソレノイドの状態） -->
  <circle cx="${BX + BW / 2}" cy="${BY + 40}" r="4.2" fill="#111" stroke="#555" stroke-width="0.6"/>
  <circle cx="${BX + BW / 2}" cy="${BY + 40}" r="3" fill="url(#hs5lled-{{uid}})"/>
  <rect x="${BX + 5}" y="${BY + 50}" width="${BW - 10}" height="22" rx="1.5" fill="#d8dadc"/>
  ${text(BX + BW / 2, BY + 58, 'IDEC  HS5L', 4.6, '#111')}
  ${text(BX + BW / 2, BY + 64, 'VD7Y4M-G', 3.6, '#111', 'normal')}
  ${text(BX + BW / 2, BY + 69.5, 'DC24V', 3.2, '#111', 'normal')}
  <!-- 端子台（カバーを外した状態） -->
  <rect x="${BX + 3}" y="${ROW_Y0 - 12}" width="${BW - 6}" height="${ROWS.length * ROW_PITCH + 6}" rx="1.5" fill="#efece4" stroke="#9c978a" stroke-width="0.6"/>
  ${ROWS.flatMap((r, i) => r.map((_, j) => screw(COL_X[j], ROW_Y0 + i * ROW_PITCH, 3.4, '#d8d4c8'))).join('')}
  <!-- 手動解錠用のねじ -->
  <rect x="${BX + BW / 2 - 5}" y="${BY + BH - 14}" width="10" height="9" rx="2" fill="#3a3d41" stroke="#111" stroke-width="0.5"/>
  <path d="M${BX + BW / 2 - 3} ${BY + BH - 9.5} H${BX + BW / 2 + 3}" stroke="#bbb" stroke-width="1.2"/>
  <!-- 電線管の口（下面） -->
  <rect x="${BX + BW / 2 - 8}" y="${BY + BH}" width="16" height="8" rx="1" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>
  ${text(W / 2, 8, 'HS5L 電磁ロック（通電で施錠）', 4.4, '#333', 'normal')}
`;

const solenoid = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'idec.hs5l-vd7y4m-g',
  name: 'セーフティインタロックスイッチ（電磁ロック）',
  model: 'HS5L-VD7Y4M-G',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC HS5L シリーズの小形電磁ロック式セーフティインタロックスイッチ（ソレノイドロック: ソレノイドに通電すると施錠、通電を止めると解錠。施錠保持力 1400N、表示灯付き、IP67）。' +
    'ソレノイド A2(+) / A1(−) は DC24V。扉監視 11-12・21-22 とロック監視 41-42・51-52 はすべて b 接点（直接開路動作）で、扉が閉じて施錠されているときに閉じる（AC125V / DC30V 2.5A）。' +
    '安全回路では 11-12 と 41-42 を直列にして安全リレー・安全コントローラーの CH1、21-22 と 51-52 を直列にして CH2 に入れる（扉が開くか解錠されると両チャンネルが開く）。' +
    'ソレノイドは施錠したいときに PLC・安全コントローラーの出力で通電する（停電すると解錠されるので、慣性で止まらない機械にはスプリングロック式の HS5E などを使う）。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: ROWS.flatMap((r, i) =>
    r.map((id, j): TerminalDef => {
      const base = { id, label: LABELS[id], hint: HINTS[id], x: COL_X[j], y: ROW_Y0 + i * ROW_PITCH, side: j === 0 ? ('left' as const) : ('right' as const) };
      if (id === 'A2') return { ...base, role: 'input', accepts: { ...solenoid, conductors: ['+'] }, function: 'lock-solenoid' };
      if (id === 'A1') return { ...base, role: 'input', accepts: { ...solenoid, conductors: ['-'] } };
      return { ...base, role: 'signal', optional: true };
    }),
  ),
  // 扉閉・施錠状態で b 接点がすべて閉（直接開路）
  links: [
    { from: '11', to: '12', switch: 'NC', directOpening: true, ratedCurrent: 2.5 },
    { from: '21', to: '22', switch: 'NC', directOpening: true, ratedCurrent: 2.5 },
    { from: '41', to: '42', switch: 'NC', directOpening: true, ratedCurrent: 2.5 },
    { from: '51', to: '52', switch: 'NC', directOpening: true, ratedCurrent: 2.5 },
  ],
  safety: { standards: ['IEC 60947-5-1', 'ISO 14119'] },
  schematic: { actuator: 'limit', elements: [{ kind: 'coil', terminals: ['A1', 'A2'] }] },
  estimated:
    'ソレノイドの極性（A2 を +、HS5E と同じとした）と消費電流（不明のため書いていない）、端子台の端子の並び、接点の直接開路動作（扉監視と同じくロック監視も直接開路とした）',
};

export default def;
