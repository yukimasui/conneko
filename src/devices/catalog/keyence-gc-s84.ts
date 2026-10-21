import type { DeviceDefinition, SafetyChannelGroup, SupplySpec, TerminalDef } from '../types';

/**
 * KEYENCE セーフティコントローラ GC シリーズ 安全入出力増設ユニット GC-S84（安全入力 8・テスト出力 2・安全出力 4）。
 * 外形は 幅22.2 × 高さ90 × 奥行95mm（1mm ≒ 2px）。メインコントローラ（GC-1000 / GC-1000R）の右側面に連結する。
 * 黒い筐体の上端に黄色の帯、POWER/ERROR LED、黒地にオレンジ解除ボタンのプッシュイン式コネクタ（2 列 × 8 段）。
 *
 * 端子配列（カタログ「Terminal arrangements」GC-S84。左列｜右列、上から）:
 *   Si0|Si1, Si2|Si3, Si4|Si5, Si6|Si7, To0|To1, So0|So1, So2|So3, +24V|0V
 */

const W = 46;
const H = 180;

const COL_L = 18;
const COL_R = 29.5;
const HOLE_L = COL_L + 1.6;
const HOLE_R = COL_R + 1.6;
const PITCH = 7.4;
const Y0 = 70;

const ROWS: [string, string][] = [
  ['Si0', 'Si1'],
  ['Si2', 'Si3'],
  ['Si4', 'Si5'],
  ['Si6', 'Si7'],
  ['To0', 'To1'],
  ['So0', 'So1'],
  ['So2', 'So3'],
  ['+24V', '0V'],
];
const rowY = (i: number) => +(Y0 + i * PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#e8e8e8', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const pushIn = (x: number, y: number) => `
  <rect x="${x - 5.6}" y="${y - 3.4}" width="11.2" height="6.8" rx="0.8" fill="#151515" stroke="#3a3a3a" stroke-width="0.3"/>
  <rect x="${x - 5}" y="${y - 2.6}" width="3.2" height="5.2" rx="0.6" fill="url(#orange-{{uid}})"/>
  <circle cx="${x + 1.6}" cy="${y}" r="2.3" fill="#050505" stroke="#555" stroke-width="0.4"/>`;

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1c"/>
      <stop offset="0.12" stop-color="#2d2e30"/>
      <stop offset="0.88" stop-color="#28292b"/>
      <stop offset="1" stop-color="#161718"/>
    </linearGradient>
    <linearGradient id="yellow-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd83a"/>
      <stop offset="1" stop-color="#e8b800"/>
    </linearGradient>
    <linearGradient id="orange-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffab3d"/>
      <stop offset="1" stop-color="#e46d00"/>
    </linearGradient>
  </defs>

  <!-- 筐体・黄色い帯 -->
  <rect x="1" y="3" width="${W - 2}" height="${H - 6}" rx="3" fill="url(#case-{{uid}})" stroke="#0b0b0b" stroke-width="1"/>
  <rect x="2" y="4" width="${W - 4}" height="10" fill="url(#yellow-{{uid}})"/>
  ${text(W / 2, 11.5, 'GC-S84', 5, '#111', 'middle', 'bold')}
  <rect x="2" y="${H - 9}" width="${W - 4}" height="5" fill="url(#yellow-{{uid}})"/>

  <!-- LED -->
  <rect x="7" y="22" width="4" height="2.6" rx="0.5" fill="#36d655"/>
  ${text(13, 24.6, 'POWER', 3.4, '#e8e8e8', 'start')}
  <rect x="7" y="29" width="4" height="2.6" rx="0.5" fill="#5a1414"/>
  ${text(13, 31.6, 'ERROR', 3.4, '#e8e8e8', 'start')}
  ${text(W / 2, 46, 'SAFETY I/O', 3.4, '#9aa0a6')}
  ${text(W / 2, 51, 'IN 8 / OUT 4', 3.4, '#9aa0a6')}

  <!-- プッシュイン式コネクタ -->
  <rect x="${COL_L - 7.5}" y="${Y0 - 5}" width="${COL_R - COL_L + 15}" height="${7 * PITCH + 10}" rx="1.2" fill="#202020" stroke="#000" stroke-width="0.6"/>
  ${ROWS.map((_, i) => pushIn(COL_L, rowY(i)) + pushIn(COL_R, rowY(i))).join('')}
  ${ROWS.map(([l, r], i) => text(COL_L - 8.2, rowY(i) + 1.3, l, 3, '#f0f0f0', 'end') + text(COL_R + 8.2, rowY(i) + 1.3, r, 3, '#f0f0f0', 'start')).join('')}
`;

const power = { system: 'DC' as const, minVoltage: 16.8, maxVoltage: 28.8 };

/** テスト出力（最大 100mA） */
const TEST: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test', limitCurrent: 0.1 };
/** 安全出力（PNP・OSSD、最大 500mA） */
const OSSD: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 0.5 };

