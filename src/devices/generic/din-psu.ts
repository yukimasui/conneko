/**
 * DIN レール取付のスイッチング電源（DC24V）の機器定義を作る。
 * オムロン S8VK-G・IDEC PS5R-V のように、容量（出力電流）で幅・高さが変わるシリーズを 1 つの機器にし、
 * 容量は params の outputCurrent で選ぶ（大きさは size、銘板・型式は容量に連動）。
 *
 * 端子 ID は汎用のスイッチング電源（generic.psu.dc24v）とそろえる（入力 L・N・PE、出力 +V1・+V2・-V1・-V2）。
 * 機種を変えても同じ ID の端子の電線はつながったままになる。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT } from './parts';
import { esc, fitSize, groundMark, ledGradient, screwTerminal, spread } from './power-parts';

/** 容量ごとの仕様 */
export interface PsuCapacity {
  /** 型式の容量の記号（S8VK-G の '060'、PS5R-V の 'D' など） */
  code: string;
  /** 出力容量[W] */
  watt: number;
  /** 定格出力電流[A]（params.outputCurrent の値） */
  amps: number;
  /** 外形の幅・高さ[mm] */
  widthMm: number;
  heightMm: number;
  /** AC100V 入力時の入力電流[A]（typ.）。上流の保護との比較に使う */
  inputCurrent: number;
}

export interface DinPsuSpec {
  type: string;
  maker: string;
  /** 代表の型式（例: 'S8VK-G□□□24'） */
  model: string;
  /** 容量から型式を組み立てる */
  modelOf: (c: PsuCapacity) => string;
  description: string;
  estimated?: string;
  capacities: PsuCapacity[];
  defaultAmps: number;
  /** 入力端子（L・N・⏚）を上下どちらに置くか。出力端子は反対側 */
  inputAt: 'top' | 'bottom';
  /** 出力端子の並び（左から） */
  outputOrder: ('+V1' | '+V2' | '-V1' | '-V2')[];
  /** 入力端子の並び（左から） */
  inputOrder: ('L' | 'N' | 'PE')[];
  /** 見た目 */
  look: PsuLook;
}

/** 見た目（筐体・正面・銘板の色と文字） */
export interface PsuLook {
  /** 筐体の側面の陰影（端 / 中央） */
  caseEdge: string;
  caseMid: string;
  /** 端子台の色 */
  block: string;
  /** 端子名の帯の色・文字色 */
  band: string;
  /** 正面パネル（一段高い部分）の色と縁 */
  face: string;
  faceStroke: string;
  /** ブランド名とその色 */
  brand: string;
  brandColor: string;
  /** シリーズ名（正面に大きく書く） */
  series: string;
  seriesColor: string;
  /** 放熱スリットの色 */
  slit: string;
  /** 正面の文字の色 */
  faceText: string;
  /** 出力電圧調整トリマの色 */
  trimmer: string;
}

const SCALE = 2; // 1mm = 2px
const BLOCK = 28; // 端子台の帯の高さ[px]
const BAND = 9; // 端子名の帯の高さ[px]
const TERM_FROM_EDGE = 16; // 端子ネジの中心の、上下の端からの距離[px]

/** 容量を選ぶ（見つからなければ既定値の容量） */
const capOf = (spec: DinPsuSpec, p: ParamValues) =>
  spec.capacities.find((c) => c.amps === Number(p.outputCurrent)) ?? spec.capacities.find((c) => c.amps === spec.defaultAmps)!;

const sizeOf = (c: PsuCapacity) => ({ width: Math.round(c.widthMm * SCALE), height: Math.round(c.heightMm * SCALE) });

/** 端子の位置（入力・出力） */
function layout(spec: DinPsuSpec, c: PsuCapacity) {
  const { width: W, height: H } = sizeOf(c);
  const inY = spec.inputAt === 'top' ? TERM_FROM_EDGE : H - TERM_FROM_EDGE;
  const outY = spec.inputAt === 'top' ? H - TERM_FROM_EDGE : TERM_FROM_EDGE;
  const inX = spread(W, spec.inputOrder.length, 3);
  const outX = spread(W, spec.outputOrder.length, 3);
  // ネジの半径は端子の間隔に合わせる（幅 22.5mm の 4 端子でも隣と重ならない）
  const pitch = (W - 6) / Math.max(spec.inputOrder.length, spec.outputOrder.length);
  const r = Math.min(5.2, +(pitch * 0.32).toFixed(2));
  return { W, H, inY, outY, inX, outX, r };
}

