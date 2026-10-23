/**
 * 三菱電機 制御盤用遮断器 FA シリーズ（NF30-FA / NV30-FA）の共通部品。
 *
 * 外形は 2 極 W40 × H72 mm、3 極 W60 × H72 mm（カタログ Y-0660「制御盤用遮断器 FA/FHU シリーズ」p.7 仕様・p.11 外形寸法図）。
 * 主端子ネジ（M5、線押え付）は極間ピッチ 20mm、上下は中心から ±30mm（上下間隔 60mm）。
 * 端子と端子の間に取付穴があり、IEC 35mm レール取付具が標準で付く。
 * 正面は中央に黒いハンドル（上 ON・下 OFF）、漏電遮断器はハンドル右側（中心から 15mm（2 極）/ 25mm（3 極））に
 * 漏電表示ボタン（中心から上 9mm）とテストボタン（上 3mm）がある。
 * 端子記号は 3 極品の写真（同カタログ p.3 の NF50-FAU）で上 1・3・5、下 2・4・6（LOAD）。
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { poleHint } from './pole-hint';

export interface FaBreakerSpec {
  type: string;
  poles: 2 | 3;
  /** 漏電遮断器（NV30-FA） */
  earthLeakage?: boolean;
  description: string;
  estimated?: string;
}

const H = 144;
/** 主端子ネジの Y 座標（中心 36mm から ±30mm） */
const TY_LINE = 12;
const TY_LOAD = 132;
/** 端子部と正面の境目（上 11mm・下 61mm） */
const FACE_TOP = 22;
const FACE_BOT = 122;
const PITCH = 40;

const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, +(maxWidth / (text.length * ratio)).toFixed(2));

const defs = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcdcd8"/>
      <stop offset="0.5" stop-color="#efefeb"/>
      <stop offset="1" stop-color="#d6d6d1"/>
    </linearGradient>
    <linearGradient id="term-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7e7e3"/>
      <stop offset="1" stop-color="#d4d4cf"/>
    </linearGradient>
    <linearGradient id="handle-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1d1d1d"/>
      <stop offset="0.45" stop-color="#444"/>
      <stop offset="1" stop-color="#181818"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6e6e6"/>
      <stop offset="1" stop-color="#9c9c9c"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#8f8f8f"/>
    </radialGradient>
    <radialGradient id="test-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f4f2"/>
      <stop offset="1" stop-color="#8e8e8a"/>
    </radialGradient>
  </defs>`;

/** 端子ネジ（線押え付き +- 溝のなべねじ M5） */
const screw = (x: number, y: number) => `
  <rect x="${x - 8}" y="${y - 8}" width="16" height="16" rx="1.2" fill="url(#washer-{{uid}})" stroke="#6d6d6d" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="6.2" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4} M${x - 2.8} ${y - 2.8} L${x + 2.8} ${y + 2.8} M${x - 2.8} ${y + 2.8} L${x + 2.8} ${y - 2.8}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

/** 取付穴（大きい穴はねじ用、小さい穴は位置決め） */
const hole = (x: number, y: number, big: boolean) =>
  big
    ? `<rect x="${x - 7}" y="${y - 8}" width="14" height="16" rx="3" fill="#d9d9d4" stroke="#a8a8a2" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="4.6" fill="#555" stroke="#888" stroke-width="0.6"/>`
    : `<circle cx="${x}" cy="${y}" r="3.2" fill="#e8e8e4" stroke="#999" stroke-width="0.7"/>`;

