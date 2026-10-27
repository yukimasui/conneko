import { MELSERVO_J5, MR_J5_ENCODER } from '../mitsubishi/melservo';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 三菱電機 AC サーボアンプ MELSERVO-J5 MR-J5-□A（汎用インタフェース、パルス列・アナログ指令、200V、10A〜70A）。
 *
 * 出典: 三菱電機 FA サイト「仕様から探す」MR-J5-40A・MR-J5-70A（出力定格電流・主回路電源の定格電流・制御回路電源 0.2A）、
 *       ミスミの MR-J5-A（200V）仕様表（10A・20A）、販売店の外形（W40 × H172 × D135mm、70A は W60 × D185mm）。
 * - 主回路電源 L1・L2・L3（三相 AC200〜240V。単相 AC200〜240V の場合は L1・L3）、制御回路電源 L11・L21（単相 AC200〜240V）。
 * - 主回路のコネクタ: CNP1（L1・L2・L3・N-・P3・P4）、CNP2（P+・C・D・L11・L21）、CNP3（U・V・W）。P3-P4 間は出荷時に短絡（DC リアクトル用）、
 *   回生オプションは P+-C 間につなぐ。
 * - CN1（50 ピン）: 入出力信号。CN2: エンコーダー（サーボモーターへ）。CN3: USB。CN8: STO（出荷時は短絡コネクタ）。
 *
 * 描き方: 実機の幅（40mm / 60mm）では端子が並ばないため、幅を 60mm 相当（120px）にそろえて描く。高さは 172mm（1mm = 2px）。
 * 主回路のコネクタ（実機は正面の左側に上から CNP1・CNP2・CNP3）を左の縁に、CN1 の主なピン（位置制御モードの初期の割付け）を右の縁に並べる。
 * CN1 はピン番号をラベルに付けた。実機では CN1 にコネクタ（MR-J3CN1）か中継端子台（MR-TB50 と MR-J2M-CN1TBL ケーブル）でつなぐ。
 */

const W = 120;
const H = 344;
const LEFT_X = 6;
const RIGHT_X = W - 6;

/** 左の縁（主回路）: [ID, コネクタ, y] */
const MAIN: [string, string, number][] = [
  ['L1', 'CNP1', 70],
  ['L2', 'CNP1', 82],
  ['L3', 'CNP1', 94],
  ['N-', 'CNP1', 106],
  ['P3', 'CNP1', 118],
  ['P4', 'CNP1', 130],
  ['P+', 'CNP2', 152],
  ['C', 'CNP2', 164],
  ['D', 'CNP2', 176],
  ['L11', 'CNP2', 188],
  ['L21', 'CNP2', 200],
  ['U', 'CNP3', 222],
  ['V', 'CNP3', 234],
  ['W', 'CNP3', 246],
];

/** 右の縁（CN1 の主なピン）: [ID（信号名）, ピン番号] */
const CN1: [string, number][] = [
  ['DICOM', 20],
  ['OPC', 12],
  ['PP', 10],
  ['PG', 11],
  ['NP', 35],
  ['NG', 36],
  ['SON', 15],
  ['RES', 19],
  ['CR', 41],
  ['EM2', 42],
  ['LSP', 43],
  ['LSN', 44],
  ['PC', 17],
  ['TL', 18],
  ['DOCOM', 46],
  ['ALM', 48],
  ['RD', 49],
  ['INP', 24],
  ['ZSP', 23],
  ['TLC', 25],
  ['LA', 4],
  ['LAR', 5],
  ['LB', 6],
  ['LBR', 7],
  ['LZ', 8],
  ['LZR', 9],
  ['OP', 33],
  ['LG', 3],
];
const CN1_Y0 = 60;
const CN1_PITCH = 9.6;
const cy = (i: number) => +(CN1_Y0 + i * CN1_PITCH).toFixed(2);

const PE = { x: 26, y: H - 7 };
const CN2 = { x: 84, y: H - 5 };

