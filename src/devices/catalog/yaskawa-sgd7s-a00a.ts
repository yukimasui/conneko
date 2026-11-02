import { SIGMA7_ENCODER, text, yaskawaLogo } from '../yaskawa/parts';
import { SIGMA7 } from '../yaskawa/sigma7';
import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * 安川電機 AC サーボパック Σ-7S SGD7S-□A00A（アナログ電圧・パルス列指令形、三相 AC200V、R90A〜5R5A）。
 *
 * 出典: 安川電機 e-mechatronics「SGD7S モデル（アナログ・パルス）定格」（定格出力電流・主回路と制御電源の入力電流）、
 *       Σ-7S 製品マニュアルの CN1 のピン配置（PULS 7、SIGN 11、/S-ON 40、P-OT 42、N-OT 43）。数値の表は src/devices/yaskawa/sigma7.ts。
 * - 主回路: L1・L2・L3（三相 AC200〜240V）、制御電源 L1C・L2C（単相 AC200〜240V）、回生抵抗器 B1/⊕・B2・B3、直流 ⊖1・⊖2、モーター U・V・W、接地。
 * - CN1（50 ピン）: 入出力。CN2: エンコーダー。CN8: 安全機能（出荷時は安全ジャンパコネクタ）。CN7: パソコン（USB）。
 *
 * 描き方: 実機の幅（40mm）では端子が並ばないため、幅を 60mm 相当（120px）にそろえて描く（MR-J5-A と同じ考え方）。
 * 主回路を左の縁、CN1 の主なピン（位置制御で使うもの）を右の縁に並べ、ラベルにピン番号を付けた。
 */

const W = 120;
const H = 344;
const LX = 6;
const RX = W - 6;

/** 左の縁（主回路）: [ID, 印字, グループ, y] */
const MAIN: [string, string, string, number][] = [
  ['L1', 'L1', 'IN', 70],
  ['L2', 'L2', 'IN', 82],
  ['L3', 'L3', 'IN', 94],
  ['L1C', 'L1C', 'IN', 106],
  ['L2C', 'L2C', 'IN', 118],
  ['B1', 'B1/⊕', 'REG', 140],
  ['B2', 'B2', 'REG', 152],
  ['B3', 'B3', 'REG', 164],
  ['N1', '⊖1', 'REG', 176],
  ['N2', '⊖2', 'REG', 188],
  ['U', 'U', 'MOT', 210],
  ['V', 'V', 'MOT', 222],
  ['W', 'W', 'MOT', 234],
];

/** 右の縁（CN1 の主なピン）: [ID, ピン番号] */
const CN1: [string, number][] = [
  ['+24VIN', 47],
  ['/S-ON', 40],
  ['P-OT', 42],
  ['N-OT', 43],
  ['/ALM-RST', 44],
  ['/P-CL', 45],
  ['/N-CL', 46],
  ['PL1', 3],
  ['PULS', 7],
  ['/PULS', 8],
  ['PL2', 13],
  ['SIGN', 11],
  ['/SIGN', 12],
  ['ALM+', 31],
  ['ALM-', 32],
  ['/COIN+', 25],
  ['/COIN-', 26],
  ['/S-RDY+', 29],
  ['/S-RDY-', 30],
  ['PAO', 33],
  ['/PAO', 34],
  ['PBO', 36],
  ['/PBO', 35],
  ['PCO', 19],
  ['/PCO', 20],
  ['SG', 1],
];
const CN1_Y0 = 62;
const CN1_PITCH = 9.6;
const cy = (i: number) => +(CN1_Y0 + i * CN1_PITCH).toFixed(2);

const PE = { x: 26, y: H - 7 };
const CN2 = { x: 84, y: H - 5 };

