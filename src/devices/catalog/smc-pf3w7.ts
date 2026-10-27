import type { DeviceDefinition, InternalLink, ParamValues, SignalSpec } from '../types';
import { sensorCable, type Lead } from '../keyence/sensor-parts';
import { text } from '../smc/parts';

/**
 * SMC 3 色表示 水用デジタルフロースイッチ PF3W7 シリーズ（表示一体型）。
 * 配管の途中に付けて水（冷却水など）の流量を測り、設定した流量で出力をオン・オフする（冷却水の断水・流量低下の検出）。
 * 本体の両端に IN・OUT の配管ポート（Rc ねじ）、上に 3 色表示の液晶とボタン、下から M8 コネクタ付きのリード線（4 芯）が出る姿を描く。
 *
 * 型式: PF3W7{流量レンジ}-{接続口径}-{出力仕様}-M（M は SI 単位固定）
 *   流量レンジ: 04 = 0.5〜4 L/min、20 = 2〜16 L/min、40 = 5〜40 L/min、11 = 10〜100 L/min
 *   出力仕様: A = OUT1 NPN・OUT2 NPN、C = OUT1 NPN・OUT2 アナログ 1〜5V（モノタロウの型式表で確認）
 *             B = PNP・PNP、D = NPN・アナログ 4〜20mA、E = PNP・1〜5V、F = PNP・4〜20mA（SMC の流量スイッチの型式の並びからの推定）
 * 出典: SMC PF3W シリーズ カタログ（https://www.smcworld.com/catalog/en/switch_sensor/PF3W1-E/6-8-p0329-0357-pf3w_en/data/6-8-p0329-0357-pf3w_en.pdf）
 *       スイッチ出力 NPN / PNP オープンコレクタ 最大負荷電流 80mA・最大印加電圧 DC28V、アナログ出力 1〜5V / 4〜20mA、耐圧 1.5MPa、使用流体温度 0〜90℃、IP65
 *       https://www.monotaro.com/p/5625/0756/（PF3W704-03-C-MR: OUT1 流量 NPN、OUT2 流量 アナログ 1〜5V）
 *       https://www.smcworld.com/upfiles/pgpdf/SP165E-001J-PF3W.pdf（電流出力の最大負荷インピーダンス DC12V 300Ω・DC24V 600Ω）
 * 推定: リード線の線色とピン（茶 DC+・青 DC−・黒 OUT1・白 OUT2。SMC の 4 芯リード線の標準）、消費電流 50mA（販売店の値）、
 *       スイッチ出力の残留電圧、出力仕様 B・D・E・F の記号、流量レンジごとの接続口径の組み合わせ。
 * 水の配管は端子にしない（Conneko のエアのチェックの対象外）。
 */

const W = 120;
const H = 150;

const RANGES: Record<string, { label: string; ports: string[] }> = {
  '04': { label: '0.5〜4 L/min', ports: ['03', '04'] },
  '20': { label: '2〜16 L/min', ports: ['03', '04'] },
  '40': { label: '5〜40 L/min', ports: ['04', '06'] },
  '11': { label: '10〜100 L/min', ports: ['06', '10'] },
};
const PORTS: Record<string, string> = { '03': 'Rc3/8', '04': 'Rc1/2', '06': 'Rc3/4', '10': 'Rc1' };

const OUTPUTS: Record<string, { out1: 'npn' | 'pnp'; out2: 'npn' | 'pnp' | 'analog-v' | 'analog-i'; label: string }> = {
  A: { out1: 'npn', out2: 'npn', label: 'A（OUT1 NPN・OUT2 NPN）' },
  B: { out1: 'pnp', out2: 'pnp', label: 'B（OUT1 PNP・OUT2 PNP）' },
  C: { out1: 'npn', out2: 'analog-v', label: 'C（OUT1 NPN・OUT2 アナログ 1〜5V）' },
  D: { out1: 'npn', out2: 'analog-i', label: 'D（OUT1 NPN・OUT2 アナログ 4〜20mA）' },
  E: { out1: 'pnp', out2: 'analog-v', label: 'E（OUT1 PNP・OUT2 アナログ 1〜5V）' },
  F: { out1: 'pnp', out2: 'analog-i', label: 'F（OUT1 PNP・OUT2 アナログ 4〜20mA）' },
};
const out = (p: ParamValues) => OUTPUTS[String(p.output)] ?? OUTPUTS.A;
const range = (p: ParamValues) => RANGES[String(p.range)] ?? RANGES['04'];

