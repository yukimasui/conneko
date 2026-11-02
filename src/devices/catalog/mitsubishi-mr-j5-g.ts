import { MELSERVO_J5, MR_J5_ENCODER } from '../mitsubishi/melservo';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 三菱電機 AC サーボアンプ MELSERVO-J5 MR-J5-□G（CC-Link IE TSN 対応、200V、10G〜70G）。
 *
 * 出典: 三菱電機 FA サイト「仕様から探す」MR-J5-G、MR-J5-G 取扱説明書（導入編）、販売店のカタログの接続例（CN3: DICOM 5、LSP 2、LSN 12、
 *       DOG 19、EM2 20、MBR 13、ALM 15）。主回路・制御回路電源・定格電流は MR-J5-A と同じ（src/devices/mitsubishi/melservo.ts）。
 * - 主回路のコネクタ CNP1（L1・L2・L3・N-・P3・P4）、CNP2（P+・C・D・L11・L21）、CNP3（U・V・W）は MR-J5-A と同じ並び。
 * - CN1A・CN1B: CC-Link IE TSN（RJ-45、1Gbps）。CN1A をマスタ側、CN1B を次の局へ（ライン接続）。
 * - CN3: 入出力（強制停止 EM2、ストロークエンド LSP・LSN、近点ドグ DOG、出力 MBR・INP・ALM）。CN2: エンコーダー。CN5: USB。CN8: STO。
 * - 位置指令はネットワークでモーションユニット（RD78G など）から受けるため、パルス列の端子はない。
 *
 * 描き方: MR-J5-A（src/devices/catalog/mitsubishi-mr-j5-a.ts）と同じく、幅を 60mm 相当（120px）にそろえ、主回路を左の縁、
 * CN3 の主なピンを右の縁、CN1A・CN1B を右の縁の下に並べた。端子 ID は MR-J5-A と共通のもの（L1・U・EM2・DICOM など）をそろえた。
 */

const W = 120;
const H = 344;
const LEFT_X = 6;
const RIGHT_X = W - 6;

/** 左の縁（主回路）: [ID, コネクタ, y]。MR-J5-A と同じ */
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

/** 右の縁（CN3 の主なピン）: [ID（信号名）, ピン番号] */
const CN3: [string, number][] = [
  ['DICOM', 5],
  ['EM2', 20],
  ['LSP', 2],
  ['LSN', 12],
  ['DOG', 19],
  ['DOCOM', 3],
  ['MBR', 13],
  ['INP', 9],
  ['ALM', 15],
];
const CN3_Y0 = 74;
const CN3_PITCH = 11;
const cy = (i: number) => CN3_Y0 + i * CN3_PITCH;
/** CC-Link IE TSN のポート（右の縁の下） */
const PORTS = [
  { id: 'CN1A', y: 212 },
  { id: 'CN1B', y: 246 },
];

const PE = { x: 26, y: H - 7 };
const CN2 = { x: 84, y: H - 5 };

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
  DICOM: 'CN3-5: デジタル入力の電源入力（シンク入力では +24V、ソース入力では 0V）',
  EM2: 'CN3-20: 強制停止 2（b 接点。開くと減速停止）',
  LSP: 'CN3-2: 正転ストロークエンド（b 接点）',
  LSN: 'CN3-12: 逆転ストロークエンド（b 接点）',
  DOG: 'CN3-19: 近点ドグ（原点復帰用）',
  DOCOM: 'CN3-3: デジタル出力の共通（シンクでは 0V）',
  MBR: 'CN3-13: 電磁ブレーキインタロック（ブレーキ解除で ON。DC24V 40mA）',
  INP: 'CN3-9: 位置決め完了（DC24V 40mA）',
  ALM: 'CN3-15: 故障（正常時 ON、アラームで OFF。DC24V 40mA）',
};

const HINTS: Record<string, string> = {
  DICOM: '入力電源',
  EM2: '強制停止',
  LSP: '正転 LS',
  LSN: '逆転 LS',
  DOG: '近点ドグ',
  DOCOM: '出力共通',
  MBR: 'ブレーキ',
  INP: '位置決完了',
  ALM: '故障',
};

