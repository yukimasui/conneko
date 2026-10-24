/**
 * SMC のスピードコントローラ（速度制御弁。絞り弁 + 逆止弁）AS シリーズ。
 * - インライン形 AS□002F（両側ワンタッチ管継手。チューブの途中に入れる）
 * - エルボ形 AS□201F（メータアウト）/ AS□211F（メータイン）。おねじをシリンダのポートにねじ込み、ワンタッチ管継手にチューブをつなぐ
 *
 * - シリンダ・エアチャック・ロータリのポートに直付けするエルボ形（アクチュエータのパラメータ speedController で付ける。下の portSpeedController）
 *
 * 出典: SMC スピードコントローラ AS-F シリーズ カタログ・製品ページ
 *   AS2201F: 最高使用圧力 1.0MPa、最低使用圧力 0.1MPa、耐圧 1.5MPa
 *   エルボ形のサイズ: AS1201F（M5）、AS2201F（R1/8・R1/4）、AS3201F（R1/4・R3/8）、AS4201F（R1/2）。メータインは AS□211F
 *   エルボ形のねじと適合チューブ外径（SMC 新製品カタログ「ワンタッチ管継手付スピードコントローラ エルボタイプ AS Series」s20-220b のバリエーション表）:
 *     AS1201F-M5: φ2・3.2・4・6 / AS2201F-01・-02: φ3.2〜10 / AS3201F-02・-03: φ6〜12 / AS4201F-04: φ10・12・16
 *   型式の外径は 2 桁（3.2 は 23）。R ねじはシール剤付き（S）、M5 はガスケットシールで S を付けない。
 *   ハンドルの色はメータアウトがアーバングレー、メータインがライトブルー
 *   型式の末尾の A はプッシュロック式のつまみ（例: AS2201F-01-06SA）。いまのカタログの標準に合わせて付ける
 *
 * 機器の中の通り道は向きのないもの（絞るのは流量で、届く圧力は変わらない）。
 * 自由流れ（逆止弁が開いて絞らずに流れる向き）を空圧回路図の記号の in → out にそろえる。
 *   メータアウト（排気を絞る）: 電磁弁 → シリンダが自由流れ、シリンダからの排気を絞る。シリンダの速度制御の基本
 *   メータイン（給気を絞る）: シリンダ → 電磁弁が自由流れ、シリンダへの給気を絞る。単動シリンダ・小形シリンダなど
 */