const NOTES: Record<string, string> = {
  L1: '主回路電源（三相 AC200〜240V。単相で使う場合は L1・L2）',
  L2: '主回路電源（三相 AC200〜240V）',
  L3: '主回路電源（三相 AC200〜240V。単相の場合は使わない）',
  L1C: '制御電源（単相 AC200〜240V、0.2A）',
  L2C: '制御電源（単相 AC200〜240V、0.2A）',
  B1: '回生抵抗器・直流（＋）。外付けの回生抵抗器は B1/⊕-B2 間',
  B2: '回生抵抗器接続',
  B3: '内蔵回生抵抗器（内蔵品は B2-B3 間を短絡して使う。容量によって内蔵なし）',
  N1: '直流（−）。DC リアクトル用（出荷時は ⊖2 と短絡）',
  N2: '直流（−）',
  '+24VIN': 'CN1-47: 入力信号用の電源（シンク入力では +24V）',
  '/S-ON': 'CN1-40: サーボオン',
  'P-OT': 'CN1-42: 正転側駆動禁止（b 接点。開くと正転を止める）',
  'N-OT': 'CN1-43: 逆転側駆動禁止（b 接点。開くと逆転を止める）',
  '/ALM-RST': 'CN1-44: アラームリセット',
  '/P-CL': 'CN1-45: 正転側外部トルク制限',
  '/N-CL': 'CN1-46: 逆転側外部トルク制限',
  PL1: 'CN1-3: オープンコレクタ指令用の電源（PULS 側。+24V を入れる）',
  PULS: 'CN1-7: パルス列指令（差動は PULS-/PULS）',
  '/PULS': 'CN1-8: パルス列指令（オープンコレクタは PL1 に +24V を入れ、PLC の NPN 出力で /PULS を引き込む）',
  PL2: 'CN1-13: オープンコレクタ指令用の電源（SIGN 側。+24V を入れる）',
  SIGN: 'CN1-11: 符号指令（差動は SIGN-/SIGN）',
  '/SIGN': 'CN1-12: 符号指令（オープンコレクタは PL2 に +24V を入れ、PLC の NPN 出力で /SIGN を引き込む）',
  'ALM+': 'CN1-31: サーボアラーム出力（フォトカプラ。正常時 ON。DC30V 50mA）',
  'ALM-': 'CN1-32: サーボアラーム出力の −',
  '/COIN+': 'CN1-25: 位置決め完了出力（フォトカプラ。DC30V 50mA）',
  '/COIN-': 'CN1-26: 位置決め完了出力の −',
  '/S-RDY+': 'CN1-29: サーボレディ出力（フォトカプラ。DC30V 50mA）',
  '/S-RDY-': 'CN1-30: サーボレディ出力の −',
  PAO: 'CN1-33: エンコーダー分周パルス A 相（ラインドライバ）',
  '/PAO': 'CN1-34: エンコーダー分周パルス A 相の反転',
  PBO: 'CN1-36: エンコーダー分周パルス B 相（ラインドライバ）',
  '/PBO': 'CN1-35: エンコーダー分周パルス B 相の反転',
  PCO: 'CN1-19: エンコーダー分周パルス C 相（原点。ラインドライバ）',
  '/PCO': 'CN1-20: エンコーダー分周パルス C 相の反転',
  SG: 'CN1-1: 信号の GND（PAO〜/PCO の基準）',
};

const HINTS: Record<string, string> = {
  '+24VIN': '入力電源',
  '/S-ON': 'サーボオン',
  'P-OT': '正転禁止',
  'N-OT': '逆転禁止',
  '/ALM-RST': 'アラーム解除',
  PL1: 'パルス電源',
  PL2: 'パルス電源',
  '/PULS': 'パルス',
  '/SIGN': '符号',
  'ALM+': 'アラーム',
  '/COIN+': '位置決完了',
  '/S-RDY+': 'サーボレディ',
  L1C: '制御電源',
  L2C: '制御電源',
};

const capOf = (p: ParamValues) => SIGMA7.find((c) => c.amp === String(p.capacity)) ?? SIGMA7[2];

