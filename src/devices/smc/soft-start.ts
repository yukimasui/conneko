/**
 * SMC のソフトスタート弁 AV2000（残圧排気弁を兼ねる 3 ポート電磁弁。電磁弁で開閉する形）。
 * 3 点セットの後ろに置き、通電すると二次側（OUT）へ少しずつ給気して、二次側の圧力が一次側のおよそ半分になると全開にする
 * （シリンダの飛び出しを防ぐ）。通電をやめると元圧（IN）を遮断し、二次側の残圧を EXH から抜く。
 *
 * 出典（検索結果の要約で確かめた範囲。この環境からはメーカーの PDF を直接読めなかった）:
 *   SMC ソフトスタート弁 AV2000・3000・4000・5000 シリーズ（AV2000-02-5DZ の製品ページ・販売店の掲載）
 *     型式: AV2000-<ポート 01 / 02>-<電圧 5 = DC24V><電気接続 D = DIN 形ターミナル><Z = 表示灯・サージ電圧保護回路付き>
 *     使用圧力 0.2〜1.0MPa、耐圧 1.5MPa、周囲温度 0〜60℃。コイル DC24V・1.8W、許容電圧変動 −15%〜+10%。
 *     ポート Rc1/4（AV2000-02）、圧力計ポート 1/8。2(A) → 3(R) の有効断面積 24mm²。手動操作はプッシュ式
 *
 * 絵は正面から見た姿: アルミのボディ（左に IN、右に OUT、下に EXH）、上にパイロット弁と DIN 形ターミナル（黒）、
 * 右上に立ち上がりの速さを調整するニードル。
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { coilAccepts } from './sy-common';
import { flowArrow, oneTouch, RC, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

/** DC24V・1.8W */
const AV_COIL_CURRENT = 0.075;