const capOf = (p: ParamValues) => MELSERVO_J5.find((c) => c.amp === String(p.capacity)) ?? MELSERVO_J5[2];

/** RJ-45 の差込口（右向き） */
const rj45 = (x: number, y: number) => `
  <rect x="${x - 20}" y="${y - 9}" width="21" height="18" rx="1.2" fill="#c3c7cb" stroke="#5f646a" stroke-width="0.6"/>
  <rect x="${x - 16}" y="${y - 6}" width="13" height="12" rx="0.6" fill="#16181b"/>
  <rect x="${x - 4}" y="${y - 3}" width="3" height="6" fill="#16181b"/>
  <rect x="${x - 19}" y="${y - 8.5}" width="3" height="2" fill="#3ccf52"/><rect x="${x - 19}" y="${y + 6.5}" width="3" height="2" fill="#f2b417"/>`;

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
  <g fill="#15171a">${Array.from({ length: 9 }, (_, i) => `<rect x="${16 + i * 10}" y="4" width="6" height="2.4" rx="1"/>`).join('')}</g>
  <!-- 表示部（局番設定のロータリスイッチ・表示） -->
  <text x="${W / 2}" y="16" text-anchor="middle" font-family="sans-serif" font-size="5.2" font-weight="bold" fill="#e8e8e8">MITSUBISHI</text>
  <rect x="34" y="20" width="44" height="17" rx="1.5" fill="#0d0f10" stroke="#555" stroke-width="0.6"/>
  <text x="75" y="33" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#ff4d3a">b01</text>
  ${[0, 1].map((i) => `<circle cx="${42 + i * 15}" cy="46" r="5" fill="#d9d9d6" stroke="#666" stroke-width="0.5"/><path d="M${42 + i * 15} 42 V50" stroke="#333" stroke-width="1.2"/>`).join('')}
  <text x="49.5" y="56" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#bbb">STATION</text>
  <!-- CHARGE ランプ -->
  <circle cx="22" cy="28" r="3" fill="#7a1a12" stroke="#222" stroke-width="0.6"/>
  <text x="22" y="37" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#ccc">CHARGE</text>
  <!-- 主回路のコネクタ（左の縁） -->
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
  <text x="${W / 2 - 4}" y="276" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#bbb">MELSERVO-J5</text>
  <text x="${W / 2 - 4}" y="284" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#f2f2f2">MR-J5-${c.amp}G</text>
  <text x="${W / 2 - 4}" y="291" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#bbb">${c.watt}W 200V  CC-Link IE TSN</text>
  <!-- CN5（USB）・CN8（STO 短絡コネクタ） -->
  <rect x="40" y="226" width="14" height="8" rx="1" fill="#111" stroke="#666" stroke-width="0.5"/>
  <text x="47" y="240" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#ccc">CN5</text>
  <rect x="58" y="224" width="14" height="11" rx="1" fill="#e2c13a" stroke="#666" stroke-width="0.5"/>
  <text x="65" y="240" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#ccc">CN8</text>
  <!-- CN3（右の縁。主なピンを並べる） -->
  <rect x="${RIGHT_X - 30}" y="${CN3_Y0 - 9}" width="35" height="${(CN3.length - 1) * CN3_PITCH + 16}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  <text x="${RIGHT_X - 34}" y="${CN3_Y0 - 4}" text-anchor="end" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f0f0f0">CN3</text>
  ${CN3.map(
    ([id, pin], i) => `<rect x="${RIGHT_X - 3}" y="${cy(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RIGHT_X}" cy="${cy(i)}" r="1.8" fill="#111"/>
  <text x="${RIGHT_X - 5}" y="${cy(i) + 1.5}" text-anchor="end" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222"><tspan font-size="3" font-weight="normal" fill="#666">${pin} </tspan>${id}</text>`,
  ).join('')}
  <!-- CN1A・CN1B（CC-Link IE TSN） -->
  ${PORTS.map((pt) => rj45(RIGHT_X + 5, pt.y) + `<text x="${RIGHT_X - 18}" y="${pt.y - 12}" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f0f0f0">${pt.id}</text>`).join('')}
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
    ...PORTS.map(
      (pt): TerminalDef => ({
        id: pt.id,
        label: `${pt.id}（CC-Link IE TSN）`,
        hint: pt.id === 'CN1A' ? 'TSN 入' : 'TSN 出',
        note:
          pt.id === 'CN1A'
            ? 'CC-Link IE TSN のポート（1Gbps、RJ-45）。マスタ局（モーションユニット RD78G など）か前の局からのケーブルをつなぐ'
            : 'CC-Link IE TSN のポート（1Gbps、RJ-45）。次の局へつなぐ（最後の局は空き）',
        x: RIGHT_X + 5,
        y: pt.y,
        side: 'right',
        role: 'connector',
        connector: { kind: 'RJ45', pins: 0, width: 18, length: 21, facing: 'front', protocols: ['cc-link-ie-tsn'] },
      }),
    ),
    ...CN3.map(([id], i): TerminalDef => {
      if (id === 'DICOM' || id === 'DOCOM') return right(id, i, { role: 'input', accepts: dcCommon });
      if (['EM2', 'LSP', 'LSN', 'DOG'].includes(id)) {
        // EM2・LSP・LSN は b 接点で使う（開くと停止）ため配線を求める
        return right(id, i, { signal: { dir: 'in', kind: 'dc', common: 'DICOM' }, optional: id === 'DOG' });
      }
      return right(id, i, { signal: { dir: 'out', kind: 'npn' } });
    }),
  ];
};

