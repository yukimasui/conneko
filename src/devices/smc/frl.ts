/**
 * SMC のエアフィルタ・レギュレータ・ルブリケータ（3 点セット）の機器定義を作る。
 * モジュラー形の AC シリーズ（AC20-B〜AC40-B）と、単体の AF（エアフィルタ）・AR（レギュレータ）・AL（ルブリケータ）・
 * AW（フィルタレギュレータ）・AFM（ミストセパレータ）を、同じ部品（モジュール）を左から並べて描く。
 *
 * 出典: SMC Air Combination AC20-B〜AC60-B / AF・AR・AL・AW・AFM カタログ（static.smc.eu の AC-B_EU.pdf）
 *   型式: AC + ボディサイズ + 組み合わせ記号 - ポートサイズ + オートドレン + 圧力計 - B（例: AC30-F03DE1-…-B。F は G ねじ、Rc は記号なし）
 *   組み合わせ: AC = AF+AR+AL、AC□A = AW+AL、AC□B = AF+AR、AC□C = AF+AFM+AR、AC□D = AW+AFM
 *   構成機器（AC20-B）: AF20-A・AR20-B・AL20-A（AW20-B・AFM20-A）。ポートサイズ AC20: 1/8・1/4、AC30: 1/4・3/8、AC40: 1/4・3/8・1/2
 *   耐圧 1.5MPa、最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa、ろ過度 AF 5μm・AFM 0.3μm、推奨油 タービン油 1 種（ISO VG32）
 *   オートドレン: C（N.C. 加圧していないときドレン口が閉）。圧力計: G（丸形・リミット表示付き）、E（角形埋込形・リミット表示付き）
 *   AW の注意: 一次側の圧力は設定圧力より 0.05MPa 以上高くする。ボディはアルミダイカスト（白）、ボウルはポリカーボネート
 *   レギュレータのつまみは引いてロック解除（オレンジの帯が見える）、押してロック
 *
 * エアのポート: 左が IN（一次側）、右が OUT（二次側）。Rc ねじのポートにワンタッチ管継手（KQ2H□-□AS など）を付けたものとし、
 * 継手のチューブ外径をパラメータで選ぶ。
 */
import type { AirLink, DeviceDefinition, ParamDef, ParamValues, PneumaticHint, TerminalDef } from '../types';
import { flowArrow, mpa, oneTouch, r2, RC, roundGauge, setPressureParam, SMC_GRADIENTS, smcLogo, squareGauge, text, tubeOdParam } from './parts';

/** モジュール（構成機器）の種類 */
export type FrlUnit = 'AF' | 'AFM' | 'AR' | 'AW' | 'AL';

export interface FrlSpec {
  type: string;
  name: string;
  /** 型式の頭（'AC'・'AW'・'AF' など） */
  series: string;
  /** AC の組み合わせ記号（''・'A'・'B'・'C'・'D'） */
  combo?: string;
  /** 左（一次側）から並べるモジュール */
  units: FrlUnit[];
  /** 型式の末尾（AC・AW・AR は 'B'、AF・AL・AFM は 'A'） */
  suffix: 'A' | 'B';
  /** 機器名の接頭辞（'FRL'・'FR' など） */
  labelPrefix: string;
  description: string;
}

const MW = 44;
const GAP = 4;
const X0 = 16;
const BODY_Y = 30;
const BODY_H = 48;
const BOWL_Y = BODY_Y + BODY_H;
const BOWL_BOTTOM = 146;
const PORT_Y = 50;

const isReg = (u: FrlUnit) => u === 'AR' || u === 'AW';
const hasBowl = (u: FrlUnit) => u !== 'AR';
const hasFilter = (u: FrlUnit) => u === 'AF' || u === 'AW' || u === 'AFM';

/** ボディサイズとポートサイズ（'20-02' → AC20・Rc1/4） */
const BODIES = ['20-01', '20-02', '30-02', '30-03', '40-02', '40-03', '40-04'];
const bodyOf = (p: ParamValues) => {
  const [size, port] = String(p.body).split('-');
  return { size, port };
};

const PNEUMATIC_UNIT = {
  AF: 'filter',
  AFM: 'mist-separator',
  AR: 'regulator',
  AW: 'filter-regulator',
  AL: 'lubricator',
} as const;

