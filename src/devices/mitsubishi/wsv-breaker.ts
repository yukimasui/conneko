/**
 * 三菱電機 WS-V シリーズのノーヒューズ遮断器（NF）・漏電遮断器（NV）の表面形を描く共通部品。
 *
 * NF32-SV / NF63-CV / NF63-SV / NF63-HV（2極 W50・3極 W75 × H130、極間ピッチ 25mm）と
 * NF125-CV / NF125-SV / NF125-HV（2極 W60・3極 W90 × H130、極間ピッチ 30mm）は、
 * いずれも主端子ネジの上下間隔が 112mm（新旧比較資料 Y-0694 の外形寸法図 p.22・p.24・p.26）。
 * 見た目は収録済みの NF32-SV 3P / 2P・NV32-SV 3P と同じ描き方にそろえ、型式・定格表示・幅・ピッチだけを変える。
 * 端子記号は一次側（LINE）1/3/5、二次側（LOAD）2/4/6（2極は 1/3・2/4）。
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { poleHint } from './pole-hint';

export interface WsvBreakerSpec {
  type: string;
  /** 一般名称（'ノーヒューズ遮断器' / '漏電遮断器'） */
  name: string;
  /** 銘板の型式（例: 'NF63-CV'） */
  modelName: string;
  poles: 2 | 3;
  /** 極間ピッチ[mm] */
  pitch: number;
  /** 外形の幅[mm] */
  widthMm: number;
  /** 漏電遮断器（テストボタン・漏電表示ボタン・定格感度電流の表示を描く） */
  earthLeakage?: boolean;
  /** 定格電流の選択肢[A] */
  ratings: number[];
  defaultRating: number;
  /** 漏電遮断器の定格感度電流の選択肢 */
  sensitivity?: ParamDef['options'];
  defaultSensitivity?: number | string;
  /** 銘板の電圧表示（例: 'AC 500V'、'Ue 100-440V'） */
  voltageText: string;
  /** 主端子ネジの半径[px]（M5 は 7、M8 は 8.5 程度） */
  screwR?: number;
  description: string;
  estimated?: string;
}

const H = 260;
const TY_LINE = 18;
const TY_LOAD = 242;

/** XML として安全な文字列にする（パラメータ値を SVG に埋め込む用） */
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 文字列が最大幅[px]に収まるフォントサイズ（文字幅は 1文字 ≒ ratio×フォントサイズ で概算） */
const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, +(maxWidth / (text.length * ratio)).toFixed(2));

const defs = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dedad2"/>
      <stop offset="0.5" stop-color="#ece9e2"/>
      <stop offset="1" stop-color="#d6d2c9"/>
    </linearGradient>
    <linearGradient id="face-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f1ec"/>
      <stop offset="1" stop-color="#e2dfd7"/>
    </linearGradient>
    <linearGradient id="term-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4e0d8"/>
      <stop offset="1" stop-color="#d3cfc6"/>
    </linearGradient>
    <linearGradient id="handle-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1c1c"/>
      <stop offset="0.45" stop-color="#3d3d3d"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6e6e6"/>
      <stop offset="1" stop-color="#9c9c9c"/>
    </linearGradient>
    <radialGradient id="test-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f4f2"/>
      <stop offset="1" stop-color="#8e8e8a"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#8f8f8f"/>
    </radialGradient>
  </defs>`;

/** 端子ネジ（座金付き +- 溝のなべねじ） */
const screw = (x: number, y: number, r: number) => `
  <rect x="${x - r - 2}" y="${y - r - 2}" width="${2 * r + 4}" height="${2 * r + 4}" rx="1.5" fill="url(#washer-{{uid}})" stroke="#6d6d6d" stroke-width="0.7"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.8"/>
  <path d="M${x - r * 0.64} ${y} H${x + r * 0.64} M${x} ${y - r * 0.64} V${y + r * 0.64}" stroke="#4a4a4a" stroke-width="1.6" stroke-linecap="round"/>`;

/** 三菱マーク（スリーダイヤ） */
const logo = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="#e60012">
    <path d="M0 -7 L2.3 -3 L0 1 L-2.3 -3 Z"/>
    <path d="M0 1 L4.6 1 L6.9 5 L2.3 5 Z"/>
    <path d="M0 1 L-4.6 1 L-6.9 5 L-2.3 5 Z"/>
  </g>`;

