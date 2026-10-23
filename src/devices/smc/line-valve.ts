/**
 * SMC の配管の途中に入れる手動弁・逆止弁: 残圧排気弁 VHS、フィンガバルブ（ボール弁）VHK2、逆止弁 AKH。
 *
 * 出典:
 *   VHS: SMC Air Combination カタログ（AC-B_EU.pdf）の付属品「Pressure Relief 3 Port Valve: (V)」
 *     型式 VHS + ボディサイズ - ポートサイズ + A（例: VHS30-03A）。VHS20: IN・OUT 1/8・1/4、EXH 1/8 / VHS30: 1/4・3/8、EXH 1/4 / VHS40: 1/4・3/8・1/2、EXH 3/8
 *     ハンドルを回して元圧を遮断し、二次側の残圧を EXH から抜く。排気した位置で南京錠（キー）を掛けられる
 *   VHK2: SMC フィンガバルブ VHK シリーズ（VHK2-□F-□F: 2 ポート、両側ワンタッチ管継手）
 *   AKH: SMC ワンタッチ管継手付き逆止弁 AKH シリーズ（AKH□-00: 両側ワンタッチ管継手）
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { flowArrow, oneTouch, RC, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* 残圧排気弁 VHS                                                       */
/* ------------------------------------------------------------------ */

const VHS_BODIES = ['20-01', '20-02', '30-02', '30-03', '40-02', '40-03', '40-04'];
const VHS_EXH: Record<string, string> = { '20': '01', '30': '02', '40': '03' };