/** レギュレータのつまみ（ロックした状態。上端 y） */
function knob(cx: number, y: number) {
  const w = 26;
  const ridges = Array.from({ length: 7 }, (_, i) => {
    const x = r2(cx - w / 2 + 3 + i * ((w - 6) / 6));
    return `<line x1="${x}" y1="${y + 2}" x2="${x}" y2="${y + 17}" stroke="#5a5e63" stroke-width="0.6"/>`;
  }).join('');
  return `
  <rect x="${cx - 9}" y="${y + 18}" width="18" height="${BODY_Y - y - 18}" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.5"/>
  <rect x="${cx - w / 2}" y="${y}" width="${w}" height="19" rx="3" fill="url(#smc-knob-{{uid}})" stroke="#0b0c0d" stroke-width="0.6"/>
  ${ridges}
  <rect x="${cx - w / 2 + 2}" y="${y + 1}" width="${w - 4}" height="2.4" rx="1" fill="#6b7075" opacity="0.6"/>`;
}

/** ボウル（ポリカーボネート・ボウルガード付き）。中身 content を透かして描く */
function bowl(x: number, content: string) {
  const l = x + 7;
  const r = x + MW - 7;
  const d = `M${l} ${BOWL_Y} H${r} V${BOWL_BOTTOM - 14} Q${r} ${BOWL_BOTTOM} ${x + MW / 2} ${BOWL_BOTTOM} Q${l} ${BOWL_BOTTOM} ${l} ${BOWL_BOTTOM - 14} Z`;
  const guard = [0.25, 0.5, 0.75]
    .map((f) => `<line x1="${r2(l + (r - l) * f)}" y1="${BOWL_Y + 6}" x2="${r2(l + (r - l) * f)}" y2="${BOWL_BOTTOM - 10}" stroke="#7d93a3" stroke-width="1.6" opacity="0.35"/>`)
    .join('');
  return `
  <rect x="${l - 2}" y="${BOWL_Y}" width="${r - l + 4}" height="6" rx="1" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  ${content}
  <path d="${d}" fill="url(#smc-clear-{{uid}})" stroke="#6c8494" stroke-width="0.7"/>
  ${guard}
  <path d="M${l + 3} ${BOWL_Y + 10} V${BOWL_BOTTOM - 16}" stroke="#fff" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>`;
}

/** フィルタエレメント（白い不織布の筒） */
const element = (x: number, tint = '#f3f1ea', band = '#c9c5b6') => {
  const cx = x + MW / 2;
  const pleats = Array.from({ length: 5 }, (_, i) => `<line x1="${r2(cx - 7 + i * 3.5)}" y1="${BOWL_Y + 10}" x2="${r2(cx - 7 + i * 3.5)}" y2="${BOWL_Y + 42}" stroke="${band}" stroke-width="0.6"/>`).join('');
  return `
  <rect x="${cx - 9}" y="${BOWL_Y + 8}" width="18" height="36" rx="1.5" fill="${tint}" stroke="${band}" stroke-width="0.6"/>
  ${pleats}
  <rect x="${cx - 10}" y="${BOWL_Y + 42}" width="20" height="4" rx="1" fill="#55595e"/>
  <path d="M${cx - 12} ${BOWL_Y + 54} L${cx} ${BOWL_Y + 50} L${cx + 12} ${BOWL_Y + 54}" fill="none" stroke="#55595e" stroke-width="1.4"/>`;
};

/** ドレン（手動のドレンコック、または C: オートドレン） */
function drain(x: number, auto: boolean) {
  const cx = x + MW / 2;
  if (auto)
    return `
  <rect x="${cx - 6}" y="${BOWL_BOTTOM - 2}" width="12" height="12" rx="2" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <rect x="${cx - 2.5}" y="${BOWL_BOTTOM + 10}" width="5" height="6" fill="#3a3d41"/>
  ${text(cx, BOWL_BOTTOM + 6.5, 'AUTO', 3.4, '#333')}`;
  return `
  <rect x="${cx - 3}" y="${BOWL_BOTTOM - 1}" width="6" height="5" fill="#9aa0a6" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - 7}" y="${BOWL_BOTTOM + 3}" width="14" height="5" rx="1.5" fill="#1f2123" stroke="#000" stroke-width="0.5"/>`;
}

