/**
 * 盤の扉に付ける Φ22 の操作スイッチ（押しボタン・照光押しボタン・セレクタスイッチ）の機器定義を作る。
 *
 * 左に正面から見た操作部（ベゼル・ボタン・つまみ）、右に背面の接点ブロックと照光ユニットを並べた概念図
 * （実機では接点ブロックは操作部の真後ろに 10mm 幅で並ぶ。お手本は idec-xw1e-lv402q4mr.ts）。縮尺は 1mm ≒ 1.5px。
 * 背面のブロックは「裏から見た並び」（メーカーの BOTTOM VIEW と同じ左右）で描く。
 * 接点ブロック 1 個につきネジ端子が上下に 1 つずつあり、上の端子から上へ、下の端子から下へ電線が出る。
 */
import type { AcceptSpec, ContactActuator, DeviceDefinition, InternalLink, NumOrParam, ParamDef, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT, TINTS, noSymbol, ncSymbol, screw, text, tintGradient, type Tint } from './parts';

/** 操作部の種類 */
export type OperatorKind = 'flush' | 'illuminated' | 'selector2' | 'selector3';

export interface ContactBlock {
  kind: 'NO' | 'NC';
  /** 上のネジの端子 ID */
  top: string;
  /** 下のネジの端子 ID */
  bottom: string;
  /** 印字（端子 ID と違う場合。同じ番号のブロックが 2 個ある機種など） */
  topLabel?: string;
  bottomLabel?: string;
  /** 接点の説明（セレクタの「右で閉」など） */
  note?: string;
  /** セレクタスイッチの a 接点が閉じる位置（positions の名前） */
  closedAt?: string[];
}

/** 背面のユニット（接点ブロックか照光ユニット） */
export type Unit = ContactBlock | { kind: 'led' };

export interface ColorOption {
  /** TINTS のキー */
  tint: string;
  /** 型式の色記号（例: オムロンの 'NG'、'TR'） */
  code: string;
}

export interface PanelSwitchSpec {
  type: string;
  name: string;
  model: string;
  maker: string;
  description: string;
  labelPrefix: string;
  operator: OperatorKind;
  /** 選べる色。先頭が既定 */
  colors: ColorOption[];
  /** 背面のユニット（裏から見て左から順） */
  units: Unit[];
  /** 照光 LED（端子 X1・X2） */
  led?: { accepts: AcceptSpec | AcceptSpec[]; current: NumOrParam; note: string };
  /** 型式の表示（色記号から作る） */
  caption: (code: string) => string;
  /** セレクタの位置の表示（左から） */
  positions?: string[];
  actuator?: ContactActuator;
  /** 接点の定格（端子の note に付ける） */
  rating?: string;
  estimated?: string;
}

const H = 128;
const CX = 48;
const CY = 62;
/** ベゼルの外径（Φ29.7 程度）の半径 */
const BEZEL_R = 22.5;
const TOP_Y = 26;
const BOT_Y = 102;
const UNIT_PITCH = 36;
const FIRST_UNIT_X = 118;

/** 接点ブロックの色（オムロン A22N: a 接点 = 青、b 接点 = 橙、照光ユニット = 黒） */
const UNIT_COLORS = {
  NO: { body: '#2f68c4', edge: '#1a3f80', title: 'NO' },
  NC: { body: '#f08a24', edge: '#9a5110', title: 'NC' },
  led: { body: '#2a2c2f', edge: '#0c0c0d', title: 'LED' },
};

/** 背面のユニットの箱とネジ */
const unitBox = (x: number, kind: 'NO' | 'NC' | 'led', inner: string, top: string, bottom: string) => {
  const c = UNIT_COLORS[kind];
  return `
  <rect x="${x - 15}" y="12" width="30" height="104" rx="2" fill="${c.body}" stroke="${c.edge}" stroke-width="0.8"/>
  <rect x="${x - 14}" y="13" width="5" height="102" rx="1.5" fill="#fff" opacity="0.12"/>
  <rect x="${x - 12}" y="40" width="24" height="48" rx="1.5" fill="#f6f3ec" stroke="#a49e90" stroke-width="0.5"/>
  ${text(x, 48, c.title, 5.2, kind === 'NO' ? '#1a3f80' : kind === 'NC' ? '#b5520b' : '#222')}
  ${inner}
  ${screw(x, TOP_Y, 5, '#d4d6d9')}
  ${screw(x, BOT_Y, 5, '#d4d6d9')}
  ${text(x, TOP_Y + 13, top, 5, '#fff')}
  ${text(x, BOT_Y - 8.6, bottom, 5, '#fff')}`;
};

