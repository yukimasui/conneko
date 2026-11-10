import { MINAS_A6, MINAS_A6_ENCODER, text } from '../panasonic/minas-a6';
import type { DeviceDefinition, InternalLink, TerminalDef } from '../types';

/**
 * パナソニック AC サーボアンプ MINAS A6SG MADLN15SG（A 枠、パルス列指令・位置制御、RS485/RS232 通信付き、安全機能なし、単相 / 三相 200V、200W まで）。
 *
 * 出典: src/devices/panasonic/minas-a6.ts のとおり。
 * - XA（電源）: L1・L2・L3（主回路。単相のときは L1・L3）、L1C・L2C（制御電源 単相 200〜240V）
 * - XB（モーター・回生）: B1・B3・B2（回生抵抗器。A 枠は内蔵なしで、外付けを B1-B2 間）、U・V・W（モーター）
 * - X4（50 ピン、入出力）: 位置制御で使う主なピン（OPC1 1、OPC2 2、PULS1 3、PULS2 4、SIGN1 5、SIGN2 6、COM+ 7、POT 9、NOT 8、
 *   BRKOFF− 10、BRKOFF+ 11、SRV-ON 29、A-CLR 31、S-RDY− 34、S-RDY+ 35、ALM− 36、ALM+ 37、INP− 38、INP+ 39、COM− 41）
 *   POT・NOT・BRKOFF・A-CLR・INP・S-RDY−・ALM− のピン番号は MINAS A5 / A6 の資料の記憶による推定（パラメータで割付けを変えられる）
 * - X6: エンコーダ
 *
 * 描き方: 実機の幅（40mm）では端子が並ばないため、幅を 60mm 相当（120px）にそろえて描く（MR-J5-A・SGD7S と同じ考え方）。
 * 主回路を左の縁、X4 の主なピンを右の縁に並べ、ラベルにピン番号を付けた。
 */

const W = 120;
const H = 330;
const LX = 6;
const RX = W - 6;

/** 左の縁（主回路）: [ID, グループ, y] */
const MAIN: [string, string, number][] = [
  ['L1', 'XA', 70],
  ['L2', 'XA', 82],
  ['L3', 'XA', 94],
  ['L1C', 'XA', 106],
  ['L2C', 'XA', 118],
  ['B1', 'XB', 142],
  ['B3', 'XB', 154],
  ['B2', 'XB', 166],
  ['U', 'XB', 178],
  ['V', 'XB', 190],
  ['W', 'XB', 202],
];

/** 右の縁（X4 の主なピン）: [ID, ピン番号] */
const X4: [string, number][] = [
  ['COM+', 7],
  ['SRV-ON', 29],
  ['A-CLR', 31],
  ['POT', 9],
  ['NOT', 8],
  ['OPC1', 1],
  ['PULS1', 3],
  ['PULS2', 4],
  ['OPC2', 2],
  ['SIGN1', 5],
  ['SIGN2', 6],
  ['S-RDY+', 35],
  ['S-RDY-', 34],
  ['ALM+', 37],
  ['ALM-', 36],
  ['INP+', 39],
  ['INP-', 38],
  ['BRKOFF+', 11],
  ['BRKOFF-', 10],
  ['COM-', 41],
];
const X4_Y0 = 62;
const X4_PITCH = 10;
const cy = (i: number) => +(X4_Y0 + i * X4_PITCH).toFixed(2);

const PE = { x: 26, y: H - 7 };
const X6 = { x: 84, y: H - 5 };

