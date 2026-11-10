/**
 * SMC の 2 色表示式 高精度デジタル圧力スイッチ ISE30A（正圧用）。
 * 30mm 角の黒い本体の正面に 2 色（赤/緑）表示の 4 桁の液晶と ▲・▼・SET のボタンがあり、下からエアのポート（R1/8 おねじ・ワンタッチ管継手）、
 * 背面からコネクタ付きリード線（2m）が出る姿を描く（図ではリード線を下へ引き出す）。
 *
 * 出典（検索結果の要約で確かめた範囲。この環境からはメーカーの PDF を直接読めなかった）:
 *   SMC ZSE30A(F)/ISE30A シリーズ カタログ（ISE30A.pdf・ZSE30A-ISE30A-B_EU.pdf）、取扱説明書（PS※※-OML0003）
 *     定格圧力範囲 −0.100〜1.000MPa、耐圧 1.5MPa。電源電圧 DC12〜24V ±10%（リップル 10% 以下、逆接続保護あり）、消費電流 40mA 以下
 *     スイッチ出力: NPN または PNP オープンコレクタ 1 出力・2 出力。最大負荷電流 80mA、最大印加電圧 28V（NPN）、残留電圧 1V 以下（負荷電流 80mA 時）
 *     出力の記号: N = NPN 1 出力、P = PNP 1 出力、A = NPN 2 出力、B = PNP 2 出力
 *     アナログ出力: 電圧 1〜5V ±2.5%F.S.（出力インピーダンス約 1kΩ）、電流 4〜20mA
 *     リード線: 茶 DC(+)、青 DC(−)、黒 OUT1、白 OUT2（2 出力・アナログ出力の形式）
 */
import { sensorCable, sensorOutputLinks, type Lead } from '../keyence/sensor-parts';
import type { DeviceDefinition, ParamValues, SignalSpec, TerminalDef } from '../types';
import { oneTouch, SMC_GRADIENTS, text } from './parts';

/** 出力の記号 → 仕様 */
const OUTPUTS: Record<string, { label: string; kind: 'npn' | 'pnp'; second?: 'switch' | 'analog-v' | 'analog-i' }> = {
  N: { label: 'N（NPN 1 出力）', kind: 'npn' },
  P: { label: 'P（PNP 1 出力）', kind: 'pnp' },
  A: { label: 'A（NPN 2 出力）', kind: 'npn', second: 'switch' },
  B: { label: 'B（PNP 2 出力）', kind: 'pnp', second: 'switch' },
  C: { label: 'C（NPN 1 出力 + アナログ電圧 1〜5V）', kind: 'npn', second: 'analog-v' },
  D: { label: 'D（NPN 1 出力 + アナログ電流 4〜20mA）', kind: 'npn', second: 'analog-i' },
  E: { label: 'E（PNP 1 出力 + アナログ電圧 1〜5V）', kind: 'pnp', second: 'analog-v' },
  F: { label: 'F（PNP 1 出力 + アナログ電流 4〜20mA）', kind: 'pnp', second: 'analog-i' },
};

const PIPING: Record<string, { label: string; tubeOD?: number; thread?: string; male?: boolean }> = {
  '01': { label: '01（R1/8 おねじ・M5 めねじ）', thread: 'R1/8', male: true },
  C4H: { label: 'C4H（φ4 ワンタッチ管継手）', tubeOD: 4 },
  C6H: { label: 'C6H（φ6 ワンタッチ管継手）', tubeOD: 6 },
};

const outOf = (p: ParamValues) => OUTPUTS[String(p.output)] ?? OUTPUTS.N;

const W = 92;
const H = 150;
const BX = 16;
const BY = 6;
const BW = 60;
const BH = 60;
const PORT_X = BX + 14;

function cableFor(four: boolean) {
  const leads: Lead[] = [
    { color: 'BN', label: 'DC+', role: 'plus', note: '電源 +（DC12〜24V ±10%）' },
    { color: 'BK', label: 'OUT1', role: 'out', signal: (p) => ({ dir: 'out', kind: outOf(p).kind }), note: '出力 1（NPN / PNP オープンコレクタ、最大 80mA）' },
    ...(four
      ? [
          {
            color: 'WH' as const,
            label: 'OUT2',
            role: 'out' as const,
            signal: (p: ParamValues): SignalSpec => {
              const o = outOf(p);
              return o.second === 'switch' ? { dir: 'out', kind: o.kind } : { dir: 'out', kind: o.second === 'analog-i' ? 'analog-i' : 'analog-v', ref: 'BU' };
            },
            note: '出力 2（2 出力の形式はスイッチ出力、アナログ出力の形式は 1〜5V / 4〜20mA）',
          },
        ]
      : []),
    { color: 'BU', label: 'DC−', role: 'minus', note: '電源 −（0V）' },
  ];
  return sensorCable({ cx: BX + BW - 14, y0: BY + BH, yFan: BY + BH + 34, yEnd: H - 2, pitch: 10, centerX: BX + BW - 12, vmin: 10.8, vmax: 26.4, leads });
}
const CABLE3 = cableFor(false);
const CABLE4 = cableFor(true);
const cableOf = (p: ParamValues) => (outOf(p).second ? CABLE4 : CABLE3);