/** 主回路・CN1 の注記 */
const NOTES: Record<string, string> = {
  L1: '主回路電源（三相 AC200〜240V。単相 AC200〜240V の場合は L1・L3）',
  L2: '主回路電源（三相 AC200〜240V。単相の場合は使わない）',
  L3: '主回路電源（三相 AC200〜240V。単相 AC200〜240V の場合は L1・L3）',
  'N-': '主回路の直流（−）。回生コンバータ・ブレーキユニット用',
  P3: 'DC リアクトル接続（出荷時は P4 と短絡）',
  P4: 'DC リアクトル接続（出荷時は P3 と短絡）',
  'P+': '主回路の直流（＋）。回生オプションは P+-C 間',
  C: '回生オプション接続（P+-C 間）',
  D: '内蔵回生抵抗器（P+-D 間を短絡して使う）',
  L11: '制御回路電源（単相 AC200〜240V、0.2A）',
  L21: '制御回路電源（単相 AC200〜240V、0.2A）',
  DICOM: 'CN1-20・21: デジタル入力の電源入力（シンク入力では +24V、ソース入力では 0V）',
  OPC: 'CN1-12: オープンコレクタのパルス列入力用の電源入力（+24V）',
  PP: 'CN1-10: 正転パルス列（オープンコレクタは OPC に +24V を入れ、PLC の NPN 出力で引き込む。差動は PP-PG）',
  PG: 'CN1-11: 正転パルス列の差動入力（−側）',
  NP: 'CN1-35: 逆転パルス列（オープンコレクタは OPC に +24V を入れ、PLC の NPN 出力で引き込む。差動は NP-NG）',
  NG: 'CN1-36: 逆転パルス列の差動入力（−側）',
  SON: 'CN1-15: サーボオン',
  RES: 'CN1-19: リセット',
  CR: 'CN1-41: クリア（溜りパルスのクリア）',
  EM2: 'CN1-42: 強制停止 2（b 接点。開くと減速停止）',
  LSP: 'CN1-43: 正転ストロークエンド（b 接点）',
  LSN: 'CN1-44: 逆転ストロークエンド（b 接点）',
  PC: 'CN1-17: 比例制御',
  TL: 'CN1-18: 外部トルク制限選択',
  DOCOM: 'CN1-46・47: デジタル入出力の共通（シンクでは 0V）',
  ALM: 'CN1-48: 故障（正常時 ON、アラームで OFF。DC24V 40mA）',
  RD: 'CN1-49: 準備完了（DC24V 40mA）',
  INP: 'CN1-24: 位置決め完了（DC24V 40mA）',
  ZSP: 'CN1-23: 零速度検出（DC24V 40mA）',
  TLC: 'CN1-25: トルク制限中（DC24V 40mA）',
  LA: 'CN1-4: エンコーダー A 相パルス（差動ラインドライバ）',
  LAR: 'CN1-5: エンコーダー A 相パルスの反転',
  LB: 'CN1-6: エンコーダー B 相パルス（差動ラインドライバ）',
  LBR: 'CN1-7: エンコーダー B 相パルスの反転',
  LZ: 'CN1-8: エンコーダー Z 相パルス（差動ラインドライバ）',
  LZR: 'CN1-9: エンコーダー Z 相パルスの反転',
  OP: 'CN1-33: エンコーダー Z 相パルス（オープンコレクタ、共通は LG）',
  LG: 'CN1-3: 制御コモン（LA〜LZR・OP の基準）',
};

/** 短い呼び名（吹き出し用） */
const HINTS: Record<string, string> = {
  DICOM: '入力電源',
  OPC: 'パルス電源',
  PP: '正転パルス',
  NP: '逆転パルス',
  SON: 'サーボオン',
  EM2: '強制停止',
  LSP: '正転 LS',
  LSN: '逆転 LS',
  DOCOM: '入出力共通',
  ALM: '故障',
  RD: '準備完了',
  INP: '位置決完了',
  ZSP: '零速度',
};

const capOf = (p: ParamValues) => MELSERVO_J5.find((c) => c.amp === String(p.capacity)) ?? MELSERVO_J5[2];

