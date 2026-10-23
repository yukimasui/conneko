/**
 * SMC 5 ポート電磁弁 SY シリーズ ボディ配管形（DC24V、L 形プラグコネクタ・リード線 300mm、表示灯・サージ電圧保護回路付き「Z」）の機器定義を作る。
 * 横から見た白い弁本体の端にパイロット弁（ソレノイド）があり、上の L 形プラグから赤（+）・黒（−）のリード線が出る姿を描く。
 * ダブルソレノイド・3 位置は両端にパイロット弁があり、左が A 側、右が B 側。
 *
 * 出典: SMC SY シリーズ カタログ（static.smc.eu の SY_EU.pdf「CAT.EUS11-83」）
 *   型式: SY + サイズ（3 / 5）+ 切換えの種類（1〜5。sy-common.ts）+ 20（ボディ配管）+ 5（DC24V）+ L（L 形プラグ）+ Z（表示灯・サージ電圧保護回路付き）+ A・B ポートの継手
 *   消費電力: DC 0.35W、表示灯付き 0.4W（省電力回路付き T は 0.1W）。許容電圧変動 ±10%
 *   極性: S・Z タイプは極性あり（逆接続保護ダイオード付き）。リード線は赤が +、黒が −。R・U タイプは無極性
 *   SY3000: 1(P)・5(EA)・3(EB) は M5、4(A)・2(B) は ワンタッチ管継手 C4 / C6 または M5
 *   SY5000: 1(P)・5(EA)・3(EB) は Rc1/8、4(A)・2(B) は C4 / C6 / C8 または Rc1/8
 *   使用圧力範囲: 2 位置シングル 0.15〜0.7MPa、2 位置ダブル 0.1〜0.7MPa、3 位置 0.2〜0.7MPa
 *
 * エアのポート: 上面に 4(A)・2(B)、下面に 5(EA)・1(P)・3(EB)。ねじのポートには、SY3000 は φ6（M5 用の KQ2H06-M5 など）、
 * SY5000 は φ8（Rc1/8 用の KQ2H08-01S など）のワンタッチ管継手を付けたものとする。
 * 機器の中の通り道: A 側に通電した位置は P→A・B→EB、通電していない位置（ダブル・3 位置は B 側に通電した位置）は P→B・A→EA。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { coilAccepts, SY_COIL_CURRENT, SY_FUNCTIONS, syAirLinks, syDefs, syPneumatic, type SyFunction } from './sy-common';

export interface SySpec {
  type: string;
  model: string;
  /** 切換えの種類 */
  fn: SyFunction;
  /** サイズ（3: SY3000、5: SY5000） */
  size: 3 | 5;
}

const H = 120;
const BODY_Y = 30;
const BODY_H = 36;
const PILOT_W = 30;

