/**
 * SMC 直動式 2 ポート電磁弁 VX21 シリーズ（エア用、N.C.、DC24V、グロメット）。エアブロー・エアの入り切りに使う。
 *
 * 出典: SMC VX2 シリーズ カタログ（CAT.ES70-23「Direct Operated 2 Port Solenoid Valve For Water, Oil, Steam, Air」）・販売店の掲載
 *   VX21（サイズ 1）の消費電力: DC 4.5W（旧 6W）。VX210 = ポート 1/8・オリフィス φ2、VX212 = ポート 1/4
 *   電圧・電気接続は型式の「Z」以下の記号で選ぶ（VX212AZ1J などの掲載）
 * 推定: 型式の電圧・電気接続の記号（Z1A = DC24V・グロメット）、エア用の最高使用圧力差（1.0MPa）、
 *   DC のコイルを無極性とすること、オリフィス φ3 の機種の記号、外観
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { flowArrow, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

export function buildVx21(type: string): DeviceDefinition {
  const W = 96;
  const H = 112;
  const bx = 24;
  const bw = 48;
  const by = 66;
  const bh = 26;
  const cy = by + bh / 2;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const t = p.port === '02' ? 'Rc1/4' : 'Rc1/8';
    return `<defs>${SMC_GRADIENTS}
    <linearGradient id="vx-brass-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f1d9a0"/>
      <stop offset="0.45" stop-color="#d1ab5a"/>
      <stop offset="1" stop-color="#8f6d27"/>
    </linearGradient>
    <linearGradient id="vx-coil-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#14161a"/>
      <stop offset="0.4" stop-color="#3a3e44"/>
      <stop offset="1" stop-color="#121315"/>
    </linearGradient>
  </defs>
  <!-- 継手（IN・OUT のねじに付けたワンタッチ管継手） -->
  <rect x="4" y="${cy - 5}" width="${bx - 4}" height="10" rx="1.4" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="2" y="${cy - 6}" width="3.2" height="12" rx="1" fill="#c7cbcf" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${bx + bw}" y="${cy - 5}" width="${W - bx - bw - 4}" height="10" rx="1.4" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="${W - 5.2}" y="${cy - 6}" width="3.2" height="12" rx="1" fill="#c7cbcf" stroke="#6b7177" stroke-width="0.5"/>
  <!-- ボディ（黄銅） -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="url(#vx-brass-{{uid}})" stroke="#6b4f16" stroke-width="0.8"/>
  ${flowArrow(bx + 6, bx + bw - 6, cy + 6, '#3b2a07')}
  ${text(bx + 7, cy - 3, '1', 5, '#3b2a07')}${text(bx + bw - 7, cy - 3, '2', 5, '#3b2a07')}
  ${text(cx, by + bh + 8, t, 4.4, '#333', 'normal')}
  <!-- チューブ（アーマチュアの筒）とコイル（黒い樹脂のモールド） -->
  <rect x="${cx - 7}" y="${by - 8}" width="14" height="8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - 18}" y="${by - 46}" width="36" height="40" rx="3" fill="url(#vx-coil-{{uid}})" stroke="#000" stroke-width="0.7"/>
  <circle cx="${cx}" cy="${by - 49}" r="4" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${smcLogo(cx, by - 32, 6)}
  ${text(cx, by - 24, `VX21${p.port === '02' ? '2' : '0'}`, 4.6, '#e6e6e6')}
  ${text(cx, by - 17, 'DC24V 4.5W', 3.8, '#c8c8c8', 'normal')}
  ${text(cx, by - 11, 'N.C.', 3.8, '#c8c8c8', 'normal')}
  <!-- グロメットとリード線（2 本、無極性） -->
  <rect x="${cx + 14}" y="${by - 42}" width="7" height="8" rx="1.5" fill="#222" stroke="#000" stroke-width="0.4"/>
  ${[0, 1].map((i) => {
    const x = W - 22 + i * 10;
    const d = `M${cx + 21} ${by - 39 + i * 2} C${W - 24} ${by - 40} ${x} ${by - 44} ${x} 12`;
    return `<path d="${d}" fill="none" stroke="#000" stroke-width="3"/><path d="${d}" fill="none" stroke="#2d2f33" stroke-width="2"/>
  <rect x="${x - 1.5}" y="2" width="3" height="10" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
  }).join('')}`;
  };
  const accepts = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+', '-'] as ('+' | '-')[] };
  const terminals = (p: ParamValues): TerminalDef[] => {
    const t = p.port === '02' ? 'Rc1/4' : 'Rc1/8';
    return [
      { id: 'C1', label: 'リード線 1', hint: 'コイル', note: 'コイルのリード線（無極性。PLC の出力・リレー接点の側か 0V のどちらにつないでもよい）', x: W - 22, y: 2, side: 'top', role: 'input', accepts },
      { id: 'C2', label: 'リード線 2', hint: 'コイル', note: 'コイルのリード線（無極性）', x: W - 12, y: 2, side: 'top', role: 'input', accepts },
      { id: 'IN', label: '1(IN)', hint: '入口 1', note: `入口ポート 1（${t}。元圧側）`, x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'tubeOD' }, thread: t, minPressure: 0, maxPressure: 1.0 } },
      { id: 'OUT', label: '2(OUT)', hint: '出口 2', note: `出口ポート 2（${t}。通電中だけ IN とつながる。ブローノズルなどへ）`, x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' }, thread: t } },
    ];
  };
  return {
    type,
    name: '電磁弁（2 ポート・エアブロー用）',
    model: 'VX210AZ1A',
    modelOf: (p) => `VX21${p.port === '02' ? '2' : '0'}AZ1A`,
    maker: 'SMC',
    category: 'valve',
    description:
      'SMC の直動式 2 ポート電磁弁 VX21 シリーズ（エア用、N.C.: 通電中だけ開く、DC24V・4.5W、グロメット・リード線）。エアブロー・エアの入り切りに使う。' +
      'IN（1）に元圧、OUT（2）にブローノズルなどをつなぐ（逆向きにつながない）。コイルは消費電力が大きい（約 0.19A）ので、PLC のトランジスタ出力の定格・コモンの合計電流を確かめる。',
    estimated: '型式の電圧・電気接続の記号（Z1A = DC24V・グロメット）、エア用の使用圧力範囲（0〜1.0MPa）、コイルを無極性とすること、外観は推定',
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals,
    airLinks: [{ from: 'IN', to: 'OUT', directed: true, valve: 'on' }],
    params: [
      {
        key: 'port',
        label: 'ポートのねじ',
        options: [
          { value: '01', label: 'Rc1/8（VX210）' },
          { value: '02', label: 'Rc1/4（VX212）' },
        ],
        default: '01',
      },
      tubeOdParam('tubeOD', 'ポートの継手（チューブ外径）', [6, 8, 10], 8),
    ],
    loadCurrent: 0.19,
    pneumatic: { symbol: 'valve', ports: { '1': 'IN', '2': 'OUT' }, valve: { ways: 2, positions: 2, operators: { a: 'solenoid', b: 'spring' }, solenoids: { a: 'C1' } } },
    schematic: { elements: [{ kind: 'coil', terminals: ['C1', 'C2'] }] },
  };
}