const svg = (p: ParamValues) => {
  const c = capOf(p);
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2c30"/>
      <stop offset="0.5" stop-color="#3a3d42"/>
      <stop offset="1" stop-color="#25272b"/>
    </linearGradient>
    <linearGradient id="plug-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e9e9e6"/>
      <stop offset="1" stop-color="#c9cac6"/>
    </linearGradient>
  </defs>
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#body-{{uid}})" stroke="#111" stroke-width="1.2"/>
  <!-- 通風口（上面） -->
  <g fill="#15171a">${Array.from({ length: 9 }, (_, i) => `<rect x="${16 + i * 10}" y="4" width="6" height="2.4" rx="1"/>`).join('')}</g>
  <!-- 表示部（5 桁 7 セグメント・操作ボタン） -->
  <text x="${W / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="5.2" font-weight="bold" fill="#e8e8e8">MITSUBISHI</text>
  <rect x="34" y="20" width="58" height="17" rx="1.5" fill="#0d0f10" stroke="#555" stroke-width="0.6"/>
  <text x="89" y="33" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#ff4d3a">  rd-on</text>
  ${['MODE', 'UP', 'DOWN', 'SET']
    .map((b, i) => `<rect x="${34 + i * 15}" y="40" width="12.5" height="7" rx="1" fill="#55585e" stroke="#777" stroke-width="0.4"/>
  <text x="${40.25 + i * 15}" y="45.2" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#eee">${b}</text>`)
    .join('')}
  <!-- CHARGE ランプ -->
  <circle cx="22" cy="28" r="3" fill="#7a1a12" stroke="#222" stroke-width="0.6"/>
  <text x="22" y="37" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#ccc">CHARGE</text>
  <!-- 主回路のコネクタ（左の縁。白いプラグの差込口） -->
  ${(['CNP1', 'CNP2', 'CNP3'] as const)
    .map((cn) => {
      const ys = MAIN.filter((m) => m[1] === cn).map((m) => m[2]);
      const y0 = Math.min(...ys) - 7;
      const y1 = Math.max(...ys) + 7;
      return `<rect x="1" y="${y0}" width="26" height="${y1 - y0}" rx="1.5" fill="url(#plug-{{uid}})" stroke="#8a8b87" stroke-width="0.7"/>
  <text x="29" y="${y0 + 4}" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f0f0f0">${cn}</text>`;
    })
    .join('')}
  ${MAIN.map(
    ([id, , y]) => `<rect x="${LEFT_X - 3.5}" y="${y - 3.5}" width="7" height="7" rx="1" fill="#3a3a3a"/><circle cx="${LEFT_X}" cy="${y}" r="2" fill="#111"/>
  <rect x="${LEFT_X + 5}" y="${y - 2.5}" width="3" height="5" rx="0.6" fill="#f08a1c"/>
  <text x="${LEFT_X + 10}" y="${y + 1.6}" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#222">${id}</text>`,
  ).join('')}
  <rect x="${LEFT_X + 1}" y="114" width="3" height="20" rx="1" fill="#b87333" opacity="0.9"/>
  <!-- 形名 -->
  <text x="${W / 2 + 2}" y="268" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#bbb">MELSERVO-J5</text>
  <text x="${W / 2 + 2}" y="276" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#f2f2f2">MR-J5-${c.amp}A</text>
  <text x="${W / 2 + 2}" y="283" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#bbb">${c.watt}W 200V</text>
  <!-- CN3（USB）・CN8（STO 短絡コネクタ） -->
  <rect x="46" y="216" width="14" height="8" rx="1" fill="#111" stroke="#666" stroke-width="0.5"/>
  <text x="53" y="230" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#ccc">CN3</text>
  <rect x="64" y="214" width="14" height="11" rx="1" fill="#e2c13a" stroke="#666" stroke-width="0.5"/>
  <text x="71" y="230" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#ccc">CN8</text>
  <!-- CN1（右の縁。主なピンを並べる） -->
  <rect x="${RIGHT_X - 30}" y="${CN1_Y0 - 9}" width="35" height="${(CN1.length - 1) * CN1_PITCH + 16}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  <text x="${RIGHT_X - 34}" y="${CN1_Y0 - 4}" text-anchor="end" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f0f0f0">CN1</text>
  ${CN1.map(
    ([id, pin], i) => `<rect x="${RIGHT_X - 3}" y="${cy(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RIGHT_X}" cy="${cy(i)}" r="1.8" fill="#111"/>
  <text x="${RIGHT_X - 5}" y="${cy(i) + 1.5}" text-anchor="end" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222"><tspan font-size="3" font-weight="normal" fill="#666">${pin} </tspan>${id}</text>`,
  ).join('')}
  <!-- CN2（エンコーダー）・接地 -->
  <rect x="${CN2.x - 9}" y="${CN2.y - 14}" width="18" height="16" rx="1.5" fill="#111" stroke="#777" stroke-width="0.6"/>
  <rect x="${CN2.x - 6}" y="${CN2.y - 11}" width="12" height="7" rx="1" fill="#333"/>
  <text x="${CN2.x}" y="${CN2.y - 17}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f0f0f0">CN2</text>
  <circle cx="${PE.x}" cy="${PE.y}" r="4.5" fill="#d6d6d6" stroke="#555" stroke-width="0.7"/>
  <path d="M${PE.x - 2.6} ${PE.y} H${PE.x + 2.6} M${PE.x} ${PE.y - 2.6} V${PE.y + 2.6}" stroke="#444" stroke-width="1"/>
  <text x="${PE.x + 8}" y="${PE.y + 1.6}" font-family="sans-serif" font-size="5" fill="#9fd89f">⏚</text>
`;
};

const ac200 = { system: 'AC' as const, minVoltage: 170, maxVoltage: 264 };
/** DICOM・DOCOM・OPC（シンク・ソースのどちらにも配線できる共通端子） */
const dcCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 26.4, conductors: ['-', '+'] as ('+' | '-')[] };
const RST = ['R', 'S', 'T'] as const;

const terminals = (p: ParamValues): TerminalDef[] => {
  const c = capOf(p);
  const left = (id: string, y: number, extra: Partial<TerminalDef>): TerminalDef =>
    ({ id, note: NOTES[id], x: LEFT_X, y, side: 'left', role: 'signal', optional: true, ...extra }) as TerminalDef;
  const right = (id: string, i: number, extra: Partial<TerminalDef> = {}): TerminalDef =>
    ({ id, note: NOTES[id], hint: HINTS[id], x: RIGHT_X, y: cy(i), side: 'right', role: 'signal', optional: true, ...extra }) as TerminalDef;
  return [
    ...MAIN.map(([id, , y]): TerminalDef => {
      if (id === 'L1' || id === 'L3') return left(id, y, { role: 'input', accepts: ac200, optional: false, hint: '主回路電源' });
      if (id === 'L2') return left(id, y, { role: 'input', accepts: ac200, hint: '主回路電源' });
      if (id === 'L11' || id === 'L21') return left(id, y, { role: 'input', accepts: ac200, optional: false, hint: '制御電源', loadCurrent: 0.2 });
      if (id === 'U' || id === 'V' || id === 'W')
        return left(id, y, {
          role: 'supply',
          supply: { system: 'AC', voltage: 200, conductor: RST[['U', 'V', 'W'].indexOf(id)], limitCurrent: c.ampOut },
          optional: false,
          note: `サーボモーターの動力（U・V・W。出力定格電流 ${c.ampOut}A）`,
          hint: 'モーター',
        });
      return left(id, y, {});
    }),
    { id: 'PE', label: '⏚', note: '保護接地（サーボモーターの接地もここへ）', x: PE.x, y: PE.y, side: 'bottom', role: 'ground' },
    {
      id: 'CN2',
      label: 'CN2（エンコーダー）',
      note: `サーボモーター HK-KT${c.motor}W のエンコーダーへ、専用のエンコーダーケーブルでつなぐ`,
      x: CN2.x,
      y: CN2.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: MR_J5_ENCODER, pins: 0, width: 14, required: true },
    },
    ...CN1.map(([id], i): TerminalDef => {
      if (id === 'DICOM' || id === 'DOCOM' || id === 'OPC') return right(id, i, { role: 'input', accepts: dcCommon });
      if (id === 'PP' || id === 'NP') return right(id, i, { signal: { dir: 'in', kind: 'dc', common: 'OPC' } });
      if (['SON', 'RES', 'CR', 'EM2', 'LSP', 'LSN', 'PC', 'TL'].includes(id)) {
        // EM2・LSP・LSN は b 接点で使う（開くと停止）ため配線を求める
        const required = id === 'EM2' || id === 'LSP' || id === 'LSN' || id === 'SON';
        return right(id, i, { signal: { dir: 'in', kind: 'dc', common: 'DICOM' }, optional: !required });
      }
      if (['ALM', 'RD', 'INP', 'ZSP', 'TLC'].includes(id)) return right(id, i, { signal: { dir: 'out', kind: 'npn' } });
      if (['LA', 'LAR', 'LB', 'LBR', 'LZ', 'LZR'].includes(id)) return right(id, i, { signal: { dir: 'out', kind: 'line-driver' } });
      return right(id, i);
    }),
  ];
};

const def: DeviceDefinition = {
  type: 'mitsubishi.mr-j5-a',
  name: 'サーボアンプ',
  model: 'MR-J5-40A',
  modelOf: (p) => `MR-J5-${capOf(p).amp}A`,
  maker: '三菱電機',
  category: 'load',
  labelPrefix: 'SA',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'capacity',
      label: '容量',
      options: MELSERVO_J5.map((c) => ({ value: c.amp, label: `MR-J5-${c.amp}A（${c.watt}W、HK-KT${c.motor}W 用、出力 ${c.ampOut}A）` })),
      default: '40',
    },
  ],
  links: [
    // DOCOM は CN1-46・47、DICOM は CN1-20・21（どちらも内部で導通。この定義では 1 つにまとめた）
    ...['ALM', 'RD', 'INP', 'ZSP', 'TLC'].map((id) => ({ from: id, to: 'DOCOM', switch: 'output' as const, ratedCurrent: 0.04 })),
  ],
  distinctGroups: [
    ['L1', 'L2', 'L3'],
    ['L11', 'L21'],
  ],
  loadCurrent: (p) => capOf(p).ampIn,
  description:
    '三菱電機の AC サーボアンプ MELSERVO-J5 MR-J5-□A（汎用インタフェース。パルス列による位置制御、アナログ電圧による速度・トルク制御）。' +
    '主回路電源 L1・L2・L3 に三相 AC200〜240V（単相の場合は L1・L3）、制御回路電源 L11・L21 に単相 AC200〜240V を入れ、U・V・W をサーボモーター HK-KT の動力に、' +
    'CN2 をエンコーダーケーブルでサーボモーターのエンコーダーにつなぐ。サーボモーターの接地は PE へ。' +
    'CN1 の入力（SON・RES・EM2・LSP・LSN など）はフォトカプラ入力で、シンク入力では DICOM に +24V、DOCOM に 0V をつなぎ、入力と DOCOM の間を接点・NPN 出力で閉じて ON。' +
    'EM2・LSP・LSN は b 接点で使う（使わない場合も DOCOM と短絡しておく）。出力（ALM・RD・INP・ZSP・TLC）は NPN オープンコレクタ（DC24V 40mA、共通 DOCOM）。' +
    'PLC の位置決めユニットからのパルス列は、オープンコレクタなら OPC に +24V を入れて PP・NP へ、差動ラインドライバなら PP-PG・NP-NG へ。' +
    '電磁ブレーキ付きのサーボモーターでは、ブレーキ電源（DC24V）を電磁ブレーキインタロック（MBR。パラメータで出力に割り付ける）のリレーで入り切りする。' +
    'CN8 は STO（安全停止）の入力で、使わない場合は付属の短絡コネクタを差したままにする。CN1 のピンはここに挙げた主なものだけで、ほかにアナログ入力（VC・TLA）などがある。',
  estimated:
    'CN1 のピンの割付け（位置制御モードの初期値）と主回路のコネクタの並び（CNP1〜CNP3）は、同じ汎用インタフェースの MR-J4-A・MR-JE-A の資料で確かめ、MR-J5-A でも同じとみなした（推定）。' +
    'CN1 の入出力・主回路の端子の位置は図面用に左右の縁へ並べたもの',
};

export default def;
