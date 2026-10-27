import type { DeviceDefinition, ParamValues } from '../types';
import { sensorCable, type Lead } from '../keyence/sensor-parts';

/**
 * フロートスイッチ（汎用品、リードスイッチ式、1 接点、ケーブル 2 芯）。
 * ステム（ガイドパイプ）に沿って磁石入りのフロートが液面とともに上下し、ステムの中のリードスイッチを開閉する。
 * タンク・クーラントの液面の上限・下限の検出に使う。ステムの上のねじ部（ナット）でタンクの天板・側面に取り付ける。
 *
 * 汎用品の代表的な姿と定格（無電圧の 1 接点、接点容量 AC/DC 100V 0.5A・10W 程度）を書いた。メーカーにより定格・線色は異なるので、
 * 実機の定格（とくに誘導負荷・ランプ負荷での開閉電流）は製品の資料で確かめる（定格は推定）。
 * a 接点（液面上昇で閉）/ b 接点（液面上昇で開）は params の contact で選ぶ（実機はフロートを上下逆に付け替えて切り換えるものが多い）。
 */

const W = 100;
const H = 170;
const SX = 35;

const leads: Lead[] = [
  { color: 'BK', label: '接点', role: 'out', signal: { dir: 'out', kind: 'contact' }, note: 'リードスイッチの接点（無電圧接点。極性なし）' },
  { color: 'WH', label: '接点', role: 'out', signal: { dir: 'out', kind: 'contact' }, note: 'リードスイッチの接点（無電圧接点。極性なし）' },
];
const cable = sensorCable({ cx: 80, y0: 112, yFan: 136, yEnd: H - 3, pitch: 13, centerX: 72, vmin: 0, vmax: 100, leads });

function svg(p: ParamValues) {
  const b = p.contact === 'b';
  const wave = Array.from({ length: 6 }, (_, i) => `q2.5 ${i % 2 ? 2 : -2} 5 0`).join(' ');
  return `
  <defs>
    <linearGradient id="fsstem-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.4" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
    <linearGradient id="fsfloat-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9c4a8"/>
      <stop offset="0.4" stop-color="#fbf8e8"/>
      <stop offset="1" stop-color="#b5b096"/>
    </linearGradient>
  </defs>
  <!-- 液（タンクの中） -->
  <path d="M6 88 ${wave} V128 H6 Z" fill="#9fd0f2" opacity="0.55"/>
  <path d="M6 88 ${wave}" fill="none" stroke="#3f8fd0" stroke-width="0.8"/>
  <text x="8" y="124" font-family="sans-serif" font-size="3.4" fill="#2a6ea8">液面</text>
  <!-- タンクの天板 -->
  <rect x="4" y="36" width="62" height="4" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <!-- ケーブル（ステムの上から出て右へ回り、下で芯線に分かれる） -->
  <path d="M${SX} 18 C${SX} 6 80 6 80 30 V112" fill="none" stroke="#0e0e0f" stroke-width="7.6" stroke-linecap="round"/>
  <path d="M${SX} 18 C${SX} 6 80 6 80 30 V112" fill="none" stroke="#2b2c2e" stroke-width="6.2" stroke-linecap="round"/>
  ${cable.svg}
  <!-- 取付ねじ部とナット -->
  <rect x="${SX - 6}" y="18" width="12" height="18" rx="1" fill="url(#fsstem-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  ${[21, 24, 27, 30, 33].map((y) => `<line x1="${SX - 6}" y1="${y}" x2="${SX + 6}" y2="${y + 0.8}" stroke="#7d8287" stroke-width="0.45"/>`).join('')}
  <rect x="${SX - 10}" y="40" width="20" height="6" rx="0.8" fill="url(#fsstem-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${SX - 10}" y="30" width="20" height="6" rx="0.8" fill="url(#fsstem-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  <!-- ステム（中にリードスイッチ） -->
  <rect x="${SX - 3.5}" y="46" width="7" height="72" rx="1.5" fill="url(#fsstem-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  <!-- フロート（磁石入り） -->
  <rect x="${SX - 13}" y="74" width="26" height="24" rx="6" fill="url(#fsfloat-{{uid}})" stroke="#8a8468" stroke-width="0.7"/>
  <line x1="${SX - 13}" y1="86" x2="${SX + 13}" y2="86" stroke="#a49e80" stroke-width="0.5"/>
  <!-- ストッパー -->
  <rect x="${SX - 6}" y="104" width="12" height="3.5" rx="1" fill="#6d7277"/>
  <rect x="${SX - 6}" y="64" width="12" height="3.5" rx="1" fill="#6d7277"/>
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">フロートスイッチ・${b ? 'b 接点（上昇で開）' : 'a 接点（上昇で閉）'}</text>`;
}

const def: DeviceDefinition = {
  type: 'generic.float-switch',
  name: 'フロートスイッチ',
  model: 'リードスイッチ式 1 接点（汎用）',
  modelOf: (p) => `フロートスイッチ ${p.contact === 'b' ? 'b 接点' : 'a 接点'}`,
  category: 'sensor',
  description:
    '汎用のフロートスイッチ（リードスイッチ式、無電圧の 1 接点、ケーブル 2 芯）。タンクやクーラントの液面の上限・下限を検出する。' +
    'params の contact で a 接点（液面が上がってフロートが上がると閉じる）/ b 接点（上がると開く）を選ぶ。' +
    '接点は極性のない無電圧接点なので、片方の芯線を +24V（または PLC 入力の COM と反対の極）、もう片方を PLC の入力につなぐ。' +
    'リードスイッチの接点容量は小さい（代表的な汎用品で AC/DC 100V 0.5A・10W 程度。推定）ので、電磁弁・ランプなどを直接開閉せず PLC 入力かリレーで受ける。' +
    '線色・定格はメーカーにより異なるため、実機の資料で確かめる。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  links: (p) => [{ from: 'BK', to: 'WH', switch: p.contact === 'b' ? 'NC' : 'NO', ratedCurrent: 0.5 }],
  params: [
    {
      key: 'contact',
      label: '接点',
      options: [
        { value: 'a', label: 'a 接点（液面上昇で閉）' },
        { value: 'b', label: 'b 接点（液面上昇で開）' },
      ],
      default: 'a',
    },
  ],
  estimated: '汎用品の代表的な定格（接点容量 AC/DC 100V 0.5A・10W 程度）と線色（黒・白）。実機の資料で確かめる',
};

export default def;