const logo = (x: number, y: number, s: number) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="#e60012">
    <path d="M0 -7 L2.3 -3 L0 1 L-2.3 -3 Z"/>
    <path d="M0 1 L4.6 1 L6.9 5 L2.3 5 Z"/>
    <path d="M0 1 L-4.6 1 L-6.9 5 L-2.3 5 Z"/>
  </g>`;

export function buildFaBreaker(spec: FaBreakerSpec): DeviceDefinition {
  const elb = !!spec.earthLeakage;
  const W = spec.poles === 3 ? 120 : 80;
  const cx = W / 2;
  const lineIds = spec.poles === 3 ? ['1', '3', '5'] : ['1', '3'];
  const loadIds = spec.poles === 3 ? ['2', '4', '6'] : ['2', '4'];
  const poles = lineIds.map((line, i) => ({ line, load: loadIds[i], x: 20 + PITCH * i }));
  const modelName = elb ? 'NV30-FA' : 'NF30-FA';
  /** 漏電表示ボタン・テストボタンの X（中心から 15mm / 25mm） */
  const btnX = cx + (spec.poles === 3 ? 50 : 30);

  /** 端子部。極間（3 極は 1-3 と 3-5 の間）に取付穴がある */
  const terminalBlock = (y0: number, ty: number, top: boolean) => {
    const holes =
      spec.poles === 2
        ? hole(cx, ty, true)
        : top
          ? hole(40, ty, true) + hole(80, ty, false)
          : hole(40, ty, false) + hole(80, ty, true);
    return `
  <rect x="2" y="${y0}" width="${W - 4}" height="22" fill="url(#term-{{uid}})"/>
  ${holes}
  ${poles.map((p) => `<rect x="${p.x - 10}" y="${ty - 10}" width="20" height="20" rx="1.5" fill="#3b3b3b"/>${screw(p.x, ty)}`).join('')}`;
  };

  const svg = (p: ParamValues) => {
    const rating = `${esc(p.ratedCurrent)}A`;
    const sens = elb ? `${esc(p.sensitivity)}mA` : '';
    // 左側（ハンドルの左）の銘板の幅
    const lw = cx - 13 - 4;
    const rx = cx + 14;
    const rw = W - 4 - rx;
    const nameplate = `
  ${logo(8, 32, 0.55)}
  <text x="13" y="31.5" font-family="sans-serif" font-size="${spec.poles === 3 ? 3 : 2.4}" font-weight="bold" fill="#444">MITSUBISHI</text>
  <text x="5" y="39" font-family="sans-serif" font-size="${spec.poles === 3 ? 2.8 : 2.2}" fill="#666">${elb ? 'EARTH LEAKAGE' : 'NO FUSE BREAKER'}</text>
  <text x="5" y="47" font-family="sans-serif" font-size="${fitSize(modelName, lw - 1, 6.5)}" font-weight="bold" fill="#333">${modelName}</text>
  <rect x="5" y="54" width="${lw - 1}" height="${elb ? 24 : 18}" rx="1.2" fill="#fbfbf8" stroke="#888" stroke-width="0.6"/>
  <text x="${5 + (lw - 1) / 2}" y="68" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(rating, lw - 5, 10)}" font-weight="bold" fill="#222">${rating}</text>
  ${elb ? `<text x="${5 + (lw - 1) / 2}" y="75.5" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(sens, lw - 5, 4.6)}" font-weight="bold" fill="#222">${sens}</text>` : ''}
  <text x="5" y="${elb ? 85 : 80}" font-family="sans-serif" font-size="${fitSize(`${spec.poles}P 50/60Hz`, lw - 1, 3)}" fill="#666">${spec.poles}P 50/60Hz</text>
  <path d="M5 ${elb ? 90 : 86} H${4 + lw} M5 ${elb ? 94 : 90} H${lw}" stroke="#b5b5ae" stroke-width="0.6"/>`;
    const right = elb
      ? `
  <circle cx="${btnX}" cy="54" r="3.6" fill="#f8f6ee" stroke="#777" stroke-width="0.7"/>
  <circle cx="${btnX}" cy="66" r="3.6" fill="url(#test-{{uid}})" stroke="#666" stroke-width="0.7"/>
  <text x="${btnX - 5}" y="54.5" text-anchor="end" font-family="sans-serif" font-size="2.4" fill="#666">IND</text>
  <text x="${btnX - 5}" y="67" text-anchor="end" font-family="sans-serif" font-size="2.4" fill="#666">TEST</text>
  <text x="${rx}" y="80" font-family="sans-serif" font-size="${fitSize('100-200V', rw, 3)}" fill="#666">100-200V</text>
  <path d="M${rx} 86 H${rx + rw} M${rx} 90 H${rx + rw - 3} M${rx} 94 H${rx + rw}" stroke="#b5b5ae" stroke-width="0.6"/>`
      : `
  <text x="${rx}" y="34" font-family="sans-serif" font-size="${fitSize('AC/DC', rw, 3)}" fill="#666">AC/DC</text>
  <path d="M${rx} 40 H${rx + rw} M${rx} 44 H${rx + rw - 3} M${rx} 48 H${rx + rw} M${rx} 52 H${rx + rw - 4} M${rx} 60 H${rx + rw} M${rx} 64 H${rx + rw - 3}" stroke="#b5b5ae" stroke-width="0.6"/>
  <rect x="${W - 19}" y="76" width="12" height="12" rx="1" fill="none" stroke="#999" stroke-width="0.6"/>
  <path d="M${W - 17} 78 h3 v3 h-3 z M${W - 12} 78 h3 v3 h-3 z M${W - 17} 83 h3 v3 h-3 z" fill="#aaa"/>`;
    return `${defs}
  <!-- 本体 -->
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="2.5" fill="url(#body-{{uid}})" stroke="#8b8a84" stroke-width="1.2"/>
  ${terminalBlock(1, TY_LINE, true)}
  ${terminalBlock(H - 23, TY_LOAD, false)}
  <!-- 正面（一段高い部分） -->
  <rect x="2" y="${FACE_TOP}" width="${W - 4}" height="${FACE_BOT - FACE_TOP}" rx="1.5" fill="#f1f1ee" stroke="#a9a9a3" stroke-width="0.8"/>
  <!-- 端子記号 -->
  ${poles
    .map(
      (q) => `
  <text x="${q.x}" y="${FACE_TOP + 6}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#555">${q.line}</text>
  <text x="${q.x}" y="${FACE_BOT - 2}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#555">${q.load}</text>`,
    )
    .join('')}
  <text x="${W - 4}" y="${FACE_BOT - 2}" text-anchor="end" font-family="sans-serif" font-size="${spec.poles === 3 ? 3 : 2.4}" fill="#777">LOAD</text>
  <!-- ハンドル（ON 位置） -->
  <text x="${cx - 1}" y="${FACE_TOP + 13}" text-anchor="end" font-family="sans-serif" font-size="3.4" fill="#555">ON</text>
  <text x="${cx + 8}" y="${FACE_TOP + 13}" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#555">I</text>
  <rect x="${cx - 12}" y="44" width="24" height="40" rx="1.5" fill="#cfcfca" stroke="#9e9e98" stroke-width="0.6"/>
  <rect x="${cx - 10}" y="45" width="20" height="34" rx="1.5" fill="url(#handle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M${cx - 7} 49 H${cx + 7} M${cx - 7} 52 H${cx + 7}" stroke="#666" stroke-width="0.7"/>
  <rect x="${cx - 10}" y="66" width="20" height="5" fill="#2b2b2b"/>
  <text x="${cx - 1}" y="${FACE_BOT - 22}" text-anchor="end" font-family="sans-serif" font-size="3.4" fill="#555">OFF</text>
  <circle cx="${cx + 9}" cy="${FACE_BOT - 23.2}" r="1.5" fill="none" stroke="#555" stroke-width="0.6"/>
  ${nameplate}
  ${right}
