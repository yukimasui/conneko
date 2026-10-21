import type { DeviceDefinition } from '../types';

/**
 * オムロン（Sti）ロープ式非常停止スイッチ ER6022-021M（2b1a、電線引込口 M20 × 3、ロープスパン最大 80m）。
 * 外形はおよそ 長さ222〜239 × 幅63 × 高さ96mm。盤外機器なので 1mm ≒ 0.7px に縮小して描く。
 * 黄色いアルミダイカストの筐体で、左端にロープを掛けるアイボルト、正面に張力表示窓と青いリセットボタン、
 * 下面に 3 つの電線引込口がある。図は正面右側の端子部（カバーを外した状態）を見せて描く。
 *
 * 接点（データシート「Contact Arrangements」）: 11-12・21-22 は b 接点（安全回路用）、33-34 は a 接点（補助）。
 * ロープを引いても、ロープが緩んで（切れて）も b 接点が開き、青いリセットボタンを押すまで復帰しない。
 */

const W = 196;
const H = 82;

const BX = 30;
const BY = 18;
const BW = 160;
const BH = 50;

const TY = 52;
const TXS = [104, 118, 132, 146, 160, 174];
const IDS = ['11', '12', '21', '22', '33', '34'];

const text = (x: number, y: number, t: string, size: number, fill = '#111', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 4) => `
  <rect x="${x - 5.4}" y="${y - 5.4}" width="10.8" height="10.8" rx="1" fill="#e8e4d8" stroke="#a49e90" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="0.9" stroke-linecap="round"/>`;

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe04a"/>
      <stop offset="0.5" stop-color="#f6c818"/>
      <stop offset="1" stop-color="#c99a00"/>
    </linearGradient>
    <linearGradient id="steel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f3f4"/>
      <stop offset="0.5" stop-color="#b9bec3"/>
      <stop offset="1" stop-color="#7d8389"/>
    </linearGradient>
    <radialGradient id="blue-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#8fc0ff"/>
      <stop offset="0.6" stop-color="#1f62d1"/>
      <stop offset="1" stop-color="#0c3580"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- ロープとアイボルト（左端） -->
  <path d="M0 43 H10" stroke="#6d7379" stroke-width="2.4" stroke-dasharray="3 1.2"/>
  <circle cx="16" cy="43" r="7" fill="none" stroke="url(#steel-{{uid}})" stroke-width="3.4"/>
  <rect x="22" y="39" width="10" height="8" rx="1" fill="url(#steel-{{uid}})" stroke="#666" stroke-width="0.4"/>

  <!-- 筐体 -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="6" fill="url(#case-{{uid}})" stroke="#8a6a00" stroke-width="0.9"/>
  <rect x="${BX + 4}" y="${BY + 4}" width="${BW - 8}" height="${BH - 8}" rx="4" fill="none" stroke="#d9ac00" stroke-width="0.8"/>
  <!-- 張力表示窓 -->
  <rect x="${BX + 10}" y="${BY + 10}" width="26" height="12" rx="2" fill="#2a2b2d" stroke="#000" stroke-width="0.5"/>
  <rect x="${BX + 13}" y="${BY + 13}" width="6" height="6" fill="#d8231f"/>
  <rect x="${BX + 19}" y="${BY + 13}" width="7" height="6" fill="#2aa84a"/>
  <rect x="${BX + 26}" y="${BY + 13}" width="6" height="6" fill="#d8231f"/>
  <path d="M${BX + 22.5} ${BY + 11} V${BY + 21}" stroke="#fff" stroke-width="1"/>
  <!-- 青いリセットボタン -->
  <circle cx="${BX + 56}" cy="${BY + 25}" r="11" fill="#2a2b2d"/>
  <circle cx="${BX + 56}" cy="${BY + 25}" r="8.5" fill="url(#blue-{{uid}})" stroke="#0a2a66" stroke-width="0.6"/>
  ${text(BX + 56, BY + 44.5, 'RESET', 4, '#4a3a00')}
  ${text(BX + 20, BY + 34, 'Sti', 7, '#222', 'middle', 'bold')}
  ${text(BX + 20, BY + 42, 'ER6022', 4.4, '#222', 'middle', 'normal')}

  <!-- 端子部（カバーを外した状態） -->
  <rect x="96" y="${BY + 4}" width="${BW - 70}" height="${BH - 8}" rx="2" fill="#f2efe6" stroke="#9c978a" stroke-width="0.6"/>
  ${TXS.map((x, i) => text(x, TY - 9, IDS[i], 4.2)).join('')}
  ${text(118, TY - 18, '2NC (11-12, 21-22)', 3.4, '#333', 'middle', 'normal')}
  ${text(167, TY - 18, '1NO', 3.4, '#333', 'middle', 'normal')}
  ${TXS.map((x) => screw(x, TY)).join('')}

  <!-- 電線引込口 M20 × 3（下面） -->
  ${[70, 118, 160].map((x) => `<rect x="${x - 8}" y="${BY + BH}" width="16" height="8" rx="1.5" fill="#3a3c3f" stroke="#111" stroke-width="0.5"/>`).join('')}
`;

const LABELS: Record<string, string> = {
  '11': '11（b 接点 1・直接開路・安全回路）',
  '12': '12（b 接点 1・直接開路・安全回路）',
  '21': '21（b 接点 2・直接開路・安全回路）',
  '22': '22（b 接点 2・直接開路・安全回路）',
  '33': '33（a 接点・補助）',
  '34': '34（a 接点・補助）',
};

const def: DeviceDefinition = {
  type: 'omron.er6022-021m',
  name: 'ロープ式非常停止スイッチ',
  model: 'ER6022-021M 2b1a',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン（Sti）ER6022 ロープ式非常停止スイッチ（コンベヤ沿いなどに張ったロープを引くと非常停止する。ロープスパン最大 80m、IP67、黄色のアルミダイカスト）。' +
    '接点は b 接点 11-12・21-22（安全回路用）と a 接点 33-34（補助、PLC への状態入力など）。AC240V 3A / DC24V 2.5A。ロープを引いても緩んでも（切れても）b 接点が開き、青いリセットボタンで復帰する。' +
    '2 チャンネルで 11-12 を安全リレーの CH1（T11-T12 など）、21-22 を CH2（T21-T22）に接続する。',
  labelPrefix: 'EMG',
  width: W,
  height: H,
  svg,
  terminals: IDS.map((id, i) => ({
    id,
    label: LABELS[id],
    x: TXS[i],
    y: TY,
    side: 'bottom' as const,
    role: 'signal' as const,
    optional: id === '33' || id === '34',
  })),
  // 運転状態（適正張力）で b 接点 11-12・21-22 が閉、a 接点 33-34 が開。b 接点は直接開路動作
  links: [
    { from: '11', to: '12', switch: 'NC', directOpening: true },
    { from: '21', to: '22', switch: 'NC', directOpening: true },
    { from: '33', to: '34', switch: 'NO' },
  ],
  safety: { standards: ['IEC 60947-5-5', 'ISO 13850'] },
};

export default def;
