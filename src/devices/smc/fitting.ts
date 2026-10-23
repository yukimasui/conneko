/**
 * SMC のワンタッチ管継手（KQ2 シリーズ）とサイレンサ（AN シリーズ）。
 *
 * 出典: SMC ワンタッチ管継手 KQ2 シリーズ、サイレンサ AN シリーズのカタログ
 *   KQ2T□-00A: ユニオンティ（3 方向とも同じチューブ外径）
 *   KQ2U□-00A: ユニオン Y（1 本から 2 本へ分岐）
 *   KQ2R□-□A: プラグインレデューサ（チューブ側 - 差込み側の外径。差込み側を太いワンタッチ管継手に差し込んで異径をつなぐ）
 *   AN: 樹脂形サイレンサ（AN120-M5・AN110-01・AN200-02・AN300-03）。電磁弁などの排気ポートにねじ込み、排気音を下げる
 *
 * 継手の中は向きのない通り道（airLinks）でつなぐ。分岐継手のポートは用途を 'work'（どちらの向きにも流れる）とする。
 */
import type { AirLink, DeviceDefinition, ParamValues } from '../types';
import { oneTouch, R_MALE, SMC_GRADIENTS, text, tubeOdParam } from './parts';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 3 つのポートを互いにつなぐ */
const allConnected = (ids: string[]): AirLink[] => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => ({ from: a, to: b })));

/** ユニオンティ KQ2T */
export function buildKq2t(type: string): DeviceDefinition {
  const W = 64;
  const H = 52;
  const cy = 16;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    const w = Math.max(9, od + 4);
    return `<defs>${SMC_GRADIENTS}</defs>
  <rect x="12" y="${cy - w / 2}" width="${W - 24}" height="${w}" rx="2" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="${cx - w / 2}" y="${cy}" width="${w}" height="${H - 12 - cy}" rx="2" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="${cx - w / 2 + 0.4}" y="${cy - w / 2 + 0.6}" width="${w - 0.8}" height="${w}" fill="#f6f7f8"/>
  ${oneTouch(2, cy, 'left', od, 12)}
  ${oneTouch(W - 2, cy, 'right', od, 12)}
  ${oneTouch(cx, H - 2, 'bottom', od, 12)}
  ${text(cx, cy + 2, `φ${od}`, 4.4, '#333')}`;
  };
  return {
    type,
    name: 'ユニオンティ（ワンタッチ管継手）',
    model: 'KQ2T06-00A',
    modelOf: (p) => `KQ2T${pad2(Number(p.tubeOD))}-00A`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のワンタッチ管継手 KQ2 シリーズのユニオンティ（T 字の分岐。3 方向とも同じチューブ外径）。1 本のチューブを 2 本に分ける（3 点セットの出口から 2 台の電磁弁へ、など）。圧力スイッチを分岐に付けるときにも使う。向きはない。',
    labelPrefix: 'J',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'A', label: 'A', hint: 'ポート A', note: 'ポート A（左）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
      { id: 'B', label: 'B', hint: 'ポート B', note: 'ポート B（右）', x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
      { id: 'C', label: 'C', hint: 'ポート C', note: 'ポート C（分岐）', x: cx, y: H - 2, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
    ],
    airLinks: allConnected(['A', 'B', 'C']),
    params: [tubeOdParam('tubeOD', 'チューブ外径', [4, 6, 8, 10, 12], 6)],
    pneumatic: { symbol: 'tee', ports: { a: 'A', b: 'B', c: 'C' } },
  };
}