/** 1 つのモジュール。x は左端 */
function moduleSvg(u: FrlUnit, x: number, p: ParamValues, size: string) {
  const cx = x + MW / 2;
  const set = Number(p.setPressure);
  let s = '';
  // 上部（つまみ・滴下窓）
  if (isReg(u)) s += knob(cx, 4);
  if (u === 'AL')
    s += `
  <rect x="${cx - 3}" y="8" width="6" height="7" fill="#3a3d41"/>
  <path d="M${cx - 9} ${BODY_Y} V22 Q${cx - 9} 14 ${cx} 14 Q${cx + 9} 14 ${cx + 9} 22 V${BODY_Y} Z" fill="url(#smc-clear-{{uid}})" stroke="#6c8494" stroke-width="0.6"/>
  <circle cx="${cx}" cy="25" r="1.6" fill="#e3b21c"/>`;
  // ボディ
  s += `
  <rect x="${x}" y="${BODY_Y}" width="${MW}" height="${BODY_H}" rx="2.5" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  ${flowArrow(x + 6, x + MW - 6, BODY_Y + 5)}`;
  if (isReg(u)) {
    s += p.gauge === 'E' ? squareGauge(cx, BODY_Y + 26, 28, set) : roundGauge(cx, BODY_Y + 25, 14, set);
    s += text(cx, BODY_Y + BODY_H - 3, `${u}${size}`, 4.6, '#333');
  } else {
    s += text(cx, BODY_Y + 20, `${u}${size}`, 6.4, '#333');
    s += smcLogo(cx, BODY_Y + 30, 5.5);
    if (u === 'AL') s += text(cx, BODY_Y + 40, 'OIL', 4.4, '#9a7a12');
    if (u === 'AFM') s += text(cx, BODY_Y + 40, '0.3μm', 4, '#555', 'normal');
    if (u === 'AF') s += text(cx, BODY_Y + 40, '5μm', 4, '#555', 'normal');
  }
  // ボウル
  if (u === 'AL') {
    const oil = `<path d="M${x + 8} ${BOWL_Y + 28} H${x + MW - 8} V${BOWL_BOTTOM - 14} Q${x + MW - 8} ${BOWL_BOTTOM - 1} ${cx} ${BOWL_BOTTOM - 1} Q${x + 8} ${BOWL_BOTTOM - 1} ${x + 8} ${BOWL_BOTTOM - 14} Z" fill="#e9c44a" opacity="0.75"/>
  <line x1="${cx}" y1="${BOWL_Y + 6}" x2="${cx}" y2="${BOWL_BOTTOM - 8}" stroke="#8a9096" stroke-width="1.4"/>`;
    s += bowl(x, oil);
    s += `<rect x="${cx - 4}" y="${BOWL_BOTTOM - 1}" width="8" height="5" rx="1" fill="#9aa0a6" stroke="#5f666c" stroke-width="0.5"/>`;
  } else if (hasBowl(u)) {
    s += bowl(x, u === 'AFM' ? element(x, '#eef6fb', '#9fbfd4') : element(x));
    s += drain(x, p.drain === 'C');
  } else {
    // AR: ボディの下のふた
    s += `<rect x="${cx - 10}" y="${BOWL_Y}" width="20" height="7" rx="2" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>`;
  }
  return s;
}

