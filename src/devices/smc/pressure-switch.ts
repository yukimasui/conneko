/**
 * SMC の 3 画面表示 高精度デジタル圧力スイッチ ISE20（正圧）/ ZSE20（真空圧）。
 * 黒い本体の正面に 3 画面の液晶（メイン画面: 赤/緑、サブ画面 2 つ: オレンジ）とボタンがあり、
 * 左にエアのポート、下からコネクタ付きリード線（茶・青・黒の 3 芯、2m）が出る姿を描く。
 *
 * 出典: SMC ZSE20(F)/ISE20 シリーズ カタログ（ZSE20(F)_ISE20.pdf）
 *   型式: ISE20 / ZSE20 - 出力仕様（N: NPN オープンコレクタ 1 出力、P: PNP オープンコレクタ 1 出力）- 単位仕様（M: SI 単位固定。日本国内向け）
 *         - 配管仕様（M5: M5 めねじ、01: R1/8、C4H / C6H: ワンタッチ管継手 φ4 / φ6 ストレート）- L（コネクタ付きリード線 3 芯 2m）
 *   定格圧力範囲: ISE20 −0.100〜1.000MPa、ZSE20 0.0〜−101.0kPa。耐圧: ISE20 1.5MPa、ZSE20 500kPa
 *   電源電圧 DC12〜24V ±10%、消費電流 25mA 以下、逆接続保護あり
 *   スイッチ出力: 最大負荷電流 80mA、最大印加電圧 28V（NPN のみ）、残留電圧 1V 以下、短絡保護あり
 *   リード線: 茶（DC+）・青（DC−）・黒（OUT1）
 */