const NOTES: Record<string, string> = {
  L1: '主回路電源（単相 / 三相 AC200〜240V。単相のときは L1・L3）',
  L2: '主回路電源（三相のとき）',
  L3: '主回路電源（単相 / 三相）',
  L1C: '制御電源（単相 AC200〜240V）',
  L2C: '制御電源（単相 AC200〜240V）',
  B1: '回生抵抗器（外付けの回生抵抗器は B1-B2 間。A 枠は内蔵なし）',
  B3: '回生抵抗器（内蔵品のある枠で B2-B3 を短絡して使う。A 枠では開放のまま）',
  B2: '回生抵抗器',
  'COM+': 'X4-7: 入力信号用の電源（シンク入力では +24V）',
  'SRV-ON': 'X4-29: サーボオン',
  'A-CLR': 'X4-31: アラームクリア（ピン番号は推定）',
  POT: 'X4-9: 正方向駆動禁止（b 接点。ピン番号は推定）',
  NOT: 'X4-8: 負方向駆動禁止（b 接点。ピン番号は推定）',
  OPC1: 'X4-1: オープンコレクタ指令用の電源（PULS 側。+24V を入れると内蔵の抵抗で DC24V のオープンコレクタを受けられる）',
  PULS1: 'X4-3: 指令パルス（差動は PULS1-PULS2）',
  PULS2: 'X4-4: 指令パルス（オープンコレクタは OPC1 に +24V を入れ、PLC の NPN 出力で PULS2 を引き込む）',
  OPC2: 'X4-2: オープンコレクタ指令用の電源（SIGN 側。+24V を入れる）',
  SIGN1: 'X4-5: 指令符号（差動は SIGN1-SIGN2）',
  SIGN2: 'X4-6: 指令符号（オープンコレクタは OPC2 に +24V を入れ、PLC の NPN 出力で SIGN2 を引き込む）',
  'S-RDY+': 'X4-35: サーボレディ出力（フォトカプラ。DC30V 50mA）',
  'S-RDY-': 'X4-34: サーボレディ出力の −（ピン番号は推定）',
  'ALM+': 'X4-37: サーボアラーム出力（フォトカプラ。正常時 ON。DC30V 50mA）',
  'ALM-': 'X4-36: サーボアラーム出力の −（ピン番号は推定）',
  'INP+': 'X4-39: 位置決め完了出力（フォトカプラ。ピン番号は推定）',
  'INP-': 'X4-38: 位置決め完了出力の −（ピン番号は推定）',
  'BRKOFF+': 'X4-11: 外部ブレーキ解除出力（ブレーキ電源を入り切りするリレーを動かす。ピン番号は推定）',
  'BRKOFF-': 'X4-10: 外部ブレーキ解除出力の −（ピン番号は推定）',
  'COM-': 'X4-41: 入出力の電源の 0V（オープンコレクタ出力の共通）',
};

const HINTS: Record<string, string> = {
  'COM+': '入力電源',
  'SRV-ON': 'サーボオン',
  POT: '正転禁止',
  NOT: '逆転禁止',
  'A-CLR': 'アラーム解除',
  OPC1: 'パルス電源',
  OPC2: 'パルス電源',
  PULS2: 'パルス',
  SIGN2: '符号',
  'S-RDY+': 'サーボレディ',
  'ALM+': 'アラーム',
  'INP+': '位置決完了',
  'BRKOFF+': 'ブレーキ解除',
  L1C: '制御電源',
  L2C: '制御電源',
};