/** ベゼル（黒い樹脂の丸枠） */
const bezel = () => `
  <circle cx="${CX + 1.2}" cy="${CY + 1.6}" r="${BEZEL_R}" fill="#000" opacity="0.22"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R}" fill="url(#bezel-{{uid}})" stroke="#0c0c0d" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 3.2}" fill="#161718" stroke="#3c3e41" stroke-width="0.6"/>`;

/** 平形の押しボタン */
const flushButton = () => `
  ${bezel()}
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 5}" fill="url(#tint-{{uid}})" stroke="url(#rim-{{uid}})" stroke-width="1.2"/>
  <ellipse cx="${CX - 5}" cy="${CY - 7}" rx="8" ry="4.5" fill="#fff" opacity="0.28" transform="rotate(-30 ${CX - 5} ${CY - 7})"/>`;

/** 照光押しボタン（半透明のボタンの中に LED が透ける） */
const illuminatedButton = () => `
  ${bezel()}
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 5}" fill="url(#tint-{{uid}})" stroke="url(#rim-{{uid}})" stroke-width="1.2"/>
  ${[4, 8, 12].map((r) => `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="0.8"/>`).join('')}
  <circle cx="${CX}" cy="${CY}" r="2.6" fill="#fff" opacity="0.5"/>
  <ellipse cx="${CX - 5}" cy="${CY - 7}" rx="8" ry="4.5" fill="#fff" opacity="0.32" transform="rotate(-30 ${CX - 5} ${CY - 7})"/>`;

/**
 * セレクタスイッチ（つまみ形）。2 ノッチは 90°（左 45°・右 45°）、3 ノッチは 45° ずつ（左・中・右）。
 * つまみは 2 ノッチは左、3 ノッチは中を向けて描き、位置の表示を外側に書く。
 */
const selectorKnob = (n: 2 | 3, labels: string[]) => {
  const angle = n === 3 ? 0 : -45;
  const marks = n === 3 ? [-45, 0, 45] : [-45, 45];
  const r = BEZEL_R + 6;
  const markSvg = marks
    .map((a, i) => {
      const rad = ((a - 90) * Math.PI) / 180;
      const x = +(CX + r * Math.cos(rad)).toFixed(2);
      const y = +(CY + r * Math.sin(rad)).toFixed(2);
      return text(x, y + 2, labels[i] ?? '', 5.4, '#222');
    })
    .join('');
  return `
  ${markSvg}
  ${bezel()}
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 5}" fill="#4a4c50" stroke="#050505" stroke-width="0.8"/>
  <g transform="rotate(${angle} ${CX} ${CY})">
    <rect x="${CX - 4.8}" y="${CY - BEZEL_R + 3}" width="9.6" height="${2 * BEZEL_R - 6}" rx="4" fill="url(#tint-{{uid}})" stroke="url(#rim-{{uid}})" stroke-width="0.9"/>
    <path d="M${CX} ${CY - BEZEL_R + 6} l-2.6 5 h5.2 Z" fill="#fff" opacity="0.9"/>
    <rect x="${CX - 3}" y="${CY - 4}" width="1.6" height="12" rx="0.8" fill="#fff" opacity="0.18"/>
  </g>`;
};

/** 背面の胴部（操作部から背面のユニットへ） */
const body = (xEnd: number) => `
  <rect x="${CX + 16}" y="${CY - 15}" width="${xEnd - CX - 16}" height="30" rx="3" fill="url(#body-{{uid}})"/>
  <rect x="${CX + 30}" y="${CY - 21}" width="12" height="42" rx="2" fill="#2a2c2f" stroke="#111" stroke-width="0.6"/>`;

const isBlock = (u: Unit): u is ContactBlock => u.kind !== 'led';