const out2Spec = (p: ParamValues): SignalSpec => {
  const k = out(p).out2;
  return k === 'analog-v' || k === 'analog-i' ? { dir: 'out', kind: k, ref: 'BU' } : { dir: 'out', kind: k };
};
const leads: Lead[] = [
  { color: 'BN', label: 'DC+', role: 'plus', note: '電源 +（DC12〜24V）。線色は推定' },
  { color: 'BK', label: 'OUT1', role: 'out', signal: (p) => ({ dir: 'out', kind: out(p).out1 }), note: 'スイッチ出力 1（NPN / PNP オープンコレクタ、最大 80mA）。線色は推定' },
  { color: 'WH', label: 'OUT2', role: 'out', signal: out2Spec, note: 'スイッチ出力 2 またはアナログ出力（出力仕様による）。線色は推定' },
  { color: 'BU', label: 'DC−', role: 'minus', note: '電源 −（0V）。アナログ出力の基準。線色は推定' },
];

const cable = sensorCable({ cx: 88, y0: 104, yFan: 120, yEnd: H - 3, pitch: 11, centerX: 60, vmin: 10.8, vmax: 26.4, leads });

const modelOf = (p: ParamValues) => `PF3W7${p.range}-${p.port}-${p.output}-M`;

function svg(p: ParamValues) {
  const o = out(p);
  const port = (x: number, dir: 1 | -1) => `
  <rect x="${dir === 1 ? x : x - 16}" y="66" width="16" height="22" rx="1.5" fill="url(#pf-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  ${[4, 8, 12].map((d) => `<line x1="${dir === 1 ? x + d : x - d}" y1="66" x2="${dir === 1 ? x + d : x - d}" y2="88" stroke="#7d848a" stroke-width="0.5"/>`).join('')}
  <rect x="${dir === 1 ? x : x - 2}" y="70" width="2" height="14" fill="#2b2f33"/>`;
  return `<defs>
    <linearGradient id="pf-metal-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef0f2"/>
      <stop offset="0.5" stop-color="#b4b9be"/>
      <stop offset="1" stop-color="#8a9096"/>
    </linearGradient>
    <linearGradient id="pf-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
  </defs>
  ${cable.svg}
  <!-- 配管ポート（IN 左・OUT 右） -->
  ${port(2, 1)}${port(W - 2, -1)}
  ${text(10, 96, 'IN', 4, '#333')}${text(W - 10, 96, 'OUT', 4, '#333')}
  <!-- 流路の本体 -->
  <rect x="18" y="60" width="${W - 36}" height="36" rx="3" fill="url(#pf-body-{{uid}})" stroke="#0b0c0d" stroke-width="0.8"/>
  <path d="M44 90 H76 M70 86.5 L76 90 L70 93.5" fill="none" stroke="#d6d9dc" stroke-width="1"/>
  ${text(W / 2, 85, 'SMC', 4.4, '#7fb2ec')}
  <!-- 表示部（3 色表示の液晶とボタン） -->
  <rect x="24" y="18" width="${W - 48}" height="44" rx="3" fill="url(#pf-body-{{uid}})" stroke="#0b0c0d" stroke-width="0.8"/>
  <rect x="29" y="23" width="${W - 58}" height="24" rx="1.5" fill="#11161a" stroke="#000" stroke-width="0.5"/>
  ${text(W - 34, 39, '12.5', 11, '#36d05a', 'bold', 'end')}
  ${text(W - 34, 45, 'L/min', 3.4, '#aaa', 'normal', 'end')}
  <circle cx="33" cy="27" r="1.5" fill="#ff8a1e"/>${text(36, 28.4, 'OUT1', 3, '#ccc', 'normal', 'start')}
  <circle cx="33" cy="32" r="1.5" fill="${o.out2.startsWith('analog') ? '#555' : '#ff8a1e'}"/>${text(36, 33.4, 'OUT2', 3, '#ccc', 'normal', 'start')}
  ${['▼', 'SET', '▲']
    .map((b, i) => {
      const x = 42 + i * 18;
      return `<rect x="${x - 7}" y="50" width="14" height="7" rx="2" fill="#5b5f64" stroke="#0b0c0d" stroke-width="0.4"/>${text(x, 55.3, b, b === 'SET' ? 3.6 : 4.2, '#e8e8e8')}`;
    })
    .join('')}
  <!-- M8 コネクタ（リード線の根元） -->
  <rect x="83" y="96" width="10" height="9" rx="1.2" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  ${text(W / 2, 7, `${modelOf(p)}`, 4.6, '#333', 'normal')}
  ${text(W / 2, 12.5, `${range(p).label}・${o.out1.toUpperCase()}${o.out2.startsWith('analog') ? `＋${o.out2 === 'analog-v' ? '1〜5V' : '4〜20mA'}` : ` 2 出力`}`, 3.6, '#555', 'normal')}`;
}

