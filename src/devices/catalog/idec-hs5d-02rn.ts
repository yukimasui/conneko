import type { DeviceDefinition } from '../types';

/**
 * IDEC 小形セーフティインタロックスイッチ HS5D-02RN（2b、樹脂ヘッド、電線引込口 G1/2、M3 ネジ端子）。
 * 外形は 幅30 × 高さ91 × 奥行30mm（1mm ≒ 2px）。濃いグレーの本体に赤橙色のヘッド。
 * 図は本体正面のカバーを外して端子台が見える状態で描き、ヘッド上面に別売のアクチュエータ（HS9Z-A51 ストレート）を差し込んでいる。
 * 端子は主回路 11-12・モニタ回路 21-22 で、いずれも直接開路動作の b 接点（アクチュエータが抜けると開く）。
 */

const W = 64;
const H = 210;

/** 本体（ヘッド込み）の左上 */
const BX = 2;
const BY = 26;
const BW = 60;
/** 端子ネジ（左から 11 12 21 22） */
const TY = 150;
const TXS = [11, 25, 39, 53];
const IDS = ['11', '12', '21', '22'];

const text = (x: number, y: number, t: string, size: number, fill = '#eee', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 4.4) => `
  <rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="1" fill="#d8d4c8"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

const directOpening = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="#222" stroke-width="0.6"/>
  <path d="M${x - 2} ${y} H${x + 1.6} M${x + 0.2} ${y - 1.3} L${x + 1.8} ${y} L${x + 0.2} ${y + 1.3}" fill="none" stroke="#222" stroke-width="0.6"/>`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2d3034"/>
      <stop offset="0.15" stop-color="#4a4e54"/>
      <stop offset="0.85" stop-color="#44484e"/>
      <stop offset="1" stop-color="#2a2d31"/>
    </linearGradient>
    <linearGradient id="head-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c2361b"/>
      <stop offset="0.15" stop-color="#ec5530"/>
      <stop offset="0.85" stop-color="#e44f2b"/>
      <stop offset="1" stop-color="#b52f16"/>
    </linearGradient>
    <linearGradient id="metal-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.5" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#8d9399"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- アクチュエータ（HS9Z-A51 ストレート）: 黒い樹脂の取付部と金属の舌片 -->
  <rect x="14" y="2" width="36" height="9" rx="2" fill="#1d1e20" stroke="#000" stroke-width="0.5"/>
  <circle cx="19" cy="6.5" r="2" fill="#777"/>
  <circle cx="45" cy="6.5" r="2" fill="#777"/>
  <path d="M27 11 H37 V30 L35 33 H29 L27 30 Z" fill="url(#metal-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="30" y="18" width="4" height="7" rx="1" fill="#555"/>

  <!-- ヘッド（赤橙、上面にアクチュエータ挿入口） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="40" rx="3" fill="url(#head-{{uid}})" stroke="#7d1f0d" stroke-width="0.8"/>
  <rect x="24" y="${BY - 1}" width="16" height="6" rx="1" fill="#2a2a2a"/>
  <rect x="${BX + 4}" y="${BY + 30}" width="${BW - 8}" height="4" rx="1" fill="#a52a12" opacity="0.6"/>
  <circle cx="${BX + 8}" cy="${BY + 33}" r="2.2" fill="#3a3a3a"/>
  <circle cx="${BX + BW - 8}" cy="${BY + 33}" r="2.2" fill="#3a3a3a"/>

  <!-- 本体 -->
  <rect x="${BX}" y="${BY + 38}" width="${BW}" height="${H - BY - 52}" rx="3" fill="url(#body-{{uid}})" stroke="#15171a" stroke-width="0.8"/>
  ${text(BX + 6, BY + 52, 'IDEC', 7, '#f0f0f0', 'start')}
  ${text(BX + 6, BY + 60, 'HS5D-02RN', 4.6, '#d9dcdf', 'start', 'normal')}

  <!-- 端子部（カバーを外した状態） -->
  <rect x="${BX + 3}" y="${BY + 68}" width="${BW - 6}" height="66" rx="2" fill="#efece4" stroke="#9c978a" stroke-width="0.7"/>
  ${text(18, BY + 77, 'Main', 3.6, '#333', 'middle', 'normal')}
  ${text(46, BY + 77, 'Monitor', 3.6, '#333', 'middle', 'normal')}
  <!-- b 接点の記号と直接開路マーク -->
  ${[18, 46]
    .map(
      (x) => `
  <path d="M${x - 9} ${BY + 86} H${x - 4} L${x + 6} ${BY + 90} M${x + 4} ${BY + 86} H${x + 9} M${x + 4} ${BY + 86} V${BY + 90}" fill="none" stroke="#222" stroke-width="0.8"/>
  ${directOpening(x, BY + 97)}`,
    )
    .join('')}
  ${TXS.map((x, i) => text(x, TY - 9, IDS[i], 4.6, '#111')).join('')}
  ${TXS.map((x) => screw(x, TY)).join('')}

  <!-- 電線引込口（G1/2） -->
  <rect x="${BX + 16}" y="${H - 16}" width="${BW - 32}" height="14" rx="2" fill="#3a3d41" stroke="#15171a" stroke-width="0.6"/>
  <circle cx="${W / 2}" cy="${H - 9}" r="5" fill="#111" stroke="#666" stroke-width="0.6"/>
`;

const def: DeviceDefinition = {
  type: 'idec.hs5d-02rn',
  name: 'セーフティインタロックスイッチ',
  model: 'HS5D-02RN 2b',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC HS5D シリーズの小形セーフティインタロックスイッチ（安全ドアスイッチ、樹脂ヘッド、G1/2、M3 ネジ端子）。扉側にアクチュエータ（HS9Z-A51 など）を付け、扉を開けてアクチュエータが抜けると b 接点が強制的に開く。' +
    '主回路 11-12・モニタ回路 21-22 はいずれも直接開路動作（IEC 60947-5-1）の b 接点（DC-13 30V 4A）。ヘッドを外すと 11-12 が開く。' +
    '2 チャンネルで使う場合は 11-12 と 21-22 を安全リレーの CH1（例: T11-T12）・CH2（T21-T22）に 1 回路ずつ接続する。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: IDS.map((id, i) => ({
    id,
    label: `${id}（${i < 2 ? '主回路' : 'モニタ回路'} b 接点・直接開路）`,
    x: TXS[i],
    y: TY,
    side: 'bottom' as const,
    role: 'signal' as const,
  })),
  // アクチュエータ挿入（扉閉）で閉じている b 接点（直接開路動作）
  links: [
    { from: '11', to: '12', switch: 'NC', directOpening: true },
    { from: '21', to: '22', switch: 'NC', directOpening: true },
  ],
  safety: { standards: ['IEC 60947-5-1', 'ISO 14119'] },
  schematic: { actuator: 'limit' },
};

export default def;