const def: DeviceDefinition = {
  type: 'mitsubishi.mr-j5-g',
  name: 'サーボアンプ',
  model: 'MR-J5-40G',
  modelOf: (p) => `MR-J5-${capOf(p).amp}G`,
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
      options: MELSERVO_J5.map((c) => ({ value: c.amp, label: `MR-J5-${c.amp}G（${c.watt}W、HK-KT${c.motor}W 用、出力 ${c.ampOut}A）` })),
      default: '40',
    },
  ],
  links: ['MBR', 'INP', 'ALM'].map((id) => ({ from: id, to: 'DOCOM', switch: 'output' as const, ratedCurrent: 0.04 })),
  distinctGroups: [
    ['L1', 'L2', 'L3'],
    ['L11', 'L21'],
  ],
  loadCurrent: (p) => capOf(p).ampIn,
  description:
    '三菱電機の AC サーボアンプ MELSERVO-J5 MR-J5-□G（CC-Link IE TSN 対応。位置・速度・トルクの指令をネットワークでモーションユニットから受ける）。' +
    '主回路電源 L1・L2・L3 に三相 AC200〜240V（単相の場合は L1・L3）、制御回路電源 L11・L21 に単相 AC200〜240V を入れ、U・V・W をサーボモーター HK-KT の動力に、' +
    'CN2 をエンコーダーケーブルでサーボモーターのエンコーダーにつなぐ。サーボモーターの接地は PE へ。' +
    'CN1A・CN1B は CC-Link IE TSN のポート（RJ-45）で、モーションユニット（RD78G など）から局をライン状につなぐ（CC-Link IE TSN 用のケーブル・スイッチを使う。一般の Ethernet のスイッチは使わない）。' +
    'CN3 の入力 EM2・LSP・LSN・DOG はフォトカプラ入力で、シンク入力では DICOM に +24V、DOCOM に 0V をつなぎ、入力と DOCOM の間を接点で閉じて ON。EM2・LSP・LSN は b 接点で使う。' +
    '出力 MBR・INP・ALM は NPN オープンコレクタ（DC24V 40mA、共通 DOCOM）。電磁ブレーキ付きのサーボモーターは、MBR で動かすリレーでブレーキ電源（DC24V）を入り切りする。' +
    'CN8 は STO（安全停止）の入力で、使わない場合は付属の短絡コネクタを差したままにする。',
  estimated:
    'CN3 の DOCOM（CN3-3）と INP（CN3-9）のピン番号、主回路のコネクタの並び（MR-J5-A と同じとみなした）は推定。' +
    'CN3 の入出力・主回路の端子・CN1A・CN1B の位置は図面用に左右の縁へ並べたもの',
};

export default def;