import { sensorCable, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { oneTouch, SMC_GRADIENTS, text } from './parts';

export interface PressureSwitchSpec {
  type: string;
  /** 'ISE20'（正圧）/ 'ZSE20'（真空圧） */
  series: 'ISE20' | 'ZSE20';
}

const W = 96;
const H = 134;
const BX = 24;
const BY = 8;
const BW = 60;
const BH = 64;
const PORT_Y = BY + 40;

const PIPING: Record<string, { label: string; tubeOD?: number; thread?: string }> = {
  C4H: { label: 'C4H（φ4 ワンタッチ管継手）', tubeOD: 4 },
  C6H: { label: 'C6H（φ6 ワンタッチ管継手）', tubeOD: 6 },
  M5: { label: 'M5（M5 めねじ）', thread: 'M5' },
  '01': { label: '01（R1/8 おねじ）', thread: 'R1/8' },
};

export function buildPressureSwitch(spec: PressureSwitchSpec): DeviceDefinition {
  const vac = spec.series === 'ZSE20';
  const cable = sensorCable({
    cx: BX + BW - 14,
    y0: BY + BH,
    yFan: BY + BH + 22,
    yEnd: H - 2,
    pitch: 10,
    centerX: BX + BW / 2,
    vmin: 10.8,
    vmax: 26.4,
    leads: [
      { color: 'BN', label: 'DC+', role: 'plus', note: '電源 +（DC12〜24V）' },
      { color: 'BK', label: 'OUT1', role: 'out', signal: switchedOut, note: '出力 1（NPN / PNP オープンコレクタ、最大 80mA）' },
      { color: 'BU', label: 'DC−', role: 'minus', note: '電源 −（0V）' },
    ],
  });

  const svg = (p: ParamValues) => {
    const pipe = PIPING[String(p.piping)] ?? PIPING.C6H;
    const port =
      pipe.tubeOD !== undefined
        ? oneTouch(2, PORT_Y, 'left', pipe.tubeOD, BX - 2)
        : `<rect x="2" y="${PORT_Y - 5}" width="${BX - 2}" height="10" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <circle cx="5" cy="${PORT_Y}" r="2.6" fill="#3b3f43"/>`;
    const main = vac ? '-80.0' : '0.500';
    const unit = vac ? 'kPa' : 'MPa';
    return `<defs>${SMC_GRADIENTS}
    <linearGradient id="ps-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
  </defs>
  ${port}
  <!-- 本体（黒） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4" fill="url(#ps-body-{{uid}})" stroke="#0b0c0d" stroke-width="0.8"/>
  <!-- 3 画面の液晶 -->
  <rect x="${BX + 5}" y="${BY + 6}" width="${BW - 10}" height="34" rx="2" fill="#11161a" stroke="#000" stroke-width="0.5"/>
  ${text(BX + BW - 8, BY + 22, main, 13, '#36d05a', 'bold', 'end')}
  ${text(BX + BW - 8, BY + 28, unit, 4, '#aaa', 'normal', 'end')}
  ${text(BX + 9, BY + 36, 'P_1', 5, '#ff9a2e', 'bold', 'start')}
  ${text(BX + BW - 8, BY + 36, vac ? '-60.0' : '0.400', 5, '#ff9a2e', 'bold', 'end')}
  <circle cx="${BX + 9}" cy="${BY + 11}" r="1.6" fill="#ff8a1e"/>
  ${text(BX + 13, BY + 12.6, 'OUT1', 3.4, '#ccc', 'normal', 'start')}
  <!-- ボタン -->
  ${['▼', 'SET', '▲']
    .map((b, i) => {
      const x = BX + 13 + i * 17;
      return `<rect x="${x - 7}" y="${BY + 45}" width="14" height="8" rx="2" fill="#5b5f64" stroke="#0b0c0d" stroke-width="0.4"/>${text(x, BY + 51, b, b === 'SET' ? 3.8 : 4.4, '#e8e8e8')}`;
    })
    .join('')}
  ${text(BX + BW / 2, BY + BH - 4, spec.series, 4.6, '#ddd')}
  ${text(BX + 6, BY + BH - 4, 'SMC', 4, '#7fb2ec', 'bold', 'start')}
  ${cable.svg}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const pipe = PIPING[String(p.piping)] ?? PIPING.C6H;
    const air: TerminalDef = {
      id: 'P',
      label: vac ? 'V' : 'P',
      hint: vac ? '真空ポート' : '圧力ポート',
      note: vac ? '真空の測定ポート（定格 0〜−101kPa）' : '圧力の測定ポート（定格 0〜1.0MPa、耐圧 1.5MPa）',
      x: 2,
      y: PORT_Y,
      side: 'left',
      role: 'air',
      air: vac
        ? { kind: 'vacuum', ...(pipe.tubeOD !== undefined ? { tubeOD: pipe.tubeOD } : {}), ...(pipe.thread ? { thread: pipe.thread } : {}) }
        : { kind: 'in', ...(pipe.tubeOD !== undefined ? { tubeOD: pipe.tubeOD } : {}), ...(pipe.thread ? { thread: pipe.thread } : {}), maxPressure: 1.0 },
    };
    return [...cable.terminals(p), air];
  };

  return {
    type: spec.type,
    name: vac ? 'デジタル圧力スイッチ（真空圧）' : 'デジタル圧力スイッチ（正圧）',
    model: `${spec.series}-N-M-C6H-L`,
    modelOf: (p) => `${spec.series}-${p.output}-M-${p.piping}-L`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      `SMC の 3 画面表示 高精度デジタル圧力スイッチ ${spec.series}（${vac ? '真空圧用、定格 0〜−101kPa' : '正圧用、定格 −0.1〜1.0MPa'}、1 出力、コネクタ付きリード線 2m）。` +
      (vac
        ? 'エジェクタと吸着パッドの間の真空を測り、設定した真空度に達したら出力をオンにする（ワークの吸着確認）。'
        : '配管の圧力を測り、設定した圧力に達したら出力をオンにする（元圧の低下の検出など。ティで分岐した先に付ける）。') +
      '電源 DC12〜24V（茶 +・青 −）、出力は黒（NPN / PNP オープンコレクタ、最大 80mA、残留電圧 1V 以下）。NPN はプラスコモン、PNP はマイナスコモンの入力につなぐ。',
    labelPrefix: vac ? 'VS' : 'PS',
    width: W,
    height: H,
    svg,
    terminals,
    links: sensorOutputLinks(['BK'], 0.08),
    params: [
      {
        key: 'output',
        label: '出力',
        options: [
          { value: 'N', label: 'N（NPN オープンコレクタ）' },
          { value: 'P', label: 'P（PNP オープンコレクタ）' },
        ],
        default: 'N',
      },
      { key: 'piping', label: '配管', options: Object.entries(PIPING).map(([value, v]) => ({ value, label: v.label })), default: 'C6H' },
    ],
    loadCurrent: 0.025,
    pneumatic: { symbol: 'pressure-switch', ports: { in: 'P' } },
  };
}