import { threadSize } from '../../data/threads';
import type { Accessory, DeviceDefinition, ParamDef, ParamValues, PneumaticHint } from '../types';
import { flowArrow, oneTouch, r2, R_MALE, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 絞り弁のつまみ（ニードル。上端 y、ロックナット付き） */
function needleKnob(cx: number, y: number) {
  return `
  <rect x="${cx - 2.6}" y="${y + 9}" width="5.2" height="7" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.4"/>
  <rect x="${cx - 6}" y="${y + 13}" width="12" height="4" rx="0.8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.4"/>
  <rect x="${cx - 6}" y="${y}" width="12" height="10" rx="2" fill="url(#smc-knob-{{uid}})" stroke="#0b0c0d" stroke-width="0.5"/>
  ${[-3, 0, 3].map((d) => `<line x1="${cx + d}" y1="${y + 1.5}" x2="${cx + d}" y2="${y + 8.5}" stroke="#5a5e63" stroke-width="0.5"/>`).join('')}`;
}

/** 速度制御弁の記号（可変絞り + 逆止弁を並べた枠）。(cx, cy) は中心、free は自由流れの向き */
function scSymbol(cx: number, cy: number, free: 'right' | 'left' | 'down' | 'up') {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[free];
  return `
  <g transform="translate(${r2(cx)} ${r2(cy)}) rotate(${rot})">
    <rect x="-11" y="-8" width="22" height="16" fill="#fff" stroke="#333" stroke-width="0.5" stroke-dasharray="1.6 1"/>
    <path d="M-9 -3.5 H9 M-9 3.5 H9" stroke="#222" stroke-width="0.6"/>
    <path d="M-3 -6 Q0 -3.5 -3 -1 M3 -6 Q0 -3.5 3 -1" fill="none" stroke="#222" stroke-width="0.6"/>
    <path d="M-4 -6.4 L4 -0.8" stroke="#222" stroke-width="0.5"/>
    <path d="M4 -0.8 l-2 -0.2 l1 -1.4 Z" fill="#222"/>
    <path d="M-2.6 3.5 L2.8 0.6 M-2.6 3.5 L2.8 6.4" fill="none" stroke="#222" stroke-width="0.6"/>
    <circle cx="1.0" cy="3.5" r="1.7" fill="#fff" stroke="#222" stroke-width="0.6"/>
  </g>`;
}

/** インライン形 AS□002F */
const INLINE: Record<number, string> = { 4: 'AS1002F-04', 6: 'AS2002F-06', 8: 'AS2002F-08', 10: 'AS3002F-10', 12: 'AS4002F-12' };

export function buildAsInline(type: string): DeviceDefinition {
  const W = 92;
  const H = 66;
  const cy = 38;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const od = Number(p.tubeOD);
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', od, 16)}
  ${oneTouch(W - 2, cy, 'right', od, 16)}
  <rect x="18" y="${cy - 10}" width="${W - 36}" height="20" rx="3" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  ${needleKnob(cx, cy - 27)}
  ${scSymbol(cx, cy + 0.5, 'right')}
  ${text(10, cy - 11, 'IN', 4.6, '#1f5fa8')}
  ${text(W - 10, cy - 11, 'OUT', 4.6, '#1f5fa8')}
  ${flowArrow(22, 34, cy - 14, '#2e8b3a')}
  ${text(28, cy - 17, '自由流れ', 3.8, '#2e8b3a')}
  ${text(cx, H - 6, `${INLINE[od] ?? ''}`, 4.8, '#333')}
  ${smcLogo(W - 26, cy - 14, 4.2)}`;
  };
  return {
    type,
    name: 'スピードコントローラ（インライン形）',
    model: 'AS2002F-06',
    modelOf: (p) => INLINE[Number(p.tubeOD)] ?? `AS2002F-${pad2(Number(p.tubeOD))}`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC のスピードコントローラ AS-F シリーズのインライン形（両側ワンタッチ管継手）。電磁弁とシリンダの間のチューブに入れ、つまみでシリンダの速さを調整する。' +
      'IN → OUT は自由流れ（絞らない）、OUT → IN は絞った流れになる。メータアウト（排気を絞る。ふつうはこちら）にするには IN を電磁弁側、OUT をシリンダ側につなぐ。メータインにするには逆向きにつなぐ。' +
      '最高使用圧力 1.0MPa、最低使用圧力 0.1MPa。',
    labelPrefix: 'SC',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'IN', label: 'IN', hint: '自由流れの入口', note: '自由流れの入口（メータアウトでは電磁弁側）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' }, minPressure: 0.1, maxPressure: 1.0 } },
      { id: 'OUT', label: 'OUT', hint: '自由流れの出口', note: '自由流れの出口（メータアウトではシリンダ側。ここから IN へ戻る流れを絞る）', x: W - 2, y: cy, side: 'right', role: 'air', air: { kind: 'work', tubeOD: { param: 'tubeOD' }, minPressure: 0.1, maxPressure: 1.0 } },
    ],
    airLinks: [{ from: 'IN', to: 'OUT' }],
    params: [tubeOdParam('tubeOD', 'チューブ外径', [4, 6, 8, 10, 12], 6)],
    pneumatic: { symbol: 'speed-controller', ports: { in: 'IN', out: 'OUT' } },
    estimated: 'チューブ外径とボディサイズ（AS1002F〜AS4002F）の対応、インライン形の使用圧力範囲は推定',
  };
}

/** エルボ形のボディサイズごとのねじ（'M5'・'01'〜'04'）と適合チューブ外径（小さいボディから並べる） */
const ELBOW_BODIES: { body: 1 | 2 | 3 | 4; thread: string; ods: number[] }[] = [
  { body: 1, thread: 'M5', ods: [2, 3.2, 4, 6] },
  { body: 2, thread: '01', ods: [3.2, 4, 6, 8, 10] },
  { body: 2, thread: '02', ods: [3.2, 4, 6, 8, 10] },
  { body: 3, thread: '02', ods: [6, 8, 10, 12] },
  { body: 3, thread: '03', ods: [6, 8, 10, 12] },
  { body: 4, thread: '04', ods: [10, 12, 16] },
];

export type SpeedControl = 'meter-out' | 'meter-in';

/**
 * エルボ形の型式（例: M5・φ4 のメータアウト → AS1201F-M5-04A、'01'・φ6 のメータイン → AS2211F-01-06SA）。
 * 末尾の A はプッシュロック式のつまみ（いまのカタログの標準）。
 * thread はねじの記号（'M5'・'01'〜'04'）。合うボディがなければ undefined
 */
export function elbowModel(thread: string, od: number, control: SpeedControl): string | undefined {
  const b = ELBOW_BODIES.find((x) => x.thread === thread && x.ods.includes(od));
  if (!b) return undefined;
  const size = od === 3.2 ? '23' : pad2(od);
  // R ねじはシール剤付き（S）が標準。M5 は付けない
  return `AS${b.body}2${control === 'meter-out' ? 0 : 1}1F-${thread}-${size}${thread === 'M5' ? '' : 'S'}A`;
}

/** エルボ形 AS□201F（メータアウト）/ AS□211F（メータイン） */
const ELBOW_SIZES = ['M5-04', 'M5-06', '01-04', '01-06', '01-08', '02-06', '02-08', '02-10', '02-12', '03-08', '03-10', '03-12', '04-10', '04-12', '04-16'];

export function buildAsElbow(type: string, mode: 'meter-out' | 'meter-in'): DeviceDefinition {
  const W = 76;
  const H = 82;
  const bx = 14;
  const cy = 34;
  const tubeY = cy;
  const cylY = H - 2;
  const cx = 28;
  const out = mode === 'meter-out';
  const svg = (p: ParamValues) => {
    const [thread, odS] = String(p.size).split('-');
    const od = Number(odS);
    return `<defs>${SMC_GRADIENTS}</defs>
  <!-- 本体（縦）とおねじ（下。シリンダのポートにねじ込む） -->
  <rect x="${cx - 4}" y="${cy + 12}" width="8" height="10" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - 7}" y="${cy + 21}" width="14" height="6" rx="1" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - 4}" y="${cy + 27}" width="8" height="${cylY - cy - 27}" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${[0, 3, 6, 9].map((d) => `<line x1="${cx - 4}" y1="${cy + 29 + d}" x2="${cx + 4}" y2="${cy + 30 + d}" stroke="#7a8086" stroke-width="0.4"/>`).join('')}
  <rect x="${bx}" y="${cy - 12}" width="${(cx - bx) * 2}" height="24" rx="3" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  ${needleKnob(cx, cy - 29)}
  <!-- 横に出たワンタッチ管継手（向きを回せる） -->
  <rect x="${cx + 10}" y="${tubeY - 7}" width="${W - cx - 28}" height="14" rx="2" fill="url(#smc-white-{{uid}})" stroke="#8a9096" stroke-width="0.6"/>
  ${oneTouch(W - 2, tubeY, 'right', od, 18)}
  ${scSymbol(cx, cy, out ? 'down' : 'up')}
  ${text(W - 12, tubeY - 10, 'チューブ', 4.2, '#1f5fa8')}
  ${text(cx + 22, cylY - 3, `${R_MALE[thread]} → シリンダ`, 4.2, '#1f5fa8')}
  ${text(W - 18, tubeY + 15, out ? 'メータアウト' : 'メータイン', 4.6, out ? '#2e8b3a' : '#b4500a')}
  ${text(W - 18, tubeY + 21, out ? '排気を絞る' : '給気を絞る', 4, '#444', 'normal')}`;
  };
  const modelOf = (p: ParamValues) => {
    const [thread, od] = String(p.size).split('-');
    return elbowModel(thread, Number(od), mode) ?? `AS22${out ? 0 : 1}1F-${thread}-${od}SA`;
  };
  return {
    type,
    name: out ? 'スピードコントローラ（エルボ形・メータアウト）' : 'スピードコントローラ（エルボ形・メータイン）',
    model: out ? 'AS2201F-01-06SA' : 'AS2211F-01-06SA',
    modelOf,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      `SMC のスピードコントローラ AS-F シリーズのエルボ形（${out ? 'メータアウト AS□201F' : 'メータイン AS□211F'}）。おねじをシリンダのポートに直接ねじ込み、横のワンタッチ管継手に電磁弁からのチューブをつなぐ。つまみでシリンダの速さを調整する。` +
      (out
        ? 'チューブ → シリンダは自由流れ（絞らない）、シリンダから出る排気を絞る（メータアウト）。複動シリンダの速度制御の基本で、負荷が変わっても速度が安定する。'
        : 'シリンダ → チューブは自由流れ（絞らない）、シリンダへ入る給気を絞る（メータイン）。単動シリンダ・小形シリンダなどに使う。') +
      '図では CYL をシリンダのポートと短いチューブでつなぐ（ねじ込みなので、チューブの外径は問わない）。最高使用圧力 1.0MPa、最低使用圧力 0.1MPa。',
    labelPrefix: 'SC',
    width: W,
    height: H,
    svg,
    terminals: (p) => {
      const [thread, od] = String(p.size).split('-');
      return [
        {
          id: 'TUBE',
          label: `φ${Number(od)}`,
          hint: '電磁弁側',
          note: `ワンタッチ管継手（φ${Number(od)}。電磁弁の A・B ポートから）${out ? '。ここからシリンダへは自由流れ' : '。シリンダからここへは自由流れ'}`,
          x: W - 2,
          y: tubeY,
          side: 'right',
          role: 'air',
          air: { kind: 'work', tubeOD: Number(od), minPressure: 0.1, maxPressure: 1.0 },
        },
        {
          id: 'CYL',
          label: R_MALE[thread],
          hint: 'シリンダ側',
          note: `おねじ（${R_MALE[thread]}。シリンダのポートにねじ込む）`,
          x: cx,
          y: cylY,
          side: 'bottom',
          role: 'air',
          air: { kind: 'work', thread: R_MALE[thread], male: true },
        },
      ];
    },
    airLinks: [{ from: 'TUBE', to: 'CYL' }],
    params: [
      {
        key: 'size',
        label: 'ねじ・チューブ外径',
        options: ELBOW_SIZES.map((s) => {
          const [t, od] = s.split('-');
          return { value: s, label: `${R_MALE[t]}・φ${Number(od)}` };
        }),
        default: '01-06',
      },
    ],
    pneumatic: { symbol: 'speed-controller', ports: out ? { in: 'TUBE', out: 'CYL' } : { in: 'CYL', out: 'TUBE' } },
    estimated: '選べるねじとチューブ外径の組み合わせは代表的なもの（推定）',
  };
}

/* ---------------- アクチュエータのポートに直付けするエルボ形 ---------------- */

/** アクチュエータのパラメータ speedController（ポートに直付けするエルボ形スピードコントローラ） */
export const speedControllerParam: ParamDef = {
  key: 'speedController',
  label: 'スピードコントローラ（ポートに直付け）',
  options: [
    { value: 'none', label: 'なし' },
    { value: 'meter-out', label: 'メータアウト（エルボ形 AS□201F）' },
    { value: 'meter-in', label: 'メータイン（エルボ形 AS□211F）' },
  ],
  default: 'none',
};

/** ポートの継手のパラメータの、部品表の仕様での名前（スピコンを直付けすると、継手はスピコンのワンタッチ管継手になる） */
export const fittingSpecLabel = (p: ParamValues) => (speedControlOf(p) ? 'チューブ外径（直付けのスピコンの継手）' : 'ポートの継手（チューブ外径）');

/** パラメータで選んだ制御方式（なしは undefined） */
export const speedControlOf = (p: ParamValues): SpeedControl | undefined =>
  p.speedController === 'meter-out' || p.speedController === 'meter-in' ? p.speedController : undefined;

/** ねじの呼び（'M5'・'Rc1/8' など）→ 型式のねじの記号（'M5'・'01'〜'04'） */
const THREAD_CODE: Record<string, string> = { M5: 'M5', '1/8': '01', '1/4': '02', '3/8': '03', '1/2': '04' };

/** ポートに直付けするスピードコントローラ */
export interface PortSpeedController {
  control: SpeedControl;
  /** 型式。ポートのねじとチューブ外径に合うエルボ形がなければ undefined（M3 のポート、R1/2 に φ8 など） */
  model?: string;
}

/** パラメータ speedController と、ポートのねじ・チューブ外径から、直付けするスピードコントローラを決める（なしは undefined） */
export function portSpeedController(p: ParamValues, thread: string, od: number): PortSpeedController | undefined {
  const control = speedControlOf(p);
  if (!control) return undefined;
  const code = THREAD_CODE[threadSize(thread) ?? ''];
  return { control, model: code ? elbowModel(code, od, control) : undefined };
}

/** 直付けの名前（部品表・端子の説明） */
const elbowName = (control: SpeedControl) => `スピードコントローラ（エルボ形・${control === 'meter-out' ? 'メータアウト' : 'メータイン'}）`;

/**
 * 直付けしたポートのエアの仕様。継手はスピードコントローラのワンタッチ管継手になるので、ねじ（thread）は書かない
 * （ねじのポートに付けるハーフユニオンを部品表に入れず、ねじと継手の外径のチェックもしない）。型式が決まらなければ元のまま
 */
export function portAirThread(sc: PortSpeedController | undefined, thread: string): { thread?: string } {
  return sc?.model ? {} : { thread };
}

/** 端子の説明に付け足す文（例: '。エルボ形スピードコントローラ AS2201F-01-06SA（メータアウト）を直付け'） */
export function speedControllerNote(sc: PortSpeedController | undefined): string {
  if (!sc?.model) return '';
  return `。エルボ形スピードコントローラ ${sc.model}（${sc.control === 'meter-out' ? 'メータアウト: 排気を絞る' : 'メータイン: 給気を絞る'}）を直付け`;
}

/** 直付けしたスピードコントローラの付属品（1 ポート 1 個）。ports は [端子ID, ねじ] */
export function speedControllerAccessories(p: ParamValues, ports: [string, string][], od: number): Accessory[] {
  const out: Accessory[] = [];
  for (const [terminal, thread] of ports) {
    const sc = portSpeedController(p, thread, od);
    if (!sc?.model) continue;
    out.push({
      model: sc.model,
      name: elbowName(sc.control),
      maker: 'SMC',
      category: 'air-fitting',
      spec: `${R_MALE[THREAD_CODE[threadSize(thread)!]] ?? thread} × φ${od}、${sc.control === 'meter-out' ? 'メータアウト' : 'メータイン'}（アクチュエータのポートに直付け）`,
      terminal,
    });
  }
  return out;
}

/** 空圧回路図の速度制御弁（記号のポート名 → 制御方式と型式）。ports は [記号のポート名, ねじ] */
export function speedControllerHint(p: ParamValues, ports: [string, string][], od: number): Pick<PneumaticHint, 'speedControllers'> {
  const out: NonNullable<PneumaticHint['speedControllers']> = {};
  for (const [sym, thread] of ports) {
    const sc = portSpeedController(p, thread, od);
    if (sc?.model) out[sym] = { control: sc.control, model: sc.model };
  }
  return Object.keys(out).length ? { speedControllers: out } : {};
}

/**
 * ポートに直付けしたエルボ形スピードコントローラの絵（小さく描く）。x はポートの中心、y はポートの面。
 * ポートにねじ込む六角・本体・上へ出るワンタッチ管継手（端子は y - 20）と、横へ出るつまみ（knob の向き）。
 * つまみの色はメータアウトが灰色、メータインが水色（実物のハンドルの色）
 */
export function elbowOnPort(x: number, y: number, od: number, knob: 'left' | 'right', sc: PortSpeedController): string {
  const w = Math.max(7, od * 1.25);
  const bw = w + 3;
  const d = knob === 'left' ? -1 : 1;
  const edge = x + (d * bw) / 2;
  const handle = sc.control === 'meter-out' ? '#6b7076' : '#7cc3ea';
  const kx = (a: number, len: number) => r2(d < 0 ? edge - a - len : edge + a);
  return `
  <rect x="${r2(x - w / 2 + 0.5)}" y="${r2(y - 4)}" width="${r2(w - 1)}" height="4" rx="0.5" fill="#c9ced3" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${r2(x - bw / 2)}" y="${r2(y - 14.5)}" width="${r2(bw)}" height="10.5" rx="1.6" fill="#f2f3f5" stroke="#7d848a" stroke-width="0.55"/>
  <rect x="${kx(0, 2)}" y="${r2(y - 11)}" width="2" height="4" fill="#b9bec3" stroke="#5f666c" stroke-width="0.4"/>
  <rect x="${kx(2, 4.5)}" y="${r2(y - 12)}" width="4.5" height="6" rx="1" fill="${handle}" stroke="#2c2f33" stroke-width="0.45"/>
  <path d="M${r2(edge + d * 3.1)} ${r2(y - 11.4)} V${r2(y - 6.6)} M${r2(edge + d * 4.6)} ${r2(y - 11.4)} V${r2(y - 6.6)}" stroke="#2c2f33" stroke-width="0.3" opacity="0.6"/>
  <rect x="${r2(x - w / 2 - 0.6)}" y="${r2(y - 18.5)}" width="${r2(w + 1.2)}" height="4" rx="1" fill="#e9ebed" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="${r2(x - od / 2)}" y="${r2(y - 20)}" width="${r2(od)}" height="2" fill="#2f7fd8" opacity="0.35"/>
  ${text(x, y - 7.6, sc.control === 'meter-out' ? 'MO' : 'MI', 2.8, '#1f5fa8')}`;
}

/** スピードコントローラを選んだが、ポートのねじとチューブ外径に合う型式がないときの赤い文字（ポートの継手の上） */
export const elbowMissing = (x: number, y: number) => text(x, y - 21.5, 'スピコンの型式なし', 3.2, '#c62828');
