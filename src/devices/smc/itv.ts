/**
 * SMC 電空レギュレータ ITV1000 シリーズ（電気信号に比例して二次側の圧力を無段階に制御する減圧弁）の機器定義を作る。
 *
 * 出典: SMC ITV1000/2000/3000 カタログ（ITV-G_EU.pdf・ITV_4017.pdf）・取扱説明書（ITV-E.pdf）・販売店の掲載（ITV1050-312L）
 *   型式: ITV10<圧力範囲>0-<入力信号><モニタ出力><ポート><ケーブル>。例: ITV1050-312L
 *     圧力範囲: 1 = 0.005〜0.1MPa、3 = 0.005〜0.5MPa、5 = 0.005〜0.9MPa / 電源（型式の 0）: DC24V
 *     入力信号: 0 = 電流 4〜20mA、1 = 電流 0〜20mA、2 = 電圧 0〜5V、3 = 電圧 0〜10V
 *     モニタ出力: 1 = アナログ 1〜5V、2 = スイッチ出力 NPN、3 = スイッチ出力 PNP、4 = アナログ 4〜20mA
 *     ポート: 1 = 1/8、2 = 1/4（Rc）。ケーブル: S ストレート 3m、L ライトアングル 3m
 *   電源 DC24V ±10%、消費電流 0.12A 以下。最大流量 200L/min（ANR）
 *   ケーブルの線色: 茶 = 電源 +、白 = 入力信号、青 = GND（コモン）、黒 = モニタ出力
 * 推定: 供給圧力の範囲（出力する圧力 + 0.1MPa 〜 1.0MPa。0.1MPa の機種は 0.2MPa まで）、スイッチ出力の負荷電流（80mA）、
 *   ケーブルの記号（S・L）、外観（正面の表示部）
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { oneTouch, r2, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

const RANGES: Record<string, { max: number; supplyMax: number }> = {
  '1': { max: 0.1, supplyMax: 0.2 },
  '3': { max: 0.5, supplyMax: 1.0 },
  '5': { max: 0.9, supplyMax: 1.0 },
};
const INPUTS: Record<string, { label: string; kind: 'analog-i' | 'analog-v' }> = {
  '0': { label: '電流 4〜20mA', kind: 'analog-i' },
  '1': { label: '電流 0〜20mA', kind: 'analog-i' },
  '2': { label: '電圧 0〜5V', kind: 'analog-v' },
  '3': { label: '電圧 0〜10V', kind: 'analog-v' },
};
const MONITORS: Record<string, { label: string; kind: 'analog-v' | 'analog-i' | 'npn' | 'pnp' }> = {
  '1': { label: 'アナログ 1〜5V', kind: 'analog-v' },
  '4': { label: 'アナログ 4〜20mA', kind: 'analog-i' },
  '2': { label: 'スイッチ出力 NPN', kind: 'npn' },
  '3': { label: 'スイッチ出力 PNP', kind: 'pnp' },
};

export function buildItv1000(type: string): DeviceDefinition {
  const W = 120;
  const H = 136;
  const bx = 30;
  const bw = 60;
  const by = 48;
  const bh = 58;
  const cy = by + 40;
  const cx = bx + bw / 2;
  const thread = (p: ParamValues) => (p.port === '2' ? 'Rc1/4' : 'Rc1/8');
  const rangeOf = (p: ParamValues) => RANGES[String(p.range)] ?? RANGES['5'];
  const leads = [
    { id: 'BN', name: '茶', fill: '#8b4f24', edge: '#4e2a10' },
    { id: 'WH', name: '白', fill: '#f4f4f4', edge: '#8a8a8a' },
    { id: 'BU', name: '青', fill: '#1f5fd6', edge: '#0f3480' },
    { id: 'BK', name: '黒', fill: '#1d1d1d', edge: '#000' },
  ];
  const leadX = (i: number) => W - 36 + i * 9;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    const r = rangeOf(p);
    const input = INPUTS[String(p.input)] ?? INPUTS['3'];
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', od, bx - 2)}
  <!-- 本体（白い樹脂のカバーとアルミのボディ） -->
  <rect x="${bx}" y="${by + 30}" width="${bw}" height="${bh - 30}" rx="2" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.7"/>
  <rect x="${bx}" y="${by}" width="${bw}" height="32" rx="3" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  <rect x="${bx + bw}" y="${cy - 6}" width="${W - bx - bw - 14}" height="12" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${oneTouch(W - 2, cy, 'right', od, 12)}
  <!-- 表示部（圧力の表示と設定キー） -->
  <rect x="${bx + 6}" y="${by + 5}" width="30" height="13" rx="1.4" fill="#141618" stroke="#000" stroke-width="0.5"/>
  ${text(bx + 21, by + 14.5, (r.max * 0.6).toFixed(r.max < 0.2 ? 3 : 2), 8, '#ff5a3c')}
  ${[0, 1].map((i) => `<rect x="${bx + 40 + i * 9}" y="${by + 7}" width="7" height="5" rx="1" fill="#d6d9dc" stroke="#7d8287" stroke-width="0.4"/>`).join('')}
  ${text(bx + 30, by + 26, 'ITV1000', 4.6, '#333')}
  ${smcLogo(bx + 10, by + 26, 4.6)}
  ${text(cx, by + bh - 6, `${input.label}`, 4, '#333', 'normal')}
  ${text(cx, by + bh - 1.5, `0〜${r.max}MPa`, 4, '#333', 'normal')}
  ${text(10, cy - 11, 'SUP', 4.6, '#1f5fa8')}
  ${text(W - 10, cy - 11, 'OUT', 4.6, '#1f5fa8')}
  <!-- 排気（下面。内蔵の排気口から大気へ） -->
  <rect x="${cx - 6}" y="${by + bh}" width="12" height="8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${text(cx, by + bh + 15, 'EXH', 4.2, '#555')}
  <!-- 電源・信号ケーブル（M12 コネクタから上へ、4 芯） -->
  <rect x="${bx + bw - 14}" y="${by - 8}" width="10" height="9" rx="1.6" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <path d="M${bx + bw - 9} ${by - 8} C${bx + bw - 9} ${by - 18} ${W - 22} ${by - 14} ${W - 22} ${by - 22}" fill="none" stroke="#1d1e20" stroke-width="5"/>
  ${leads
    .map((l, i) => {
      const x = leadX(i);
      const d = `M${W - 22 + (i - 1.5) * 1.2} ${by - 21} C${W - 22} ${by - 26} ${x} ${by - 24} ${x} 10`;
      return `<path d="${d}" fill="none" stroke="${l.edge}" stroke-width="2.6"/><path d="${d}" fill="none" stroke="${l.fill}" stroke-width="1.8"/>
  <rect x="${r2(x - 1.5)}" y="2" width="3" height="9" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
    })
    .join('')}`;
  };
  const terminals = (p: ParamValues): TerminalDef[] => {
    const r = rangeOf(p);
    const input = INPUTS[String(p.input)] ?? INPUTS['3'];
    const mon = MONITORS[String(p.monitor)] ?? MONITORS['1'];
    const t = thread(p);
    const dc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4, conductors: [c] });
    return [
      { id: 'BN', label: '茶 +24V', hint: '電源 +24V', note: '茶: 電源 +（DC24V ±10%、0.12A 以下）', x: leadX(0), y: 2, side: 'top', role: 'input', accepts: dc('+') },
      {
        id: 'WH',
        label: `白 入力（${input.label}）`,
        hint: '入力信号',
        note: `白: 入力信号（${input.label}。PLC のアナログ出力から。基準は青 GND）`,
        x: leadX(1),
        y: 2,
        side: 'top',
        role: 'signal',
        signal: { dir: 'in', kind: input.kind, ref: 'BU' },
      },
      { id: 'BU', label: '青 GND', hint: 'GND', note: '青: GND（電源 −・入力信号とモニタ出力のコモン）', x: leadX(2), y: 2, side: 'top', role: 'input', accepts: dc('-') },
      {
        id: 'BK',
        label: `黒 モニタ（${mon.label}）`,
        hint: 'モニタ出力',
        note: `黒: モニタ出力（${mon.label}${mon.kind === 'npn' || mon.kind === 'pnp' ? '。設定した圧力に達すると ON' : '。二次側の圧力に比例。PLC のアナログ入力へ'}）`,
        x: leadX(3),
        y: 2,
        side: 'top',
        role: 'signal',
        optional: true,
        signal: mon.kind === 'npn' || mon.kind === 'pnp' ? { dir: 'out', kind: mon.kind } : { dir: 'out', kind: mon.kind, ref: 'BU' },
      },
      {
        id: 'IN',
        label: 'SUP',
        hint: '供給 SUP',
        note: `供給ポート（${t}。出力する圧力 + 0.1MPa 以上のエアを入れる）`,
        x: 2,
        y: cy,
        side: 'left',
        role: 'air',
        air: { kind: 'in', tubeOD: { param: 'tubeOD' }, thread: t, minPressure: Math.round((Number(p.outMax) + 0.1) * 100) / 100, maxPressure: r.supplyMax },
      },
      { id: 'OUT', label: 'OUT', hint: '出力 OUT', note: `出力ポート（${t}。入力信号に比例した圧力 0〜${r.max}MPa）`, x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'out', tubeOD: { param: 'tubeOD' }, thread: t } },
      { id: 'EXH', label: 'EXH', hint: '排気', note: '排気（二次側の圧力を下げるときに内蔵の排気口から大気へ出す。配管しない）', x: cx, y: by + bh + 8, side: 'bottom', role: 'air', optional: true, air: { kind: 'exhaust' } },
    ];
  };
  return {
    type,
    name: '電空レギュレータ',
    model: 'ITV1030-312S',
    modelOf: (p) => `ITV10${p.range}0-${p.input}${p.monitor}${p.port}${p.cable}`,
    maker: 'SMC',
    category: 'air-supply',
    description:
      'SMC の電空レギュレータ ITV1000 シリーズ。PLC のアナログ出力（電圧・電流）に比例して二次側（OUT）の圧力を 0〜設定範囲の上限まで無段階に変える（押付け力・ブローの強さの制御など）。' +
      'ケーブルは 茶 = +24V、青 = GND、白 = 入力信号（基準は青）、黒 = モニタ出力（アナログは二次側の圧力に比例、スイッチ出力は設定圧力で ON）。' +
      '電源 DC24V ±10%・0.12A 以下。SUP には出力する圧力 + 0.1MPa 以上のエアを入れる。排気は内蔵の排気口から出る。' +
      '空圧回路図では減圧弁の記号で描き、エアの圧力のチェックはパラメータ outMax（使う最大の出力圧力）で行う。',
    estimated: '供給圧力の範囲（出力する圧力 + 0.1MPa〜1.0MPa、0.1MPa の機種は 0.2MPa まで）、スイッチ出力の負荷電流（80mA）、ケーブルの記号（S・L）、外観は推定',
    labelPrefix: 'EPR',
    width: W,
    height: H,
    svg,
    terminals,
    links: (p) => {
      const mon = MONITORS[String(p.monitor)];
      if (mon?.kind === 'npn') return [{ from: 'BK', to: 'BU', switch: 'output' as const, ratedCurrent: 0.08 }];
      if (mon?.kind === 'pnp') return [{ from: 'BK', to: 'BN', switch: 'output' as const, ratedCurrent: 0.08 }];
      return [];
    },
    airLinks: [
      { from: 'IN', to: 'OUT', directed: true, regulate: { param: 'outMax' } },
      { from: 'OUT', to: 'EXH', directed: true },
    ],
    params: [
      {
        key: 'range',
        label: '設定圧力の範囲',
        options: [
          { value: '1', label: '0.005〜0.1MPa（1）' },
          { value: '3', label: '0.005〜0.5MPa（3）' },
          { value: '5', label: '0.005〜0.9MPa（5）' },
        ],
        default: '3',
      },
      {
        key: 'outMax',
        label: '圧力の計算に使う出力圧力',
        unit: 'MPa',
        options: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((v) => ({ value: v })),
        optionsFor: (p) => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].filter((v) => v <= rangeOf(p).max + 1e-9).map((v) => ({ value: v })),
        default: 0.3,
      },
      { key: 'input', label: '入力信号', options: Object.entries(INPUTS).map(([value, x]) => ({ value, label: `${x.label}（${value}）` })), default: '3' },
      { key: 'monitor', label: 'モニタ出力', options: Object.entries(MONITORS).map(([value, x]) => ({ value, label: `${x.label}（${value}）` })), default: '1' },
      {
        key: 'port',
        label: 'ポートのねじ',
        options: [
          { value: '1', label: 'Rc1/8（1）' },
          { value: '2', label: 'Rc1/4（2）' },
        ],
        default: '2',
      },
      tubeOdParam('tubeOD', 'ポートの継手（チューブ外径）', [6, 8], 6),
      {
        key: 'cable',
        label: 'ケーブル',
        options: [
          { value: 'S', label: 'ストレート 3m（S）' },
          { value: 'L', label: 'ライトアングル 3m（L）' },
        ],
        default: 'S',
      },
    ],
    loadCurrent: 0.12,
    pneumatic: { symbol: 'regulator', ports: { in: 'IN', out: 'OUT' } },
  };
}
