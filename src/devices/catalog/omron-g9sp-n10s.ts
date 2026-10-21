import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * オムロン セーフティコントローラ G9SP-N10S（スタンドアロン形、安全入力 10・テスト出力 4・安全出力 4・標準出力 4）。
 * 外形は 幅86 × 高さ90（取付けタブ込み 110）× 奥行85mm（1mm ≒ 2px）。
 * 上下に M3 ネジの千鳥 2 段端子台、左側にメモリカセットスロット・USB・プッシュスイッチ・DIP スイッチ、
 * 中央に動作表示 LED とオプションボードスロット、右側に増設 I/O ユニット接続コネクタがある。
 *
 * 端子配列（データシート F42I-E-05「Terminal Arrangement」）:
 *   上段 外側: V1 G1 Si1 Si3 Si5 Si7 Si9 T1 T3 / 内側: NC Si0 Si2 Si4 Si6 Si8 T0 T2
 *   下段 内側: NC So0 So2 O0 O2 NC NC / 外側: V2 G2 So1 So3 O1 O3 NC
 */

const W = 176;
const H = 204;
/** 本体の上下（上下の取付けタブを除く） */
const BY0 = 12;
const BY1 = 192;

const P = 15.2; // 端子ピッチ 7.6mm
const TOP_OUT_Y = 22;
const TOP_IN_Y = 37;
const TOP_OUT_X0 = 40;
const TOP_IN_X0 = TOP_OUT_X0 + P / 2;
const BOT_IN_Y = 165;
const BOT_OUT_Y = 180;
const BOT_OUT_X0 = 64;
const BOT_IN_X0 = BOT_OUT_X0 + P / 2;

const TOP_OUT = ['V1', 'G1', 'Si1', 'Si3', 'Si5', 'Si7', 'Si9', 'T1', 'T3'];
const TOP_IN = ['NC', 'Si0', 'Si2', 'Si4', 'Si6', 'Si8', 'T0', 'T2'];
const BOT_IN = ['NC', 'So0', 'So2', 'O0', 'O2', 'NC', 'NC'];
const BOT_OUT = ['V2', 'G2', 'So1', 'So3', 'O1', 'O3', 'NC'];

const xs = (x0: number, n: number) => Array.from({ length: n }, (_, i) => +(x0 + i * P).toFixed(1));

const screw = (x: number, y: number, r = 5.2) => `
  <rect x="${x - 6.8}" y="${y - 6.8}" width="13.6" height="13.6" rx="1" fill="#141516"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.1" stroke-linecap="round"/>`;

