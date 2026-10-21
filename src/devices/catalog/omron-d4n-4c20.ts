import type { DeviceDefinition } from '../types';

/**
 * オムロン 安全リミットスイッチ D4N-4C20（2b1a スローアクション、電線引込口 M20、ローラレバー形 樹脂レバー・樹脂ローラ）。
 * 本体は 幅31 × 高さ55 × 奥行30mm（1mm ≒ 2px）。黒い樹脂の本体とヘッドに、回転するローラレバーが付く。
 * 図は本体正面のカバーを外して端子が見える状態で描く。
 *
 * 接点（データシート CSM_D4N_DS_E）: 11-12・21-22 は直接開路動作の b 接点（⊖マーク）、33-34 は a 接点。
 * 可動部（扉やテーブル）がレバーを押すと b 接点が強制的に開く。
 */

const W = 120;
const H = 206;

const BX = 6;
const BW = 62;
const HEAD_Y = 52;
const BODY_Y = 96;
const BODY_H = 96;

const TY = 160;
const TXS = [13, 22, 31, 40, 49, 58];
const IDS = ['11', '12', '21', '22', '33', '34'];

const text = (x: number, y: number, t: string, size: number, fill = '#eee', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 3.3) => `
  <rect x="${x - 4.2}" y="${y - 4.2}" width="8.4" height="8.4" rx="0.8" fill="#d8d4c8"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.4"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="0.8" stroke-linecap="round"/>`;

const directOpening = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="2.8" fill="none" stroke="#222" stroke-width="0.5"/>
  <path d="M${x - 1.8} ${y} H${x + 1.4} M${x + 0.2} ${y - 1.1} L${x + 1.6} ${y} L${x + 0.2} ${y + 1.1}" fill="none" stroke="#222" stroke-width="0.5"/>`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141516"/>
      <stop offset="0.15" stop-color="#34373b"/>
      <stop offset="0.85" stop-color="#2e3134"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <radialGradient id="roller-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="1" stop-color="#151617"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- ローラレバー（ヘッドの軸から右上へ） -->
  <path d="M${BX + BW / 2} ${HEAD_Y + 18} L${BX + BW / 2 + 52} ${HEAD_Y - 30}" stroke="#1d1e20" stroke-width="7" stroke-linecap="round"/>
  <circle cx="${BX + BW / 2 + 52}" cy="${HEAD_Y - 30}" r="15" fill="url(#roller-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <circle cx="${BX + BW / 2 + 52}" cy="${HEAD_Y - 30}" r="3" fill="#8d9298"/>
  <!-- ヘッド -->
  <rect x="${BX + 4}" y="${HEAD_Y}" width="${BW - 8}" height="${BODY_Y - HEAD_Y + 2}" rx="4" fill="url(#body-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <circle cx="${BX + BW / 2}" cy="${HEAD_Y + 18}" r="9" fill="#1d1e20" stroke="#55585c" stroke-width="0.8"/>
  <circle cx="${BX + BW / 2}" cy="${HEAD_Y + 18}" r="3.4" fill="#9aa0a6"/>
  <!-- 本体 -->
  <rect x="${BX}" y="${BODY_Y}" width="${BW}" height="${BODY_H}" rx="3" fill="url(#body-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <rect x="${BX + 5}" y="${BODY_Y + 5}" width="${BW - 10}" height="16" rx="1" fill="#c9ccd0"/>
  ${text(BX + BW / 2, BODY_Y + 12, 'OMRON', 5, '#111')}
  ${text(BX + BW / 2, BODY_Y + 18.6, 'D4N-4C20', 4, '#111', 'middle', 'normal')}
  <!-- 端子部（カバーを外した状態） -->
  <rect x="${BX + 3}" y="${BODY_Y + 26}" width="${BW - 6}" height="48" rx="1.5" fill="#efece4" stroke="#9c978a" stroke-width="0.6"/>
  ${text(17.5, BODY_Y + 34, 'NC', 3.6, '#c0161b')}
  ${text(35.5, BODY_Y + 34, 'NC', 3.6, '#c0161b')}
  ${directOpening(17.5, BODY_Y + 42)}
  ${directOpening(35.5, BODY_Y + 42)}
  ${text(53.5, BODY_Y + 34, 'NO', 3.6, '#333')}
  ${TXS.map((x, i) => text(x, TY - 6, IDS[i], 3.6, '#111')).join('')}
  ${TXS.map((x) => screw(x, TY)).join('')}
  <!-- 電線引込口（M20） -->
  <rect x="${BX + BW / 2 - 9}" y="${BODY_Y + BODY_H}" width="18" height="10" rx="1.5" fill="#3a3c3f" stroke="#000" stroke-width="0.5"/>
  <circle cx="${BX + BW / 2}" cy="${BODY_Y + BODY_H + 5}" r="3.4" fill="#111"/>
`;

const LABELS: Record<string, string> = {
  '11': '11（b 接点 1・直接開路）',
  '12': '12（b 接点 1・直接開路）',
  '21': '21（b 接点 2・直接開路）',
  '22': '22（b 接点 2・直接開路）',
  '33': '33（a 接点）',
  '34': '34（a 接点）',
};

const def: DeviceDefinition = {
  type: 'omron.d4n-4c20',
  name: '安全リミットスイッチ',
  model: 'D4N-4C20 2b1a',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン D4N 安全リミットスイッチ（樹脂ローラレバー形、スローアクション、電線引込口 M20、IP67）。扉・可動テーブルなどの位置検出に使い、レバーが押されると b 接点が強制的に開く（直接開路動作、IEC 60947-5-1 附属書 K）。' +
    '接点は b 接点 11-12・21-22 と a 接点 33-34（AC-15 240V 3A）。安全回路では 11-12 と 21-22 を安全リレーの 2 チャンネル入力に 1 回路ずつ接続し、33-34 は PLC への状態入力などに使う。図ではレバーが押されていない状態として接点を閉とみなす。',
  labelPrefix: 'LS',
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
  links: [
    { from: '11', to: '12' },
    { from: '21', to: '22' },
    { from: '33', to: '34' },
  ],
};

export default def;
