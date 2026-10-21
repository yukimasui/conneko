import type { DeviceDefinition } from '../types';

/**
 * 単相100V 電源（建屋の分電盤・コンセントなどからの一次電源）。
 * 盤外の電源引込みを表す概念的なノードで、L/N と PE を出力する。
 * 色は国内の慣例（電圧側 L=黒、接地側 N=白、接地 PE=緑）に合わせる。
 */

const W = 140;
const H = 110;
const TERMINALS = [
  { id: 'L', x: 35, color: '#222', text: '#fff' },
  { id: 'N', x: 70, color: '#eee', text: '#222' },
  { id: 'PE', x: 105, color: '#2a2', text: '#fff' },
];
const TY = 92;

const screw = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="7" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <path d="M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}" stroke="#444" stroke-width="1.4"/>`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2ee"/>
      <stop offset="1" stop-color="#d6d6d0"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="8" fill="url(#body-{{uid}})" stroke="#8a8a84" stroke-width="1.5"/>
  <rect x="10" y="10" width="${W - 20}" height="42" rx="4" fill="#2f3b48"/>
  <path d="M28 16 L20 32 H28 L24 46 L38 26 H30 L34 16 Z" fill="#ffd23f" stroke="#c9a000" stroke-width="0.8"/>
  <text x="44" y="29" font-family="sans-serif" font-size="13" font-weight="bold" fill="#fff">AC 1φ 100V</text>
  <text x="44" y="44" font-family="sans-serif" font-size="8" fill="#c7d2dd">一次電源 分電盤より</text>
  <rect x="14" y="62" width="${W - 28}" height="42" rx="3" fill="#3a3a3a"/>
  ${TERMINALS.map(
    (t) => `
  <rect x="${t.x - 12}" y="64" width="24" height="10" rx="1.5" fill="${t.color}" stroke="#888" stroke-width="0.6"/>
  <text x="${t.x}" y="72" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="${t.text}">${t.id}</text>
  ${screw(t.x, TY)}`,
  ).join('')}
`;

const def: DeviceDefinition = {
  type: 'generic.power-source.1p100v',
  name: '単相100V電源',
  model: 'AC 1φ2W 100V',
  category: 'power-source',
  description: '建屋の分電盤などから引き込む単相2線100Vの一次電源。電圧側(L)・接地側(N)と接地(PE)を出力する。',
  labelPrefix: 'PS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'L', x: 35, y: TY, side: 'bottom', role: 'supply', supply: { system: 'AC', voltage: 100, conductor: 'L' } },
    { id: 'N', x: 70, y: TY, side: 'bottom', role: 'supply', supply: { system: 'AC', voltage: 100, conductor: 'N' } },
    { id: 'PE', x: 105, y: TY, side: 'bottom', role: 'supply', supply: { system: 'AC', voltage: 0, conductor: 'PE' } },
  ],
};

export default def;