const svg = `
  <defs>
    <linearGradient id="a6-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2c30"/>
      <stop offset="0.5" stop-color="#3b3e43"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
    <linearGradient id="a6-plug-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9dadc"/>
      <stop offset="1" stop-color="#b8babd"/>
    </linearGradient>
  </defs>
  <!-- 本体（黒い樹脂、放熱のスリット） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#a6-body-{{uid}})" stroke="#000" stroke-width="1.2"/>
  <g fill="#18191b">${Array.from({ length: 9 }, (_, i) => `<rect x="${16 + i * 10}" y="4" width="6" height="2.4" rx="1"/>`).join('')}</g>
  ${text(W / 2, 15, 'Panasonic', 6, '#ffffff', 'middle', 'bold')}
  <!-- 表示部（6 桁 LED・操作キー） -->
  <rect x="36" y="21" width="58" height="15" rx="1.5" fill="#0d0f10" stroke="#555" stroke-width="0.6"/>
  ${text(90, 32.5, 'r   0', 10, '#ff4d3a', 'end', 'bold')}
  ${['M', 'S', '◀', '▲', '▼']
    .map((b, i) => `<rect x="${36 + i * 12}" y="39" width="10" height="7" rx="1" fill="#4a4d52" stroke="#6c7076" stroke-width="0.4"/>${text(41 + i * 12, 44.2, b, 3.4, '#eee')}`)
    .join('')}
  <!-- CHARGE ランプ -->
  <circle cx="22" cy="26" r="3" fill="#7a1a12" stroke="#222" stroke-width="0.6"/>${text(22, 34, 'CHARGE', 3, '#ccc')}
  <!-- XA・XB（左の縁。白いコネクタ） -->
  ${(['XA', 'XB'] as const)
    .map((g) => {
      const ys = MAIN.filter((m) => m[1] === g).map((m) => m[2]);
      const y0 = Math.min(...ys) - 7;
      const y1 = Math.max(...ys) + 7;
      return `<rect x="1" y="${y0}" width="30" height="${y1 - y0}" rx="1.5" fill="url(#a6-plug-{{uid}})" stroke="#6c7076" stroke-width="0.7"/>${text(34, y0 + 5, g, 3.6, '#f0f0f0', 'start', 'bold')}`;
    })
    .join('')}
  ${MAIN.map(
    ([id, , y]) => `<rect x="${LX - 3.5}" y="${y - 3.5}" width="7" height="7" rx="1" fill="#e8e8e8" stroke="#777" stroke-width="0.4"/><circle cx="${LX}" cy="${y}" r="2" fill="#333"/>
  <rect x="${LX + 5}" y="${y - 2.5}" width="3" height="5" rx="0.6" fill="#f2a71b"/>
  ${text(LX + 10, y + 1.6, id, 4.2, '#222', 'start', 'bold')}`,
  ).join('')}
  <!-- 形名 -->
  ${text(W / 2 - 6, 250, 'MINAS A6', 5, '#e8e8e8', 'middle', 'bold')}
  ${text(W / 2 - 6, 258, MINAS_A6.amp, 5.4, '#f2f2f2', 'middle', 'bold')}
  ${text(W / 2 - 6, 265, '200V 200W', 3.6, '#bbb')}
  <!-- X1（USB）・X2（通信） -->
  <rect x="42" y="214" width="14" height="8" rx="1" fill="#000" stroke="#666" stroke-width="0.5"/>${text(49, 228, 'X1', 3.4, '#ccc')}
  <rect x="60" y="212" width="16" height="11" rx="1" fill="#000" stroke="#666" stroke-width="0.5"/>${text(68, 228, 'X2', 3.4, '#ccc')}
  <!-- X4（右の縁） -->
  <rect x="${RX - 36}" y="${X4_Y0 - 9}" width="41" height="${(X4.length - 1) * X4_PITCH + 16}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  ${text(RX - 40, X4_Y0 - 4, 'X4', 4, '#f0f0f0', 'end', 'bold')}
  ${X4.map(
    ([id, pin], i) => `<rect x="${RX - 3}" y="${cy(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RX}" cy="${cy(i)}" r="1.8" fill="#111"/>
  <text x="${RX - 5}" y="${cy(i) + 1.5}" text-anchor="end" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#222"><tspan font-size="2.8" font-weight="normal" fill="#666">${pin} </tspan>${id.replace(/-$/, '−')}</text>`,
  ).join('')}
  <!-- X6（エンコーダ）・接地 -->
  <rect x="${X6.x - 9}" y="${X6.y - 14}" width="18" height="16" rx="1.5" fill="#000" stroke="#777" stroke-width="0.6"/>
  <rect x="${X6.x - 6}" y="${X6.y - 11}" width="12" height="7" rx="1" fill="#333"/>
  ${text(X6.x, X6.y - 17, 'X6', 4, '#f0f0f0', 'middle', 'bold')}
  <circle cx="${PE.x}" cy="${PE.y}" r="4.5" fill="#d6d6d6" stroke="#555" stroke-width="0.7"/>
  <path d="M${PE.x - 2.6} ${PE.y} H${PE.x + 2.6} M${PE.x} ${PE.y - 2.6} V${PE.y + 2.6}" stroke="#444" stroke-width="1"/>
  ${text(PE.x + 8, PE.y + 1.6, '⏚', 5, '#9fd89f', 'start')}