export function buildIse30a(type: string): DeviceDefinition {
  const svg = (p: ParamValues) => {
    const pipe = PIPING[String(p.piping)] ?? PIPING['01'];
    const o = outOf(p);
    const port =
      pipe.tubeOD !== undefined
        ? oneTouch(PORT_X, BY + BH + 30, 'bottom', pipe.tubeOD, 30)
        : `<rect x="${PORT_X - 6}" y="${BY + BH}" width="12" height="5" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${PORT_X - 4}" y="${BY + BH + 5}" width="8" height="9" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${[0, 2.5, 5].map((d) => `<line x1="${PORT_X - 4}" y1="${BY + BH + 7 + d}" x2="${PORT_X + 4}" y2="${BY + BH + 8 + d}" stroke="#7a8086" stroke-width="0.4"/>`).join('')}`;
    return `<defs>${SMC_GRADIENTS}
    <linearGradient id="ise30-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#46494e"/>
      <stop offset="1" stop-color="#1a1b1e"/>
    </linearGradient>
  </defs>
  ${cableOf(p).svg}
  ${port}
  <!-- 本体（黒い 30mm 角） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4" fill="url(#ise30-body-{{uid}})" stroke="#0b0c0d" stroke-width="0.8"/>
  <!-- 2 色表示の液晶（4 桁） -->
  <rect x="${BX + 5}" y="${BY + 6}" width="${BW - 10}" height="24" rx="2" fill="#11161a" stroke="#000" stroke-width="0.5"/>
  ${text(BX + BW - 8, BY + 25, '0.500', 12, '#e84a3a', 'bold', 'end')}
  <circle cx="${BX + 9}" cy="${BY + 10.5}" r="1.5" fill="#ff8a1e"/>
  ${text(BX + 12.5, BY + 11.8, 'OUT1', 3, '#ccc', 'normal', 'start')}
  ${o.second === 'switch' ? `<circle cx="${BX + 28}" cy="${BY + 10.5}" r="1.5" fill="#3fd25a"/>${text(BX + 31.5, BY + 11.8, 'OUT2', 3, '#ccc', 'normal', 'start')}` : ''}
  ${text(BX + BW - 7, BY + 29, 'MPa', 3, '#aaa', 'normal', 'end')}
  <!-- ボタン -->
  ${['▲', '▼', 'SET']
    .map((b, i) => {
      const x = BX + 13 + i * 17;
      return `<rect x="${x - 7}" y="${BY + 34}" width="14" height="8" rx="2" fill="#5b5f64" stroke="#0b0c0d" stroke-width="0.4"/>${text(x, BY + 40, b, b === 'SET' ? 3.8 : 4.4, '#e8e8e8')}`;
    })
    .join('')}
  ${text(BX + BW / 2 + 6, BY + BH - 5, 'ISE30A', 4.4, '#ddd')}
  ${text(BX + 6, BY + BH - 5, 'SMC', 4, '#7fb2ec', 'bold', 'start')}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const pipe = PIPING[String(p.piping)] ?? PIPING['01'];
    const air: TerminalDef = {
      id: 'P',
      label: 'P',
      hint: '圧力ポート',
      note: `圧力の測定ポート（${pipe.label}。定格 −0.1〜1.0MPa、耐圧 1.5MPa）`,
      x: PORT_X,
      y: pipe.tubeOD !== undefined ? BY + BH + 30 : BY + BH + 14,
      side: 'bottom',
      role: 'air',
      air: { kind: 'in', ...(pipe.tubeOD !== undefined ? { tubeOD: pipe.tubeOD } : {}), ...(pipe.thread ? { thread: pipe.thread, male: true } : {}), maxPressure: 1.0 },
    };
    return [...cableOf(p).terminals(p), air];
  };

  return {
    type,
    name: 'デジタル圧力スイッチ（正圧）',
    model: 'ISE30A-01-N-L',
    modelOf: (p) => `ISE30A-${p.piping}-${p.output}-L`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC の 2 色表示式 高精度デジタル圧力スイッチ ISE30A（正圧用、定格 −0.1〜1.0MPa、耐圧 1.5MPa、コネクタ付きリード線 2m）。' +
      '配管の圧力を測り、設定した圧力に達したら出力をオンにする（元圧の低下の検出・ワークの着座確認など。ティで分岐した先に付ける）。' +
      '電源 DC12〜24V ±10%（茶 +・青 −）、消費電流 40mA 以下。出力 1 は黒（NPN / PNP オープンコレクタ、最大 80mA、残留電圧 1V 以下）。' +
      '2 出力の形式（A・B）は白が出力 2、アナログ出力の形式（C〜F）は白が 1〜5V / 4〜20mA のアナログ出力（基準は青の 0V）。' +
      'NPN はプラスコモン、PNP はマイナスコモンの入力につなぐ。配管 01 は R1/8 のおねじ（M5 のめねじ付き）で、相手のめねじのポート・継手にねじ込む。',
    estimated: 'アナログ出力の形式の記号（C〜F）、1 出力の形式のリード線を 3 芯とすること、外観（図ではリード線を下へ引き出す）は推定',
    labelPrefix: 'PS',
    width: W,
    height: H,
    svg,
    terminals,
    links: (p) => sensorOutputLinks(outOf(p).second === 'switch' ? ['BK', 'WH'] : ['BK'], 0.08, undefined, (q) => outOf(q).kind)(p),
    params: [
      { key: 'output', label: '出力', options: Object.entries(OUTPUTS).map(([value, v]) => ({ value, label: v.label })), default: 'N' },
      { key: 'piping', label: '配管', options: Object.entries(PIPING).map(([value, v]) => ({ value, label: v.label })), default: '01' },
    ],
    loadCurrent: 0.04,
    pneumatic: { symbol: 'pressure-switch', ports: { in: 'P' } },
  };
}
