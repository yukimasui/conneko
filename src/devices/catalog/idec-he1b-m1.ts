import type { DeviceDefinition, ParamValues } from '../types';
import { text } from '../generic/parts';

/**
 * IDEC 3 ポジションイネーブルスイッチ HE1B（ベーシックタイプ、ティーチングペンダント・操作箱に組み込む押しボタン形、1 接点、はんだ端子）。
 * 取付けの向きは params の mount で選ぶ（HE1B-M1: 側面取付け / HE1B-M1N: 前面取付け）。
 *
 * 出典: IDEC HE1B シリーズ データシート（Mouser・electronicsdatasheets の写し）、IDEC Enabling Switches の選定ガイド、RS の型式表（HE1B-M1N、SPST、IP40）
 * - 3 ポジション（OFF-ON-OFF）: 離す（1）と開、半分押す（2）と閉、強く押し込む（3）と開。押し込みから戻すときは閉じない
 * - 接点 1 回路（1NO・SPST）、はんだ端子（電線 0.5mm² まで）
 * - 定格: 定格熱電流 5A、AC-12（抵抗負荷）AC125V 3A・AC250V 1.5A、AC-15 AC125V 1.5A、DC-12 DC30V 2A・DC125V 0.4A
 * 推定: 端子番号（1・2 とした）と裏面の端子の位置、外形の見た目。
 * 2 回路のイネーブルスイッチは HE5B（idec.he5b-m2pb）・HE1G（idec.he1g-l21sm）。
 */

const W = 140;
const H = 104;

const TERMS = [
  { id: '1', x: 104, y: 50 },
  { id: '2', x: 124, y: 50 },
];

const isFront = (p: ParamValues) => p.mount === 'front';

function svg(p: ParamValues) {
  const front = isFront(p);
  return `
  <defs>
    <linearGradient id="he1b-btn-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c6066"/>
      <stop offset="0.5" stop-color="#2f3236"/>
      <stop offset="1" stop-color="#16171a"/>
    </linearGradient>
    <linearGradient id="he1b-case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3a3d41"/>
      <stop offset="1" stop-color="#202225"/>
    </linearGradient>
    <linearGradient id="he1b-tab-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b98f3a"/>
      <stop offset="0.5" stop-color="#f4d58a"/>
      <stop offset="1" stop-color="#a87c2a"/>
    </linearGradient>
  </defs>
  ${text(40, 12, front ? '正面（前面取付け）' : '側面（側面取付け）', 4, '#555', 'normal')}
  <!-- 本体（樹脂のケース）と押しボタン（長方形の押し面） -->
  <rect x="14" y="20" width="52" height="66" rx="4" fill="url(#he1b-case-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  <rect x="20" y="28" width="40" height="50" rx="6" fill="url(#he1b-btn-{{uid}})" stroke="#000" stroke-width="0.8"/>
  ${[36, 44, 52, 60, 68].map((y) => `<line x1="25" y1="${y}" x2="55" y2="${y}" stroke="#6b7076" stroke-width="0.8" opacity="0.6"/>`).join('')}
  ${front ? '' : '<rect x="8" y="42" width="6" height="22" rx="1" fill="#2a2c2f" stroke="#000" stroke-width="0.5"/>'}
  ${text(40, 98, 'HE1B', 4.6, '#222')}
  <!-- 裏面のはんだ端子 -->
  ${text(114, 12, '裏面（はんだ端子）', 4, '#555', 'normal')}
  <rect x="90" y="26" width="48" height="50" rx="3" fill="#2a2c2f" stroke="#000" stroke-width="0.8"/>
  ${TERMS.map(
    (t) => `<rect x="${t.x - 3.5}" y="${t.y - 14}" width="7" height="18" rx="1" fill="url(#he1b-tab-{{uid}})" stroke="#7a5a18" stroke-width="0.5"/>
  <circle cx="${t.x}" cy="${t.y - 9}" r="1.6" fill="#2a2c2f"/>
  ${text(t.x, t.y + 12, t.id, 4.6, '#f0f0f0')}`,
  ).join('')}
  ${text(114, 92, 'DC30V 2A / AC125V 3A', 3.4, '#444', 'normal')}
`;
}

const def: DeviceDefinition = {
  type: 'idec.he1b-m1',
  name: 'イネーブルスイッチ（組込み 1 接点）',
  model: 'HE1B-M1',
  modelOf: (p) => (isFront(p) ? 'HE1B-M1N' : 'HE1B-M1'),
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC の 3 ポジションイネーブルスイッチ HE1B（ベーシックタイプ、ティーチングペンダント・操作箱に組み込む押しボタン形、1 接点、はんだ端子）。取付けは params の mount（側面: HE1B-M1 / 前面: HE1B-M1N）。' +
    '接点 1-2 は、離す（ポジション 1）と開、半分押す（2）と閉、強く押し込む（3）と開。定格 DC30V 2A・AC125V 3A（抵抗負荷）、AC-15 AC125V 1.5A。' +
    '押し込みで強制的に開くので a 接点でも安全入力に使えるが、1 接点（1 チャンネル）しかないため、2 チャンネルの安全入力には 2 個使うか 2 接点の HE5B・HE1G を使う。',
  labelPrefix: 'EN',
  width: W,
  height: H,
  svg,
  terminals: TERMS.map((t) => ({
    id: t.id,
    label: t.id,
    note: `イネーブル接点の端子 ${t.id}（ポジション 2 で ${t.id === '1' ? '2' : '1'} と導通。端子番号は推定）。DC30V 2A / AC125V 3A`,
    x: t.x,
    y: t.y - 14,
    side: 'top' as const,
    role: 'signal' as const,
    wire: { methods: ['bare'], minSq: 0.2, maxSq: 0.5 },
  })),
  // 3 ポジションのイネーブル接点。押し込みで強制的に開く a 接点として directOpening を付ける（HE5B・HE1G と同じ扱い）
  links: [{ from: '1', to: '2', switch: 'NO', directOpening: true, ratedCurrent: 2 }],
  params: [
    {
      key: 'mount',
      label: '取付け',
      options: [
        { value: 'side', label: '側面取付け（HE1B-M1）' },
        { value: 'front', label: '前面取付け（HE1B-M1N）' },
      ],
      default: 'side',
    },
  ],
  safety: { standards: ['IEC 60947-5-8', 'IEC 60947-5-1'] },
  schematic: { actuator: 'pushbutton' },
  estimated: '端子番号（1・2 とした）と裏面の端子の位置、外形の見た目、適合電線の太さの下限',
};

export default def;
