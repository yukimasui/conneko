/**
 * 安川電機 インバーター GA500（小形高機能タイプ）三相 200V 級の共通の作り。
 *
 * 出典: 安川電機 e-mechatronics「GA500 仕様 200V 級」（の販売店・検索での引用）、GA500 データシート、V1000 → GA500 置換え資料。
 * - 定格（出荷時は重負荷 HD。パラメータ C6-01 で軽負荷 ND にできる）:
 *   2006: HD 0.75kW・出力 5A・入力 5.8A、2012: HD 2.2kW・出力 11A・入力 11A、2021: HD 3.7kW・出力 17.6A。
 * - 外形: 高さ 128mm。幅は 2006 が 68mm、2012 が 108mm、2021 が 140mm（奥行 143mm）。
 * - 主回路端子: R/L1・S/L2・T/L3（電源）、U/T1・V/T2・W/T3（モーター）、−・+1・+2（直流母線・DC リアクトル。+1-+2 間は出荷時に短絡片）、
 *   B1・B2（ブレーキ抵抗器。ブレーキトランジスタ内蔵）、接地。
 * - 制御回路端子: 多機能接点入力 S1〜S7（共通 SC。シンク・ソース・内部電源・外部電源を切り換えられる。出荷時はシンク・内部電源）、
 *   SP（+24V）・SN（0V）、安全入力 H1・H2（共通 HC。出荷時は短絡線）、周波数指令 A1（電圧）・A2（電流）・+V（設定用電源）・AC（共通）、
 *   異常出力 MA-MB-MC（リレー）、フォトカプラ出力 P1-C1・P2-C2、パルス出力 MP、アナログ出力 AM。
 *
 * 描き方（1mm = 2px）: 正面（上に LED の操作器、下に端子カバー）。端子は図面用に、制御回路を左右の縁、主回路を下に並べた。
 * インバーターのファミリーで機種を変えても配線が残るように、主回路の端子 ID は三菱電機の FR-E820 / FR-A820 とそろえた
 * （モーター側は ID を U・V・W にして、印字を U/T1・V/T2・W/T3 にした）。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { text, yaskawaLogo } from './parts';

export interface Ga500Spec {
  type: string;
  /** 容量コード（'2006' など。型式 CIPR-GA50A□□□□） */
  code: string;
  /** 重負荷（HD）の適用モーター容量[kW] */
  kw: number;
  /** 軽負荷（ND）の適用モーター容量[kW] */
  ndKw: number;
  /** 定格出力電流[A]（HD） */
  outputCurrent: number;
  /** 定格入力電流[A]（HD） */
  inputCurrent: number;
  /** 外形の幅[mm] */
  widthMm: number;
  estimated: string;
}

const H = 256;
const LEFT: [string, string][] = [
  ['S1', 'S1'],
  ['S2', 'S2'],
  ['S3', 'S3'],
  ['S4', 'S4'],
  ['S5', 'S5'],
  ['S6', 'S6'],
  ['S7', 'S7'],
  ['SC', 'SC'],
  ['SP', 'SP'],
  ['SN', 'SN'],
  ['H1', 'H1'],
  ['H2', 'H2'],
  ['HC', 'HC'],
];
const RIGHT: [string, string][] = [
  ['MA', 'MA'],
  ['MB', 'MB'],
  ['MC', 'MC'],
  ['P1', 'P1'],
  ['C1', 'C1'],
  ['P2', 'P2'],
  ['C2', 'C2'],
  ['MP', 'MP'],
  ['AM', 'AM'],
  ['AC', 'AC'],
  ['+V', '+V'],
  ['A1', 'A1'],
  ['A2', 'A2'],
];
const Y0 = 66;
const PITCH = 10;
const yAt = (i: number) => Y0 + i * PITCH;

const MAIN: [string, string][] = [
  ['R/L1', 'R/L1'],
  ['S/L2', 'S/L2'],
  ['T/L3', 'T/L3'],
  ['U', 'U/T1'],
  ['V', 'V/T2'],
  ['W', 'W/T3'],
];
const UPPER = ['-', '+1', '+2', 'B1', 'B2'];
const MAIN_Y = 228;
const UPPER_Y = 205;
const EARTH_Y = 248;