const text = (x: number, y: number, t: string, size: number, fill = '#111', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 千鳥 2 段の端子名の印字帯（各ラベルは対応するネジの真下／真上に置く） */
const labelStrip = (y: number, lines: { x0: number; names: string[] }[]) => {
  const x0 = Math.min(...lines.map((l) => l.x0)) - P / 2;
  const x1 = Math.max(...lines.map((l) => l.x0 + (l.names.length - 1) * P)) + P / 2;
  let s = `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="14" rx="0.8" fill="#e4e5e6" stroke="#8a8d90" stroke-width="0.5"/>`;
  lines.forEach((l, li) => {
    const ly = y + 6 + li * 6.6;
    xs(l.x0, l.names.length).forEach((x, i) => {
      s += `<rect x="${x - P / 2 + 0.6}" y="${ly - 4.6}" width="${P - 1.2}" height="5.8" fill="none" stroke="#9a9da1" stroke-width="0.35"/>`;
      s += text(x, ly, l.names[i], 4, '#111');
    });
  });
  return s;
};

/** 動作表示 LED（MS・FORCE・LOCK・ERR/ALM・MC・COMM） */
const LEDS: [string, string][] = [
  ['MS', '#36d655'],
  ['FORCE', '#4a4a2a'],
  ['LOCK', '#4a4a2a'],
  ['ERR/ALM', '#4a2a2a'],
  ['MC', '#4a4a2a'],
  ['COMM', '#4a4a2a'],
];

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3d41"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2d30"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 取付けタブ（左上・右下） -->
  <rect x="2" y="0" width="22" height="16" rx="3" fill="#2c2e31" stroke="#111" stroke-width="0.6"/>
  <circle cx="13" cy="7" r="3.4" fill="#b8bdc2" stroke="#444" stroke-width="0.5"/>
  <rect x="${W - 24}" y="${H - 16}" width="22" height="16" rx="3" fill="#2c2e31" stroke="#111" stroke-width="0.6"/>
  <circle cx="${W - 13}" cy="${H - 7}" r="3.4" fill="#b8bdc2" stroke="#444" stroke-width="0.5"/>

  <!-- 本体 -->
  <rect x="1" y="${BY0}" width="${W - 2}" height="${BY1 - BY0}" rx="3" fill="url(#case-{{uid}})" stroke="#0d0d0e" stroke-width="1"/>

  <!-- 左側: ロゴ・メモリカセット・USB・スイッチ -->
  ${text(5, 24, 'OMRON', 5.4, '#e8eaec', 'start')}
  ${text(6, 31, 'G9SP', 4.6, '#f2c500', 'start')}
  <rect x="5" y="44" width="22" height="22" rx="1.5" fill="#1a1b1d" stroke="#4d5054" stroke-width="0.6"/>
  ${text(16, 57, 'MEMORY', 3, '#9aa0a6', 'middle', 'normal')}
  <rect x="5" y="72" width="22" height="30" rx="1.5" fill="#1a1b1d" stroke="#4d5054" stroke-width="0.6"/>
  <rect x="10" y="80" width="12" height="11" rx="1" fill="#c6cace" stroke="#555" stroke-width="0.5"/>
  <rect x="13" y="83" width="6" height="5" fill="#222"/>
  ${text(16, 98, 'USB', 3.4, '#c9cdd1', 'middle', 'normal')}
  <circle cx="12" cy="110" r="4" fill="#3d4044" stroke="#111" stroke-width="0.6"/>
  <rect x="19" y="105" width="8" height="12" rx="0.8" fill="#e8e8e8" stroke="#555" stroke-width="0.4"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="20.5" y="${106.2 + i * 2.7}" width="2.6" height="1.8" fill="#333"/>`).join('')}
  <rect x="5" y="124" width="22" height="34" rx="1.5" fill="#2e3034" stroke="#4d5054" stroke-width="0.6"/>

  <!-- 上段端子台 -->
  <rect x="${TOP_OUT_X0 - 10}" y="${BY0 + 1}" width="${8 * P + 20}" height="34" rx="1.5" fill="url(#tb-{{uid}})" stroke="#0a0a0a" stroke-width="0.6"/>
  ${xs(TOP_OUT_X0, TOP_OUT.length).map((x) => screw(x, TOP_OUT_Y)).join('')}
  ${xs(TOP_IN_X0, TOP_IN.length).map((x) => screw(x, TOP_IN_Y)).join('')}
  ${labelStrip(46, [
    { x0: TOP_OUT_X0, names: TOP_OUT },
    { x0: TOP_IN_X0, names: TOP_IN },
  ])}

  <!-- 中央: 動作表示 LED・オプションボードスロット・増設コネクタ -->
  ${LEDS.map(([n, c], i) => `<rect x="34" y="${66 + i * 10}" width="5" height="3.4" rx="0.5" fill="${c}" stroke="#111" stroke-width="0.3"/>${text(42, 69 + i * 10, n, 3.4, '#d9dcdf', 'start', 'normal')}`).join('')}
  <rect x="66" y="66" width="76" height="62" rx="2" fill="#2f3236" stroke="#55585c" stroke-width="0.7"/>
  ${Array.from({ length: 18 }, (_, i) => `<circle cx="${84 + (i % 6) * 8}" cy="${88 + Math.floor(i / 6) * 8}" r="1.6" fill="none" stroke="#7c8086" stroke-width="0.6"/>`).join('')}
  ${text(104, 75, 'OPTION', 3.4, '#8e9399', 'middle', 'normal')}
  <rect x="150" y="70" width="18" height="56" rx="1.5" fill="#2a2c2f" stroke="#55585c" stroke-width="0.6"/>
  ${text(159, 100, 'EXP', 3.2, '#8e9399', 'middle', 'normal')}
  ${text(104, 136, 'SAFETY CONTROLLER  G9SP-N10S', 4, '#d9dcdf', 'middle', 'normal')}

  <!-- 下段端子台 -->
  ${labelStrip(141, [
    { x0: BOT_IN_X0, names: BOT_IN },
    { x0: BOT_OUT_X0, names: BOT_OUT },
  ])}
  <rect x="${BOT_OUT_X0 - 10}" y="158" width="${6.5 * P + 20}" height="${BY1 - 159}" rx="1.5" fill="url(#tb-{{uid}})" stroke="#0a0a0a" stroke-width="0.6"/>
  ${xs(BOT_IN_X0, BOT_IN.length).map((x) => screw(x, BOT_IN_Y)).join('')}
  ${xs(BOT_OUT_X0, BOT_OUT.length).map((x) => screw(x, BOT_OUT_Y)).join('')}
`;

const KIND_LABEL: Record<string, string> = {
  Si: '安全入力',
  T: 'テスト出力',
  So: '安全出力',
  O: '標準出力（非安全）',
};
const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };
const POWER_LABEL: Record<string, string> = {
  V1: 'V1（内部・入力回路用 +24V）',
  G1: 'G1（内部・入力回路用 0V）',
  V2: 'V2（出力回路用 +24V）',
  G2: 'G2（出力回路用 0V）',
};