function terminals(spec: DinPsuSpec, p: ParamValues): TerminalDef[] {
  const c = capOf(spec, p);
  const { inY, outY, inX, outX } = layout(spec, c);
  const inSide = spec.inputAt === 'top' ? ('top' as const) : ('bottom' as const);
  const outSide = spec.inputAt === 'top' ? ('bottom' as const) : ('top' as const);
  const accepts = { system: 'AC' as const, minVoltage: 100, maxVoltage: 240, conductors: ['R', 'S', 'T', 'L', 'N'] as ('R' | 'S' | 'T' | 'L' | 'N')[] };
  const input: TerminalDef[] = spec.inputOrder.map((id, i) =>
    id === 'PE'
      ? { id, label: '⏚', hint: '接地', note: 'PE（保護接地）', x: inX[i], y: inY, side: inSide, role: 'ground' as const }
      : { id, hint: 'AC入力', note: id === 'L' ? '入力 L（内蔵ヒューズ側）' : '入力 N', x: inX[i], y: inY, side: inSide, role: 'input' as const, accepts },
  );
  const output: TerminalDef[] = spec.outputOrder.map((id, i) => {
    const plus = id.startsWith('+');
    return {
      id,
      label: plus ? '+V' : '-V',
      hint: plus ? '出力 +24V' : '出力 0V',
      x: outX[i],
      y: outY,
      side: outSide,
      role: 'supply' as const,
      supply: { system: 'DC' as const, voltage: 24, conductor: plus ? ('+' as const) : ('-' as const), limitCurrent: { param: 'outputCurrent' } },
      // 2 組目は渡り配線用なので未接続でも警告しない
      ...(id.endsWith('2') ? { optional: true } : {}),
    };
  });
  return [...input, ...output];
}

function svg(spec: DinPsuSpec, p: ParamValues): string {
  const c = capOf(spec, p);
  const L = spec.look;
  const { W, H, inY, outY, inX, outX, r } = layout(spec, c);
  const top = spec.inputAt === 'top';
  // 端子台の帯と端子名の帯の位置
  const blockY = (y: number) => (y < H / 2 ? 2 : H - 2 - BLOCK);
  const bandY = (y: number) => (y < H / 2 ? 2 + BLOCK : H - 2 - BLOCK - BAND);
  const label = (x: number, y: number, t: string, color: string, size = 5.2) =>
    `<text x="${x}" y="${bandY(y) + 6.8}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${color}">${t}</text>`;
  const labelSize = Math.min(5.2, fitSize('+V', (W - 6) / 4.2, 5.2, 0.62));
  // 正面パネル（端子名の帯の間）
  const faceTop = 2 + BLOCK + BAND + 1;
  const faceBottom = H - 2 - BLOCK - BAND - 1;
  const faceH = faceBottom - faceTop;
  // 表示灯・トリマは出力端子の側
  const indY = top ? faceBottom - 13 : faceTop + 11;
  const wide = W >= 60;
  const ledX = wide ? W * 0.3 : W * 0.3;
  const adjX = wide ? W * 0.7 : W * 0.72;
  const indText = (x: number, t: string) =>
    `<text x="${x}" y="${indY + 10.5}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(t, W * 0.4, 3.8)}" font-weight="bold" fill="${L.faceText}">${t}</text>`;
  // 銘板（正面中央）
  const plateTop = top ? faceTop + 8 : indY + 18;
  const plateBottom = top ? indY - 8 : faceBottom - 8;
  const cx = W / 2;
  const model = esc(spec.modelOf(c));
  const slits = Math.max(2, Math.floor((W - 10) / 9));
  const slitW = (W - 10) / slits;
  const slitRow = (y: number) =>
    Array.from({ length: slits }, (_, i) => `<rect x="${(5 + i * slitW + slitW * 0.22).toFixed(1)}" y="${y}" width="${(slitW * 0.56).toFixed(1)}" height="10" rx="1.5" fill="${L.slit}" opacity="0.85"/>`).join('');
  const slitY = top ? faceTop + 3 : faceBottom - 13;
  const plateFrom = top ? plateTop + 10 : plateTop;
  const plateTo = top ? plateBottom : plateBottom - 10;
  const pH = plateTo - plateFrom;
  return `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${L.caseEdge}"/>
      <stop offset="0.12" stop-color="${L.caseMid}"/>
      <stop offset="0.88" stop-color="${L.caseMid}"/>
      <stop offset="1" stop-color="${L.caseEdge}"/>
    </linearGradient>
    <linearGradient id="block-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${L.block}"/>
      <stop offset="1" stop-color="#1e2023"/>
    </linearGradient>
    ${SCREW_GRADIENT}
    ${ledGradient('led', '#d9ffd9', '#3ddc5a', '#16872c')}
  </defs>

  <!-- 筐体 -->
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="3" fill="url(#case-{{uid}})" stroke="#7d8187" stroke-width="1"/>

  <!-- 端子台（上・下） -->
  ${[inY, outY].map((y) => `<rect x="2" y="${blockY(y)}" width="${W - 4}" height="${BLOCK}" rx="2" fill="url(#block-{{uid}})"/>`).join('')}
  ${inX.map((x) => screwTerminal(x, inY, r)).join('')}
  ${outX.map((x) => screwTerminal(x, outY, r)).join('')}

  <!-- 端子名の帯 -->
  ${[inY, outY].map((y) => `<rect x="2" y="${bandY(y)}" width="${W - 4}" height="${BAND}" fill="${L.band}" stroke="#9a9ea4" stroke-width="0.4"/>`).join('')}
  ${spec.inputOrder.map((id, i) => (id === 'PE' ? groundMark(inX[i], bandY(inY) + 1.4, 0.95) : label(inX[i], inY, id, '#222', labelSize))).join('')}
  ${spec.outputOrder.map((id, i) => label(outX[i], outY, id.startsWith('+') ? '+V' : '-V', id.startsWith('+') ? '#c21d1d' : '#1d3fae', labelSize)).join('')}

  <!-- 正面パネル -->
  <rect x="4" y="${faceTop}" width="${W - 8}" height="${faceH}" rx="2" fill="${L.face}" stroke="${L.faceStroke}" stroke-width="0.6"/>
  ${slitRow(slitY)}

  <!-- 表示灯（DC ON）・出力電圧調整（V.ADJ） -->
  <circle cx="${ledX}" cy="${indY}" r="3.6" fill="#1a1a1a"/>
  <circle cx="${ledX}" cy="${indY}" r="2.7" fill="url(#led-{{uid}})"/>
  ${indText(ledX, 'DC ON')}
  <circle cx="${adjX}" cy="${indY}" r="${Math.min(4.6, W * 0.09).toFixed(2)}" fill="${L.trimmer}" stroke="#333" stroke-width="0.6"/>
  <path d="M${adjX - 2.6} ${indY} H${adjX + 2.6}" stroke="#f2f2f2" stroke-width="1.2" stroke-linecap="round"/>
  ${indText(adjX, 'V.ADJ')}

  <!-- 銘板 -->
  <text x="${cx}" y="${plateFrom + pH * 0.14}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(L.brand, W - 12, 8.5, 0.7)}" font-weight="bold" fill="${L.brandColor}" letter-spacing="0.4">${L.brand}</text>
  <text x="${cx}" y="${plateFrom + pH * 0.3}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(L.series, W - 10, 9, 0.66)}" font-weight="bold" fill="${L.seriesColor}">${L.series}</text>
  <rect x="${cx - Math.min(18, W * 0.36)}" y="${plateFrom + pH * 0.38}" width="${Math.min(36, W * 0.72)}" height="${Math.max(9, pH * 0.1).toFixed(1)}" rx="1.5" fill="#f2b705" stroke="#a87e00" stroke-width="0.5"/>
  <text x="${cx}" y="${(plateFrom + pH * 0.38 + Math.max(9, pH * 0.1) * 0.72).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(`${c.watt}W`, W * 0.6, 6.5)}" font-weight="bold" fill="#1d1d1d">${c.watt}W</text>
  <text x="${cx}" y="${plateFrom + pH * 0.64}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize('DC24V', W - 10, 7.5)}" font-weight="bold" fill="${L.faceText}">DC24V</text>
  <text x="${cx}" y="${plateFrom + pH * 0.76}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(`${c.amps}A`, W - 10, 6)}" font-weight="bold" fill="${L.faceText}">${c.amps}A</text>
  <text x="${cx}" y="${plateFrom + pH * 0.9}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(model, W - 8, 4.4, 0.6)}" fill="${L.faceText}">${model}</text>
`;
}