const NOTES: Record<string, string> = {
  S1: '多機能接点入力 1（初期: 正転運転 / 停止）',
  S2: '多機能接点入力 2（初期: 逆転運転 / 停止）',
  S3: '多機能接点入力 3（初期: 外部異常）',
  S4: '多機能接点入力 4（初期: 異常リセット）',
  S5: '多機能接点入力 5（初期: 多段速指令 1）',
  S6: '多機能接点入力 6（初期: 多段速指令 2）',
  S7: '多機能接点入力 7（初期: JOG 指令）',
  SC: '多機能接点入力の共通（シンク・内部電源では S1〜S7 と SC の間を接点で閉じて ON）',
  SP: '接点入力用の電源 +24V（内部電源。150mA）',
  SN: '接点入力用の電源 0V（内部電源）',
  H1: '安全入力 1（開くとモーターへの出力を遮断。出荷時は HC と短絡線）',
  H2: '安全入力 2（開くとモーターへの出力を遮断。出荷時は HC と短絡線）',
  HC: '安全入力の共通',
  MA: '異常出力（リレー）a 接点側。異常で MA-MC 導通',
  MB: '異常出力（リレー）b 接点側。正常時 MB-MC 導通',
  MC: '異常出力（リレー）の共通',
  P1: 'フォトカプラ出力 1（初期: 運転中。DC48V 50mA 以下）',
  C1: 'フォトカプラ出力 1 の共通',
  P2: 'フォトカプラ出力 2（初期: 周波数一致。DC48V 50mA 以下）',
  C2: 'フォトカプラ出力 2 の共通',
  MP: 'パルス列出力（出力周波数）',
  AM: 'アナログモニタ出力（0〜10V。初期: 出力周波数）',
  AC: '周波数指令・アナログモニタの共通（0V）',
  '+V': '周波数設定用電源（DC10.5V、20mA）',
  A1: '周波数指令（電圧 0〜10V）',
  A2: '周波数指令（電流 4〜20mA。DIP スイッチで電圧にもできる）',
  '-': '直流母線（−）',
  '+1': 'DC リアクトル接続（出荷時は +2 と短絡片）',
  '+2': '直流母線（＋）。DC リアクトル・ブレーキ抵抗器用',
  B1: 'ブレーキ抵抗器接続（B1-B2 間）',
  B2: 'ブレーキ抵抗器接続（B1-B2 間）',
};

const HINTS: Record<string, string> = {
  S1: '正転',
  S2: '逆転',
  S3: '外部異常',
  S4: '異常リセット',
  S5: '多段速1',
  S6: '多段速2',
  S7: 'JOG',
  SC: '入力コモン',
  SP: '+24V',
  SN: '0V',
  H1: '安全入力1',
  H2: '安全入力2',
  HC: '安全コモン',
  MA: '異常 a',
  MB: '異常 b',
  MC: '異常 共通',
  P1: '運転中',
  P2: '周波数一致',
  A1: '電圧指令',
  A2: '電流指令',
  '+V': '設定電源',
  AC: 'アナログ共通',
};

const screw = (x: number, y: number, r = 5.6) => `
  <rect x="${x - r - 2.2}" y="${y - r - 2.2}" width="${2 * r + 4.4}" height="${2 * r + 4.4}" rx="1.2" fill="#3a3a3a"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#gscrew-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.2" stroke-linecap="round"/>`;

/** ねじなしの制御回路端子（差込口と解除ボタン） */
const spring = (x: number, y: number, side: 'left' | 'right') => {
  const dx = side === 'left' ? 1 : -1;
  return `
  <rect x="${x - 4}" y="${y - 3.6}" width="8" height="7.2" rx="1" fill="#1f2022" stroke="#555" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="2.1" fill="#000"/>
  <rect x="${x + dx * 5 - 1.5}" y="${y - 2.5}" width="3" height="5" rx="0.6" fill="#e7e8ea"/>`;
};

const ac200: TerminalDef['accepts'] = { system: 'AC', minVoltage: 170, maxVoltage: 264 };
const RST = ['R', 'S', 'T'] as const;