/** ハンドル（ON 位置）。cx はハンドル枠の中心 */
const handle = (cx: number) => `
  <rect x="${cx - 22}" y="47" width="44" height="166" fill="#e7e4dc" stroke="#b3afa5" stroke-width="0.8"/>
  <rect x="${cx - 16}" y="66" width="32" height="88" rx="3" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <rect x="${cx - 12}" y="70" width="24" height="80" rx="2" fill="#2a2a2a"/>
  <rect x="${cx - 11}" y="71" width="22" height="42" rx="2" fill="url(#handle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M${cx - 8} 76 H${cx + 8} M${cx - 8} 80 H${cx + 8} M${cx - 8} 84 H${cx + 8}" stroke="#5a5a5a" stroke-width="0.9"/>
  <rect x="${cx - 11}" y="116" width="22" height="32" rx="1.5" fill="#d7262e"/>
  <text x="${cx}" y="128" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#fff">I</text>
  <text x="${cx}" y="140" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#fff">ON</text>
  <text x="${cx}" y="62" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">ON ▲</text>
  <text x="${cx}" y="162" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">OFF ▼</text>`;

/** 定格表示の枠（定格電流と、漏電遮断器は定格感度電流） */
const ratingBox = (x: number, y: number, w: number, h: number, rating: string, sens?: string) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#fbfaf7" stroke="#777" stroke-width="0.8"/>
  <text x="${x + 3}" y="${y + 7}" font-family="sans-serif" font-size="4.2" fill="#555">JET</text>
  <text x="${x + w / 2}" y="${y + (sens ? h - 18 : h - 8)}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(rating, w - 4, sens ? 15 : 16)}" font-weight="bold" fill="#222">${rating}</text>
  ${sens ? `<text x="${x + w / 2}" y="${y + h - 6}" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(sens, w - 4, 6)}" font-weight="bold" fill="#222">${sens}</text>` : ''}`;

/** 漏電遮断器のテストボタン・漏電表示ボタン */
const elbButtons = (x: number) => `
  <circle cx="${x + 17}" cy="70" r="9.5" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <circle cx="${x + 17}" cy="70" r="7.5" fill="url(#test-{{uid}})" stroke="#6f6f6a" stroke-width="0.8"/>
  <text x="${x + 2}" y="89" font-family="sans-serif" font-size="7" font-weight="bold" fill="#333">T</text>
  <text x="${x + 9}" y="87" font-family="sans-serif" font-size="4.2" fill="#555">TEST</text>
  <text x="${x + 9}" y="92" font-family="sans-serif" font-size="4.2" fill="#555">BUTTON</text>
  <circle cx="${x + 17}" cy="106" r="6" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <circle cx="${x + 17}" cy="106" r="4.2" fill="#f7f7f2" stroke="#7a7a74" stroke-width="0.8"/>
  <text x="${x}" y="120" font-family="sans-serif" font-size="4.2" fill="#555">LEAKAGE</text>
  <text x="${x}" y="125" font-family="sans-serif" font-size="4.2" fill="#555">INDICATOR</text>`;

/** 仕様欄の罫線（細かい文字の代わり） */
const specLines = (x: number, y0: number, w: number, n: number) =>
  `<g stroke="#a4a096" stroke-width="0.8"><path d="${Array.from({ length: n }, (_, i) => `M${x} ${y0 + i * 6} H${x + w - (i % 2 ? 6 : 0)}`).join(' ')}"/></g>`;

export function buildWsvBreaker(spec: WsvBreakerSpec): DeviceDefinition {
  const W = spec.widthMm * 2;
  const pitch = spec.pitch * 2;
  const r = spec.screwR ?? 7;
  const lineIds = spec.poles === 3 ? ['1', '3', '5'] : ['1', '3'];
  const loadIds = spec.poles === 3 ? ['2', '4', '6'] : ['2', '4'];
  // 端子は外形の中央に対称に並ぶ
  const x0 = W / 2 - (pitch * (spec.poles - 1)) / 2;
  const poles = lineIds.map((line, i) => ({ line, load: loadIds[i], x: x0 + pitch * i }));
  const elb = !!spec.earthLeakage;

  /** 端子部（一次側/二次側）。各極の端子カバーの窓と極間の絶縁バリア */
  const terminalBlock = (y0: number, ty: number) => `
  <rect x="2" y="${y0}" width="${W - 4}" height="40" fill="url(#term-{{uid}})"/>
  ${poles
    .map(
      (p) => `
  <rect x="${p.x - r - 5}" y="${ty - r - 5}" width="${2 * r + 10}" height="${2 * r + 10}" rx="2" fill="#3b3b3b"/>
  ${screw(p.x, ty, r)}`,
    )
    .join('')}
  ${poles
    .slice(1)
    .map((p) => `<rect x="${p.x - pitch / 2 - 2}" y="${y0 + 2}" width="4" height="36" rx="1" fill="#d2cec5" stroke="#aaa59b" stroke-width="0.6"/>`)
    .join('')}`;

  const svg = (p: ParamValues) => {
    const rating = `${esc(p.ratedCurrent)}A`;
    const sens = elb ? `${esc(p.sensitivity)}mA` : undefined;
    // 15/30mA は高速形（動作時間 0.1s 以内）
    const sensSpec = elb ? (typeof p.sensitivity === 'number' && p.sensitivity <= 30 ? `IΔn ${sens} 0.1s` : `IΔn ${sens}`) : '';
    const model = esc(spec.modelName);
    const kindText = elb
      ? `<text x="11" y="76" font-family="sans-serif" font-size="4.2" fill="#555">EARTH-LEAKAGE</text>
  <text x="11" y="81" font-family="sans-serif" font-size="4.2" fill="#555">CIRCUIT BREAKER</text>`
      : `<text x="11" y="78" font-family="sans-serif" font-size="4.6" fill="#555">NO-FUSE BREAKER</text>`;
    const common = `${defs}
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#body-{{uid}})" stroke="#8d897f" stroke-width="1.5"/>
  ${terminalBlock(0, TY_LINE)}
  ${terminalBlock(H - 40, TY_LOAD)}
  <!-- 端子記号 -->
  ${poles
    .map(
      (q) => `
  <text x="${q.x - r - 6}" y="40" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">${q.line}</text>
  <text x="${q.x - r - 6}" y="${H - 34}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">${q.load}</text>`,
    )
    .join('')}
  <text x="${W - 8}" y="40" text-anchor="end" font-family="sans-serif" font-size="7" fill="#555">LINE</text>
  <text x="${W - 8}" y="${H - 34}" text-anchor="end" font-family="sans-serif" font-size="7" fill="#555">LOAD</text>
  <!-- 前面カバー（銘板・ハンドル部） -->
  <rect x="6" y="46" width="${W - 12}" height="168" rx="4" fill="url(#face-{{uid}})" stroke="#a7a399" stroke-width="1"/>`;

    if (spec.poles === 2) {
      // 2極: ハンドルは左寄り、銘板・定格表示は右側（NF32-SV 2P と同じ配置）
      const hx = 28;
      const rx = 51;
      const rw = W - rx - 11;
      return `${common}
  ${handle(hx)}
  <g stroke="#b3afa5" stroke-width="0.8"><path d="M14 180 H42 M14 186 H38 M14 192 H42"/></g>
  ${logo(56, 59, 0.87)}
  <text x="63" y="58" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="63" y="63" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#333">ELECTRIC</text>
  <text x="${rx}" y="74" font-family="sans-serif" font-size="4.2" fill="#555">${elb ? 'EARTH-LEAKAGE' : 'NO-FUSE'}</text>
  <text x="${rx}" y="79" font-family="sans-serif" font-size="4.2" fill="#555">BREAKER</text>
  <text x="${rx}" y="86" font-family="sans-serif" font-size="4.2" fill="#555">MODEL</text>
  <text x="${rx}" y="96" font-family="sans-serif" font-size="${fitSize(model, rw + 2, 8.5)}" font-weight="bold" fill="#222">${model}</text>
  <rect x="${rx + 1}" y="104" width="28" height="9" rx="4.5" fill="#e0262c" stroke="#9e1218" stroke-width="0.7"/>
  <text x="${rx}" y="121" font-family="sans-serif" font-size="4.2" fill="#555">PUSH TO TRIP</text>
  ${ratingBox(rx, 128, rw, 34, rating, sens)}
  <text x="${rx}" y="172" font-family="sans-serif" font-size="4.2" fill="#555">POLE 2P 50/60Hz</text>
  <text x="${rx}" y="179" font-family="sans-serif" font-size="${fitSize(spec.voltageText, rw, 4.2, 0.55)}" fill="#555">${esc(spec.voltageText)}</text>
  ${specLines(rx, 185, rw, 3)}
  <text x="${rx}" y="207" font-family="sans-serif" font-size="4.2" fill="#666">MADE IN JAPAN</text>
