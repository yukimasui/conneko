/**
 * ボディ配管形の 5 ポート電磁弁（2 位置シングル・ダブル）の機器定義を作る。CKD 4GA1・コガネイ F10 など、SMC SY 以外のメーカーの弁に使う。
 * 作り・端子 ID は SMC SY（src/devices/smc/sy-body.ts）とそろえる（機種を変えても電線・チューブがつながったままになる）:
 * - ソレノイド: シングルは +・−、ダブルは A+・A−・B+・B−（リード線の先）
 * - エアのポート: 上面に A（4）・B（2）、下面に EA（5。R1）・P（1）・EB（3。R2）
 * - 機器の中の通り道・空圧回路図の記号は SY と同じ（src/devices/smc/sy-common.ts の syAirLinks・syPneumatic）
 *
 * 横から見た弁本体の端にパイロット弁（ソレノイド）があり、上のコネクタからリード線が下へ出る姿を描く。ダブルは左が A 側、右が B 側。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { SY_FUNCTIONS, syAirLinks, syPneumatic } from '../smc/sy-common';

export interface BodyValveLook {
  /** 弁本体の色（上・中・下のグラデーション） */
  body: [string, string, string];
  /** 本体の縁の色 */
  edge: string;
  /** 本体に書く文字の色 */
  ink: string;
  /** パイロット弁（ソレノイド）の色 */
  pilot: [string, string, string];
  /** コネクタの色 */
  plug: string;
  /** ロゴ */
  logo: { text: string; color: string };
}

export interface BodyValveSpec {
  type: string;
  /** 代表の型式（パレット・説明用） */
  model: string;
  modelOf: (p: ParamValues) => string;
  maker: string;
  /** シリーズ名（'4GA1' など。本体の銘板に書く） */
  series: string;
  fn: 'single' | 'double';
  /** 本体の幅[px] */
  bodyW: number;
  look: BodyValveLook;
  /** ポートの印字（A・B・P・EA・EB の順） */
  labels: { A: string; B: string; P: string; EA: string; EB: string };
  /** P・EA・EB のねじと、付けるワンタッチ管継手のチューブ外径 */
  thread: string;
  lowerOD: number;
  /** A・B ポートのワンタッチ管継手の選択肢と既定 */
  abOptions: number[];
  abDefault: number;
  /** A・B の継手の型式の記号（'C4' など） */
  abCode: (od: number) => string;
  minPressure: number;
  maxPressure: number;
  /** ソレノイドの消費電力[W]（DC24V） */
  coilW: number;
  /** リード線の色（+・−） */
  leads: { plus: 'red' | 'brown' | 'white'; minus: 'black' | 'blue' };
  description: string;
  estimated?: string;
}

const H = 120;
const BODY_Y = 30;
const BODY_H = 36;
const PILOT_W = 30;

const WIRE: Record<'red' | 'brown' | 'white' | 'black' | 'blue', { c: string; edge: string; name: string }> = {
  red: { c: '#d6302c', edge: '#871a17', name: '赤' },
  brown: { c: '#8b4f24', edge: '#4e2a10', name: '茶' },
  white: { c: '#f4f4f4', edge: '#8a8a8a', name: '白' },
  black: { c: '#1d1d1d', edge: '#000', name: '黒' },
  blue: { c: '#1f5fd6', edge: '#0f3480', name: '青' },
};