export function buildAv2000(type: string): DeviceDefinition {
  const W = 112;
  const H = 120;
  const bx = 20;
  const bw = W - bx * 2;
  const by = 46;
  const bh = 46;
  const py = by + 24;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    return `<defs>${SMC_GRADIENTS}
    <linearGradient id="av-din-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c3f44"/>
      <stop offset="1" stop-color="#141517"/>
    </linearGradient>
  </defs>
  <rect x="12" y="${py - 8}" width="${bx - 10}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${W - bx - 2}" y="${py - 8}" width="${bx - 10}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  ${oneTouch(2, py, 'left', od, 10)}
  ${oneTouch(W - 2, py, 'right', od, 10)}
  <!-- ボディ（アルミ） -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.8"/>
  ${flowArrow(bx + 6, bx + bw - 6, by + 8)}
  ${text(bx + 8, by + 19, '1', 4.4, '#1f5fa8')}
  ${text(bx + bw - 8, by + 19, '2', 4.4, '#1f5fa8')}
  ${text(cx, by + bh - 12, 'AV2000', 5, '#333')}
  ${smcLogo(cx, by + bh - 4, 4.4)}
  <!-- パイロット弁と DIN 形ターミナル（表示灯付き） -->
  <rect x="${bx + 6}" y="${by - 10}" width="34" height="10" fill="#55595e" stroke="#2a2c2f" stroke-width="0.5"/>
  <rect x="${bx + 4}" y="6" width="38" height="30" rx="2.5" fill="url(#av-din-{{uid}})" stroke="#0b0c0d" stroke-width="0.7"/>
  <circle cx="${bx + 23}" cy="20" r="3" fill="#b9bec3" stroke="#555" stroke-width="0.5"/>
  <path d="M${bx + 21.2} 20 H${bx + 24.8} M${bx + 23} 18.2 V21.8" stroke="#555" stroke-width="0.6"/>
  <rect x="${bx + 9}" y="10" width="6" height="4" rx="1" fill="#ff4a3d" opacity="0.9"/>
  ${text(bx + 23, 32, 'DIN', 3.4, '#ccc', 'normal')}
  <!-- 立ち上がりの速さのニードル -->
  <rect x="${W - bx - 22}" y="${by - 8}" width="10" height="8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${W - bx - 24}" y="${by - 20}" width="14" height="12" rx="2" fill="url(#smc-knob-{{uid}})" stroke="#0b0c0d" stroke-width="0.5"/>
  ${text(W - bx - 17, by - 23, '速さ', 3.4, '#444', 'normal')}
  <!-- EXH ポート（下面、ねじ） -->
  <rect x="${cx - 7}" y="${by + bh}" width="14" height="10" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${by + bh + 6}" r="3.4" fill="#3b3f43"/>
  ${text(cx + 15, by + bh + 8, '3 EXH', 4.2, '#c62020')}
  ${text(9, py - 11, 'IN', 5, '#1f5fa8')}
  ${text(W - 9, py - 11, 'OUT', 5, '#1f5fa8')}
  ${text(cx, H - 4, '通電: 徐々に給気 / 切: 残圧排気', 4, '#444', 'normal')}`;
  };
  return {
    type,
    name: 'ソフトスタート弁（残圧排気・電磁式）',
    model: 'AV2000-02-5DZ',
    modelOf: (p) => `AV2000-${p.port}-5DZ`,
    maker: 'SMC',
    category: 'air-supply',
    description:
      'SMC のソフトスタート弁 AV2000（残圧排気弁を兼ねる 3 ポート電磁弁、DC24V・1.8W、DIN 形ターミナル・表示灯・サージ電圧保護回路付き）。3 点セットの後ろ（電磁弁の手前）に置く。' +
      '通電すると IN → OUT へ少しずつ給気し、二次側の圧力が一次側のおよそ半分になると全開にする（立ち上がりの速さはニードルで調整。シリンダの飛び出しを防ぐ）。' +
      '通電をやめると元圧を遮断し、二次側の残圧を EXH から抜く（非常停止・保守のときの残圧排気）。使用圧力 0.2〜1.0MPa。' +
      'コイルの端子は DIN 形ターミナルの 1（+）・2（−）。IN・OUT の Rc ねじにワンタッチ管継手を付けたものとし、継手のチューブ外径をパラメータで選ぶ。EXH にはサイレンサを付ける。',
    estimated: 'コイルの極性（1 = +、2 = −）、EXH ポートのねじ（IN・OUT と同じとした）、外観は推定',
    labelPrefix: 'AV',
    width: W,
    height: H,
    svg,
    terminals: (p) => {
      const port = String(p.port);
      return [
        { id: '1', label: '1(+)', hint: 'コイル+', note: 'DIN 形ターミナルの 1（コイル +。DC24V）', x: bx + 14, y: 6, side: 'top', role: 'input', accepts: { ...coilAccepts('+'), minVoltage: 20.4 } },
        { id: '2', label: '2(−)', hint: 'コイル−', note: 'DIN 形ターミナルの 2（コイル −）', x: bx + 32, y: 6, side: 'top', role: 'input', accepts: { ...coilAccepts('-'), minVoltage: 20.4 } },
        { id: 'IN', label: '1(IN)', hint: '一次側 IN', note: `一次側（${RC[port]}。3 点セットの OUT から）`, x: 2, y: py, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'tubeOD' }, thread: RC[port], minPressure: 0.2, maxPressure: 1.0 } },
        { id: 'OUT', label: '2(OUT)', hint: '二次側 OUT', note: `二次側（${RC[port]}。電磁弁・マニホールドへ）`, x: W - 2, y: py, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' }, thread: RC[port] } },
        { id: 'EXH', label: '3(EXH)', hint: '排気 EXH', note: `排気ポート（${RC[port]}。サイレンサを付ける）`, x: cx, y: by + bh + 10, side: 'bottom', role: 'air', air: { kind: 'exhaust', thread: RC[port] } },
      ];
    },
    airLinks: [
      { from: 'IN', to: 'OUT', directed: true, valve: 'on' },
      { from: 'OUT', to: 'EXH', directed: true, valve: 'off' },
    ],
    params: [
      {
        key: 'port',
        label: 'ポート',
        options: [
          { value: '01', label: '01（Rc1/8）' },
          { value: '02', label: '02（Rc1/4）' },
        ],
        default: '02',
      },
      tubeOdParam('tubeOD', 'IN・OUT の継手', [6, 8, 10], 8),
    ],
    loadCurrent: AV_COIL_CURRENT,
    schematic: { elements: [{ kind: 'coil', terminals: ['1', '2'] }] },
    pneumatic: {
      symbol: 'soft-start',
      ports: { in: 'IN', out: 'OUT', exh: 'EXH' },
      valve: { ways: 3, positions: 2, operators: { a: 'solenoid', b: 'spring' }, solenoids: { a: '1' } },
    },
  };
}