/** 入出力端子（偶数番号が CH1、奇数番号が CH2） */
const ioTerminal = (id: string, x: number, y: number, side: 'left' | 'right'): TerminalDef => {
  const channel = Number(id.slice(2)) % 2 === 0 ? 1 : 2;
  const base = { id, x, y, side, optional: true };
  if (id.startsWith('Si')) return { ...base, label: `${id}（安全入力）`, role: 'signal', function: 'safety-input', channel };
  if (id.startsWith('To')) return { ...base, label: `${id}（テスト出力）`, role: 'supply', supply: TEST, function: 'test-output', channel };
  return { ...base, label: `${id}（安全出力 OSSD）`, role: 'supply', supply: OSSD, function: 'ossd', channel };
};

const terminals: TerminalDef[] = ROWS.flatMap(([l, r], i): TerminalDef[] => {
  if (l === '+24V') {
    return [
      { id: '+24V', label: '+24V（電源）', x: HOLE_L, y: rowY(i), side: 'left', role: 'input', accepts: { ...power, conductors: ['+'] } },
      { id: '0V', label: '0V（電源）', x: HOLE_R, y: rowY(i), side: 'right', role: 'input', accepts: { ...power, conductors: ['-'] } },
    ];
  }
  return [
    ioTerminal(l, HOLE_L, rowY(i), 'left'),
    ioTerminal(r, HOLE_R, rowY(i), 'right'),
  ];
});

const def: DeviceDefinition = {
  type: 'keyence.gc-s84',
  name: 'セーフティコントローラ 増設ユニット',
  model: 'GC-S84',
  maker: 'KEYENCE',
  category: 'safety',
  description:
    'KEYENCE GC シリーズの安全入出力増設ユニット（幅22.2mm）。メインコントローラ GC-1000 / GC-1000R の右側面に連結して使う（連結はケーブル不要のため図では配線しない）。' +
    '安全入力 Si0〜Si7、テスト出力 To0/To1、安全出力 So0〜So3（PNP・OSSD）。ユニット自身の電源 +24V / 0V（60mA）を別に配線する。端子名はメインコントローラと同じ規則（偶数・奇数の Si を 2 チャンネルの組にする）。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals,
  // 安全入力の組（既定の配線として偶数の Si に To0、奇数の Si に To1 を戻す。使い方は設定ソフトで決める）と安全出力の組
  safetyChannels: [
    ...[0, 2, 4, 6].map((n): SafetyChannelGroup => ({
      id: `Si${n}-Si${n + 1}`,
      label: `安全入力 Si${n}/Si${n + 1}（To0→Si${n}、To1→Si${n + 1}）`,
      kind: 'input',
      configurable: true,
      mode: ['nc-nc', 'ossd'],
      channels: [{ source: 'To0', input: `Si${n}` }, { source: 'To1', input: `Si${n + 1}` }],
    })),
    { id: 'So0-So1', label: '安全出力 So0/So1', kind: 'output', channels: [{ output: 'So0' }, { output: 'So1' }] },
    { id: 'So2-So3', label: '安全出力 So2/So3', kind: 'output', channels: [{ output: 'So2' }, { output: 'So3' }] },
  ],
  safety: { pl: 'e', category: '4', sil: 3, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061'] },
  // 60mA（出力負荷は別途）
  loadCurrent: 0.06,
};

export default def;