`;

const ac200 = { system: 'AC' as const, minVoltage: 170, maxVoltage: 264 };
const dcCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 26.4, conductors: ['-', '+'] as ('+' | '-')[] };
const RST = ['R', 'S', 'T'] as const;
/** フォトカプラ出力（+ 側, − 側） */
const OUTS: [string, string][] = [
  ['S-RDY+', 'S-RDY-'],
  ['ALM+', 'ALM-'],
  ['INP+', 'INP-'],
  ['BRKOFF+', 'BRKOFF-'],
];
const INPUTS = ['SRV-ON', 'A-CLR', 'POT', 'NOT'];

const terminals: TerminalDef[] = [
  ...MAIN.map(([id, , y]): TerminalDef => {
    const base = { id, note: NOTES[id], hint: HINTS[id], x: LX, y, side: 'left' as const };
    if (id === 'L1' || id === 'L3') return { ...base, role: 'input', accepts: ac200, hint: '主回路電源' };
    if (id === 'L2') return { ...base, role: 'input', accepts: ac200, optional: true, hint: '主回路電源' };
    if (id === 'L1C' || id === 'L2C') return { ...base, role: 'input', accepts: ac200, loadCurrent: 0.2 };
    if (id === 'U' || id === 'V' || id === 'W')
      return {
        ...base,
        role: 'supply',
        supply: { system: 'AC', voltage: 200, conductor: RST[['U', 'V', 'W'].indexOf(id)], limitCurrent: MINAS_A6.ampOut },
        note: `サーボモーターの動力（定格出力電流 ${MINAS_A6.ampOut}A。推定）`,
        hint: 'モーター',
      };
    return { ...base, role: 'signal', optional: true };
  }),
  { id: 'PE', label: '⏚', note: '保護接地（サーボモーターの接地もここへ）', x: PE.x, y: PE.y, side: 'bottom', role: 'ground' },
  {
    id: 'X6',
    label: 'X6（エンコーダ）',
    note: `サーボモーター ${MINAS_A6.motor} のエンコーダへ、専用のエンコーダケーブルでつなぐ`,
    x: X6.x,
    y: X6.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: MINAS_A6_ENCODER, pins: 0, width: 14, required: true },
  },
  ...X4.map(([id], i): TerminalDef => {
    const base = { id, ...(id.endsWith('-') ? { label: id.replace(/-$/, '−') } : {}), note: NOTES[id], hint: HINTS[id], x: RX, y: cy(i), side: 'right' as const, optional: true };
    if (id === 'COM+') return { ...base, role: 'input', accepts: dcCommon };
    if (id === 'COM-') return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 26.4, conductors: ['-'] } };
    if (id === 'OPC1' || id === 'OPC2') return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 26.4, conductors: ['+'] } };
    if (INPUTS.includes(id)) return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'COM+' }, optional: id === 'A-CLR' };
    if (id === 'PULS2') return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'OPC1' } };
    if (id === 'SIGN2') return { ...base, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'OPC2' } };
    if (OUTS.some(([plus]) => plus === id)) return { ...base, role: 'signal', signal: { dir: 'out', kind: 'npn' } };
    if (OUTS.some(([, minus]) => minus === id)) return { ...base, role: 'input', accepts: dcCommon };
    return { ...base, role: 'signal' };
  }),
];

const links: InternalLink[] = OUTS.map(([plus, minus]) => ({ from: plus, to: minus, switch: 'output', ratedCurrent: 0.05 }));

const def: DeviceDefinition = {
  type: 'panasonic.madln15sg',
  name: 'サーボアンプ',
  model: MINAS_A6.amp,
  maker: 'パナソニック',
  category: 'load',
  labelPrefix: 'SA',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  distinctGroups: [
    ['L1', 'L2', 'L3'],
    ['L1C', 'L2C'],
  ],
  loadCurrent: MINAS_A6.ampIn,
  description:
    'パナソニックの AC サーボアンプ MINAS A6SG MADLN15SG（A 枠、パルス列指令の位置制御、RS485/RS232 通信付き、安全機能なし、200W まで。外形 W40 × H150 × D130mm）。サーボモーター MSMF022L1（200W）と組み合わせる。' +
    '主回路 L1・L2・L3 に単相 / 三相 AC200〜240V（単相は L1・L3）、制御電源 L1C・L2C に単相 AC200〜240V を入れ、U・V・W をサーボモーターの動力に、X6 をエンコーダケーブルでサーボモーターのエンコーダにつなぐ。' +
    'X4 の入力（SRV-ON・POT・NOT・A-CLR）はフォトカプラ入力で、COM+ に +24V を入れ、入力と 0V の間を接点・NPN 出力で閉じて ON（シンク）。POT・NOT は b 接点で使う（使わないときはパラメータで無効にする）。' +
    'パルス列は、DC24V のオープンコレクタなら OPC1・OPC2 に +24V を入れて PULS2・SIGN2 を PLC の NPN 出力で引き込み、差動ラインドライバなら PULS1-PULS2・SIGN1-SIGN2 へ。' +
    '出力 S-RDY・ALM・INP・BRKOFF はフォトカプラ出力（DC30V 50mA。+ と − の組）。電磁ブレーキ付きのサーボモーターは BRKOFF で動かすリレーでブレーキ電源（DC24V）を入り切りする。' +
    'A 枠は回生抵抗器を内蔵していないので、回生が大きいときは外付けの回生抵抗器を B1-B2 間につなぐ。',
  estimated:
    '定格出力電流 1.6A・主回路の入力電流 1.5A・制御電源の電流 0.2A、X4 のうち POT・NOT・A-CLR・INP・BRKOFF・S-RDY−・ALM− のピン番号（MINAS A5 / A6 の資料の記憶による）。' +
    '主回路・X4 の端子の位置は図面用に左右の縁へ並べたもの',
};

export default def;