`;
  };

  const params: ParamDef[] = [
    {
      key: 'ratedCurrent',
      label: '定格電流',
      unit: 'A',
      options: [5, 10, 15, 20, 30].map((v) => ({ value: v, label: `${v}A` })),
      default: 10,
    },
  ];
  if (elb) {
    params.push({
      // 定格感度電流（表示用。電気チェックには使わない）
      key: 'sensitivity',
      label: '定格感度電流',
      unit: 'mA',
      options: [
        { value: 15, label: '15mA' },
        { value: 30, label: '30mA' },
      ],
      default: 30,
    });
  }

  return {
    type: spec.type,
    name: elb ? '漏電遮断器（制御盤用）' : 'ノーヒューズ遮断器（制御盤用）',
    model: `${modelName} ${spec.poles}P`,
    maker: '三菱電機',
    category: 'breaker',
    description: spec.description,
    labelPrefix: elb ? 'ELB' : 'MCCB',
    width: W,
    height: H,
    svg,
    terminals: [
      ...poles.map((q, i) => ({ id: q.line, hint: poleHint(poles.length, i, '一次'), x: q.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
      ...poles.map((q, i) => ({ id: q.load, hint: poleHint(poles.length, i, '二次'), x: q.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
    ],
    links: poles.map((q) => ({ from: q.line, to: q.load, directed: true, protects: true })),
    params,
    protectionCurrent: { param: 'ratedCurrent' },
    ...(elb ? { schematic: { earthLeakage: true } } : {}),
    ...(spec.estimated ? { estimated: spec.estimated } : {}),
  };
}