/** ユニオン Y KQ2U */
export function buildKq2u(type: string): DeviceDefinition {
  const W = 64;
  const H = 52;
  const cy = H / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    const w = Math.max(9, od + 4);
    const by = 12;
    return `<defs>${SMC_GRADIENTS}</defs>
  <path d="M12 ${cy - w / 2} H24 L${W - 14} ${by - w / 2} V${by + w / 2} L32 ${cy} L${W - 14} ${H - by - w / 2} V${H - by + w / 2} L24 ${cy + w / 2} H12 Z" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6" stroke-linejoin="round"/>
  ${oneTouch(2, cy, 'left', od, 12)}
  ${oneTouch(W - 2, by, 'right', od, 12)}
  ${oneTouch(W - 2, H - by, 'right', od, 12)}
  ${text(26, cy + 1.6, `φ${od}`, 4.2, '#333')}`;
  };
  return {
    type,
    name: 'ユニオン Y（ワンタッチ管継手）',
    model: 'KQ2U06-00A',
    modelOf: (p) => `KQ2U${pad2(Number(p.tubeOD))}-00A`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のワンタッチ管継手 KQ2 シリーズのユニオン Y（Y 字の分岐。3 方向とも同じチューブ外径）。左の 1 本（A）を右の 2 本（B・C）に分ける。ティより分岐した 2 本を同じ向きにそろえやすい。向きはない。',
    labelPrefix: 'J',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'A', label: 'A', hint: 'ポート A', note: 'ポート A（1 本の側）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
      { id: 'B', label: 'B', hint: 'ポート B', note: 'ポート B（分岐の上）', x: W - 2, y: 12, side: 'right', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
      { id: 'C', label: 'C', hint: 'ポート C', note: 'ポート C（分岐の下）', x: W - 2, y: H - 12, side: 'right', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' } } },
    ],
    airLinks: allConnected(['A', 'B', 'C']),
    params: [tubeOdParam('tubeOD', 'チューブ外径', [4, 6, 8, 10, 12], 6)],
    pneumatic: { symbol: 'tee', ports: { a: 'A', b: 'B', c: 'C' } },
  };
}

/** プラグインレデューサ KQ2R（細いチューブ ← → 太い継手への差込み） */
const REDUCERS = ['4-6', '6-8', '8-10', '10-12', '4-8', '6-10', '8-12'];

