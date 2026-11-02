import type { DeviceDefinition } from '../types';
import { text } from '../generic/parts';

/**
 * IDEC φ16 丸形 3 ポジションイネーブルスイッチ HE5B-M2PB（パネル取付け、黒いゴムカバー付き、イネーブル接点 2 回路、はんだ端子）。
 * 左に正面（押しボタン）、右に裏面のはんだ端子（C1・NO1・C2・NO2）を描く（1mm ≒ 2.4px）。
 *
 * 接点（IDEC HE1B/HE5B カタログ）: 3 ポジション（1: 離す=開、2: 半分押す=閉、3: 押し込む=開）のイネーブル接点 2 回路。
 *   端子番号は NO1-C1 間・NO2-C2 間。定格 AC125V / DC30V 1A（販売店の型式表）。
 * 出典: IDEC イネーブルスイッチ HE1B/HE5B カタログ（manualslib の写し）、Distrelec・RS の型式表（HE5B-M2PB、DP3T、1A、IP65）
 */

const W = 150;
const H = 112;

/** 裏面の端子（はんだ端子。並びは推定） */
const TERMS: { id: string; x: number; y: number }[] = [
  { id: 'C1', x: 102, y: 44 },
  { id: 'NO1', x: 122, y: 44 },
  { id: 'C2', x: 102, y: 76 },
  { id: 'NO2', x: 122, y: 76 },
];

const svg = `
  <defs>
    <radialGradient id="he5bboot-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="0.6" stop-color="#2a2c2f"/>
      <stop offset="1" stop-color="#0f1011"/>
    </radialGradient>
    <radialGradient id="he5bbezel-{{uid}}" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#f1f3f5"/>
      <stop offset="0.6" stop-color="#b9bec4"/>
      <stop offset="1" stop-color="#7d838a"/>
    </radialGradient>
    <linearGradient id="he5btab-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b98f3a"/>
      <stop offset="0.5" stop-color="#f4d58a"/>
      <stop offset="1" stop-color="#a87c2a"/>
    </linearGradient>
  </defs>
  <!-- 正面: ベゼルと黒いゴムカバーの押しボタン（φ16） -->
  ${text(40, 14, '正面', 4, '#555', 'normal')}
  <circle cx="40" cy="60" r="30" fill="url(#he5bbezel-{{uid}})" stroke="#5c6166" stroke-width="0.8"/>
  <circle cx="40" cy="60" r="23" fill="url(#he5bboot-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <circle cx="40" cy="60" r="15" fill="none" stroke="#3d4044" stroke-width="1.2"/>
  ${text(40, 100, 'HE5B-M2PB', 4.4, '#222')}
  <!-- 裏面: 本体とはんだ端子 -->
  ${text(112, 14, '裏面（はんだ端子）', 4, '#555', 'normal')}
  <rect x="88" y="22" width="48" height="74" rx="4" fill="#1d1e20" stroke="#000" stroke-width="0.8"/>
  ${TERMS.map(
    (t) => `
  <rect x="${t.x - 3}" y="${t.y - 8}" width="6" height="12" rx="1" fill="url(#he5btab-{{uid}})" stroke="#7a5a10" stroke-width="0.5"/>
  <circle cx="${t.x}" cy="${t.y - 4}" r="1.3" fill="#1d1e20"/>
  ${text(t.x, t.y + 11, t.id, 3.8, '#f0f0f0')}`,
  ).join('')}
  ${text(112, 106, '1A 30VDC / 125VAC', 3.4, '#444', 'normal')}
`;

const RATING = 'AC125V / DC30V 1A';

const def: DeviceDefinition = {
  type: 'idec.he5b-m2pb',
  name: 'イネーブルスイッチ（パネル取付け φ16）',
  model: 'HE5B-M2PB',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC の φ16 丸形 3 ポジションイネーブルスイッチ HE5B-M2PB（パネル取付け、黒いゴムカバー、IP65、はんだ端子）。ティーチングペンダント・操作盤に組み込んで使う。' +
    `イネーブル接点 2 回路（C1-NO1・C2-NO2）は、離す（ポジション 1）と開、半分押す（2）と閉、強く押し込む（3）と開（${RATING}）。` +
    '安全回路では C1-NO1 と C2-NO2 を安全リレー・安全コントローラーの 2 チャンネル入力に 1 回路ずつ入れる（押し込みで強制的に開くため、a 接点でも安全入力に使える）。',
  labelPrefix: 'EN',
  width: W,
  height: H,
  svg,
  terminals: TERMS.map((t) => ({
    id: t.id,
    label: t.id,
    note: `${t.id.startsWith('C') ? '共通' : 'a 接点'}（イネーブル接点 ${t.id.slice(-1)}。ポジション 2 で ${t.id.startsWith('C') ? 'NO' : 'C'}${t.id.slice(-1)} と導通）。${RATING}`,
    x: t.x,
    y: t.y - 8,
    side: 'top' as const,
    role: 'signal' as const,
    wire: { methods: ['bare'], minSq: 0.2, maxSq: 0.5 },
  })),
  // 3 ポジションのイネーブル接点。押し込みで強制的に開く a 接点として directOpening を付ける（HE1G と同じ扱い）
  links: [
    { from: 'C1', to: 'NO1', switch: 'NO', directOpening: true, ratedCurrent: 1 },
    { from: 'C2', to: 'NO2', switch: 'NO', directOpening: true, ratedCurrent: 1 },
  ],
  safety: { standards: ['IEC 60947-5-8', 'IEC 60947-5-1'] },
  schematic: { actuator: 'pushbutton' },
  estimated: '裏面のはんだ端子の並び（カタログの写しは端子番号のみ）、適合電線の太さ',
};

export default def;