`;
    }

    // 3極: ハンドルは中央、左に銘板、右に定格表示（NV は右上にテスト・漏電表示ボタン、定格表示は左下）
    const hx = W / 2;
    const rx = hx + 27;
    const rw = W - 11 - rx;
    const lw = hx - 22 - 11 - 3;
    const left = `
  ${logo(17, 60)}
  <text x="25" y="58" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="25" y="64" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">ELECTRIC</text>
  ${kindText}
  <text x="11" y="${elb ? 88 : 86}" font-family="sans-serif" font-size="4.6" fill="#555">MODEL</text>
  <text x="11" y="${elb ? 98 : 97}" font-family="sans-serif" font-size="${fitSize(model, lw, 9)}" font-weight="bold" fill="#222">${model}</text>
  <rect x="12" y="118" width="30" height="10" rx="5" fill="#e0262c" stroke="#9e1218" stroke-width="0.7"/>
  <text x="11" y="137" font-family="sans-serif" font-size="4.4" fill="#555">PUSH TO TRIP</text>
  <text x="11" y="206" font-family="sans-serif" font-size="4.2" fill="#666">MADE IN JAPAN</text>`;
    if (elb) {
      return `${common}
  ${handle(hx)}
  ${left}
  ${ratingBox(10, 148, Math.min(lw, 50), 42, rating, sens)}
  ${elbButtons(rx)}
  <text x="${rx}" y="139" font-family="sans-serif" font-size="4.4" fill="#555">POLE 3P 50/60Hz</text>
  <text x="${rx}" y="146" font-family="sans-serif" font-size="${fitSize(spec.voltageText, rw, 4.4, 0.55)}" fill="#555">${esc(spec.voltageText)}</text>
  <text x="${rx}" y="153" font-family="sans-serif" font-size="${fitSize(sensSpec, rw, 4.4, 0.55)}" fill="#555">${sensSpec}</text>
  ${specLines(rx, 160, rw, 5)}
  <rect x="${W - 33}" y="190" width="18" height="18" rx="9" fill="none" stroke="#777" stroke-width="0.9"/>
  <text x="${W - 24}" y="202" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#666">CCC</text>