/** パイロット弁と L 形プラグ。x はパイロット弁の左端。返り値の端子はリード線の先 */
function pilot(x: number, side: 'A' | 'B' | '', leadX: [number, number]) {
  const cx = x + PILOT_W / 2;
  const wire = (from: number, to: number, color: string, edge: string) => {
    const d = `M${from} 24 C${from} 50 ${to} 70 ${to} 104`;
    return `<path d="${d}" fill="none" stroke="${edge}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  };
  return `
  <!-- リード線（パイロット弁の裏を通って下へ） -->
  ${wire(cx - 3, leadX[0], '#d6302c', '#871a17')}
  ${wire(cx + 3, leadX[1], '#1d1d1d', '#000')}
  <!-- パイロット弁${side ? `（${side} 側）` : ''} -->
  <rect x="${x}" y="${BODY_Y - 2}" width="${PILOT_W}" height="${BODY_H + 4}" rx="2" fill="url(#pilot-{{uid}})" stroke="#2a2c2f" stroke-width="0.7"/>
  <circle cx="${cx}" cy="${BODY_Y + BODY_H - 7}" r="3.2" fill="#d9dcdf" stroke="#555" stroke-width="0.5"/>
  <path d="M${cx - 2} ${BODY_Y + BODY_H - 7} H${cx + 2}" stroke="#555" stroke-width="0.8"/>
  ${side ? text(cx, BODY_Y + 14, side, 7, '#f2f2f2') : ''}
  <!-- L 形プラグ（表示灯付き） -->
  <rect x="${x + 3}" y="10" width="${PILOT_W - 6}" height="${BODY_Y - 10}" rx="2" fill="#2b2c2e" stroke="#0e0e0f" stroke-width="0.6"/>
  <rect x="${x + 6}" y="13" width="7" height="5" rx="1" fill="#ff4a3d" opacity="0.9"/>
  ${text(x + PILOT_W - 8, 19, '−+', 4.2, '#d0d0d0', 'normal')}
  ${[leadX[0], leadX[1]].map((lx) => `<rect x="${lx - 1.6}" y="104" width="3.2" height="10" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`).join('')}
  ${text(leadX[0] - 5, 106, '赤', 3.6, '#333')}
  ${text(leadX[1] + 5, 106, '黒', 3.6, '#333')}`;
}

export function buildSy(s: SySpec): DeviceDefinition {
  const f = SY_FUNCTIONS[s.fn];
  const double = f.solenoids === 2;
  const sy5 = s.size === 5;
  const bodyW = sy5 ? 84 : 70;
  const W = bodyW + PILOT_W * f.solenoids + 16;
  const bodyX = 8 + (double ? PILOT_W : 0);
  const pilots: { x: number; side: 'A' | 'B' | ''; leads: [number, number] }[] = double
    ? [
        { x: 8, side: 'A', leads: [10, 26] },
        { x: bodyX + bodyW, side: 'B', leads: [W - 26, W - 10] },
      ]
    : [{ x: bodyX + bodyW, side: '', leads: [W - 30, W - 12] }];

  const ports = [
    { x: bodyX + bodyW * 0.36, label: '4(A)' },
    { x: bodyX + bodyW * 0.64, label: '2(B)' },
  ];
  /** 下面のポート（5(EA)・1(P)・3(EB)） */
  const lower = [
    { id: 'EA', label: '5(EA)', x: bodyX + bodyW * 0.2 },
    { id: 'P', label: '1(P)', x: bodyX + bodyW * 0.5 },
    { id: 'EB', label: '3(EB)', x: bodyX + bodyW * 0.8 },
  ];
  const lowY = BODY_Y + BODY_H;
  const thread = sy5 ? 'Rc1/8' : 'M5';
  const lowerOD = sy5 ? 8 : 6;
  const svg = `
  <defs>${syDefs}
  </defs>
  <!-- 弁本体（白い樹脂） -->
  <rect x="${bodyX}" y="${BODY_Y}" width="${bodyW}" height="${BODY_H}" rx="2" fill="url(#valve-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  ${ports
    .map(
      (p) => `<rect x="${p.x - 6}" y="${BODY_Y - 6}" width="12" height="7" rx="1" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <circle cx="${p.x}" cy="${BODY_Y - 5}" r="3" fill="#3a3c3f"/>
  ${text(p.x, BODY_Y + 9, p.label, 4.2, '#333', 'normal')}`,
    )
    .join('')}
  ${lower
    .map(
      (p) => `<rect x="${p.x - 5}" y="${lowY - 1}" width="10" height="6" rx="1" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <circle cx="${p.x}" cy="${lowY + 4}" r="2.6" fill="#3a3c3f"/>
  ${text(p.x, lowY - 3, p.label, 3.6, '#333', 'normal')}`,
    )
    .join('')}
  ${text(bodyX + bodyW / 2, BODY_Y + (f.center ? 17 : 20), 'SMC', 6, '#1f5fa8')}
  ${text(bodyX + bodyW / 2, BODY_Y + (f.center ? 23 : 27), s.model, 4, '#333', 'normal')}
  ${f.center ? text(bodyX + bodyW / 2, BODY_Y + 28, f.short, 3.4, '#555', 'normal') : ''}
  ${pilots.map((p) => pilot(p.x, p.side, p.leads)).join('')}
`;

  const terminals: TerminalDef[] = pilots.flatMap((p) => {
    const pre = p.side;
    const what = p.side ? `ソレノイド ${p.side} 側` : 'ソレノイド';
    return [
      { id: `${pre}+`, label: `${pre}+`, note: `${what}（赤 +）`, x: p.leads[0], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: coilAccepts('+') },
      { id: `${pre}-`, label: `${pre}−`, note: `${what}（黒 −）`, x: p.leads[1], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: coilAccepts('-') },
    ];
  });

  // エアのポート
  const pRange = { minPressure: f.minPressure, maxPressure: f.maxPressure };
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const airPorts: TerminalDef[] = [
    ...ports.map((p, i) => ({
      id: i === 0 ? 'A' : 'B',
      label: p.label,
      hint: i === 0 ? '出力 A' : '出力 B',
      note: i === 0 ? `出力ポート 4(A)（${aOn}で P とつながる）` : `出力ポート 2(B)（${bOn}で P とつながる）`,
      x: p.x,
      y: BODY_Y - 9,
      side: 'top' as const,
      role: 'air' as const,
      air: { kind: 'work' as const, tubeOD: { param: 'portAB' } },
    })),
    ...lower.map((p) => ({
      id: p.id,
      label: p.label,
      hint: p.id === 'P' ? '供給 P' : `排気 ${p.id}`,
      note: p.id === 'P' ? `供給ポート 1(P)（${thread}）` : `排気ポート ${p.label}（${thread}。サイレンサを付けるか、配管で集合排気する）`,
      x: p.x,
      y: lowY + 9,
      side: 'bottom' as const,
      role: 'air' as const,
      air: p.id === 'P' ? { kind: 'in' as const, tubeOD: lowerOD, thread, ...pRange } : { kind: 'exhaust' as const, tubeOD: lowerOD, thread },
    })),
  ];

  const sol = double ? { a: 'A+', b: 'B+' } : { a: '+' };
  return {
    type: s.type,
    name: f.name,
    model: s.model,
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC の 5 ポート電磁弁 SY${s.size}000 シリーズ ボディ配管形（${f.short}、DC24V、L 形プラグコネクタ・リード線 300mm、表示灯・サージ電圧保護回路付き）。` +
      `使用圧力範囲 ${f.minPressure}〜${f.maxPressure}MPa。消費電力 0.4W（表示灯込み、約 17mA）、許容電圧変動 ±10%。極性あり: 赤（+）を PLC の出力・リレー接点の側、黒（−）を 0V につなぐ` +
      `（NPN 出力の PLC なら赤を +24V、黒を出力へ）。${f.behavior}` +
      `P・EA・EB は ${thread}（φ${lowerOD} のワンタッチ管継手を付けたものとする）。`,
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals: [...terminals, ...airPorts],
    airLinks: syAirLinks(),
    params: [
      {
        key: 'portAB',
        label: 'A・B ポートの継手',
        unit: 'mm',
        options: (sy5 ? [4, 6, 8] : [4, 6]).map((v) => ({ value: v, label: `C${v}（φ${v} ワンタッチ管継手）` })),
        default: 6,
      },
    ],
    modelOf: (p) => `${s.model}-C${p.portAB}`,
    pneumatic: syPneumatic(s.fn, sol),
    loadCurrent: SY_COIL_CURRENT,
    schematic: { elements: pilots.map((p) => ({ kind: 'coil' as const, terminals: [`${p.side}+`, `${p.side}-`] })) },
  };
}
