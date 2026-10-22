import type { DeviceDefinition } from '../types';

/**
 * IDEC 電磁ロック式セーフティインタロックスイッチ HS5E-A4403-G
 * （スプリングロック＝ソレノイド通電で解錠、表示灯付き、ケーブル 3m、8 芯）。
 * 外形は 幅35 × 高さ146 × 奥行40mm。縦長なので 1mm ≒ 1.2px に縮小して描く。
 * 黒い本体の上に金属のヘッド（アクチュエータ挿入口）、本体上部に緑の表示灯、下端からケーブルが出る。
 * ケーブル先端の 8 本の芯線（線色は取扱説明書による）を端子として定義する。
 *
 * 接点（アクチュエータ挿入・ソレノイド OFF＝施錠の状態）:
 *   主回路 11-42（扉監視 11-12 とロック監視 41-42 を内部で直列。12-41 は内部接続）… b 接点・直接開路
 *   扉モニタ 23-24（a 接点）、ロックモニタ 53-54（a 接点）、ソレノイド A2(+) / A1(−) DC24V
 */

const W = 190;
const H = 236;

/** 本体（1mm ≒ 1.2px: 幅35 → 42px、高さ146 → 175px） */
const BX = 8;
const BY = 18;
const BW = 42;
const BH = 175;

/** ケーブルのシース端（ここから芯線が広がる） */
const SX = 104;
const SY = 214;
/** 芯線の先端（端子）の x と、1 本目の y・ピッチ */
const TIP_X = 184;
const TIP_Y0 = 132;
const TIP_PITCH = 13;

const COLORS: Record<string, string> = {
  white: '#f4f4f2',
  black: '#1c1c1c',
  blue: '#1f5fd1',
  orange: '#f28a1c',
  brown: '#7b4a26',
};

/** 芯線（id、地色、ストライプ色、印字） */
const WIRES: { id: string; base: string; stripe?: string; text: string; label: string }[] = [
  { id: 'A2', base: 'white', text: '白 A2(+)', label: 'A2(+)（ソレノイド +24V、白）' },
  { id: 'A1', base: 'black', text: '黒 A1(−)', label: 'A1(−)（ソレノイド 0V、黒）' },
  { id: '11', base: 'blue', text: '青 11', label: '11（主回路 b 接点・直接開路、青）' },
  { id: '42', base: 'blue', stripe: 'white', text: '青白 42', label: '42（主回路 b 接点・直接開路、青/白）' },
  { id: '23', base: 'orange', text: '橙 23', label: '23（扉モニタ a 接点、橙）' },
  { id: '24', base: 'orange', stripe: 'white', text: '橙白 24', label: '24（扉モニタ a 接点、橙/白）' },
  { id: '53', base: 'brown', text: '茶 53', label: '53（ロックモニタ a 接点、茶）' },
  { id: '54', base: 'brown', stripe: 'white', text: '茶白 54', label: '54（ロックモニタ a 接点、茶/白）' },
];
const tipY = (i: number) => TIP_Y0 + i * TIP_PITCH;