const svg = (p: ParamValues) => {
  const c = capOf(p);
  return `
  <defs>
    <linearGradient id="s7-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1d1e21"/>
      <stop offset="0.5" stop-color="#303236"/>
      <stop offset="1" stop-color="#1a1b1d"/>
    </linearGradient>
    <linearGradient id="s7-plug-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3c3e42"/>
      <stop offset="1" stop-color="#2a2c2f"/>
    </linearGradient>
  </defs>
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#s7-body-{{uid}})" stroke="#000" stroke-width="1.2"/>
  <g fill="#0f1011">${Array.from({ length: 9 }, (_, i) => `<rect x="${16 + i * 10}" y="4" width="6" height="2.4" rx="1"/>`).join('')}</g>
  ${yaskawaLogo(W / 2, 16, 6, '#ffffff', 'middle')}
  <!-- パネルオペレータ（5 桁 7 セグメント・4 キー） -->
  <rect x="34" y="21" width="58" height="16" rx="1.5" fill="#0d0f10" stroke="#555" stroke-width="0.6"/>
  ${text(89, 33.5, 'b.b', 12, '#ff4d3a', 'end', 'bold')}
  ${['MODE', '▲', '▼', 'DATA']
    .map((b, i) => `<rect x="${34 + i * 15}" y="40" width="12.5" height="7" rx="1" fill="#4a4d52" stroke="#6c7076" stroke-width="0.4"/>${text(40.25 + i * 15, 45.2, b, b.length > 1 ? 2.8 : 3.6, '#eee', 'middle')}`)
    .join('')}
  <!-- CHARGE・POWER ランプ -->
  <circle cx="22" cy="26" r="3" fill="#7a1a12" stroke="#222" stroke-width="0.6"/>${text(22, 34, 'CHARGE', 3, '#ccc')}
  <circle cx="22" cy="42" r="2.4" fill="#3ccf52" stroke="#0d3a13" stroke-width="0.5"/>${text(22, 49, 'POWER', 3, '#ccc')}
  <!-- 主回路のコネクタ（左の縁。黒いプラグに白い印字） -->
  ${(['IN', 'REG', 'MOT'] as const)
    .map((g) => {
      const ys = MAIN.filter((m) => m[2] === g).map((m) => m[3]);
      const y0 = Math.min(...ys) - 7;
      const y1 = Math.max(...ys) + 7;
      return `<rect x="1" y="${y0}" width="30" height="${y1 - y0}" rx="1.5" fill="url(#s7-plug-{{uid}})" stroke="#6c7076" stroke-width="0.7"/>`;
    })
    .join('')}
  ${MAIN.map(
    ([, label, , y]) => `<rect x="${LX - 3.5}" y="${y - 3.5}" width="7" height="7" rx="1" fill="#111"/><circle cx="${LX}" cy="${y}" r="2" fill="#000" stroke="#555" stroke-width="0.4"/>
  <rect x="${LX + 5}" y="${y - 2.5}" width="3" height="5" rx="0.6" fill="#d9dadc"/>
  ${text(LX + 10, y + 1.6, label, 4.2, '#f0f0f0', 'start', 'bold')}`,
  ).join('')}
  <!-- 形名 -->
  ${text(W / 2 - 4, 270, 'Σ-7S SERVOPACK', 4, '#bbb')}
  ${text(W / 2 - 4, 278, `SGD7S-${c.amp}A00A`, 5.6, '#f2f2f2', 'middle', 'bold')}
  ${text(W / 2 - 4, 285, `${c.watt}W 200V`, 3.6, '#bbb')}
  <!-- CN7（USB）・CN8（安全ジャンパ） -->
  <rect x="46" y="226" width="14" height="8" rx="1" fill="#000" stroke="#666" stroke-width="0.5"/>${text(53, 240, 'CN7', 3.4, '#ccc')}
  <rect x="64" y="224" width="14" height="11" rx="1" fill="#e2c13a" stroke="#666" stroke-width="0.5"/>${text(71, 240, 'CN8', 3.4, '#ccc')}
  <!-- CN1（右の縁） -->
  <rect x="${RX - 34}" y="${CN1_Y0 - 9}" width="39" height="${(CN1.length - 1) * CN1_PITCH + 16}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  ${text(RX - 38, CN1_Y0 - 4, 'CN1', 4, '#f0f0f0', 'end', 'bold')}
  ${CN1.map(
    ([id, pin], i) => `<rect x="${RX - 3}" y="${cy(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RX}" cy="${cy(i)}" r="1.8" fill="#111"/>
  <text x="${RX - 5}" y="${cy(i) + 1.5}" text-anchor="end" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#222"><tspan font-size="2.8" font-weight="normal" fill="#666">${pin} </tspan>${id}</text>`,
  ).join('')}
  <!-- CN2（エンコーダー）・接地 -->
  <rect x="${CN2.x - 9}" y="${CN2.y - 14}" width="18" height="16" rx="1.5" fill="#000" stroke="#777" stroke-width="0.6"/>
  <rect x="${CN2.x - 6}" y="${CN2.y - 11}" width="12" height="7" rx="1" fill="#333"/>
  ${text(CN2.x, CN2.y - 17, 'CN2', 4, '#f0f0f0', 'middle', 'bold')}
  <circle cx="${PE.x}" cy="${PE.y}" r="4.5" fill="#d6d6d6" stroke="#555" stroke-width="0.7"/>
  <path d="M${PE.x - 2.6} ${PE.y} H${PE.x + 2.6} M${PE.x} ${PE.y - 2.6} V${PE.y + 2.6}" stroke="#444" stroke-width="1"/>
  ${text(PE.x + 8, PE.y + 1.6, '⏚', 5, '#9fd89f', 'start')}