export function buildPanelSwitch(s: PanelSwitchSpec): DeviceDefinition {
  const xs = s.units.map((_, i) => FIRST_UNIT_X + i * UNIT_PITCH);
  const W = xs[xs.length - 1] + 20;
  const colorOf = (p: ParamValues) => s.colors.find((c) => c.code === String(p.color)) ?? s.colors[0];

  const operator = (): string => {
    if (s.operator === 'flush') return flushButton();
    if (s.operator === 'illuminated') return illuminatedButton();
    return selectorKnob(s.operator === 'selector3' ? 3 : 2, s.positions ?? []);
  };

  const svg = (p: ParamValues) => {
    const opt = colorOf(p);
    const c: Tint = TINTS[opt.tint];
    const units = s.units
      .map((u, i) => {
        const x = xs[i];
        if (!isBlock(u)) {
          return unitBox(
            x,
            'led',
            `${text(x, 56, 'DC/AC24V', 3.6, '#333', 'normal')}
  <circle cx="${x}" cy="70" r="6" fill="none" stroke="#222" stroke-width="0.9"/>
  <path d="M${x - 4.2} ${70 - 4.2} L${x + 4.2} ${70 + 4.2} M${x + 4.2} ${70 - 4.2} L${x - 4.2} ${70 + 4.2}" stroke="#222" stroke-width="0.9"/>`,
            'X1',
            'X2',
          );
        }
        return unitBox(x, u.kind, u.kind === 'NO' ? noSymbol(x, 54) : ncSymbol(x, 54), u.topLabel ?? u.top, u.bottomLabel ?? u.bottom);
      })
      .join('');
    return `
  <defs>
    ${tintGradient('tint', c)}
    <linearGradient id="rim-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.hi}"/>
      <stop offset="1" stop-color="${c.edge}"/>
    </linearGradient>
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="0.5" stop-color="#2a2c2f"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d51"/>
      <stop offset="0.5" stop-color="#2c2e31"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  ${body(xs[0] - 15)}
  ${operator()}
  ${units}
  ${text(CX, 122, s.caption(opt.code), 4.6, '#333', 'normal')}`;
  };

  const rating = s.rating ? `。${s.rating}` : '';
  const terminals: TerminalDef[] = [];
  s.units.forEach((u, i) => {
    if (!isBlock(u)) {
      if (!s.led) throw new Error(`${s.type}: 照光ユニットがあるのに led の指定がない`);
      const base = { role: 'input' as const, accepts: s.led.accepts, optional: true };
      terminals.push(
        { id: 'X1', label: 'X1', note: `照光 LED（${s.led.note}）`, x: xs[i], y: TOP_Y, side: 'top', ...base },
        { id: 'X2', label: 'X2', note: `照光 LED（${s.led.note}）`, x: xs[i], y: BOT_Y, side: 'bottom', ...base },
      );
      return;
    }
    const what = `${u.kind === 'NO' ? 'a 接点' : 'b 接点'} ${u.topLabel ?? u.top}-${u.bottomLabel ?? u.bottom}`;
    const note = `${what}${u.note ? `（${u.note}）` : ''}${rating}`;
    terminals.push(
      { id: u.top, label: u.topLabel ?? u.top, note, x: xs[i], y: TOP_Y, side: 'top', role: 'signal', optional: true },
      { id: u.bottom, label: u.bottomLabel ?? u.bottom, note, x: xs[i], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    );
  });

  const links: InternalLink[] = s.units.filter(isBlock).map((b) => ({ from: b.top, to: b.bottom, switch: b.kind, ...(b.closedAt ? { positions: b.closedAt } : {}) }));
  const params: ParamDef[] = [
    {
      key: 'color',
      label: s.operator.startsWith('selector') ? 'つまみの色' : 'ボタンの色',
      options: s.colors.map((c) => ({ value: c.code, label: `${TINTS[c.tint].label}（${c.code}）` })),
      default: s.colors[0].code,
    },
  ];
  const hasLed = s.units.some((u) => !isBlock(u));
  const schematic = {
    ...(s.actuator ? { actuator: s.actuator } : {}),
    ...(hasLed ? { elements: [{ kind: 'lamp' as const, terminals: ['X1', 'X2'] }] } : {}),
  };

  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: s.maker,
    category: 'control',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals,
    links,
    params,
    ...(hasLed && s.led ? { loadCurrent: s.led.current } : {}),
    ...(Object.keys(schematic).length ? { schematic } : {}),
    ...(s.estimated ? { estimated: s.estimated } : {}),
  };
}

/**
 * オムロン A22N・M22N の LED の電流[A]（24V AC/DC。色で変わる: 赤・橙・黄・青 約 12mA、白・緑 約 5mA）。
 * params の color（色記号。末尾の 1 文字が色: G 緑・R 赤・Y 黄・W 白・A 青・O 橙）から求める
 */
export const a22nLedCurrent = (p: ParamValues): number => (/[GW]$/.test(String(p.color ?? '')) ? 0.005 : 0.012);

/** オムロン A22N の接点の定格（データシート A22N/M22N/A30N の Ratings） */
export const A22N_RATING = 'AC-15: AC240V 3A・AC120V 6A、DC-13: DC24V 4A（最小適用負荷 DC5V 10mA）';

/** LED 24V AC/DC ±10% の受電条件（極性なし） */
export const LED_24V_ACDC: AcceptSpec[] = [
  { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4 },
  { system: 'AC', minVoltage: 21.6, maxVoltage: 26.4 },
];