const def: DeviceDefinition = {
  type: 'smc.pf3w7',
  name: '流量センサ（水用デジタルフロースイッチ）',
  model: 'PF3W7（3 色表示 水用デジタルフロースイッチ、表示一体型）',
  modelOf,
  maker: 'SMC',
  category: 'sensor',
  description:
    'SMC の 3 色表示 水用デジタルフロースイッチ PF3W7（表示一体型、温度センサなし）。冷却水などの配管の途中に付け、流量が設定値を下回った・上回ったときに出力する（断水・流量低下の検出）。' +
    'params で流量レンジ（04: 0.5〜4、20: 2〜16、40: 5〜40、11: 10〜100 L/min）、接続口径（Rc ねじ）、出力仕様（A: NPN 2 出力、B: PNP 2 出力、C〜F: スイッチ出力 1 点＋アナログ出力）を選ぶ。' +
    'M8 コネクタ付きのリード線（4 芯）を、茶 = DC+（+24V）、青 = DC−（0V）、黒 = OUT1、白 = OUT2 としてつなぐ（線色は推定。取扱説明書で確かめること）。' +
    'スイッチ出力は NPN / PNP オープンコレクタ 最大 80mA・DC28V 以下（NPN はプラスコモン、PNP はマイナスコモンの入力へ）。' +
    'アナログ出力は 1〜5V または 4〜20mA（電流出力の最大負荷インピーダンス DC12V で 300Ω・DC24V で 600Ω）で、PLC のアナログ入力の − 側を 0V（青）につなぐ。' +
    '電源 DC12〜24V ±10%、消費電流 50mA 以下（推定）。耐圧 1.5MPa、使用流体温度 0〜90℃、IP65。水の配管は図の端子にしていない。',
  labelPrefix: 'FS',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // スイッチ出力は ON で NPN なら DC−、PNP なら DC+ と導通する。アナログ出力には経路を書かない
  links: (p): InternalLink[] => {
    const o = out(p);
    const sw = (id: string, k: 'npn' | 'pnp'): InternalLink => ({ from: id, to: k === 'pnp' ? 'BN' : 'BU', switch: 'output', ratedCurrent: 0.08 });
    return [sw('BK', o.out1), ...(o.out2 === 'npn' || o.out2 === 'pnp' ? [sw('WH', o.out2)] : [])];
  },
  params: [
    { key: 'range', label: '流量レンジ', options: Object.entries(RANGES).map(([value, r]) => ({ value, label: `${value}（${r.label}）` })), default: '04' },
    {
      key: 'port',
      label: '接続口径',
      options: Object.entries(PORTS).map(([value, l]) => ({ value, label: `${value}（${l}）` })),
      optionsFor: (p) => range(p).ports.map((value) => ({ value, label: `${value}（${PORTS[value]}）` })),
      default: '03',
    },
    { key: 'output', label: '出力仕様', options: Object.entries(OUTPUTS).map(([value, o]) => ({ value, label: o.label })), default: 'A' },
  ],
  loadCurrent: 0.05,
  estimated:
    'リード線の線色（茶 DC+・青 DC−・黒 OUT1・白 OUT2）、消費電流 50mA、出力仕様 B・D・E・F の記号、流量レンジごとの接続口径の組み合わせ（資料で確かめられなかった）',
};

export default def;