const text = (x: number, y: number, t: string, size: number, fill = '#eee', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** シース端から芯線を扇状に広げ、先端に棒端子を付ける */
const fan = () =>
  WIRES.map((w, i) => {
    const n = WIRES.length;
    const y0 = SY + (i - (n - 1) / 2) * 1.1;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 26} ${y0.toFixed(1)} ${TIP_X - 50} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = w.base === 'white' || w.base === 'orange' ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2.3" stroke-linecap="round"/>
  ${w.stripe ? `<path d="${d}" fill="none" stroke="${COLORS[w.stripe]}" stroke-width="1.1" stroke-dasharray="3 3"/>` : ''}
  <rect x="${TIP_X - 11}" y="${ty - 2.2}" width="4" height="4.4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.3}" width="7" height="2.6" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 3, w.text, 4, '#222', 'end', 'bold')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16171a"/>
      <stop offset="0.15" stop-color="#2e3135"/>
      <stop offset="0.85" stop-color="#2a2d31"/>
      <stop offset="1" stop-color="#121315"/>
    </linearGradient>
    <linearGradient id="metal-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d939a"/>
      <stop offset="0.5" stop-color="#e3e6e9"/>
      <stop offset="1" stop-color="#858b92"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
    <radialGradient id="led-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#d9ffd9"/>
      <stop offset="0.5" stop-color="#3ddc5a"/>
      <stop offset="1" stop-color="#16872c"/>
    </radialGradient>
  </defs>

  <!-- 金属ヘッド（上面にアクチュエータ挿入口） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="30" rx="2" fill="url(#metal-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <rect x="${BX + 13}" y="${BY - 3}" width="16" height="7" rx="1" fill="#2b2b2b"/>
  <rect x="${BX + 8}" y="${BY + 9}" width="26" height="12" rx="1.5" fill="#1d1e20"/>
  <circle cx="${BX + 5}" cy="${BY + 25}" r="1.8" fill="#555"/>
  <circle cx="${BX + BW - 5}" cy="${BY + 25}" r="1.8" fill="#555"/>

  <!-- 本体 -->
  <rect x="${BX}" y="${BY + 30}" width="${BW}" height="${BH - 30}" rx="3" fill="url(#body-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <circle cx="${BX + BW / 2}" cy="${BY + 44}" r="4.6" fill="#111" stroke="#555" stroke-width="0.6"/>
  <circle cx="${BX + BW / 2}" cy="${BY + 44}" r="3.4" fill="url(#led-{{uid}})"/>
  <rect x="${BX + 6}" y="${BY + 56}" width="${BW - 12}" height="34" rx="1.5" fill="#d8dadc"/>
  ${text(BX + BW / 2, BY + 66, 'IDEC', 7, '#111')}
  ${text(BX + BW / 2, BY + 74, 'HS5E', 4.6, '#111', 'middle', 'normal')}
  ${text(BX + BW / 2, BY + 80, 'A4403-G', 4, '#111', 'middle', 'normal')}
  ${text(BX + BW / 2, BY + 86.5, 'DC24V', 3.6, '#111', 'middle', 'normal')}
  <!-- 取付け穴 -->
  ${[BY + 100, BY + BH - 14].map((y) => `<circle cx="${BX + BW / 2}" cy="${y}" r="3.4" fill="#0a0a0a" stroke="#4a4d51" stroke-width="0.6"/>`).join('')}
  <!-- 手動解錠用キー穴 -->
  <rect x="${BX + BW / 2 - 6}" y="${BY + 120}" width="12" height="12" rx="2" fill="#3a3d41" stroke="#111" stroke-width="0.5"/>
  <path d="M${BX + BW / 2 - 3.5} ${BY + 126} H${BX + BW / 2 + 3.5}" stroke="#bbb" stroke-width="1.4"/>

  <!-- ケーブル（φ7.6、黒） -->
  <path d="M${BX + BW / 2} ${BY + BH} V${SY - 12} Q${BX + BW / 2} ${SY} ${BX + BW / 2 + 12} ${SY} H${SX}" fill="none" stroke="#111" stroke-width="6.5"/>
  <path d="M${BX + BW / 2 - 1.5} ${BY + BH} V${SY - 12}" stroke="#444" stroke-width="1" opacity="0.7"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#222"/>
  ${fan()}
`;

const solenoid = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'idec.hs5e-a4403-g',
  name: 'セーフティインタロックスイッチ（電磁ロック）',
  model: 'HS5E-A4403-G',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC HS5E シリーズの電磁ロック式セーフティインタロックスイッチ（スプリングロック: ソレノイド通電で解錠、停電時は施錠を保持。保持力 1400N 以上。表示灯付き、ケーブル 3m）。' +
    'ソレノイド A2(+)/A1(−) は DC24V 266mA（初期値）。主回路 11-42 は扉監視とロック監視の b 接点（直接開路）を内部で直列にしたもので、扉が閉じて施錠されているときだけ閉じる（DC-13 30V 1A）。23-24 は扉モニタ、53-54 はロックモニタの a 接点（PLC への状態入力用）。' +
    '安全回路では 11-42 を安全リレー・安全コントローラーの入力に、ソレノイドは解錠許可（停止確認後）の出力で駆動する。2 チャンネルが必要な場合は主回路 2 系統の機種（HS5E-DD など）を使う。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    // スプリングロック式: 通電で解錠する。施錠の電源チェックのため、機能は + 側（A2）に付ける
    if (w.id === 'A2') return { ...base, role: 'input' as const, accepts: { ...solenoid, conductors: ['+' as const] }, function: 'unlock-solenoid' as const };
    if (w.id === 'A1') return { ...base, role: 'input' as const, accepts: { ...solenoid, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  // 扉閉・施錠状態で主回路 11-42（b 接点・直接開路）が閉、モニタの a 接点 23-24・53-54 が開
  links: [
    { from: '11', to: '42', switch: 'NC', directOpening: true },
    { from: '23', to: '24', switch: 'NO' },
    { from: '53', to: '54', switch: 'NO' },
  ],
  safety: { standards: ['IEC 60947-5-1', 'ISO 14119'] },
  // ソレノイド 266mA（初期値）＋表示灯 10mA
  loadCurrent: 0.28,
  schematic: { actuator: 'limit', elements: [{ kind: 'coil', terminals: ['A1', 'A2'] }] },
};

export default def;