/** DIN レール取付のスイッチング電源の機器定義 */
export function buildDinPsu(spec: DinPsuSpec): DeviceDefinition {
  const def0 = sizeOf(spec.capacities.find((c) => c.amps === spec.defaultAmps)!);
  return {
    type: spec.type,
    name: 'スイッチング電源',
    model: spec.model,
    modelOf: (p) => spec.modelOf(capOf(spec, p)),
    maker: spec.maker,
    category: 'power-supply',
    description: spec.description,
    labelPrefix: 'PSU',
    width: def0.width,
    height: def0.height,
    size: (p) => sizeOf(capOf(spec, p)),
    svg: (p) => svg(spec, p),
    terminals: (p) => terminals(spec, p),
    links: [
      // 同極の出力端子は内部でつながっている
      { from: '+V1', to: '+V2' },
      { from: '-V1', to: '-V2' },
    ],
    params: [
      {
        key: 'outputCurrent',
        label: '容量（定格出力電流）',
        unit: 'A',
        options: spec.capacities.map((c) => ({ value: c.amps, label: `${c.watt}W（${c.amps}A）` })),
        default: spec.defaultAmps,
      },
    ],
    // 入力電流（AC100V 時）を負荷電流として上流の保護と比べる
    loadCurrent: (p) => capOf(spec, p).inputCurrent,
    distinctGroups: [['L', 'N']],
    ...(spec.estimated ? { estimated: spec.estimated } : {}),
  };
}