export function buildFrl(spec: FrlSpec): DeviceDefinition {
  const n = spec.units.length;
  const W = X0 * 2 + n * MW + (n - 1) * GAP;
  const anyBowl = spec.units.some(hasBowl);
  const H = anyBowl ? BOWL_BOTTOM + 26 : BOWL_Y + 16;
  const reg = spec.units.some(isReg);
  const filter = spec.units.some(hasFilter);

  const svg = (p: ParamValues) => {
    const { size } = bodyOf(p);
    const od = Number(p.tubeOD);
    let s = `<defs>${SMC_GRADIENTS}</defs>`;
    // ポートの継手（IN・OUT）と、モジュールをつなぐスペーサ
    s += `
  <rect x="10" y="${PORT_Y - 8}" width="${X0 - 8}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${W - X0 - 2}" y="${PORT_Y - 8}" width="${X0 - 8}" height="16" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  ${oneTouch(2, PORT_Y, 'left', od, 10)}
  ${oneTouch(W - 2, PORT_Y, 'right', od, 10)}`;
    spec.units.forEach((u, i) => {
      const x = X0 + i * (MW + GAP);
      s += moduleSvg(u, x, p, size);
      if (i < n - 1) s += `<rect x="${x + MW - 1}" y="${BODY_Y + 8}" width="${GAP + 2}" height="${BODY_H - 16}" fill="#5c6166" stroke="#2f3336" stroke-width="0.4"/>`;
    });
    s += text(9, PORT_Y - 11, 'IN', 5, '#1f5fa8');
    s += text(W - 9, PORT_Y - 11, 'OUT', 5, '#1f5fa8');
    if (reg) s += text(W / 2, H - 3, `設定 ${mpa(Number(p.setPressure))}MPa`, 5.6, '#1d4f8a');
    return s;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const { port } = bodyOf(p);
    const thread = RC[port];
    const set = Number(p.setPressure);
    return [
      {
        id: 'IN',
        label: 'IN',
        hint: '一次側 IN',
        note: reg ? `一次側（エア源から。設定圧力より 0.05MPa 以上高い圧力を入れる。最高使用圧力 1.0MPa）` : '一次側（エア源から。最高使用圧力 1.0MPa）',
        x: 2,
        y: PORT_Y,
        side: 'left',
        role: 'air',
        air: { kind: 'in', tubeOD: { param: 'tubeOD' }, thread, maxPressure: 1.0, ...(reg ? { minPressure: Math.round((set + 0.05) * 1000) / 1000 } : {}) },
      },
      {
        id: 'OUT',
        label: 'OUT',
        hint: '二次側 OUT',
        note: reg ? '二次側（設定圧力に減圧したエアを電磁弁などへ送る）' : '二次側（電磁弁などへ）',
        x: W - 2,
        y: PORT_Y,
        side: 'right',
        role: 'air',
        air: { kind: 'out', tubeOD: { param: 'tubeOD' }, thread },
      },
    ];
  };

  const airLinks: AirLink[] = [{ from: 'IN', to: 'OUT', directed: true, ...(reg ? { regulate: { param: 'setPressure' } } : {}) }];

  const params: ParamDef[] = [
    {
      key: 'body',
      label: 'サイズ・ポート',
      options: BODIES.map((b) => {
        const [size, port] = b.split('-');
        return { value: b, label: `${spec.series}${size}（${RC[port]}）` };
      }),
      default: '20-02',
    },
    tubeOdParam('tubeOD', 'IN・OUT の継手', [6, 8, 10, 12], 8),
  ];
  if (reg) {
    params.push(setPressureParam(0.4, 0.8));
    params.push({
      key: 'gauge',
      label: '圧力計',
      options: [
        { value: 'G', label: 'G（丸形・リミット表示付き）' },
        { value: 'E', label: 'E（角形埋込形・リミット表示付き）' },
      ],
      default: 'G',
    });
  }
  if (filter) {
    params.push({
      key: 'drain',
      label: 'ドレン',
      options: [
        { value: '', label: '手動（ドレンコック）' },
        { value: 'C', label: 'C（オートドレン N.C.）' },
      ],
      default: '',
    });
  }

  const pneumatic: PneumaticHint =
    n > 1
      ? { symbol: 'frl', ports: { in: 'IN', out: 'OUT' }, units: spec.units.map((u) => PNEUMATIC_UNIT[u]), gauge: reg }
      : { symbol: PNEUMATIC_UNIT[spec.units[0]], ports: { in: 'IN', out: 'OUT' }, ...(reg ? { gauge: true } : {}) };

  return {
    type: spec.type,
    name: spec.name,
    model: `${spec.series}20${spec.combo ?? ''}-02${reg ? 'G' : ''}-${spec.suffix}`,
    modelOf: (p) => {
      const { size, port } = bodyOf(p);
      return `${spec.series}${size}${spec.combo ?? ''}-${port}${filter ? (p.drain ?? '') : ''}${reg ? p.gauge : ''}-${spec.suffix}`;
    },
    maker: 'SMC',
    category: 'air-supply',
    description:
      spec.description +
      ' IN・OUT の Rc ねじにワンタッチ管継手（KQ2H□-□AS など。型式には含まない）を付けたものとし、継手のチューブ外径をパラメータで選ぶ。',
    labelPrefix: spec.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals,
    airLinks,
    params,
    pneumatic,
  };
}