`;
    }
    return `${common}
  ${handle(hx)}
  ${left}
  ${specLines(11, 176, lw, 4)}
  ${ratingBox(rx - 1, 56, rw + 2, 36, rating)}
  <text x="${rx}" y="102" font-family="sans-serif" font-size="4.4" fill="#555">POLE 3P</text>
  <text x="${rx}" y="109" font-family="sans-serif" font-size="4.4" fill="#555">50/60Hz  DC</text>
  <text x="${rx}" y="116" font-family="sans-serif" font-size="${fitSize(spec.voltageText, rw, 4.4, 0.55)}" fill="#555">${esc(spec.voltageText)}</text>
  <text x="${rx}" y="130" font-family="sans-serif" font-size="4.4" fill="#555">Icu/Ics kA</text>
  ${specLines(rx, 136, rw, 8)}
  <rect x="${W - 33}" y="190" width="18" height="18" rx="9" fill="none" stroke="#777" stroke-width="0.9"/>
  <text x="${W - 24}" y="202" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#666">CCC</text>
`;
  };

  const params: ParamDef[] = [
    {
      key: 'ratedCurrent',
      label: '定格電流',
      unit: 'A',
      options: spec.ratings.map((v) => ({ value: v, label: `${v}A` })),
      default: spec.defaultRating,
    },
  ];
  if (elb && spec.sensitivity) {
    params.push({
      // 定格感度電流（表示用。電気チェックには使わない）
      key: 'sensitivity',
      label: '定格感度電流',
      unit: 'mA',
      options: spec.sensitivity,
      default: spec.defaultSensitivity ?? 30,
    });
  }

  return {
    type: spec.type,
    name: spec.name,
    model: `${spec.modelName} ${spec.poles}P`,
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