`;
};

const ac200 = { system: 'AC' as const, minVoltage: 170, maxVoltage: 264 };
const dcCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 26.4, conductors: ['-', '+'] as ('+' | '-')[] };
const RST = ['R', 'S', 'T'] as const;
/** フォトカプラ出力（+ 側, − 側） */
const OUTS: [string, string][] = [
  ['ALM+', 'ALM-'],
  ['/COIN+', '/COIN-'],
  ['/S-RDY+', '/S-RDY-'],
];

const terminals = (p: ParamValues): TerminalDef[] => {
  const c = capOf(p);
  return [
    ...MAIN.map(([id, label, , y]): TerminalDef => {
      const base = { id, ...(label !== id ? { label } : {}), note: NOTES[id], hint: HINTS[id], x: LX, y, side: 'left' as const };
      if (id === 'L1' || id === 'L2') return { ...base, role: 'input', accepts: ac200, hint: '主回路電源' };
      if (id === 'L3') return { ...base, role: 'input', accepts: ac200, optional: true, hint: '主回路電源' };
      if (id === 'L1C' || id === 'L2C') return { ...base, role: 'input', accepts: ac200, loadCurrent: 0.2 };
      if (id === 'U' || id === 'V' || id === 'W')
        return {
          ...base,
          role: 'supply',
          supply: { system: 'AC', voltage: 200, conductor: RST[['U', 'V', 'W'].indexOf(id)], limitCurrent: c.ampOut },
          note: `サーボモーターの動力（定格出力電流 ${c.ampOut}A）`,
          hint: 'モーター',
        };
      return { ...base, role: 'signal', optional: true };
    }),
    { id: 'PE', label: '⏚', note: '保護接地（サーボモーターの接地もここへ）', x: PE.x, y: PE.y, side: 'bottom', role: 'ground' },
    {
      id: 'CN2',
      label: 'CN2（エンコーダー）',
      note: `サーボモーター SGM7J-${c.motor}A のエンコーダーへ、専用のエンコーダーケーブルでつなぐ`,
      x: CN2.x,
      y: CN2.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: SIGMA7_ENCODER, pins: 0, width: 14, required: true },
    },
    ...CN1.map(([id], i): TerminalDef => {
      const base = { id, note: NOTES[id], hint: HINTS[id], x: RX, y: cy(i), side: 'right' as const, optional: true };
      if (id === '+24VIN') return { ...base, role: 'input', accepts: dcCommon };
      if (id === 'PL1' || id === 'PL2') return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 26.4, conductors: ['+'] } };
      if (['/S-ON', 'P-OT', 'N-OT', '/ALM-RST', '/P-CL', '/N-CL'].includes(id))
        return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: '+24VIN' }, optional: !['/S-ON', 'P-OT', 'N-OT'].includes(id) };
      if (id === '/PULS') return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'PL1' } };
      if (id === '/SIGN') return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'PL2' } };
      if (OUTS.some(([plus]) => plus === id)) return { ...base, role: 'signal', signal: { dir: 'out', kind: 'npn' } };
      if (OUTS.some(([, minus]) => minus === id)) return { ...base, role: 'input', accepts: dcCommon };
      if (['PAO', '/PAO', 'PBO', '/PBO', 'PCO', '/PCO'].includes(id)) return { ...base, role: 'signal', signal: { dir: 'out', kind: 'line-driver' } };
      return { ...base, role: 'signal' };
    }),
  ];
};

const links: InternalLink[] = OUTS.map(([plus, minus]) => ({ from: plus, to: minus, switch: 'output', ratedCurrent: 0.05 }));

const def: DeviceDefinition = {
  type: 'yaskawa.sgd7s-a00a',
  name: 'サーボアンプ',
  model: 'SGD7S-2R8A00A',
  modelOf: (p) => `SGD7S-${capOf(p).amp}A00A`,
  maker: '安川電機',
  category: 'load',
  labelPrefix: 'SA',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    {
      key: 'capacity',
      label: '容量',
      options: SIGMA7.map((c) => ({ value: c.amp, label: `SGD7S-${c.amp}A00A（${c.watt}W、SGM7J-${c.motor}A 用、出力 ${c.ampOut}A）` })),
      default: '2R8',
    },
  ],
  distinctGroups: [
    ['L1', 'L2', 'L3'],
    ['L1C', 'L2C'],
  ],
  loadCurrent: (p) => capOf(p).ampIn,
  description:
    '安川電機の AC サーボパック Σ-7S SGD7S-□A00A（アナログ電圧・パルス列指令形）。PLC の位置決めユニットからのパルス列で位置制御、アナログ電圧で速度・トルク制御をする。' +
    '主回路 L1・L2・L3 に三相 AC200〜240V、制御電源 L1C・L2C に単相 AC200〜240V を入れ、U・V・W をサーボモーター SGM7J の動力に、CN2 をエンコーダーケーブルでサーボモーターのエンコーダーにつなぐ。' +
    'CN1 の入力（/S-ON・P-OT・N-OT など）はフォトカプラ入力で、+24VIN に +24V を入れ、入力と 0V の間を接点・NPN 出力で閉じて ON（シンク）。P-OT・N-OT は b 接点で使う（使わないときはパラメータで無効にする）。' +
    'パルス列は、オープンコレクタなら PL1・PL2 に +24V を入れて /PULS・/SIGN を PLC の NPN 出力で引き込み、差動ラインドライバなら PULS-/PULS・SIGN-/SIGN へ。' +
    '出力 ALM・/COIN・/S-RDY はフォトカプラ出力（DC30V 50mA。+ と − の組）。電磁ブレーキ付きのサーボモーターは、ブレーキ出力 /BK（パラメータで出力に割り付ける）で動かすリレーでブレーキ電源（DC24V）を入り切りする。' +
    'CN8 は安全機能（HWBB）の入力で、使わない場合は安全ジャンパコネクタを差したままにする。',
  estimated:
    'CN1 のうち PULS・SIGN・/S-ON・P-OT・N-OT 以外のピン番号（+24VIN 47、ALM 31・32 など）と、主回路のコネクタの並びは Σ-V・Σ-7 の資料の記憶による推定。' +
    'CN1 の入出力・主回路の端子の位置は図面用に左右の縁へ並べたもの',
};

export default def;
