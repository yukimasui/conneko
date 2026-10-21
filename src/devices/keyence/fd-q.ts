import type { DeviceDefinition, ParamValues, SignalSpec } from '../types';
import {
  OUTPUT_PARAM,
  leadPins,
  roundConnector,
  roundReceptacle,
  sensorCable,
  sensorInput,
  sensorOutputLinks,
  switchedOut,
  type Lead,
} from './sensor-parts';

/**
 * KEYENCE クランプオン式流量センサ FD-Q シリーズ（FD-Q10C / Q20C / Q32C / Q50C）。
 * 配管の外側に取り付け金具で固定する超音波式。上から見た姿（外形 106 × 38 mm のヘッドが配管の上に載る、1mm ≒ 2px）を描く。
 * 上面の左に M12 4ピンコネクタ、中央に 2 段表示（流量・積算/設定値）、右に操作ボタン。
 *
 * 電源・I/O は M12 4ピンコネクタ。M12 接続ケーブル（別売）の標準線色で端子を定義する:
 *   1 茶 = DC20〜30V、2 白 = ch.2（制御出力 / アナログ 4〜20mA / 外部入力を切換）、3 青 = 0V、4 黒 = ch.1（制御出力 / パルス出力）
 * ※ピン 1〜4 と機能の対応は M12 センサの標準的な割り当てによる推定（KEYENCE の入出力回路図は Web 非公開）。
 *
 * 2 通りの姿を作る（buildFdq）:
 * - 'cable': M12 ケーブル（別売）を差した姿。ケーブルの芯線の先が端子（BN / WH / BU / BK）
 * - 'm12': センサー単体。上面の M12 コネクタ（CN）が端子で、M12 ケーブル（generic.m12-4p-cable など）とつなぐ
 * 出典: https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/
 *       https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/dimensions/
 */

const W = 240;
const HX = 14;
const HY = 30;
const HW = 212;
const HH = 76;
const CN = { x: HX + 26, y: HY + 38 };

const MODELS: Record<string, { pipe: string; flow: string }> = {
  Q10C: { pipe: '1/4"・3/8"（8A・10A）', flow: '〜10L/min' },
  Q20C: { pipe: '1/2"・3/4"（15A・20A）', flow: '60/100L/min' },
  Q32C: { pipe: '1"・1 1/4"（25A・32A）', flow: '〜200L/min' },
  Q50C: { pipe: '1 1/2"・2"（40A・50A）', flow: '〜400L/min' },
};

/** ch.2 の機能（設定で制御出力 / アナログ 4〜20mA / 外部入力） */
const ch2Signal = (p: ParamValues): SignalSpec =>
  p.ch2 === 'analog' ? { dir: 'out', kind: 'analog-i' } : p.ch2 === 'in' ? sensorInput(p) : switchedOut(p);

/** M12 のピン 1〜4 の順の芯線 */
const LEADS: Lead[] = [
  { color: 'BN', label: '+V（DC20〜30V、M12 ピン1）', role: 'plus' },
  { color: 'WH', label: 'ch.2 制御出力 / アナログ 4〜20mA / 外部入力（M12 ピン2）', role: 'out', signal: ch2Signal },
  { color: 'BU', label: '0V（M12 ピン3）', role: 'minus' },
  { color: 'BK', label: 'ch.1 制御出力 / パルス出力（M12 ピン4）', role: 'out', signal: switchedOut },
];

const cable = sensorCable({ cx: CN.x, y0: CN.y, yFan: 136, yEnd: 166, pitch: 12, centerX: CN.x + 8, vmin: 20, vmax: 30, leads: LEADS });

