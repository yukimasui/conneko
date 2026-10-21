import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * KEYENCE 非接触式セーフティインタロックスイッチ GS-11P5（GS シリーズ 非接触タイプ スタンダード、PNP、ケーブル 5m）。
 * センサ本体（亜鉛ダイカスト・ニッケルクロムめっき＋樹脂の検出面）と、扉側に付けるアクチュエータ（別体）を並べて描く。
 * 外形寸法・表示灯の配置は公開資料で確認できなかったため、見た目は概略（docs/safety-catalog.md 参照）。
 * ケーブル先端の 8 本の芯線（線色は KEYENCE 配線ナビ GS-11P* による）を端子として定義する。
 */

const W = 196;
const H = 196;

const SX = 96;
const SY = 168;
const TIP_X = 190;
const TIP_Y0 = 98;
const TIP_PITCH = 12.4;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  gray: '#9a9a9a',
  red: '#d8231f',
  lightblue: '#7cc7f0',
};

const WIRES: { id: string; base: string; stripe?: string; text: string; label: string }[] = [
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源、茶）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源、青）' },
  { id: 'OSSD1', base: 'black', text: '黒 OSSD1', label: 'OSSD1（安全出力 PNP 150mA、黒）' },
  { id: 'OSSD2', base: 'white', text: '白 OSSD2', label: 'OSSD2（安全出力 PNP 150mA、白）' },
  { id: 'IN1', base: 'red', stripe: 'black', text: '赤黒 安全入力1', label: '安全入力 1（単体使用時は +24V、直列接続時は前段の OSSD1。赤/黒）' },
  { id: 'IN2', base: 'red', stripe: 'white', text: '赤白 安全入力2', label: '安全入力 2（単体使用時は +24V、直列接続時は前段の OSSD2。赤/白）' },
  { id: 'AUX', base: 'gray', text: '灰 AUX', label: 'AUX 出力（非安全、扉の開閉状態。灰）' },
  { id: 'LOCK', base: 'lightblue', text: '水 (未使用)', label: '水色（GS-11 では未使用。ロック付き機種のロック制御入力）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'gray', 'lightblue'].includes(w.base) ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.9" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2" stroke-linecap="round"/>
  ${w.stripe ? `<path d="${d}" fill="none" stroke="${COLORS[w.stripe]}" stroke-width="1" stroke-dasharray="3 3"/>` : ''}
  <rect x="${TIP_X - 11}" y="${ty - 2}" width="4" height="4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.2}" width="7" height="2.4" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 2.8, w.text, 3.8, '#222', 'end')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="chrome-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949b"/>
      <stop offset="0.25" stop-color="#e9ecef"/>
      <stop offset="0.6" stop-color="#b9bec4"/>
      <stop offset="1" stop-color="#7d838a"/>
    </linearGradient>
    <linearGradient id="face-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1d"/>
      <stop offset="1" stop-color="#38393c"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <!-- センサ本体（固定側） -->
  <rect x="8" y="14" width="40" height="118" rx="4" fill="url(#chrome-{{uid}})" stroke="#555a60" stroke-width="0.8"/>
  <rect x="38" y="20" width="10" height="106" rx="2" fill="url(#face-{{uid}})"/>
  ${[24, 120].map((y) => `<circle cx="20" cy="${y}" r="3.4" fill="#2a2b2d" stroke="#666" stroke-width="0.5"/>`).join('')}
  <!-- 表示灯（OSSD 緑・扉開 赤 など） -->
  <rect x="13" y="40" width="7" height="5" rx="1" fill="#3ddc5a" stroke="#111" stroke-width="0.4"/>
  <rect x="13" y="48" width="7" height="5" rx="1" fill="#5a1414" stroke="#111" stroke-width="0.4"/>
  <rect x="13" y="56" width="7" height="5" rx="1" fill="#5a4a14" stroke="#111" stroke-width="0.4"/>
  <text x="29" y="74" font-family="sans-serif" font-size="5" font-weight="bold" font-style="italic" fill="#222" transform="rotate(90 29 74)">KEYENCE  GS-11P</text>

  <!-- アクチュエータ（扉側、別体） -->
  <rect x="58" y="34" width="22" height="78" rx="3" fill="url(#chrome-{{uid}})" stroke="#555a60" stroke-width="0.8"/>
  <rect x="58" y="40" width="7" height="66" rx="1.5" fill="url(#face-{{uid}})"/>
  ${[42, 104].map((y) => `<circle cx="72" cy="${y}" r="3" fill="#2a2b2d" stroke="#666" stroke-width="0.5"/>`).join('')}
  ${text(69, 124, 'アクチュエータ', 4.2, '#555', 'middle', 'normal')}

  <!-- ケーブル -->
  <path d="M28 132 V${SY - 12} Q28 ${SY} 40 ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="5"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };
/** 安全出力（PNP、各 150mA） */
const OSSD: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 0.15 };

/** 電源以外の芯線の電気的な役割と安全回路での機能 */
const SPEC: Record<string, Partial<TerminalDef>> = {
  OSSD1: { role: 'supply', supply: OSSD, function: 'ossd', channel: 1 },
  OSSD2: { role: 'supply', supply: OSSD, function: 'ossd', channel: 2 },
  // 単体使用時は +24V、直列接続時は前段の OSSD1/OSSD2 を受ける
  IN1: { function: 'safety-input', channel: 1 },
  IN2: { function: 'safety-input', channel: 2 },
  AUX: { function: 'aux-output', signal: { dir: 'out', kind: 'pnp' } },
};

const def: DeviceDefinition = {
  type: 'keyence.gs-11p5',
  name: '非接触式セーフティインタロックスイッチ',
  model: 'GS-11P5（PNP、ケーブル 5m）',
  maker: 'KEYENCE',
  category: 'safety',
  description:
    'KEYENCE GS シリーズの非接触式セーフティインタロックスイッチ（スタンダードタイプ、PNP）。扉側のアクチュエータが近づく（10mm 以内）と OSSD が ON になり、扉が開くと OFF になる。PL e / カテゴリ4、SIL3、ISO 14119 タイプ4。電源は茶 +24V / 青 0V（DC24V、0.8W）。' +
    '安全出力は OSSD1（黒）・OSSD2（白）、各 150mA。OSSD を安全コントローラー・安全リレーの 2 チャンネル入力（例: GC-1000 の Si2/Si3）に接続する。' +
    '安全入力 1/2（赤黒・赤白）は単体使用時は +24V に接続し、複数台を直列につなぐときは前段の OSSD1/OSSD2 を受ける。灰は扉状態の AUX 出力（非安全）、水色は未使用。未使用線は 1 本ずつ絶縁する。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '0V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true, ...SPEC[w.id] };
  }),
  safetyChannels: [
    // 前段の OSSD（または +24V）を受ける入力。テストパルスは返さない
    { id: 'IN', label: '安全入力 1/2（前段の OSSD1/OSSD2、単体使用時は +24V）', kind: 'input', mode: 'ossd', channels: [{ input: 'IN1' }, { input: 'IN2' }] },
    { id: 'OSSD', label: '安全出力 OSSD1/OSSD2', kind: 'output', channels: [{ output: 'OSSD1' }, { output: 'OSSD2' }] },
  ],
  safety: { pl: 'e', category: '4', sil: 3, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061', 'ISO 14119 タイプ4'] },
  // 0.8W / 24V
  loadCurrent: 0.035,
};

export default def;