/** GA500（三相 200V 級）の機器定義を作る */
export function buildGa500(s: Ga500Spec): DeviceDefinition {
  const W = s.widthMm * 2;
  const LX = 5;
  const RX = W - 5;
  const cx = W / 2;
  const span = W - 32;
  const MAIN_X = MAIN.map((_, i) => +(16 + (span * i) / (MAIN.length - 1)).toFixed(2));
  const UPPER_X = UPPER.map((_, i) => +(MAIN_X[1] + ((MAIN_X[5] - MAIN_X[1]) * i) / (UPPER.length - 1)).toFixed(2));
  const EARTH_X = [+((MAIN_X[0] + MAIN_X[1]) / 2).toFixed(2), +((MAIN_X[4] + MAIN_X[5]) / 2).toFixed(2)];
  const model = `CIPR-GA50A${s.code}ABBA`;
  // 操作器（LED）の幅
  const kw = Math.min(W - 40, 104);
  const kx = cx - kw / 2;

  const svg = `
  <defs>
    <linearGradient id="gbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2b2d31"/>
      <stop offset="0.5" stop-color="#3d4045"/>
      <stop offset="1" stop-color="#26282b"/>
    </linearGradient>
    <linearGradient id="gtop-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9eaeb"/>
      <stop offset="1" stop-color="#c9cbcd"/>
    </linearGradient>
    <radialGradient id="gscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 本体（黒い樹脂のケース。上部は明るいグレーの操作器の枠） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#gbody-{{uid}})" stroke="#111" stroke-width="1.2"/>
  <g fill="#17181a">${Array.from({ length: Math.floor((W - 30) / 8) }, (_, i) => `<rect x="${16 + i * 8}" y="3.5" width="4.5" height="2" rx="1"/>`).join('')}</g>
  <rect x="${kx - 4}" y="9" width="${kw + 8}" height="50" rx="3" fill="url(#gtop-{{uid}})" stroke="#8b8e92" stroke-width="0.7"/>
  <!-- LED 操作器（5 桁 7 セグメント・キー） -->
  <rect x="${kx}" y="13" width="${kw * 0.62}" height="15" rx="1" fill="#120a09" stroke="#000" stroke-width="0.5"/>
  ${text(kx + kw * 0.6, 25, '60.00', 11, '#ff4a2e', 'end', 'bold')}
  ${['ALM', 'REV', 'DRV', 'FOUT'].map((t, i) => `<circle cx="${kx + kw * 0.68}" cy="${14.5 + i * 3.8}" r="1" fill="${i === 2 ? '#3ccf52' : '#7a7d82'}"/>${text(kx + kw * 0.68 + 2.5, 15.6 + i * 3.8, t, 2.8, '#333', 'start')}`).join('')}
  ${[
    ['ESC', '#55585d'],
    ['RESET', '#55585d'],
    ['ENTER', '#55585d'],
  ]
    .map(([t, c], i) => `<rect x="${kx + i * (kw / 3)}" y="32" width="${kw / 3 - 3}" height="8" rx="1.2" fill="${c}"/>${text(kx + i * (kw / 3) + (kw / 3 - 3) / 2, 37.4, t, 3.2, '#fff', 'middle', 'bold')}`)
    .join('')}
  <rect x="${kx}" y="44" width="${kw * 0.22}" height="10" rx="1.2" fill="#55585d"/>${text(kx + kw * 0.11, 50.6, 'LO/RE', 3, '#fff', 'middle', 'bold')}
  <circle cx="${kx + kw * 0.36}" cy="49" r="5" fill="#2a8a3e" stroke="#155d26" stroke-width="0.6"/>${text(kx + kw * 0.36, 50.4, 'RUN', 2.8, '#fff', 'middle', 'bold')}
  <path d="M${kx + kw * 0.5} 51 l3 -4 l3 4 z M${kx + kw * 0.5 + 8} 47 l3 4 l3 -4 z" fill="#55585d"/>
  <circle cx="${kx + kw * 0.86}" cy="49" r="5" fill="#d0281c" stroke="#7d1209" stroke-width="0.6"/>${text(kx + kw * 0.86, 50.4, 'STOP', 2.6, '#fff', 'middle', 'bold')}
  <!-- ロゴ・形名 -->
  ${yaskawaLogo(cx, 72, 7.4, '#ffffff', 'middle')}
  ${text(cx, 84, 'GA500', 8, '#e8eaec', 'middle', 'bold')}
  ${text(cx, 92, `CIPR-GA50A${s.code}`, 4.2, '#c5c8cc', 'middle')}
  ${text(cx, 98, `3φ200V ${s.kw}kW (HD)`, 3.6, '#a9adb2', 'middle')}
  <!-- 端子カバー -->
  <rect x="26" y="104" width="${W - 52}" height="84" rx="2" fill="#333539" stroke="#4d5055" stroke-width="0.6"/>
  <g stroke="#45484d" stroke-width="0.8">${[118, 132, 146, 160, 174].map((y) => `<path d="M32 ${y} H${W - 32}"/>`).join('')}</g>
  <!-- 左右の縁の制御回路端子（図面用に並べた） -->
  <rect x="${LX - 4}" y="${Y0 - 7}" width="22" height="${(LEFT.length - 1) * PITCH + 14}" rx="1.5" fill="#d6d7d9" stroke="#8b8e92" stroke-width="0.6"/>
  <rect x="${RX - 18}" y="${Y0 - 7}" width="22" height="${(RIGHT.length - 1) * PITCH + 14}" rx="1.5" fill="#d6d7d9" stroke="#8b8e92" stroke-width="0.6"/>
  ${LEFT.map(([, label], i) => `${spring(LX + 1, yAt(i), 'left')}${text(LX + 8.5, yAt(i) + 1.5, label, 4, '#222', 'start', 'bold')}`).join('')}
  ${RIGHT.map(([, label], i) => `${spring(RX - 1, yAt(i), 'right')}${text(RX - 8.5, yAt(i) + 1.5, label, 4, '#222', 'end', 'bold')}`).join('')}
  <!-- 主回路端子台 -->
  <rect x="4" y="${UPPER_Y - 11}" width="${W - 8}" height="${H - UPPER_Y + 8}" rx="2" fill="#1e1f22"/>
  ${UPPER.map((id, i) => screw(UPPER_X[i], UPPER_Y, 5) + text(UPPER_X[i], UPPER_Y + 11, id, 3.8, '#fff', 'middle', 'bold')).join('')}
  <rect x="${UPPER_X[1] - 3}" y="${UPPER_Y - 3.5}" width="${UPPER_X[2] - UPPER_X[1] + 6}" height="7" rx="1.5" fill="#b87333" opacity="0.85"/>
  ${MAIN.map(([, label], i) => screw(MAIN_X[i], MAIN_Y) + text(MAIN_X[i], MAIN_Y + 11.5, label, label.length > 4 ? 3.4 : 3.8, '#fff', 'middle', 'bold')).join('')}
  ${EARTH_X.map((x) => screw(x, EARTH_Y, 4)).join('')}
  ${text(cx, EARTH_Y + 2, '⏚', 5.5, '#fff')}
`;

  const sig = (id: string, label: string, x: number, y: number, side: 'left' | 'right', extra: Partial<TerminalDef> = {}): TerminalDef => ({
    id,
    ...(label !== id ? { label } : {}),
    note: NOTES[id],
    ...(HINTS[id] ? { hint: HINTS[id] } : {}),
    x,
    y,
    side,
    role: 'signal',
    optional: true,
    ...extra,
  });

  const terminals: TerminalDef[] = [
    ...MAIN.slice(0, 3).map(([id], i): TerminalDef => ({ id, x: MAIN_X[i], y: MAIN_Y, side: 'bottom', role: 'input', accepts: ac200, note: '電源入力（三相 AC200〜240V）' })),
    ...MAIN.slice(3).map(
      ([id, label], i): TerminalDef => ({
        id,
        label,
        x: MAIN_X[i + 3],
        y: MAIN_Y,
        side: 'bottom',
        role: 'supply',
        supply: { system: 'AC', voltage: 200, conductor: RST[i], limitCurrent: s.outputCurrent },
        note: `インバータ出力（モーターへ。HD 定格出力電流 ${s.outputCurrent}A）`,
      }),
    ),
    ...UPPER.map((id, i): TerminalDef => ({ id, note: NOTES[id], x: UPPER_X[i], y: UPPER_Y, side: 'top', role: 'signal', optional: true })),
    { id: 'E', label: '⏚', note: '接地', x: EARTH_X[0], y: EARTH_Y, side: 'bottom', role: 'ground' },
    { id: 'E2', label: '⏚', note: '接地（モーターの接地用）', x: EARTH_X[1], y: EARTH_Y, side: 'bottom', role: 'ground', optional: true },
    ...LEFT.map(([id, label], i): TerminalDef => {
      const y = yAt(i);
      if (id === 'SP') return { id, note: NOTES[id], hint: HINTS[id], x: LX, y, side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.15 }, optional: true };
      if (id === 'SN') return { id, note: NOTES[id], hint: HINTS[id], x: LX, y, side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 0.15 }, optional: true };
      if (id === 'SC' || id === 'H1' || id === 'H2' || id === 'HC') return sig(id, label, LX, y, 'left');
      // 多機能接点入力（シンク・内部電源。SC との間を接点・NPN トランジスタで閉じて ON）
      return sig(id, label, LX, y, 'left', { signal: { dir: 'in', kind: 'dry' } });
    }),
    ...RIGHT.map(([id, label], i): TerminalDef => {
      const y = yAt(i);
      if (id === 'P1' || id === 'P2') return sig(id, label, RX, y, 'right', { signal: { dir: 'out', kind: 'npn' } });
      if (id === 'C1' || id === 'C2')
        return { id, note: NOTES[id], x: RX, y, side: 'right', role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 48, conductors: ['-', '+'] }, optional: true };
      if (id === '+V') return { id, note: NOTES[id], hint: HINTS[id], x: RX, y, side: 'right', role: 'supply', supply: { system: 'DC', voltage: 10.5, conductor: '+', limitCurrent: 0.02 }, optional: true };
      if (id === 'A1') return sig(id, label, RX, y, 'right', { signal: { dir: 'in', kind: 'analog-v', ref: 'AC' } });
      if (id === 'A2') return sig(id, label, RX, y, 'right', { signal: { dir: 'in', kind: 'analog-i', ref: 'AC' } });
      if (id === 'AM') return sig(id, label, RX, y, 'right', { signal: { dir: 'out', kind: 'analog-v' } });
      return sig(id, label, RX, y, 'right');
    }),
  ];

  return {
    type: s.type,
    name: 'インバーター',
    model,
    maker: '安川電機',
    category: 'load',
    description:
      `安川電機の小形高機能インバーター GA500 三相 200V 級（重負荷 HD ${s.kw}kW・定格出力電流 ${s.outputCurrent}A・定格入力電流 ${s.inputCurrent}A。軽負荷 ND にすると ${s.ndKw}kW）。` +
      'R/L1・S/L2・T/L3 に三相 AC200〜240V を入れ、U/T1・V/T2・W/T3 からモーターを可変速運転する（誘導モーター・PM モーター）。' +
      '多機能接点入力 S1〜S7 は出荷時シンク・内部電源で、S1〜S7 と SC の間を接点か NPN トランジスタで閉じて ON（初期: S1 正転・S2 逆転・S3 外部異常・S4 異常リセット・S5/S6 多段速・S7 JOG）。' +
      'MA-MB-MC は異常出力のリレー接点、P1-C1・P2-C2 はフォトカプラ出力（DC48V 50mA）。周波数は +V-A1-AC にボリューム、A1-AC に 0〜10V、A2-AC に 4〜20mA を入れて設定する。' +
      'H1・H2 は安全入力（Safe Disable。使わない場合は HC と短絡したまま）。ブレーキトランジスタを内蔵しており、ブレーキ抵抗器は B1-B2 間につなぐ。' +
      `型式の末尾（ABBA）は標準品の例。`,
    labelPrefix: 'INV',
    width: W,
    height: H,
    svg,
    terminals,
    links: [
      { from: 'MC', to: 'MA', switch: 'NO', ratedCurrent: 1 },
      { from: 'MC', to: 'MB', switch: 'NC', ratedCurrent: 1 },
      { from: 'P1', to: 'C1', switch: 'output', ratedCurrent: 0.05 },
      { from: 'P2', to: 'C2', switch: 'output', ratedCurrent: 0.05 },
    ],
    distinctGroups: [['R/L1', 'S/L2', 'T/L3']],
    loadCurrent: s.inputCurrent,
    estimated: s.estimated,
  };
}

/** 端子の並びの説明（各容量の estimated の頭に付ける） */
export const GA500_LAYOUT_NOTE =
  '制御回路端子・主回路端子の並びは図面用に整理したもの。多機能入出力の初期の機能、SP の容量（150mA）、リレー出力の定格（1A）、型式の末尾（ABBA）は推定';