const svg = (p: ParamValues, variant: 'cable' | 'm12') => {
  const m = MODELS[String(p.model)] ?? MODELS.Q20C;
  return `
  <defs>
    <linearGradient id="fdpipe-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.45" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#7d838a"/>
    </linearGradient>
    <linearGradient id="fdhead-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#1b1c1f"/>
    </linearGradient>
  </defs>
  <!-- 配管 -->
  <rect x="0" y="${HY + 22}" width="${W}" height="32" fill="url(#fdpipe-{{uid}})" stroke="#6d7277" stroke-width="0.6"/>
  <text x="${W - 4}" y="${HY + HH + 18}" text-anchor="end" font-family="sans-serif" font-size="3.6" fill="#555">配管 ${m.pipe}</text>
  <!-- 取り付け金具 -->
  <rect x="${HX + 8}" y="${HY - 6}" width="${HW - 16}" height="${HH + 12}" rx="4" fill="#b9bec3" stroke="#6d7277" stroke-width="0.6"/>
  <!-- ヘッド -->
  <rect x="${HX}" y="${HY}" width="${HW}" height="${HH}" rx="6" fill="url(#fdhead-{{uid}})" stroke="#0a0a0b" stroke-width="0.9"/>
  <rect x="${HX + 6}" y="${HY + 6}" width="${HW - 12}" height="${HH - 12}" rx="4" fill="none" stroke="#4a4d52" stroke-width="0.6"/>
  <!-- ネジ -->
  <circle cx="${HX + 10}" cy="${HY + HH / 2}" r="3" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  <circle cx="${HX + HW - 10}" cy="${HY + HH / 2}" r="3" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  <!-- 表示 -->
  <text x="${HX + 52}" y="${HY + 17}" font-family="sans-serif" font-size="5" font-weight="bold" fill="#e6e7e9" letter-spacing="0.3">KEYENCE</text>
  <rect x="${HX + 52}" y="${HY + 22}" width="66" height="38" rx="2" fill="#0b0b0c" stroke="#55585c" stroke-width="0.6"/>
  <text x="${HX + 114}" y="${HY + 39}" text-anchor="end" font-family="monospace" font-size="14" font-weight="bold" fill="#ff3b30">25.0</text>
  <text x="${HX + 114}" y="${HY + 56}" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#3cff6a">200</text>
  <rect x="${HX + 124}" y="${HY + 22}" width="20" height="38" rx="2" fill="#1f5f2a" stroke="#2a8a3a" stroke-width="0.6"/>
  <rect x="${HX + 127}" y="${HY + 25}" width="14" height="32" rx="1" fill="#79e08a" opacity="0.7"/>
  <rect x="${HX + 152}" y="${HY + 22}" width="12" height="11" rx="2" fill="#55585d"/>
  <rect x="${HX + 152}" y="${HY + 35.5}" width="12" height="11" rx="2" fill="#55585d"/>
  <rect x="${HX + 152}" y="${HY + 49}" width="12" height="11" rx="2" fill="#55585d"/>
  <text x="${HX + 52}" y="${HY + 70}" font-family="sans-serif" font-size="4" fill="#c9ccd0">FD-${String(p.model)}</text>
  ${
    variant === 'm12'
      ? roundReceptacle(CN.x, CN.y, 10)
      : `${cable.svg}
  <!-- M12 コネクタに差したケーブルのプラグ（上から見たローレットナット） -->
  <circle cx="${CN.x}" cy="${CN.y}" r="10" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.6"/>
  ${Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    return `<line x1="${+(CN.x + 8 * Math.cos(a)).toFixed(2)}" y1="${+(CN.y + 8 * Math.sin(a)).toFixed(2)}" x2="${+(CN.x + 9.9 * Math.cos(a)).toFixed(2)}" y2="${+(CN.y + 9.9 * Math.sin(a)).toFixed(2)}" stroke="#7a7f84" stroke-width="0.6"/>`;
  }).join('')}
  <circle cx="${CN.x}" cy="${CN.y}" r="6.6" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.5"/>`
  }
  <text x="${W / 2}" y="10" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">クランプオン式流量センサ FD-${String(p.model)}（${m.flow}）</text>`;
};

const PARAMS = [
  {
    key: 'model',
    label: '型式（対応配管）',
    options: Object.entries(MODELS).map(([value, m]) => ({ value, label: `FD-${value}（${m.pipe}）` })),
    default: 'Q20C',
  },
  { ...OUTPUT_PARAM, label: '出力形式（センサーの設定）' },
  {
    key: 'ch2',
    label: 'ch.2 の機能（センサーの設定）',
    options: [
      { value: 'out', label: '制御出力' },
      { value: 'analog', label: 'アナログ出力 4〜20mA' },
      { value: 'in', label: '外部入力' },
    ],
    default: 'out',
  },
];

/** 制御出力（30V 100mA）の内部経路。ch.2 を制御出力にしたときだけ ch.2 も含める */
const outLinks = (ids: { ch1: string; ch2: string; plus: string; minus: string }) => (p: ParamValues) =>
  sensorOutputLinks(p.ch2 === 'out' || p.ch2 === undefined ? [ids.ch1, ids.ch2] : [ids.ch1], 0.1, ids)(p);

const DESCRIPTION =
  'KEYENCE のクランプオン式流量センサ FD-Q シリーズ（超音波式、配管の外側に取り付け、液体用）。型式（対応配管）は params の model で選ぶ（Q10C: 1/4"・3/8"、Q20C: 1/2"・3/4"、Q32C: 1"・1 1/4"、Q50C: 1 1/2"・2"）。電源・I/O は M12 4ピンコネクタで、ピン 1 茶 = +24V、3 青 = 0V、4 黒 = ch.1（制御出力 / パルス出力、NPN/PNP 切換、30V 100mA。params の output）、2 白 = ch.2（制御出力 / アナログ 4〜20mA / 外部入力を切換。params の ch2）。電源 DC20〜30V、消費電流 100mA 以下。IO-Link 対応。ピンと線色の対応は M12 センサの標準割り当てによる推定。';

export function buildFdq(variant: 'cable' | 'm12'): DeviceDefinition {
  const common = {
    name: '流量センサ（クランプオン式）',
    maker: 'KEYENCE',
    category: 'sensor' as const,
    labelPrefix: 'FS',
    width: W,
    svg: (p: ParamValues) => svg(p, variant),
    params: PARAMS,
    loadCurrent: 0.1,
  };
  if (variant === 'cable') {
    return {
      ...common,
      type: 'keyence.fd-q',
      model: 'FD-Q シリーズ',
      description: `${DESCRIPTION}M12 ケーブル（別売）を差した姿で、芯線の色ごとの端子を持つ。`,
      height: 170,
      terminals: cable.terminals,
      links: outLinks({ ch1: 'BK', ch2: 'WH', plus: 'BN', minus: 'BU' }),
    };
  }
  return {
    ...common,
    type: 'keyence.fd-q.m12',
    model: 'FD-Q シリーズ（M12 コネクタ）',
    description: `${DESCRIPTION}センサー単体の姿で、上面の M12 コネクタ（CN）に M12 4 ピンのセンサーケーブル（片側バラ線など）をつなぐ。`,
    height: 130,
    terminals: [
      {
        id: 'CN',
        label: 'M12 4ピン コネクタ',
        x: CN.x,
        y: CN.y,
        side: 'bottom',
        role: 'connector',
        connector: roundConnector('M12', { facing: 'front', length: 20 }),
      },
    ],
    pins: leadPins('CN', LEADS, 20, 30),
    links: outLinks({ ch1: 'CN#4', ch2: 'CN#2', plus: 'CN#1', minus: 'CN#3' }),
  };
}