export function buildBodyValve(s: BodyValveSpec): DeviceDefinition {
  const f = SY_FUNCTIONS[s.fn];
  const double = s.fn === 'double';
  const W = s.bodyW + PILOT_W * (double ? 2 : 1) + 16;
  const bodyX = 8 + (double ? PILOT_W : 0);
  const L = s.look;
  const plus = WIRE[s.leads.plus];
  const minus = WIRE[s.leads.minus];
  const pilots: { x: number; side: 'A' | 'B' | ''; leads: [number, number] }[] = double
    ? [
        { x: 8, side: 'A', leads: [10, 26] },
        { x: bodyX + s.bodyW, side: 'B', leads: [W - 26, W - 10] },
      ]
    : [{ x: bodyX + s.bodyW, side: '', leads: [W - 30, W - 12] }];

  const top = [
    { id: 'A', x: bodyX + s.bodyW * 0.36, label: s.labels.A },
    { id: 'B', x: bodyX + s.bodyW * 0.64, label: s.labels.B },
  ];
  const lower = [
    { id: 'EA', label: s.labels.EA, x: bodyX + s.bodyW * 0.2 },
    { id: 'P', label: s.labels.P, x: bodyX + s.bodyW * 0.5 },
    { id: 'EB', label: s.labels.EB, x: bodyX + s.bodyW * 0.8 },
  ];
  const lowY = BODY_Y + BODY_H;

  const pilot = (x: number, side: 'A' | 'B' | '', leadX: [number, number]) => {
    const cx = x + PILOT_W / 2;
    const wire = (from: number, to: number, w: { c: string; edge: string }) => {
      const d = `M${from} 24 C${from} 50 ${to} 70 ${to} 104`;
      return `<path d="${d}" fill="none" stroke="${w.edge}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${w.c}" stroke-width="2.2" stroke-linecap="round"/>`;
    };
    return `
  <!-- リード線 -->
  ${wire(cx - 3, leadX[0], plus)}
  ${wire(cx + 3, leadX[1], minus)}
  <!-- パイロット弁${side ? `（${side} 側）` : ''}・手動ボタン -->
  <rect x="${x}" y="${BODY_Y - 2}" width="${PILOT_W}" height="${BODY_H + 4}" rx="2" fill="url(#bv-pilot-{{uid}})" stroke="#1a1b1d" stroke-width="0.7"/>
  <rect x="${cx - 4}" y="${BODY_Y + BODY_H - 11}" width="8" height="6" rx="1.2" fill="#f2b705" stroke="#7a5c00" stroke-width="0.5"/>
  ${side ? text(cx, BODY_Y + 14, side, 7, '#f2f2f2') : ''}
  <!-- コネクタ（表示灯付き） -->
  <rect x="${x + 3}" y="10" width="${PILOT_W - 6}" height="${BODY_Y - 10}" rx="2" fill="${L.plug}" stroke="#0e0e0f" stroke-width="0.6"/>
  <rect x="${x + 6}" y="13" width="7" height="5" rx="1" fill="#ff4a3d" opacity="0.9"/>
  ${text(x + PILOT_W - 8, 19, '−+', 4.2, '#d0d0d0', 'normal')}
  ${leadX.map((lx) => `<rect x="${lx - 1.6}" y="104" width="3.2" height="10" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`).join('')}
  ${text(leadX[0] - 5, 106, plus.name, 3.6, '#333')}
  ${text(leadX[1] + 5, 106, minus.name, 3.6, '#333')}`;
  };

  const svg = `
  <defs>
    <linearGradient id="bv-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${L.body[0]}"/>
      <stop offset="0.5" stop-color="${L.body[1]}"/>
      <stop offset="1" stop-color="${L.body[2]}"/>
    </linearGradient>
    <linearGradient id="bv-pilot-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${L.pilot[0]}"/>
      <stop offset="0.5" stop-color="${L.pilot[1]}"/>
      <stop offset="1" stop-color="${L.pilot[2]}"/>
    </linearGradient>
  </defs>
  <!-- 弁本体 -->
  <rect x="${bodyX}" y="${BODY_Y}" width="${s.bodyW}" height="${BODY_H}" rx="2" fill="url(#bv-body-{{uid}})" stroke="${L.edge}" stroke-width="0.8"/>
  ${top
    .map(
      (p) => `<rect x="${p.x - 6}" y="${BODY_Y - 6}" width="12" height="7" rx="1" fill="#e6e8ea" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${p.x - 5}" y="${BODY_Y - 9}" width="10" height="3.5" rx="1" fill="#b9bec3" stroke="#5c6166" stroke-width="0.4"/>
  <circle cx="${p.x}" cy="${BODY_Y - 5}" r="2.6" fill="#3a3c3f"/>
  ${text(p.x, BODY_Y + 9, p.label, 4.2, L.ink, 'normal')}`,
    )
    .join('')}
  ${lower
    .map(
      (p) => `<rect x="${p.x - 5}" y="${lowY - 1}" width="10" height="6" rx="1" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <circle cx="${p.x}" cy="${lowY + 4}" r="2.6" fill="#3a3c3f"/>
  ${text(p.x, lowY - 3, p.label, 3.6, L.ink, 'normal')}`,
    )
    .join('')}
  ${text(bodyX + s.bodyW / 2, BODY_Y + 19, L.logo.text, L.logo.text.length > 4 ? 5 : 6, L.logo.color)}
  ${text(bodyX + s.bodyW / 2, BODY_Y + 26, s.series, 4, L.ink, 'normal')}
  ${pilots.map((p) => pilot(p.x, p.side, p.leads)).join('')}
`;

  const accepts = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4, conductors: [c] });
  const terminals: TerminalDef[] = pilots.flatMap((p) => {
    const pre = p.side;
    const what = p.side ? `ソレノイド ${p.side} 側` : 'ソレノイド';
    return [
      { id: `${pre}+`, label: `${pre}+`, note: `${what}（${plus.name} +）`, x: p.leads[0], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: accepts('+') },
      { id: `${pre}-`, label: `${pre}−`, note: `${what}（${minus.name} −）`, x: p.leads[1], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: accepts('-') },
    ];
  });
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const air: TerminalDef[] = [
    ...top.map((p, i) => ({
      id: p.id,
      label: p.label,
      hint: i === 0 ? '出力 A' : '出力 B',
      note: i === 0 ? `出力ポート ${p.label}（${aOn}で P とつながる）` : `出力ポート ${p.label}（${bOn}で P とつながる）`,
      x: p.x,
      y: BODY_Y - 9,
      side: 'top' as const,
      role: 'air' as const,
      air: { kind: 'work' as const, tubeOD: { param: 'portAB' } },
    })),
    ...lower.map((p) => ({
      id: p.id,
      label: p.label,
      hint: p.id === 'P' ? '供給 P' : `排気 ${p.label.replace(/^\d\(|\)$/g, '')}`,
      note: p.id === 'P' ? `供給ポート ${p.label}（${s.thread}）` : `排気ポート ${p.label}（${s.thread}。サイレンサを付けるか、配管で集合排気する）`,
      x: p.x,
      y: lowY + 9,
      side: 'bottom' as const,
      role: 'air' as const,
      air:
        p.id === 'P'
          ? { kind: 'in' as const, tubeOD: s.lowerOD, thread: s.thread, minPressure: s.minPressure, maxPressure: s.maxPressure }
          : { kind: 'exhaust' as const, tubeOD: s.lowerOD, thread: s.thread },
    })),
  ];
  const current = Math.round((s.coilW / 24) * 1000) / 1000;
  return {
    type: s.type,
    name: f.name,
    model: s.model,
    modelOf: (p) => s.modelOf(p),
    maker: s.maker,
    category: 'valve',
    description:
      `${s.description}使用圧力範囲 ${s.minPressure}〜${s.maxPressure}MPa。ソレノイドは DC24V・${s.coilW}W（約 ${Math.round(current * 1000)}mA）、許容電圧変動 ±10%。` +
      `極性あり: ${plus.name}（+）を PLC の出力・リレー接点の側、${minus.name}（−）を 0V につなぐ（NPN 出力の PLC なら${plus.name}を +24V、${minus.name}を出力へ）。${f.behavior}` +
      `P・排気ポートは ${s.thread}（φ${s.lowerOD} のワンタッチ管継手を付けたものとする）。`,
    ...(s.estimated ? { estimated: s.estimated } : {}),
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals: [...terminals, ...air],
    airLinks: syAirLinks(),
    params: [
      {
        key: 'portAB',
        label: 'A・B ポートの継手',
        unit: 'mm',
        options: s.abOptions.map((v) => ({ value: v, label: `${s.abCode(v)}（φ${v} ワンタッチ管継手）` })),
        default: s.abDefault,
      },
    ],
    pneumatic: syPneumatic(s.fn, double ? { a: 'A+', b: 'B+' } : { a: '+' }),
    loadCurrent: current,
    schematic: { elements: pilots.map((p) => ({ kind: 'coil' as const, terminals: [`${p.side}+`, `${p.side}-`] })) },
  };
}