export function buildVhs(type: string): DeviceDefinition {
  const W = 84;
  const H = 112;
  const bx = 18;
  const bw = W - bx * 2;
  const by = 22;
  const bh = 52;
  const py = by + 22;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const [size] = String(p.body).split('-');
    const od = Number(p.tubeOD);
    const hy = by + 24;
    return `<defs>${SMC_GRADIENTS}
    <radialGradient id="vhs-red-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#ff8a7a"/>
      <stop offset="0.5" stop-color="#d7261e"/>
      <stop offset="1" stop-color="#7f0e0a"/>
    </radialGradient>
  </defs>
  <rect x="10" y="${py - 8}" width="${bx - 8}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${W - bx - 2}" y="${py - 8}" width="${bx - 8}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  ${oneTouch(2, py, 'left', od, 10)}
  ${oneTouch(W - 2, py, 'right', od, 10)}
  <!-- ボディ（白） -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  ${flowArrow(bx + 5, bx + bw - 5, by + 5)}
  ${text(bx + 8, by + 15, 'SUP', 4.4, '#1f5fa8')}
  ${text(bx + bw - 8, by + 15, 'EXH', 4.4, '#c62020')}
  <!-- ハンドル（赤。SUP の位置。つまみの先にキー（南京錠）の穴） -->
  <circle cx="${cx}" cy="${hy}" r="15" fill="url(#vhs-red-{{uid}})" stroke="#5e0b08" stroke-width="0.7"/>
  <rect x="${cx - 4.5}" y="${hy - 21}" width="9" height="30" rx="3" fill="#c81f18" stroke="#5e0b08" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${hy - 16}" r="2.2" fill="#3a0605"/>
  <circle cx="${cx}" cy="${hy}" r="3" fill="#8f1510"/>
  ${text(cx, by + bh - 4, `VHS${size}`, 4.6, '#333')}
  ${smcLogo(bx + bw - 9, by + bh - 4, 4.2)}
  <!-- EXH ポート（下面、ねじ） -->
  <rect x="${cx - 7}" y="${by + bh}" width="14" height="10" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${by + bh + 6}" r="3.4" fill="#3b3f43"/>
  ${text(cx + 15, by + bh + 8, 'EXH', 4.4, '#c62020')}
  ${text(9, py - 11, 'IN', 5, '#1f5fa8')}
  ${text(W - 9, py - 11, 'OUT', 5, '#1f5fa8')}
  ${text(cx, H - 6, 'SUP: 通す / EXH: 遮断して排気', 4.4, '#444', 'normal')}`;
  };
  return {
    type,
    name: '残圧排気弁（3 ポート手動弁）',
    model: 'VHS20-02A',
    modelOf: (p) => `VHS${p.body}A`,
    maker: 'SMC',
    category: 'air-supply',
    description:
      'SMC の残圧排気弁 VHS シリーズ（3 ポート手動弁、ロック穴付き）。3 点セットの後ろ（または電磁弁の手前）に置き、保守のときにハンドルを EXH へ回すと、元圧（IN）を遮断して二次側（OUT）の残圧を EXH から大気へ抜く。' +
      '排気した位置で南京錠を掛けられ、作業中に誤ってエアを入れないようにできる。ハンドルが SUP のときは IN → OUT へ通す。EXH ポートにはサイレンサ（AN シリーズ）を付ける。' +
      'IN・OUT の Rc ねじにワンタッチ管継手を付けたものとし、継手のチューブ外径をパラメータで選ぶ。',
    labelPrefix: 'VHS',
    width: W,
    height: H,
    svg,
    terminals: (p) => {
      const [size, port] = String(p.body).split('-');
      return [
        { id: 'IN', label: 'IN', hint: '一次側 IN', note: '一次側（3 点セットの OUT から）', x: 2, y: py, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'tubeOD' }, thread: RC[port], minPressure: 0.1, maxPressure: 1.0 } },
        { id: 'OUT', label: 'OUT', hint: '二次側 OUT', note: '二次側（電磁弁などへ。EXH にすると残圧を抜く）', x: W - 2, y: py, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' }, thread: RC[port] } },
        { id: 'EXH', label: 'EXH', hint: '排気 EXH', note: `排気ポート（${RC[VHS_EXH[size]]}。サイレンサを付ける）`, x: cx, y: by + bh + 10, side: 'bottom', role: 'air', air: { kind: 'exhaust', thread: RC[VHS_EXH[size]] } },
      ];
    },
    airLinks: [
      { from: 'IN', to: 'OUT', directed: true, valve: 'on' },
      { from: 'OUT', to: 'EXH', directed: true, valve: 'off' },
    ],
    params: [
      {
        key: 'body',
        label: 'サイズ・ポート',
        options: VHS_BODIES.map((b) => {
          const [size, port] = b.split('-');
          return { value: b, label: `VHS${size}（${RC[port]}）` };
        }),
        default: '20-02',
      },
      tubeOdParam('tubeOD', 'IN・OUT の継手', [6, 8, 10, 12], 8),
    ],
    pneumatic: { symbol: 'residual-valve', ports: { in: 'IN', out: 'OUT', exh: 'EXH' } },
    estimated: '使用圧力範囲（0.1〜1.0MPa）とハンドルの色・形は推定',
  };
}

/* ------------------------------------------------------------------ */
/* フィンガバルブ VHK2（2 ポート、ボール弁）                             */
/* ------------------------------------------------------------------ */

