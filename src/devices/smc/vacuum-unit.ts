/**
 * SMC 真空ユニット ZK2（エジェクタシステム、単体）。真空エジェクタに供給弁（真空の入り切り）と破壊弁（ワークを離すときに
 * 真空を破壊するエア）を一体にしたもの。サイレンサ排気。
 *
 * 出典: SMC 真空エジェクタ ZK2 シリーズ カタログ（es100-102-zk2.pdf）・取扱説明書（ZK2-SMX04EN）・販売店の掲載（ZK2A10K5NL2A-07-K）
 *   ノズル径: 07 = φ0.7、10 = φ1.0、12 = φ1.2、15 = φ1.5。定格電圧 DC24V（型式の 5）。供給弁 N.C.・破壊弁 N.C.
 *   パイロット・真空のポートは φ4 などのワンタッチ管継手
 * 推定: 型式の記号の並び（ZK2A<ノズル>K5N-<V の継手>。K・N の意味、圧力スイッチなし）、供給圧力の範囲（0.3〜0.6MPa）、
 *   弁の消費電力（0.4W・約 17mA）・リード線の色（赤 +・黒 −）、SUP の継手、外観
 *
 * エアのポート: SUP（供給）・V（真空）・EXH（内蔵サイレンサの排気）。破壊弁は SUP のエアを V へ流して真空を破壊するが、
 * 真空のポートは圧力の計算の対象外なので、機器の中の通り道は SUP → EXH（供給弁が開いた位置）だけを書く。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { coilAccepts, leadTip, leadWire, lPlug } from './sy-common';
import { oneTouch, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function buildZk2(type: string): DeviceDefinition {
  const W = 128;
  const H = 120;
  const bx = 18;
  const bw = 70;
  const by = 56;
  const bh = 34;
  const cy = by + bh / 2;
  /** リード線の先（供給弁 S+・S−、破壊弁 R+・R−）の x */
  const tips = [26, 38, 60, 72];
  const svg = (p: ParamValues) => {
    const vac = Number(p.vacTube);
    const sup = Number(p.supTube);
    const valve = (x: number, label: string) => `
  <rect x="${x}" y="${by - 20}" width="28" height="20" rx="1.6" fill="url(#zk-pilot-{{uid}})" stroke="#111" stroke-width="0.6"/>
  ${text(x + 14, by - 6, label, 4.2, '#eee')}
  ${lPlug(x + 3, by - 32, 22, 12)}`;
    return `<defs>${SMC_GRADIENTS}
    <linearGradient id="zk-pilot-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595e"/>
      <stop offset="0.5" stop-color="#36393c"/>
      <stop offset="1" stop-color="#1f2123"/>
    </linearGradient>
  </defs>
  ${oneTouch(2, cy, 'left', sup, bx - 2)}
  <!-- 本体（エジェクタ・弁のベース） -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  ${smcLogo(bx + 14, by + 12, 5)}
  ${text(bx + bw / 2 + 8, by + 12, `ZK2A${p.nozzle}`, 4.8, '#222')}
  ${text(bx + bw / 2, by + 22, 'ノズル φ' + (Number(p.nozzle) / 10).toFixed(1), 3.8, '#444', 'normal')}
  ${text(bx + 8, by + bh - 4, 'SUP', 4, '#1f5fa8', 'bold', 'start')}
  <!-- 真空ポート V（下面） -->
  ${oneTouch(bx + bw / 2, H - 2, 'bottom', vac, H - 2 - by - bh)}
  ${text(bx + bw / 2 + 10, H - 6, 'V', 5, '#7b3fa0')}
  <!-- サイレンサ（排気） -->
  <rect x="${bx + bw}" y="${cy - 9}" width="6" height="18" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <rect x="${bx + bw + 6}" y="${cy - 8}" width="${W - bx - bw - 10}" height="16" rx="4" fill="#1f2022" stroke="#000" stroke-width="0.5"/>
  ${Array.from({ length: 5 }, (_, i) => `<line x1="${bx + bw + 11 + i * 6}" y1="${cy - 6}" x2="${bx + bw + 11 + i * 6}" y2="${cy + 6}" stroke="#efefe8" stroke-width="1.5"/>`).join('')}
  ${text(W - 14, cy + 15, 'EXH', 4.2, '#555')}
  <!-- 供給弁・破壊弁（L 形プラグ付き）とリード線 -->
  ${valve(bx + 2, '供給')}
  ${valve(bx + 34, '破壊')}
  ${leadWire(bx + 2 + 10, by - 32, tips[0], 12, 'red')}${leadWire(bx + 2 + 18, by - 32, tips[1], 12, 'black')}
  ${leadWire(bx + 34 + 10, by - 32, tips[2], 12, 'red')}${leadWire(bx + 34 + 18, by - 32, tips[3], 12, 'black')}
  ${tips.map((x) => leadTip(x, 2, 'up')).join('')}`;
  };
  const coil = (id: string, x: number, what: string, c: '+' | '-'): TerminalDef => ({
    id,
    label: id.replace('-', '−'),
    hint: `${what}${c === '+' ? '+' : '−'}`,
    note: `${what}のソレノイド（${c === '+' ? '赤 +' : '黒 −'}）`,
    x,
    y: 2,
    side: 'top',
    role: 'input',
    accepts: coilAccepts(c),
  });
  return {
    type,
    name: '真空エジェクタ（真空ユニット・電磁弁付き）',
    model: 'ZK2A10K5N-06',
    modelOf: (p) => `ZK2A${p.nozzle}K5N-${pad2(Number(p.vacTube))}`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC の真空ユニット ZK2（エジェクタシステム、サイレンサ排気）。真空エジェクタに、真空を入り切りする供給弁と、ワークを離すときに真空を破壊する破壊弁（どちらも N.C.・DC24V）が付いている。' +
      'SUP に圧縮エアを入れ、供給弁（S+・S−）に通電すると V に真空ができる。吸着をやめるときは供給弁を切り、破壊弁（R+・R−）に短い時間通電する（供給弁と破壊弁を同時に通電しない）。' +
      'V を吸着パッドへチューブでつなぐ（途中に真空用圧力スイッチを入れて吸着を確かめる）。排気は内蔵のサイレンサから出る。',
    estimated: '型式の記号の並び（ZK2A<ノズル>K5N-<V の継手>）、供給圧力の範囲（0.3〜0.6MPa）、弁の消費電力（0.4W）とリード線の色、継手の外径、外観は推定',
    labelPrefix: 'EJ',
    width: W,
    height: H,
    svg,
    terminals: [
      coil('S+', tips[0], '供給弁', '+'),
      coil('S-', tips[1], '供給弁', '-'),
      coil('R+', tips[2], '破壊弁', '+'),
      coil('R-', tips[3], '破壊弁', '-'),
      { id: 'SUP', label: 'SUP', hint: '供給 SUP', note: '供給ポート（圧縮エアを入れる。供給弁・破壊弁の元圧）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'supTube' }, minPressure: 0.3, maxPressure: 0.6 } },
      { id: 'V', label: 'V', hint: '真空 V', note: '真空ポート（吸着パッドへ）', x: bx + bw / 2, y: H - 2, side: 'bottom', role: 'air', air: { kind: 'vacuum', tubeOD: { param: 'vacTube' } } },
      { id: 'EXH', label: 'EXH', hint: '排気 EXH', note: '排気（内蔵サイレンサから大気へ。配管しない）', x: W - 2, y: cy, side: 'right', role: 'air', optional: true, air: { kind: 'exhaust' } },
    ],
    airLinks: [{ from: 'SUP', to: 'EXH', directed: true, valve: 'on' }],
    params: [
      {
        key: 'nozzle',
        label: 'ノズル径',
        options: [
          { value: '07', label: 'φ0.7（07）' },
          { value: '10', label: 'φ1.0（10）' },
          { value: '12', label: 'φ1.2（12）' },
          { value: '15', label: 'φ1.5（15）' },
        ],
        default: '10',
      },
      tubeOdParam('supTube', 'SUP の継手', [6, 8], 6),
      tubeOdParam('vacTube', 'V の継手', [4, 6, 8], 6),
    ],
    loadCurrent: 0.017,
    pneumatic: { symbol: 'vacuum-ejector', ports: { in: 'SUP', vac: 'V', exh: 'EXH' } },
    schematic: {
      elements: [
        { kind: 'coil', terminals: ['S+', 'S-'] },
        { kind: 'coil', terminals: ['R+', 'R-'] },
      ],
    },
  };
}