const terminal = (id: string, x: number, y: number, side: 'top' | 'bottom'): TerminalDef | undefined => {
  if (id === 'NC') return undefined; // 使用しない（接続禁止）
  if (id in POWER_LABEL) {
    return {
      id,
      label: POWER_LABEL[id],
      x,
      y,
      side,
      role: 'input',
      accepts: { ...power, conductors: [id.startsWith('V') ? '+' : '-'] },
    };
  }
  const kind = id.replace(/\d+$/, '');
  return { id, label: `${id}（${KIND_LABEL[kind]}）`, x, y, side, role: 'signal', optional: true };
};

const row = (names: string[], x0: number, y: number, side: 'top' | 'bottom') =>
  names.map((n, i) => terminal(n, xs(x0, names.length)[i], y, side)).filter((t): t is TerminalDef => !!t);

const def: DeviceDefinition = {
  type: 'omron.g9sp-n10s',
  name: 'セーフティコントローラ',
  model: 'G9SP-N10S',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロン G9SP シリーズのスタンドアロン形セーフティコントローラ。安全入力 Si0〜Si9、テスト出力 T0〜T3（T3 はムーティングランプ用 300mA）、安全出力 So0〜So3（PNP 各 0.8A）、標準出力 O0〜O3。' +
    '電源は V1/G1（内部・入力回路用）と V2/G2（出力回路用）の 2 系統でいずれも DC24V（20.4〜26.4V）。PL e / カテゴリ4、SIL3。' +
    '配線例（データシート）: 非常停止の b 接点 11-12 を T0→Si0、21-22 を T1→Si1、リセットスイッチを T2→Si2、接触器 KM1・KM2 の b 接点（ミラー接点）を直列にして T3→Si3（EDM）、So0→KM1、So1→KM2 のコイルを駆動して G2 に戻す。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals: [
    ...row(TOP_OUT, TOP_OUT_X0, TOP_OUT_Y, 'top'),
    ...row(TOP_IN, TOP_IN_X0, TOP_IN_Y, 'top'),
    ...row(BOT_IN, BOT_IN_X0, BOT_IN_Y, 'bottom'),
    ...row(BOT_OUT, BOT_OUT_X0, BOT_OUT_Y, 'bottom'),
  ],
  // N10S の消費電流 400mA（V1 300mA、V2 100mA。出力負荷電流は別途）
  loadCurrent: 0.4,
};

export default def;