export function buildVhk2(type: string): DeviceDefinition {
  const W = 84;
  const H = 52;
  const cy = 32;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', od, 16)}
  ${oneTouch(W - 2, cy, 'right', od, 16)}
  <rect x="18" y="${cy - 9}" width="${W - 36}" height="18" rx="3" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  <!-- ハンドル（流れの向きと平行で「開」） -->
  <rect x="${cx - 16}" y="${cy - 19}" width="32" height="8" rx="3" fill="#ef7d1a" stroke="#8a4205" stroke-width="0.6"/>
  <rect x="${cx - 3}" y="${cy - 12}" width="6" height="4" fill="#55595e"/>
  ${text(cx, cy - 13.2, '開 OPEN', 4.4, '#fff')}
  ${flowArrow(cx - 12, cx + 12, cy + 2, '#555')}
  ${text(cx, H - 2, `VHK2 φ${od}`, 4.6, '#333')}`;
  };
  return {
    type,
    name: 'フィンガバルブ（ボール弁）',
    model: 'VHK2-06F-06F',
    modelOf: (p) => `VHK2-${pad2(Number(p.tubeOD))}F-${pad2(Number(p.tubeOD))}F`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のフィンガバルブ VHK2 シリーズ（2 ポート、両側ワンタッチ管継手）。チューブの途中に入れる小形の手動ボール弁で、ハンドルを流れの向きに合わせると開（通す）、直角にすると閉（止める）。' +
      '向きはなく、どちらからでも流せる。残圧を抜くには 3 ポートの VHK3 や残圧排気弁 VHS を使う。',
    labelPrefix: 'BV',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'IN', label: '1', hint: 'ポート 1', note: 'ポート 1（上流側）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'tubeOD' }, maxPressure: 1.0 } },
      { id: 'OUT', label: '2', hint: 'ポート 2', note: 'ポート 2（下流側）', x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' }, maxPressure: 1.0 } },
    ],
    airLinks: [{ from: 'IN', to: 'OUT', valve: 'on' }],
    params: [tubeOdParam('tubeOD', 'チューブ外径', [4, 6, 8, 10, 12], 6)],
    pneumatic: { symbol: 'shutoff', ports: { in: 'IN', out: 'OUT' } },
    estimated: '最高使用圧力 1.0MPa とハンドルの色は推定',
  };
}

/* ------------------------------------------------------------------ */
/* 逆止弁 AKH                                                           */
/* ------------------------------------------------------------------ */

export function buildAkh(type: string): DeviceDefinition {
  const W = 84;
  const H = 40;
  const cy = 18;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', od, 16)}
  ${oneTouch(W - 2, cy, 'right', od, 16)}
  <rect x="18" y="${cy - 8}" width="${W - 36}" height="16" rx="7" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  <!-- 逆止弁の記号（ボールと弁座）と流れの向き -->
  <circle cx="${cx - 4}" cy="${cy}" r="3.4" fill="none" stroke="#222" stroke-width="0.8"/>
  <path d="M${cx + 2} ${cy - 5} L${cx - 2} ${cy} L${cx + 2} ${cy + 5}" fill="none" stroke="#222" stroke-width="0.8"/>
  ${flowArrow(cx + 4, cx + 15, cy, '#1f5fa8')}
  ${text(cx, H - 3, `AKH φ${od}　IN → OUT`, 4.6, '#333')}`;
  };
  return {
    type,
    name: '逆止弁（ワンタッチ管継手付き）',
    model: 'AKH06-00',
    modelOf: (p) => `AKH${pad2(Number(p.tubeOD))}-00`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のワンタッチ管継手付き逆止弁 AKH シリーズ（両側ワンタッチ管継手）。IN → OUT の向きにだけ流し、逆向きの流れを止める。' +
      '元圧が下がったときにタンク・シリンダの圧力を保つ、別系統からの逆流を防ぐ、などに使う。ボディの矢印の向きに合わせてつなぐ。',
    labelPrefix: 'CV',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'IN', label: 'IN', hint: '入口 IN', note: '入口（この向きから流れる）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'tubeOD' }, maxPressure: 1.0 } },
      { id: 'OUT', label: 'OUT', hint: '出口 OUT', note: '出口（ここから入ってくるエアは止める）', x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' } } },
    ],
    airLinks: [{ from: 'IN', to: 'OUT', directed: true }],
    params: [tubeOdParam('tubeOD', 'チューブ外径', [4, 6, 8, 10, 12], 6)],
    pneumatic: { symbol: 'check-valve', ports: { in: 'IN', out: 'OUT' } },
    estimated: '最高使用圧力 1.0MPa は推定',
  };
}

