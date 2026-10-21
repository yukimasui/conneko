import type { DeviceDefinition } from '../types';

/**
 * IDEC グリップ形イネーブルスイッチ HE1G-L21SM（3 ポジション、モニタスイッチ付き、ネジ端子台形）。
 * 外形はおよそ 長さ174 × 幅46 × 奥行58mm（1mm ≒ 1px に縮小して描く）。
 * 黒いグリップの前面に黄色いシリコンゴムのイネーブルボタン、下端にケーブルグランド（M20）がある。
 * 図はグリップ下部の端子台（1〜6）が見えるようにカバーを外した状態で描く。
 *
 * 端子（データシート「HE1G-L Grip Switch」）:
 *   1-2・3-4: 3 ポジションのイネーブル接点 2 回路（離す=OFF、軽く握る=ON、強く握り込む=OFF）
 *   5-6: モニタスイッチ（b 接点、直接開路動作 70N）
 */

const W = 76;
const H = 210;

const TY = 186;
const TXS = [13, 23, 33, 43, 53, 63];
const IDS = ['1', '2', '3', '4', '5', '6'];

const text = (x: number, y: number, t: string, size: number, fill = '#eee', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 3.4) => `
  <rect x="${x - 4.6}" y="${y - 4.6}" width="9.2" height="9.2" rx="0.8" fill="#2f8f4a"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.4"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="0.8" stroke-linecap="round"/>`;

const svg = `
  <defs>
    <linearGradient id="grip-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121314"/>
      <stop offset="0.3" stop-color="#34373b"/>
      <stop offset="0.6" stop-color="#2a2c2f"/>
      <stop offset="1" stop-color="#0f1011"/>
    </linearGradient>
    <linearGradient id="btn-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9a800"/>
      <stop offset="0.35" stop-color="#ffe14a"/>
      <stop offset="1" stop-color="#d4b000"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- グリップ本体（上が太く、下に向かって細くなる） -->
  <path d="M14 6 Q38 0 62 6 L64 60 Q60 70 60 90 L60 160 Q60 168 54 170 H22 Q16 168 16 160 L16 90 Q16 70 12 60 Z" fill="url(#grip-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <!-- 指掛けの凹凸 -->
  ${[96, 112, 128, 144].map((y) => `<path d="M17 ${y} Q38 ${y + 5} 59 ${y}" fill="none" stroke="#45484c" stroke-width="1.2"/>`).join('')}
  <!-- 黄色いイネーブルボタン -->
  <rect x="24" y="16" width="28" height="64" rx="10" fill="url(#btn-{{uid}})" stroke="#8a7200" stroke-width="0.8"/>
  ${[28, 38, 48, 58, 68].map((y) => `<path d="M28 ${y} H48" stroke="#b39400" stroke-width="0.8" opacity="0.7"/>`).join('')}
  ${text(38, 92, 'IDEC', 6, '#f0f0f0')}
  ${text(38, 160, 'HE1G-L', 4.4, '#cfd2d5', 'middle', 'normal')}

  <!-- 端子台（カバーを外した状態） -->
  <rect x="6" y="170" width="${W - 12}" height="26" rx="2" fill="#1a1b1d" stroke="#000" stroke-width="0.6"/>
  ${TXS.map((x, i) => text(x, 177.5, IDS[i], 4, '#f2f2f2')).join('')}
  ${TXS.map((x) => screw(x, TY)).join('')}
  <!-- ケーブルグランド（M20） -->
  <rect x="26" y="196" width="24" height="10" rx="2" fill="#2b2d30" stroke="#000" stroke-width="0.5"/>
  <rect x="31" y="204" width="14" height="6" fill="#111"/>
`;

const LABELS: Record<string, string> = {
  '1': '1（イネーブル接点 1、3 ポジション・ポジション 2 で閉）',
  '2': '2（イネーブル接点 1、3 ポジション・ポジション 2 で閉）',
  '3': '3（イネーブル接点 2、3 ポジション・ポジション 2 で閉）',
  '4': '4（イネーブル接点 2、3 ポジション・ポジション 2 で閉）',
  '5': '5（モニタスイッチ b 接点・直接開路）',
  '6': '6（モニタスイッチ b 接点・直接開路）',
};

const def: DeviceDefinition = {
  type: 'idec.he1g-l21sm',
  name: 'イネーブルスイッチ（グリップ形）',
  model: 'HE1G-L21SM',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC HE1G-L グリップ形イネーブルスイッチ（3 ポジション、IEC 60947-5-8。HE2B を内蔵）。ロボットの教示など、安全柵の中で機械を動かすときに手に持ち、軽く握っている間（ポジション 2）だけ運転を許可する。離す（ポジション 1）か強く握り込む（ポジション 3）とイネーブル接点が開く。' +
    'イネーブル接点 1-2・3-4 の 2 回路を安全リレー・安全コントローラーの 2 チャンネル入力（例: FS1A の T0→X0、T1→X1）に接続する（DC-13 30V 0.7A）。5-6 はモニタスイッチ（b 接点）。',
  labelPrefix: 'ES',
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
  })),
  // イネーブル接点はポジション 2（軽く握る）でだけ閉じる a 接点。ポジション 2 → 3（握り込み）で強制的に開くため directOpening を付ける。
  // モニタスイッチ 5-6 は b 接点（直接開路）
  links: [
    { from: '1', to: '2', switch: 'NO', directOpening: true },
    { from: '3', to: '4', switch: 'NO', directOpening: true },
    { from: '5', to: '6', switch: 'NC', directOpening: true },
  ],
  safety: { standards: ['IEC 60947-5-8', 'IEC 60204-1'] },
};

export default def;
