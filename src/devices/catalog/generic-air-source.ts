import type { DeviceDefinition, ParamValues } from '../types';

/**
 * エア源（工場エアの取り出し口）。
 * 天井の主管から下ろした配管にボール弁（元弁）が付き、その先のワンタッチ管継手からチューブで装置へ引く姿を描く。
 * 供給圧力（主管の圧力）と出口の継手のチューブ外径を選べる。エア回路のチェックでは、ここから圧力が伝わる。
 */
const W = 120;
const H = 132;
const PX = 30;

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="pipe-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d858c"/>
      <stop offset="0.45" stop-color="#d9dee2"/>
      <stop offset="1" stop-color="#6b7279"/>
    </linearGradient>
    <linearGradient id="brass-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9c7a2c"/>
      <stop offset="0.5" stop-color="#e8cf82"/>
      <stop offset="1" stop-color="#8a6a22"/>
    </linearGradient>
  </defs>
  <!-- 主管（天井から下ろした配管） -->
  <rect x="2" y="4" width="${W - 4}" height="14" rx="3" fill="#a9b0b6" stroke="#5f666c" stroke-width="0.8"/>
  <rect x="2" y="6" width="${W - 4}" height="4" fill="#d6dbdf" opacity="0.8"/>
  <rect x="${PX - 7}" y="16" width="14" height="40" fill="url(#pipe-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  <!-- ボール弁（元弁） -->
  <rect x="${PX - 12}" y="56" width="24" height="28" rx="4" fill="url(#brass-{{uid}})" stroke="#6e5418" stroke-width="0.8"/>
  <rect x="${PX - 3}" y="50" width="6" height="8" fill="#555" />
  <rect x="${PX - 2}" y="44" width="30" height="8" rx="3" fill="#e2552c" stroke="#8f2f12" stroke-width="0.8"/>
  <text x="${PX + 16}" y="50.5" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#fff">開</text>
  <!-- 出口の配管とワンタッチ管継手 -->
  <rect x="${PX - 6}" y="84" width="12" height="22" fill="url(#pipe-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  <rect x="${PX - 9}" y="106" width="18" height="16" rx="2" fill="#e9ecee" stroke="#6b7279" stroke-width="0.8"/>
  <rect x="${PX - 10}" y="118" width="20" height="8" rx="2" fill="#2f7fd8" stroke="#1d4f8a" stroke-width="0.8"/>
  <text x="${PX}" y="116" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#333">φ${p.tubeOD}</text>
  <!-- 圧力の表示（配管の右） -->
  <rect x="${PX + 22}" y="88" width="${W - PX - 24}" height="30" rx="3" fill="#eef7ff" stroke="#2f7fd8" stroke-width="0.8"/>
  <text x="${(PX + 22 + W - 2) / 2}" y="100" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1d4f8a">工場エア</text>
  <text x="${(PX + 22 + W - 2) / 2}" y="112" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#1d4f8a">${p.pressure}MPa</text>`;

const def: DeviceDefinition = {
  type: 'generic.air-source',
  name: 'エア源（工場エア）',
  model: '工場エアの取り出し口',
  category: 'air-supply',
  description:
    '工場の主管から取り出したエアの供給口（ボール弁付き）。エア回路の起点として置き、出口から 3 点セット（フィルタ・レギュレータ）へチューブで引く。供給圧力（主管の圧力）と出口の継手のチューブ外径を選べる。',
  labelPrefix: 'AIR',
  width: W,
  height: H,
  svg,
  params: [
    {
      key: 'pressure',
      label: '供給圧力',
      unit: 'MPa',
      options: [{ value: 0.4 }, { value: 0.5 }, { value: 0.6 }, { value: 0.7 }, { value: 0.8 }],
      default: 0.5,
    },
    {
      key: 'tubeOD',
      label: '出口の継手',
      unit: 'mm',
      options: [
        { value: 6, label: 'φ6' },
        { value: 8, label: 'φ8' },
        { value: 10, label: 'φ10' },
        { value: 12, label: 'φ12' },
      ],
      default: 8,
    },
  ],
  pneumatic: { symbol: 'source', ports: { out: 'OUT' } },
  terminals: [
    {
      id: 'OUT',
      label: 'OUT',
      hint: 'エア出口',
      note: 'エアの出口（供給圧力のエアを送る）',
      x: PX,
      y: 126,
      side: 'bottom',
      role: 'air',
      air: { kind: 'supply', pressure: { param: 'pressure' }, tubeOD: { param: 'tubeOD' } },
    },
  ],
};

export default def;