export function buildKq2r(type: string): DeviceDefinition {
  const W = 76;
  const H = 34;
  const cy = 16;
  const svg = (p: ParamValues) => {
    const [small, big] = String(p.size).split('-').map(Number);
    const ws = Math.max(9, small + 4);
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', small, 14)}
  <rect x="16" y="${cy - ws / 2}" width="22" height="${ws}" rx="2" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <!-- 差込み側（太いチューブと同じ外径の管。相手のワンタッチ管継手に差し込む） -->
  <rect x="38" y="${cy - big / 2}" width="${W - 40}" height="${big}" fill="url(#smc-metal-{{uid}})" stroke="#6b7177" stroke-width="0.6"/>
  <line x1="${W - 6}" y1="${cy - big / 2}" x2="${W - 6}" y2="${cy + big / 2}" stroke="#6b7177" stroke-width="0.5"/>
  ${text(27, cy + 1.6, `φ${small}`, 4.2, '#333')}
  ${text(W - 18, cy + big / 2 + 7, `差込 φ${big}`, 4.2, '#333')}`;
  };
  return {
    type,
    name: '異径継手（プラグインレデューサ）',
    model: 'KQ2R06-08A',
    modelOf: (p) => {
      const [small, big] = String(p.size).split('-').map(Number);
      return `KQ2R${pad2(small)}-${pad2(big)}A`;
    },
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のワンタッチ管継手 KQ2 シリーズのプラグインレデューサ（異径継手）。差込み側（太い外径の管）を太いチューブ用のワンタッチ管継手（3 点セットの出口・ティなど）に差し込み、反対側に細いチューブをつなぐ。' +
      '図では、差込み側（PLUG）を太いワンタッチ管継手のポートと太いチューブでつなぐ。向きはない。',
    labelPrefix: 'J',
    width: W,
    height: H,
    svg,
    terminals: (p) => {
      const [small, big] = String(p.size).split('-').map(Number);
      return [
        { id: 'TUBE', label: `φ${small}`, hint: '細いチューブ', note: `細いチューブ側（φ${small} のワンタッチ管継手）`, x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'work', tubeOD: small } },
        { id: 'PLUG', label: `差込 φ${big}`, hint: '差込み側', note: `差込み側（φ${big} のワンタッチ管継手に差し込む）`, x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'work', tubeOD: big } },
      ];
    },
    airLinks: [{ from: 'TUBE', to: 'PLUG' }],
    params: [
      {
        key: 'size',
        label: 'チューブ側 - 差込み側',
        options: REDUCERS.map((r) => {
          const [s, b] = r.split('-');
          return { value: r, label: `φ${s} - 差込 φ${b}` };
        }),
        default: '6-8',
      },
    ],
    pneumatic: { symbol: 'tee', ports: { a: 'TUBE', b: 'PLUG' } },
    estimated: 'チューブ外径と差込み側の組み合わせ（選べる組）は推定',
  };
}

/** サイレンサ AN（ねじ込み形） */
const SILENCERS: Record<string, string> = { M5: 'AN120-M5', '01': 'AN110-01', '02': 'AN200-02', '03': 'AN300-03' };

export function buildAn(type: string): DeviceDefinition {
  const W = 32;
  const H = 56;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const big = p.thread === 'M5' ? 0 : p.thread === '01' ? 2 : 4;
    const bw = 14 + big;
    const slits = Array.from({ length: 6 }, (_, i) => `<line x1="${cx - bw / 2 + 2}" y1="${20 + i * 4.5}" x2="${cx + bw / 2 - 2}" y2="${20 + i * 4.5}" stroke="#efefe8" stroke-width="1.6"/>`).join('');
    return `<defs>${SMC_GRADIENTS}</defs>
  <!-- ねじ（おねじ）と六角 -->
  <rect x="${cx - 4}" y="2" width="8" height="8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${[4, 6, 8].map((y) => `<line x1="${cx - 4}" y1="${y}" x2="${cx + 4}" y2="${y + 0.8}" stroke="#7a8086" stroke-width="0.4"/>`).join('')}
  <rect x="${cx - bw / 2 - 1}" y="10" width="${bw + 2}" height="6" rx="1" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <!-- 吸音材（白）が見える黒い樹脂の筒 -->
  <rect x="${cx - bw / 2}" y="16" width="${bw}" height="30" rx="3" fill="#1f2022" stroke="#000" stroke-width="0.6"/>
  ${slits}
  ${text(cx, H - 3, String(p.thread), 5, '#333')}`;
  };
  return {
    type,
    name: 'サイレンサ',
    model: 'AN120-M5',
    modelOf: (p) => SILENCERS[String(p.thread)] ?? 'AN120-M5',
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC の樹脂形サイレンサ AN シリーズ。電磁弁の排気ポート（R・EA・EB）や残圧排気弁の EXH にねじ込み、排気音を下げる。図では排気ポートとつなぐ（ねじ込みなので、チューブの外径は問わない）。ねじの呼びは取り付ける排気ポートに合わせる。',
    labelPrefix: 'SL',
    width: W,
    height: H,
    svg,
    terminals: (p) => [
      {
        id: 'IN',
        label: String(p.thread),
        hint: '排気の入口',
        note: `排気ポートにねじ込む側（${R_MALE[String(p.thread)]}）`,
        x: cx,
        y: 2,
        side: 'top',
        role: 'air',
        air: { kind: 'exhaust', thread: R_MALE[String(p.thread)] },
      },
    ],
    params: [
      {
        key: 'thread',
        label: 'ねじ',
        options: Object.entries(SILENCERS).map(([t, m]) => ({ value: t, label: `${R_MALE[t]}（${m}）` })),
        default: 'M5',
      },
    ],
    pneumatic: { symbol: 'silencer', ports: { in: 'IN' } },
  };
}
